import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import SourceManagement from "./SourceManagement";
import TeamManagement from "./TeamManagement";
import adminBanner from "@/assets/admin-banner.jpg";

const businessSchema = z.object({
  name: z.string().trim().min(1, { message: "Business name is required" }).max(100, { message: "Business name must be less than 100 characters" }),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, { message: "Template name is required" }).max(100, { message: "Template name must be less than 100 characters" }),
  body: z.string().trim().min(1, { message: "Template body is required" }).max(5000, { message: "Template body must be less than 5000 characters" }),
});

const AdminView = () => {
  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
    },
  });

  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      body: "",
    },
  });

  const handleAddBusiness = async (values: z.infer<typeof businessSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("businesses")
        .insert({ name: values.name, user_id: user.id });

      if (error) throw error;
      
      toast.success("Business added successfully");
      businessForm.reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddTemplate = async (values: z.infer<typeof templateSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("response_templates")
        .insert({ name: values.name, body: values.body, user_id: user.id });

      if (error) throw error;
      
      toast.success("Template added successfully");
      templateForm.reset();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="w-full h-32 rounded-lg overflow-hidden mb-8">
        <img 
          src={adminBanner} 
          alt="Admin panel settings and configuration" 
          className="w-full h-full object-cover"
        />
      </div>
      <TeamManagement />
      
      <SourceManagement />
      
      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Manage Businesses</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Add a business name to begin tracking and sourcing its reviews from various platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...businessForm}>
            <form onSubmit={businessForm.handleSubmit(handleAddBusiness)} className="flex gap-3">
              <FormField
                control={businessForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        placeholder="Enter business name"
                        className="bg-background border-input h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={businessForm.formState.isSubmitting}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
              >
                Add Business
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">Manage Response Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleAddTemplate)} className="space-y-5">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Template Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Positive Feedback"
                        className="bg-background border-input h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Template Body</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Template body..."
                        className="min-h-[180px] bg-background border-input resize-none"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground pt-1">
                      Available placeholders: {"{customerName}"}, {"{businessName}"}, {"{intent}"}, {"{reviewText}"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={templateForm.formState.isSubmitting}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8"
              >
                Add Template
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminView;