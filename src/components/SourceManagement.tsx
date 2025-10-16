import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import SourceConnectionButton from "./SourceConnectionButton";

interface Source {
  id: string;
  name: string;
  display_name: string;
  icon: string;
}

interface EnabledSource {
  source_id: string;
}

const SourceManagement = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [enabledSources, setEnabledSources] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness) {
      fetchEnabledSources(selectedBusiness);
    }
  }, [selectedBusiness]);

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .order("display_name");
    
    if (error) {
      toast.error("Failed to fetch sources");
      return;
    }
    setSources(data || []);
  };

  const fetchBusinesses = async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name")
      .order("name");
    
    if (error) {
      toast.error("Failed to fetch businesses");
      return;
    }
    setBusinesses(data || []);
    if (data && data.length > 0) {
      setSelectedBusiness(data[0].id);
    }
    setLoading(false);
  };

  const fetchEnabledSources = async (businessId: string) => {
    const { data, error } = await supabase
      .from("enabled_sources")
      .select("source_id")
      .eq("business_id", businessId);
    
    if (error) {
      toast.error("Failed to fetch enabled sources");
      return;
    }
    
    const enabled = new Set((data || []).map((es: EnabledSource) => es.source_id));
    setEnabledSources(enabled);
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    if (!selectedBusiness) {
      toast.error("Please select a business first");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    if (enabled) {
      // Enable the source
      const { error } = await supabase
        .from("enabled_sources")
        .insert({
          business_id: selectedBusiness,
          source_id: sourceId,
          user_id: user.id,
        });
      
      if (error) {
        toast.error("Failed to enable source");
        return;
      }
      
      setEnabledSources(prev => new Set([...prev, sourceId]));
      toast.success("Source enabled successfully");
    } else {
      // Disable the source
      const { error } = await supabase
        .from("enabled_sources")
        .delete()
        .eq("business_id", selectedBusiness)
        .eq("source_id", sourceId);
      
      if (error) {
        toast.error("Failed to disable source");
        return;
      }
      
      setEnabledSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
      toast.success("Source disabled successfully");
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')];
    return Icon || LucideIcons.Star;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">
          Manage Review Sources
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enable or disable review platforms for your businesses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Selector */}
        {businesses.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="business-select" className="text-sm font-semibold text-foreground">
              Select Business
            </Label>
            <select
              id="business-select"
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full h-11 px-4 rounded-lg bg-background border border-input text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sources List */}
        {selectedBusiness && (
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-foreground">Available Sources</Label>
            <div className="space-y-3">
              {sources.map((source) => {
                const Icon = getIcon(source.icon);
                const isEnabled = enabledSources.has(source.id);
                return (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{source.display_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <SourceConnectionButton
                        sourceId={source.id}
                        sourceName={source.display_name}
                        businessId={selectedBusiness}
                        isEnabled={isEnabled}
                      />
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleSource(source.id, checked)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {businesses.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Please add a business first to manage review sources
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SourceManagement;
