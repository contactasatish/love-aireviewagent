import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Trash2, Edit, UserPlus } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72, { message: "Password must be less than 72 characters" }),
});

const updatePasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72, { message: "Password must be less than 72 characters" }),
});

interface TeamMember {
  id: string;
  email: string;
  created_at: string;
}

const TeamManagement = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const addUserForm = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const updatePasswordForm = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      // Fetch all users with 'member' role
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'member');

      if (error) throw error;

      // Get user details from profiles
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .in('id', userIds);

      if (profileError) throw profileError;

      setMembers(profiles || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load team members');
    }
  };

  const handleAddUser = async (values: z.infer<typeof addUserSchema>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-new-user', {
        body: { email: values.email, password: values.password }
      });

      if (error) throw error;

      toast.success("User created successfully");
      addUserForm.reset();
      setIsAddDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    }
  };

  const handleUpdatePassword = async (values: z.infer<typeof updatePasswordSchema>) => {
    if (!selectedMember) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: { user_id: selectedMember.id, password: values.password }
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      updatePasswordForm.reset();
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });

      if (error) throw error;

      toast.success("User deleted successfully");
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Team Management</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Manage user accounts and permissions
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="mr-2 h-5 w-5" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new team member account with email and password.
                </DialogDescription>
              </DialogHeader>
              <Form {...addUserForm}>
                <form onSubmit={addUserForm.handleSubmit(handleAddUser)}>
                  <div className="space-y-4 py-4">
                    <FormField
                      control={addUserForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              className="bg-background border-input h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addUserForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter password"
                              className="bg-background border-input h-11"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={addUserForm.formState.isSubmitting}>
                      {addUserForm.formState.isSubmitting ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No team members yet</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50"
              >
                <div>
                  <p className="font-medium text-foreground">{member.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(member.id, member.email)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Password</DialogTitle>
              <DialogDescription>
                Change the password for {selectedMember?.email}
              </DialogDescription>
            </DialogHeader>
            <Form {...updatePasswordForm}>
              <form onSubmit={updatePasswordForm.handleSubmit(handleUpdatePassword)}>
                <div className="space-y-4 py-4">
                  <FormField
                    control={updatePasswordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            className="bg-background border-input h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updatePasswordForm.formState.isSubmitting}>
                    {updatePasswordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TeamManagement;
