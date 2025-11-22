import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Image as ImageIcon, 
  Wand2, 
  Scissors, 
  ZoomIn, 
  Save,
  Upload,
  Download,
  Trash2,
  Eye,
  Loader2
} from "lucide-react";
import { IMAGE_MODELS } from "@shared/imageModels";

import { SavedImage } from "@shared/schema";

export default function ImageStudio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"generate" | "remove-bg" | "upscale" | "saved">("generate");
  
  // Image Generation State
  const [generateForm, setGenerateForm] = useState({
    prompt: "",
    model: "runware:100@1", // Will be updated with proper models later
    style: "realistic",
  });

  // Background Removal State
  const [removeBgFile, setRemoveBgFile] = useState<File | null>(null);

  // Upscale State
  const [upscaleFile, setUpscaleFile] = useState<File | null>(null);
  const [upscaleFactor, setUpscaleFactor] = useState("2x");

  // Query for saved images
  const { data: savedImages = [], isLoading: imagesLoading } = useQuery<SavedImage[]>({
    queryKey: ["/api/images/saved"],
  });

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: async (data: typeof generateForm) => {
      const response = await apiRequest("POST", "/api/images/generate", data);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Image Generated",
        description: "Your image has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images/saved"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image.",
        variant: "destructive",
      });
    },
  });

  // Remove background mutation
  const removeBgMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const response = await apiRequest("POST", "/api/images/remove-background", formData);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Background Removed",
        description: "Background has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images/saved"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Background Removal Failed",
        description: error.message || "Failed to remove background.",
        variant: "destructive",
      });
    },
  });

  // Upscale mutation
  const upscaleMutation = useMutation({
    mutationFn: async (data: { file: File; factor: string }) => {
      const formData = new FormData();
      formData.append("image", data.file);
      formData.append("factor", data.factor);
      const response = await apiRequest("POST", "/api/images/upscale", formData);
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Image Upscaled",
        description: "Image has been upscaled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images/saved"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upscaling Failed",
        description: error.message || "Failed to upscale image.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.prompt.trim()) {
      toast({
        title: "Missing Prompt",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive",
      });
      return;
    }
    generateImageMutation.mutate(generateForm);
  };

  const handleRemoveBgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeBgFile) {
      toast({
        title: "No File Selected",
        description: "Please select an image file to remove the background.",
        variant: "destructive",
      });
      return;
    }
    removeBgMutation.mutate(removeBgFile);
  };

  const handleUpscaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upscaleFile) {
      toast({
        title: "No File Selected",
        description: "Please select an image file to upscale.",
        variant: "destructive",
      });
      return;
    }
    upscaleMutation.mutate({ file: upscaleFile, factor: upscaleFactor });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "generate":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wand2 className="h-5 w-5" />
                <span>Generate Images</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="imagePrompt">Image Description</Label>
                  <Textarea
                    id="imagePrompt"
                    data-testid="input-image-prompt"
                    rows={4}
                    className="resize-none"
                    placeholder="Describe the image you want to generate... e.g., A beautiful sunset over mountains, photorealistic style"
                    value={generateForm.prompt}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, prompt: e.target.value }))}
                    maxLength={500}
                  />
                  <div className="text-xs text-slate-400 text-right">
                    {generateForm.prompt.length}/500
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="imageModel">AI Model</Label>
                    <Select 
                      value={generateForm.model} 
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, model: value }))}
                    >
                      <SelectTrigger id="imageModel" data-testid="select-image-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(IMAGE_MODELS).map(([key, model]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-left">{model.name}</span>
                              <span className="text-xs text-muted-foreground text-left">
                                {model.description} • {model.speed} • {model.cost}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageStyle">Style</Label>
                    <Select 
                      value={generateForm.style} 
                      onValueChange={(value) => setGenerateForm(prev => ({ ...prev, style: value }))}
                    >
                      <SelectTrigger id="imageStyle" data-testid="select-image-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Photorealistic</SelectItem>
                        <SelectItem value="artistic">Artistic</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="abstract">Abstract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={generateImageMutation.isPending}
                  className="w-full"
                  data-testid="button-generate-image"
                >
                  {generateImageMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Image
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "remove-bg":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Scissors className="h-5 w-5" />
                <span>Remove Background</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRemoveBgSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bgRemoveFile">Select Image</Label>
                  <Input
                    id="bgRemoveFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRemoveBgFile(e.target.files?.[0] || null)}
                    data-testid="input-bg-remove-file"
                  />
                  <p className="text-sm text-slate-500">
                    Upload an image to automatically remove its background
                  </p>
                </div>

                {removeBgFile && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium">Selected file:</p>
                    <p className="text-sm text-slate-600">{removeBgFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(removeBgFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={removeBgMutation.isPending || !removeBgFile}
                  className="w-full"
                  data-testid="button-remove-background"
                >
                  {removeBgMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing Background...
                    </>
                  ) : (
                    <>
                      <Scissors className="mr-2 h-4 w-4" />
                      Remove Background
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "upscale":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ZoomIn className="h-5 w-5" />
                <span>Upscale Images</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpscaleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="upscaleFile">Select Image</Label>
                  <Input
                    id="upscaleFile"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUpscaleFile(e.target.files?.[0] || null)}
                    data-testid="input-upscale-file"
                  />
                  <p className="text-sm text-slate-500">
                    Upload an image to enhance its resolution and quality
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upscaleFactor">Upscale Factor</Label>
                  <Select 
                    value={upscaleFactor} 
                    onValueChange={setUpscaleFactor}
                  >
                    <SelectTrigger id="upscaleFactor" data-testid="select-upscale-factor">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x">2x (Double Resolution)</SelectItem>
                      <SelectItem value="4x">4x (Quadruple Resolution)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {upscaleFile && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium">Selected file:</p>
                    <p className="text-sm text-slate-600">{upscaleFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(upscaleFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={upscaleMutation.isPending || !upscaleFile}
                  className="w-full"
                  data-testid="button-upscale-image"
                >
                  {upscaleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upscaling...
                    </>
                  ) : (
                    <>
                      <ZoomIn className="mr-2 h-4 w-4" />
                      Upscale Image
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "saved":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Save className="h-5 w-5" />
                  <span>Saved Images</span>
                </div>
                <Badge variant="secondary">
                  {savedImages.length}/50 images
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {imagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading images...</span>
                </div>
              ) : savedImages.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No saved images</h3>
                  <p className="text-slate-600">
                    Generate, edit, or upload images to see them here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {savedImages.map((image) => (
                    <div key={image.id} className="group relative bg-slate-50 rounded-lg overflow-hidden">
                      <img
                        src={image.originalUrl}
                        alt={image.filename}
                        className="w-full h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="secondary" data-testid={`button-view-${image.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" data-testid={`button-download-${image.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" data-testid={`button-delete-${image.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{image.filename}</p>
                        <p className="text-xs text-slate-500">
                          {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" data-testid="text-image-studio-title">
          Image Studio
        </h1>
        <p className="text-slate-600 mt-2">
          Generate, edit, and manage your images with AI-powered tools
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "generate", label: "Generate", icon: Wand2 },
              { id: "remove-bg", label: "Remove Background", icon: Scissors },
              { id: "upscale", label: "Upscale", icon: ZoomIn },
              { id: "saved", label: "Saved Images", icon: Save },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
}