import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HeaderProps {
  activeTab: "dashboard" | "admin";
  onTabChange: (tab: "dashboard" | "admin") => void;
}

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              AI Review Assistant
            </h1>
            <p className="text-muted-foreground mt-2">
              Analyze, Generate, and Approve Responses with Human-in-the-Loop AI
            </p>
          </div>
          <Button variant="ghost" onClick={handleSignOut} className="ml-4">
            Sign Out
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => onTabChange("dashboard")}
          >
            Dashboard
          </Button>
          <Button
            variant={activeTab === "admin" ? "default" : "outline"}
            onClick={() => onTabChange("admin")}
          >
            Admin
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;