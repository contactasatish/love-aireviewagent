import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(1, { message: "Full name is required" }).max(100, { message: "Name must be less than 100 characters" }),
});

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof signInSchema> | z.infer<typeof signUpSchema>>({
    resolver: zodResolver(isLogin ? signInSchema : signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  const handleAuth = async (values: z.infer<typeof signInSchema> | z.infer<typeof signUpSchema>) => {
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        toast.success(t("auth.welcomeBack"));
        navigate("/dashboard");
      } else {
        const signUpValues = values as z.infer<typeof signUpSchema>;
        const { error } = await supabase.auth.signUp({
          email: signUpValues.email,
          password: signUpValues.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: signUpValues.fullName,
            },
          },
        });
        if (error) throw error;
        toast.success(t("auth.accountCreated"));
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <button 
            onClick={() => navigate("/")}
            className="mx-auto mb-4 hover:opacity-80 transition-opacity"
            aria-label="Back to home"
          >
            <img src={logo} alt="AI Review Assistant" className="w-20 h-20 mx-auto" />
          </button>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t("auth.title")}
          </CardTitle>
          <CardDescription>
            {isLogin ? t("auth.signIn") : t("auth.signUp")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAuth)} className="space-y-4">
              {!isLogin && (
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.fullName")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t("auth.loading") : isLogin ? t("auth.signInButton") : t("auth.signUpButton")}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
            </button>
          </div>
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;