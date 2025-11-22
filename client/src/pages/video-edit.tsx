import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VideoPreview from "@/components/VideoPreview";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Play, Upload, RefreshCw, Loader2, X } from "lucide-react";
import type { Video } from "@shared/schema";

export default function VideoEdit() {
  const [, params] = useRoute("/videos/:id/edit");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editedScript, setEditedScript] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [scriptSegments, setScriptSegments] = useState<any[]>([]);
  const [regenerateDialog, setRegenerateDialog] = useState<{ 
    open: boolean; 
    imageIndex: number | null;
    selectedProvider: string;
    selectedModel: string;
  }>({
    open: false,
    imageIndex: null,
    selectedProvider: 'runware',
    selectedModel: 'runware:100@1'
  });

  // Fetch video data
  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/videos", params?.id],
    enabled: !!params?.id,
  });

  // Initialize edited script when video loads
  useEffect(() => {
    if (video?.script) {
      setEditedScript(video.script);
    }
    if (video?.assets && typeof video.assets === 'object') {
      const assets = video.assets as any;
      if ('images' in assets) {
        setImageUrls(assets.images || []);
      }
      if ('scriptSegments' in assets) {
        setScriptSegments(assets.scriptSegments || []);
      }
    }
  }, [video]);

  // Regenerate single image mutation
  const regenerateSingleImageMutation = useMutation({
    mutationFn: async ({ imageIndex, provider, model }: { imageIndex: number; provider: string; model: string }) => {
      const response = await apiRequest("POST", `/api/videos/${params?.id}/regenerate-image/${imageIndex}`, {
        imageProvider: provider,
        runwareModel: model
      });
      return response.json();
    },
    onSuccess: () => {
      setRegenerateDialog({ open: false, imageIndex: null, selectedProvider: 'runware', selectedModel: 'runware:100@1' });
      toast({
        title: "Success",
        description: "Image regenerated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos", params?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate image.",
        variant: "destructive",
      });
    },
  });

  // Regenerate all images mutation
  const regenerateImagesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/videos/${params?.id}/regenerate-images`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Images regenerated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos", params?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate images",
        variant: "destructive",
      });
    },
  });

  // Upload custom images
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newImages = Array.from(files).slice(0, 5 - uploadedImages.length);
    setUploadedImages([...uploadedImages, ...newImages]);
    
    // Create preview URLs
    newImages.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  // Update script mutation
  const updateScriptMutation = useMutation({
    mutationFn: async (newScript: string) => {
      return await apiRequest("PUT", `/api/videos/${params?.id}/script`, {
        script: newScript,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Script updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos", params?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update script",
        variant: "destructive",
      });
    },
  });

  // Compile video mutation
  const compileVideoMutation = useMutation({
    mutationFn: async () => {
      // First update script if changed
      if (editedScript !== video?.script) {
        await updateScriptMutation.mutateAsync(editedScript);
      }
      
      // Then start compilation
      return await apiRequest("POST", `/api/videos/${params?.id}/compile`, {
        customImages: uploadedImages.length > 0 ? uploadedImages : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Compilation Started",
        description: "Your video is being compiled. You can track progress in My Videos.",
      });
      // Invalidate and refetch videos to immediately show status change
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      navigate("/my-videos");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to compile video",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading video editor...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Video Not Found</h2>
          <p className="text-muted-foreground mb-4">The video you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/my-videos")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/my-videos")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Videos
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900" data-testid="text-video-title">
                Edit Video: {video.topic}
              </h1>
              <div className="text-slate-600 mt-1 flex items-center space-x-2">
                <span>Duration: {video.duration}s • Language: {video.language}</span>
                <Badge variant="secondary">{video.status}</Badge>
              </div>
            </div>
            
            <Button 
              onClick={() => compileVideoMutation.mutate()}
              disabled={compileVideoMutation.isPending}
              size="lg"
              data-testid="button-compile"
            >
              {compileVideoMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Compile Video
            </Button>
          </div>
        </div>

        {/* Video Preview */}
        <div className="mb-6">
          <VideoPreview
            script={scriptSegments}
            images={imageUrls}
            audioUrl={`/api/videos/${video.id}/audio`}
            topic={video.topic}
            textColor={video.textColor || 'yellow'}
            textFont={video.textFont || 'dejavu-sans-bold'}
            duration={video.duration}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Script Editor */}
          <Card data-testid="card-script-editor">
            <CardHeader>
              <CardTitle>Script Editor</CardTitle>
              <CardDescription>
                Edit your video script. Changes will be reflected in the final video.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                placeholder="Edit your video script here..."
                rows={15}
                className="font-mono text-sm"
                data-testid="textarea-script"
              />
              
              <Button 
                onClick={() => updateScriptMutation.mutate(editedScript)}
                disabled={updateScriptMutation.isPending || editedScript === video.script}
                variant="outline"
                data-testid="button-save-script"
              >
                {updateScriptMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Script Changes
              </Button>
            </CardContent>
          </Card>

          {/* Image Editor */}
          <Card data-testid="card-image-editor">
            <CardHeader>
              <CardTitle>Image Editor</CardTitle>
              <CardDescription>
                Review generated images, regenerate them, or upload custom ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Individual Image Controls */}
              <div className="space-y-4">
                {imageUrls.map((url, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img 
                          src={url} 
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg border"
                          data-testid={`img-generated-${index}`}
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <h5 className="font-medium">Image {index + 1}</h5>
                          <p className="text-sm text-muted-foreground">
                            {scriptSegments[index]?.text || `Segment ${index + 1}`}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setRegenerateDialog({ 
                              open: true, 
                              imageIndex: index,
                              selectedProvider: video?.imageProvider || 'runware',
                              selectedModel: video?.runwareModel || 'runware:100@1'
                            })}
                            data-testid={`button-regenerate-${index}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Regenerate
                          </Button>
                          <div className="relative">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => document.getElementById(`upload-${index}`)?.click()}
                              data-testid={`button-upload-${index}`}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Replace
                            </Button>
                            <input
                              id={`upload-${index}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  // TODO: Implement single image replacement
                                  toast({
                                    title: "Feature Coming Soon",
                                    description: "Individual image replacement will be available soon.",
                                  });
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Bulk Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Bulk Actions</h4>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => regenerateImagesMutation.mutate()}
                    disabled={regenerateImagesMutation.isPending}
                    variant="outline"
                    size="sm"
                    data-testid="button-regenerate-all"
                  >
                    {regenerateImagesMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Regenerate All
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('bulk-upload')?.click()}
                    data-testid="button-upload-all"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload Multiple
                  </Button>
                  <input
                    id="bulk-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Use bulk actions to regenerate all images or upload multiple replacements at once.
                </p>
              </div>

              {uploadedImages.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Uploaded Images ({uploadedImages.length})</h4>
                  <div className="text-sm text-muted-foreground">
                    {uploadedImages.map((file, index) => (
                      <div key={index}>{file.name}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Video Info */}
        <Card className="mt-6" data-testid="card-video-info">
          <CardHeader>
            <CardTitle>Video Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Topic:</strong> {video.topic}
              </div>
              <div>
                <strong>Duration:</strong> {video.duration}s
              </div>
              <div>
                <strong>Language:</strong> {video.language}
              </div>
              <div>
                <strong>Voice:</strong> {video.voiceStyle}
              </div>
              <div>
                <strong>Image Provider:</strong> {video.imageProvider}
              </div>
              <div>
                <strong>Image Style:</strong> {video.imageStyle}
              </div>
              <div>
                <strong>Subtitles:</strong> {video.subtitles ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Credits Used:</strong> {video.creditsUsed || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regenerate Image Dialog */}
        <Dialog open={regenerateDialog.open} onOpenChange={(open) => setRegenerateDialog({ open, imageIndex: null, selectedProvider: 'runware', selectedModel: 'runware:100@1' })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Regenerate Image {(regenerateDialog.imageIndex ?? 0) + 1}</DialogTitle>
              <DialogDescription>
                Generate a new image for this segment using AI. This will replace the current image.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Image Preview */}
              {regenerateDialog.imageIndex !== null && imageUrls[regenerateDialog.imageIndex] && (
                <div>
                  <Label className="text-sm font-medium">Current Image</Label>
                  <div className="mt-2">
                    <img 
                      src={imageUrls[regenerateDialog.imageIndex]} 
                      alt={`Current image ${regenerateDialog.imageIndex + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>
                </div>
              )}

              {/* Script Segment */}
              {regenerateDialog.imageIndex !== null && scriptSegments[regenerateDialog.imageIndex] && (
                <div>
                  <Label className="text-sm font-medium">Script Segment</Label>
                  <p className="text-sm text-muted-foreground mt-1 p-2 bg-slate-50 rounded border">
                    "{scriptSegments[regenerateDialog.imageIndex].text}"
                  </p>
                </div>
              )}

              {/* Image Provider Selection */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Image Provider</Label>
                  <Select 
                    value={regenerateDialog.selectedProvider} 
                    onValueChange={(value) => setRegenerateDialog(prev => ({
                      ...prev,
                      selectedProvider: value,
                      selectedModel: value === 'runware' ? 'runware:100@1' : 'dalle3'
                    }))}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder="Select image provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runware">Runware (Cost Efficient)</SelectItem>
                      <SelectItem value="dalle">DALL-E 3 (Premium Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selection for Runware */}
                {regenerateDialog.selectedProvider === 'runware' && (
                  <div>
                    <Label className="text-sm font-medium">Runware Model</Label>
                    <Select 
                      value={regenerateDialog.selectedModel} 
                      onValueChange={(value) => setRegenerateDialog(prev => ({
                        ...prev,
                        selectedModel: value
                      }))}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="runware:100@1">Realistic Vision (Best Cost)</SelectItem>
                        <SelectItem value="runware:101@1">FLUX.1 [dev]</SelectItem>
                        <SelectItem value="runware:4@1">Stable Diffusion XL</SelectItem>
                        <SelectItem value="civitai:6755@10415">DreamShaper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Cost Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Estimated Cost</span>
                  <span className="text-sm font-bold text-blue-900">
                    {regenerateDialog.selectedProvider === 'runware' ? '1 credit' : '5 credits'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setRegenerateDialog({ open: false, imageIndex: null, selectedProvider: 'runware', selectedModel: 'runware:100@1' })}
                  disabled={regenerateSingleImageMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (regenerateDialog.imageIndex !== null) {
                      regenerateSingleImageMutation.mutate({
                        imageIndex: regenerateDialog.imageIndex,
                        provider: regenerateDialog.selectedProvider,
                        model: regenerateDialog.selectedModel
                      });
                    }
                  }}
                  disabled={regenerateSingleImageMutation.isPending}
                >
                  {regenerateSingleImageMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}