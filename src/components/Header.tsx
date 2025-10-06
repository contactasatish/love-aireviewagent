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
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t("header.title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              {t("header.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <ThemeToggle />
            <LanguageToggle />
            <Button variant="ghost" onClick={handleSignOut}>
              {t("header.signOut")}
            </Button>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => onTabChange("dashboard")}
          >
            {t("header.dashboard")}
          </Button>
          <Button
            variant={activeTab === "admin" ? "default" : "outline"}
            onClick={() => onTabChange("admin")}
          >
            {t("header.admin")}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;