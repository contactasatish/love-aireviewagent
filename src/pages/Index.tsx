import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, BarChart3, Link2 } from "lucide-react";
import FeatureSection from "@/components/FeatureSection";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            AI Review Assistant
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Analyze, Generate, and Approve Responses with Human-in-the-Loop AI
          </p>
          <div className="flex gap-4 justify-center mt-10">
            <Button size="lg" className="text-lg px-8 h-12" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 h-12" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
          Everything You Need to Manage Reviews
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <FeatureSection
            icon={MessageSquare}
            title="Analyze and Summarize Customer Reviews"
            description="Automatically analyze customer sentiment and extract key insights from reviews across all platforms in seconds."
          />
          <FeatureSection
            icon={Sparkles}
            title="Generate AI-Powered Review Responses"
            description="Create personalized, professional responses to customer reviews with AI assistance, maintaining your brand voice."
          />
          <FeatureSection
            icon={BarChart3}
            title="View Your Sentiment Analysis Dashboard"
            description="Get comprehensive insights into customer sentiment trends, ratings distribution, and key performance metrics."
          />
          <FeatureSection
            icon={Link2}
            title="Connect Your Review Collection Platforms"
            description="Seamlessly integrate with Google Business, Facebook, Yelp, TripAdvisor, and more to centralize all your reviews."
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
