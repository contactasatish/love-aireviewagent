import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Clock } from "lucide-react";
import { Badge } from "./ui/badge";

interface Business {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
  display_name: string;
}

interface EnabledSource {
  source_id: string;
  business_id: string;
  connected: boolean;
  account_name?: string;
  sources: Source;
}

interface SyncCooldown {
  [sourceId: string]: number; // timestamp of last sync
}

const SourceManagement = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [enabledSources, setEnabledSources] = useState<EnabledSource[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncCooldowns, setSyncCooldowns] = useState<SyncCooldown>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Update current time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchEnabledSources();
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async () => {
    const { data, error } = await supabase.from("businesses").select("id, name").order("name");

    if (error) {
      toast.error("Failed to fetch businesses");
      return;
    }
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0].id);
    }
  };

  const fetchEnabledSources = async () => {
    const { data, error } = await supabase
      .from("enabled_sources")
      .select(
        `
        source_id,
        business_id,
        connected,
        account_name,
        sources (
          id,
          name,
          display_name
        )
      `,
      )
      .eq("business_id", selectedBusiness);

    if (error) {
      toast.error("Failed to fetch sources");
      return;
    }
    setEnabledSources(data || []);
  };

  const canSync = (sourceId: string): boolean => {
    const lastSyncTime = syncCooldowns[sourceId] || 0;
    return currentTime - lastSyncTime >= SYNC_COOLDOWN_MS;
  };

  const getRemainingCooldown = (sourceId: string): number => {
    const lastSyncTime = syncCooldowns[sourceId] || 0;
    const elapsed = currentTime - lastSyncTime;
    const remaining = Math.max(0, SYNC_COOLDOWN_MS - elapsed);
    return Math.ceil(remaining / 1000); // Convert to seconds
  };

  const formatCooldownTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInitiateOAuth = async (sourceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("initiate-google-oauth", {
        body: {
          businessId: selectedBusiness,
          sourceName: sourceName,
        },
      });

      if (error) throw error;

      if (data?.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(data.authUrl, "OAuth", `width=${width},height=${height},left=${left},top=${top}`);

        const checkInterval = setInterval(async () => {
          const { data: sources } = await supabase
            .from("enabled_sources")
            .select("connected")
            .eq("business_id", selectedBusiness)
            .eq("source_id", data.sourceId)
            .single();

          if (sources?.connected) {
            clearInterval(checkInterval);
            toast.success("Successfully connected to Google Business!");
            fetchEnabledSources();
          }
        }, 2000);

        setTimeout(() => clearInterval(checkInterval), 5 * 60 * 1000);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate OAuth");
    }
  };

  const handleDisconnect = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from("enabled_sources")
        .update({ connected: false, account_name: null })
        .eq("business_id", selectedBusiness)
        .eq("source_id", sourceId);

      if (error) throw error;

      await supabase
        .from("oauth_connections")
        .update({ status: "disconnected" })
        .eq("business_id", selectedBusiness)
        .eq("provider", "google");

      toast.success("Disconnected successfully");
      fetchEnabledSources();
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect");
    }
  };

  const handleSyncReviews = async (sourceId: string) => {
    // Check cooldown
    if (!canSync(sourceId)) {
      const remaining = getRemainingCooldown(sourceId);
      toast.warning(`Please wait ${formatCooldownTime(remaining)} before syncing again`);
      return;
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews", {
        body: {
          businessId: selectedBusiness,
          sourceId: sourceId,
        },
      });

      if (error) throw error;

      // Update cooldown
      setSyncCooldowns({
        ...syncCooldowns,
        [sourceId]: Date.now(),
      });

      const newReviews = data?.newReviews || 0;
      const totalFetched = data?.totalFetched || 0;

      if (newReviews === 0) {
        toast.info(`No new reviews found. Total reviews checked: ${totalFetched}`);
      } else {
        toast.success(`Successfully synced ${newReviews} new review(s)!`);
      }
    } catch (error: any) {
      console.error("Sync error:", error);

      if (error.message?.includes("429") || error.message?.includes("Rate limit")) {
        toast.error("Google rate limit reached. Please try again in 24 hours.");
      } else {
        toast.error(error.message || "Failed to sync reviews");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">Manage Sources</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enable or disable review platforms for your businesses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Select Business</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>

        {/* Available Sources */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Available Sources</h3>
          {enabledSources.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No sources configured. Add a business first.</p>
          ) : (
            <div className="space-y-3">
              {enabledSources.map((enabledSource) => {
                const isSyncing = syncing;
                const canSyncNow = canSync(enabledSource.source_id);
                const remainingSeconds = getRemainingCooldown(enabledSource.source_id);

                return (
                  <div
                    key={enabledSource.source_id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{enabledSource.sources.display_name}</span>
                        {enabledSource.connected && enabledSource.account_name && (
                          <span className="text-sm text-muted-foreground">
                            Connected as: {enabledSource.account_name}
                          </span>
                        )}
                      </div>
                      <Badge
                        variant={enabledSource.connected ? "default" : "secondary"}
                        className={enabledSource.connected ? "bg-green-500/20 text-green-600 border-green-500/30" : ""}
                      >
                        {enabledSource.connected ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {enabledSource.connected ? (
                        <>
                          <Button
                            onClick={() => handleSyncReviews(enabledSource.source_id)}
                            disabled={isSyncing || !canSyncNow}
                            variant="default"
                            size="sm"
                            className="relative"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                            {!canSyncNow && !isSyncing ? (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatCooldownTime(remainingSeconds)}
                              </span>
                            ) : (
                              "Sync Reviews"
                            )}
                          </Button>
                          <Button onClick={() => handleDisconnect(enabledSource.source_id)} variant="ghost" size="sm">
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleInitiateOAuth(enabledSource.sources.name)}
                          variant="default"
                          size="sm"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SourceManagement;
