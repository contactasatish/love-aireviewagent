import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

interface HeaderProps {
  activeTab: "dashboard" | "admin";
  onTabChange: (tab: "dashboard" | "admin") => void;
}

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("header.signedOut"));
    navigate("/auth");
  };

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end items-center gap-2 mb-8">
          <ThemeToggle />
          <LanguageToggle />
          <Button variant="ghost" onClick={handleSignOut} className="text-foreground hover:text-foreground">
            {t("header.signOut")}
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            {t("header.title")}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto">
            {t("header.subtitle")}
          </p>
        </div>
        
        <div className="flex justify-center gap-3">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => onTabChange("dashboard")}
            size="lg"
            className="min-w-[140px]"
          >
            {t("header.dashboard")}
          </Button>
          <Button
            variant={activeTab === "admin" ? "default" : "outline"}
            onClick={() => onTabChange("admin")}
            size="lg"
            className="min-w-[140px]"
          >
            {t("header.admin")}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;