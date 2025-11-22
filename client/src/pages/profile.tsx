import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, Shield, CreditCard, Calendar } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Not authenticated</h2>
          <p className="text-slate-600">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const userInitials = (user as any).firstName 
    ? `${(user as any).firstName[0]}${(user as any).lastName?.[0] || ''}`.toUpperCase()
    : (user as any).email?.[0]?.toUpperCase() || 'U';

  const displayName = (user as any).firstName 
    ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim()
    : (user as any).email;

  const handleSave = () => {
    // TODO: Implement profile update API call
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved.",
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" data-testid="text-profile-title">Profile</h1>
        <p className="text-slate-600 mt-2">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage 
                    src={(user as any).profileImageUrl} 
                    alt="Profile picture"
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium" data-testid="text-display-name">{displayName}</h3>
                  <p className="text-slate-600" data-testid="text-email">{(user as any).email}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!isEditing}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled={true}
                  data-testid="input-email"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} data-testid="button-save">
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} data-testid="button-edit">
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Account Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-slate-600">Manage your account password</p>
                </div>
                <Button variant="outline" data-testid="button-change-password">
                  Change Password
                </Button>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-slate-600">Add an extra layer of security</p>
                </div>
                <Badge variant="secondary">Not Enabled</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Account Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary" data-testid="text-credits-balance">
                  {(user as any).credits || 0}
                </div>
                <p className="text-sm text-slate-600">Available Credits</p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Account Type</span>
                  <Badge>Free Plan</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Member Since</span>
                  <span className="text-slate-600">
                    {(user as any).createdAt 
                      ? new Date((user as any).createdAt).toLocaleDateString()
                      : 'Unknown'
                    }
                  </span>
                </div>
              </div>
              
              <Button className="w-full" data-testid="button-buy-credits">
                Buy More Credits
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Quick Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Videos Created</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Watch Time</span>
                <span className="font-medium">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Credits Used</span>
                <span className="font-medium">-</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}