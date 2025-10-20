import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import Header from "@/components/Header";
import DashboardView from "@/components/DashboardView";
import AdminView from "@/components/AdminView";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin">("dashboard");

  useEffect(() => {
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    
    if (oauthStatus === 'success') {
      toast.success('Source connected successfully');
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (oauthStatus === 'error') {
      toast.error('Failed to connect source');
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-8">
        {activeTab === "dashboard" ? <DashboardView /> : <AdminView />}
      </main>
    </div>
  );
};

export default Dashboard;