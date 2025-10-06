import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Manage Businesses</CardTitle>
          <CardDescription>
            Add a business name to begin tracking and sourcing its reviews from various platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBusiness} className="flex gap-2">
            <Input
              placeholder="Enter business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              Add Business
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Response Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="e.g., Positive Feedback"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateBody">Template Body</Label>
              <Textarea
                id="templateBody"
                placeholder="Template body..."
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                required
                className="min-h-[150px]"
              />
              <p className="text-sm text-muted-foreground">
                Available placeholders: {"{customerName}"}, {"{businessName}"}, {"{intent}"}, {"{reviewText}"}
              </p>
            </div>
            <Button type="submit" disabled={loading}>
              Add Template
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminView;