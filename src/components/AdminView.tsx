import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import SourceManagement from "./SourceManagement";

const AdminView = () => {
  const [businessName, setBusinessName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("businesses")
        .insert({ name: businessName, user_id: user.id });

      if (error) throw error;
      
      toast.success("Business added successfully");
      setBusinessName("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("response_templates")
        .insert({ name: templateName, body: templateBody, user_id: user.id });

      if (error) throw error;
      
      toast.success("Template added successfully");
      setTemplateName("");
      setTemplateBody("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <SourceManagement />
      
      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Manage Businesses</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Add a business name to begin tracking and sourcing its reviews from various platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBusiness} className="flex gap-3">
            <Input
              placeholder="Enter business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="flex-1 bg-background border-input h-11"
            />
            <Button 
              type="submit" 
              disabled={loading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
            >
              Add Business
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Manage Response Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTemplate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="templateName" className="text-sm font-semibold text-foreground">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Positive Feedback"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
                className="bg-background border-input h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateBody" className="text-sm font-semibold text-foreground">Template Body</Label>
              <Textarea
                id="templateBody"
                placeholder="Template body..."
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                required
                className="min-h-[180px] bg-background border-input resize-none"
              />
              <p className="text-xs text-muted-foreground pt-1">
                Available placeholders: {"{customerName}"}, {"{businessName}"}, {"{intent}"}, {"{reviewText}"}
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
            >
              Add Template
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminView;