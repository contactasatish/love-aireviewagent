import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Trash2, KeyRound, UserPlus } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  created_at: string;
}

const TeamManagement = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      // Get all user roles with 'member' role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'member');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setMembers([]);
        return;
      }

      // Get user details from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .in('id', roleData.map(r => r.user_id));

      if (profilesError) throw profilesError;

      setMembers(profilesData || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load team members");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-new-user', {
        body: { email: newUserEmail, password: newUserPassword },
      });

      if (error) throw error;

      toast.success("User created successfully");
      setNewUserEmail("");
      setNewUserPassword("");
      setIsAddDialogOpen(false);
      fetchMembers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('update-user-password', {
        body: { user_id: editUserId, password: editPassword },
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setEditPassword("");
      setEditUserId(null);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;

      toast.success("User deleted successfully");
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Team Management</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Manage team members and their access
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Team Member</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Enter the email and password for the new team member
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background border-input"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
                  {loading ? "Creating..." : "Create User"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members yet. Add your first member to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border bg-background/50"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{member.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isEditDialogOpen && editUserId === member.id} onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) {
                      setEditUserId(null);
                      setEditPassword("");
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditUserId(member.id)}
                        className="bg-background border-input"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Update Password</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Enter a new password for {member.email}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-password" className="text-foreground">New Password</Label>
                          <Input
                            id="edit-password"
                            type="password"
                            placeholder="Enter new password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            required
                            minLength={6}
                            className="bg-background border-input"
                          />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
                          {loading ? "Updating..." : "Update Password"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteUser(member.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamManagement;