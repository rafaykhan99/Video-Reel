import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Youtube,
  Instagram,
  Twitter,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Loader2
} from "lucide-react";
import { ConnectedAccount } from "@shared/schema";

export default function ConnectAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connectedAccounts, isLoading } = useQuery({
    queryKey: ["/api/connected-accounts"],
  });

  const connectYouTubeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/connect/youtube");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error) => {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate YouTube connection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await apiRequest("DELETE", `/api/connected-accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/connected-accounts"] });
      toast({
        title: "Account Disconnected",
        description: "Successfully disconnected the account.",
      });
    },
    onError: () => {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const platforms = [
    {
      id: "youtube",
      name: "YouTube",
      description: "Upload videos to YouTube Shorts",
      icon: Youtube,
      color: "text-red-600",
      bgColor: "bg-red-50",
      available: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      description: "Upload videos to Instagram Reels",
      icon: Instagram,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      available: false,
    },
    {
      id: "tiktok",
      name: "TikTok",
      description: "Upload videos to TikTok",
      icon: Twitter,
      color: "text-black",
      bgColor: "bg-gray-50",
      available: false,
    },
  ];

  const getConnectedAccount = (platformId: string): ConnectedAccount | undefined => {
    return (connectedAccounts as ConnectedAccount[])?.find(
      (account) => account.platform === platformId
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Connect Accounts
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Connect your social media accounts to upload videos directly from the app
        </p>
      </div>

      <Alert className="mb-6" data-testid="alert-info">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          After connecting your accounts, you can upload videos directly to platforms like YouTube Shorts
          from the video completion page. Your account credentials are stored securely and used only for uploading.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {platforms.map((platform) => {
          const connectedAccount = getConnectedAccount(platform.id);
          const isConnected = !!connectedAccount;

          return (
            <Card key={platform.id} className="relative" data-testid={`card-platform-${platform.id}`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${platform.bgColor}`}>
                      <platform.icon className={`h-6 w-6 ${platform.color}`} />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {platform.name}
                        {isConnected && (
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {!platform.available && (
                          <Badge variant="outline" className="text-gray-500">
                            Coming Soon
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{platform.description}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {platform.available && (
                      <>
                        {isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectMutation.mutate(connectedAccount.id)}
                            disabled={disconnectMutation.isPending}
                            data-testid={`button-disconnect-${platform.id}`}
                          >
                            {disconnectMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            onClick={() => connectYouTubeMutation.mutate()}
                            disabled={connectYouTubeMutation.isPending}
                            data-testid={`button-connect-${platform.id}`}
                          >
                            {connectYouTubeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Connect
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isConnected && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account:</span>
                      <span className="font-medium">{connectedAccount.platformUsername}</span>
                    </div>
                    {connectedAccount.channelName && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Channel:</span>
                        <span className="font-medium">{connectedAccount.channelName}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Connected:</span>
                      <span className="font-medium">
                        {new Date(connectedAccount.createdAt || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card data-testid="card-upload-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              How to Upload Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Generate your video</p>
                  <p className="text-sm text-muted-foreground">Create and compile your video using our AI tools</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Connect your accounts</p>
                  <p className="text-sm text-muted-foreground">Connect the social media accounts you want to upload to</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Upload directly</p>
                  <p className="text-sm text-muted-foreground">Use the "Upload to Platform" button on your completed videos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}