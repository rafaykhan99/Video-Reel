import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Eye, 
  Download, 
  Palette, 
  Globe,
  Volume2,
  Monitor
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    videoCompletionEmails: true,
    marketingEmails: false,
    
    // Video Preferences
    defaultQuality: "1080p",
    autoDownload: false,
    subtitlesEnabled: true,
    
    // Interface Preferences
    theme: "light",
    language: "english",
    autoPlay: true,
    
    // Privacy Settings
    profilePublic: false,
    analyticsEnabled: true,
  });

  const handleSave = () => {
    // TODO: Implement settings save API call
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" data-testid="text-settings-title">Settings</h1>
        <p className="text-slate-600 mt-2">Customize your experience and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <div className="text-sm text-slate-600">
                  Receive important updates via email
                </div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(value) => updateSetting('emailNotifications', value)}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Video Completion Alerts</Label>
                <div className="text-sm text-slate-600">
                  Get notified when your videos finish generating
                </div>
              </div>
              <Switch
                checked={settings.videoCompletionEmails}
                onCheckedChange={(value) => updateSetting('videoCompletionEmails', value)}
                data-testid="switch-video-completion"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Marketing Communications</Label>
                <div className="text-sm text-slate-600">
                  Receive updates about new features and promotions
                </div>
              </div>
              <Switch
                checked={settings.marketingEmails}
                onCheckedChange={(value) => updateSetting('marketingEmails', value)}
                data-testid="switch-marketing"
              />
            </div>
          </CardContent>
        </Card>

        {/* Video Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5" />
              <span>Video Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="defaultQuality">Default Video Quality</Label>
                <Select 
                  value={settings.defaultQuality} 
                  onValueChange={(value) => updateSetting('defaultQuality', value)}
                >
                  <SelectTrigger id="defaultQuality" data-testid="select-quality">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                    <SelectItem value="1440p">1440p 2K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Interface Language</Label>
                <Select 
                  value={settings.language} 
                  onValueChange={(value) => updateSetting('language', value)}
                >
                  <SelectTrigger id="language" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Español</SelectItem>
                    <SelectItem value="french">Français</SelectItem>
                    <SelectItem value="german">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-download Completed Videos</Label>
                <div className="text-sm text-slate-600">
                  Automatically download videos when generation completes
                </div>
              </div>
              <Switch
                checked={settings.autoDownload}
                onCheckedChange={(value) => updateSetting('autoDownload', value)}
                data-testid="switch-auto-download"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Subtitles by Default</Label>
                <div className="text-sm text-slate-600">
                  Show subtitles on video previews automatically
                </div>
              </div>
              <Switch
                checked={settings.subtitlesEnabled}
                onCheckedChange={(value) => updateSetting('subtitlesEnabled', value)}
                data-testid="switch-subtitles"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-play Videos</Label>
                <div className="text-sm text-slate-600">
                  Start playing videos automatically in preview
                </div>
              </div>
              <Switch
                checked={settings.autoPlay}
                onCheckedChange={(value) => updateSetting('autoPlay', value)}
                data-testid="switch-autoplay"
              />
            </div>
          </CardContent>
        </Card>

        {/* Interface Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Interface</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value) => updateSetting('theme', value)}
              >
                <SelectTrigger id="theme" data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Mode</SelectItem>
                  <SelectItem value="dark">Dark Mode</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-slate-600">
                Choose your preferred color theme for the interface
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Privacy & Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Public Profile</Label>
                <div className="text-sm text-slate-600">
                  Make your profile visible to other users
                </div>
              </div>
              <Switch
                checked={settings.profilePublic}
                onCheckedChange={(value) => updateSetting('profilePublic', value)}
                data-testid="switch-public-profile"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Usage Analytics</Label>
                <div className="text-sm text-slate-600">
                  Help improve the service by sharing anonymous usage data
                </div>
              </div>
              <Switch
                checked={settings.analyticsEnabled}
                onCheckedChange={(value) => updateSetting('analyticsEnabled', value)}
                data-testid="switch-analytics"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Settings */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" data-testid="button-save-settings">
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
}