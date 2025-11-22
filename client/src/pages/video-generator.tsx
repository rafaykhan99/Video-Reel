import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, InsertVideo } from "@shared/schema";
import { 
  Play, 
  Download, 
  Share, 
  Edit, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Volume2,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Check,
  Loader2
} from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { SUPPORTED_LANGUAGES, getLanguageName, getLanguageNativeName } from "@shared/languages";
import { AVAILABLE_FONTS, FONT_CATEGORIES, TEXT_COLORS } from "@shared/fonts";
import { VIDEO_CATEGORIES } from "@shared/categories";

interface VideoGenerationStep {
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  progress?: number;
}

export default function VideoGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [generationSteps, setGenerationSteps] = useState<VideoGenerationStep[]>([
    { name: "Script Generation", status: "pending" },
    { name: "Image Generation", status: "pending", progress: 0 },
    { name: "Edit & Review", status: "pending" },
    { name: "Audio & Compilation", status: "pending" },
  ]);

  const [formData, setFormData] = useState<InsertVideo>({
    topic: "",
    category: "explainer",
    duration: 30,
    language: "english",
    voiceStyle: "professional",
    imageStyle: "modern",
    imageProvider: "runware",
    runwareModel: "runware:100@1",
    textFont: "dejavu-sans-bold",
    textColor: "yellow",
    subtitles: true,
  });

  // Query for credit cost calculation
  const { data: costData } = useQuery({
    queryKey: ["/api/videos/calculate-cost", formData.duration, formData.imageProvider],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/videos/calculate-cost", {
        duration: formData.duration,
        imageProvider: formData.imageProvider,
      });
      return response.json();
    },
    enabled: formData.duration > 0,
  });

  // Query for user's credit balance
  const { data: creditsData } = useQuery<{ balance: number; transactions: any[] }>({
    queryKey: ["/api/credits"],
  });

  // Query for recent videos
  const { data: recentVideos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  // Query for specific video details
  const { data: videoDetails, refetch: refetchVideo } = useQuery<Video>({
    queryKey: ["/api/videos", selectedVideo?.id],
    enabled: !!selectedVideo?.id,
    refetchInterval: (query) => {
      // Keep refetching for any active status to get real-time updates
      const status = query.state.data?.status;
      return (status === "generating" || status === "compiling") ? 2000 : false;
    },
  });

  // Create video mutation
  const createVideoMutation = useMutation({
    mutationFn: async (data: InsertVideo) => {
      const response = await apiRequest("POST", "/api/videos", data);
      return response.json();
    },
    onSuccess: (video: Video) => {
      setSelectedVideo(video);
      setCurrentStep(2);
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video Created",
        description: "Your video project has been created successfully.",
      });
      
      // Start generation
      generateVideoMutation.mutate(video.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create video project.",
        variant: "destructive",
      });
    },
  });

  // Generate video mutation
  const generateVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/generate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] }); // Refresh credits after deduction
      setGenerationSteps(prev => 
        prev.map(step => ({ ...step, status: step.name === "Script Generation" ? "in-progress" : "pending" }))
      );
      
      // Start polling for video status
      const pollInterval = setInterval(async () => {
        try {
          const updatedVideo = await refetchVideo();
          if (updatedVideo.data?.status === "editing") {
            // Script and images generated - ready for editing
            setGenerationSteps(prev => 
              prev.map((step, index) => ({
                ...step,
                status: index < 2 ? "completed" : "pending"
              }))
            );
            clearInterval(pollInterval);
            
            // Update selected video
            setSelectedVideo(updatedVideo.data);
            
            toast({
              title: "Ready for Editing!",
              description: "Script and images generated. Click 'Edit & Compile' in My Videos to review and finalize your video."
            });
          } else if (updatedVideo.data?.status === "compiling") {
            // Video is being compiled - update step 3 as in progress
            setCurrentStep(3);
            setGenerationSteps(prev => 
              prev.map((step, index) => ({
                ...step,
                status: index < 2 ? "completed" : index === 2 ? "in-progress" : "pending"
              }))
            );
          } else if (updatedVideo.data?.status === "completed") {
            setCurrentStep(3);
            setGenerationSteps(prev => 
              prev.map(step => ({ ...step, status: "completed" }))
            );
            clearInterval(pollInterval);
            
            // Force invalidate and refetch all video queries to get latest data including subtitles
            await queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
            await queryClient.refetchQueries({ queryKey: ["/api/videos", updatedVideo.data.id] });
            
            // Update selected video with the latest data
            setSelectedVideo(updatedVideo.data);
            
            toast({
              title: "Video Ready!",
              description: "Your video has been generated successfully and is ready to preview and download.",
            });
          } else if (updatedVideo.data?.status === "failed") {
            setGenerationSteps(prev => 
              prev.map(step => ({ ...step, status: "failed" }))
            );
            clearInterval(pollInterval);
            toast({
              title: "Generation Failed",
              description: "There was an error generating your video.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start video generation.",
        variant: "destructive",
      });
    },
  });

  const retryVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/retry`);
      return response.json();
    },
    onSuccess: (data: { video: Video }) => {
      setSelectedVideo(data.video);
      setCurrentStep(1);
      setGenerationSteps(prev => 
        prev.map(step => ({ ...step, status: "pending" }))
      );
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video Reset",
        description: "You can now try generating the video again.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset video for retry.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Submitting form data:", formData);
    
    if (!formData.topic.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic for your video.",
        variant: "destructive",
      });
      return;
    }

    createVideoMutation.mutate(formData);
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return "completed";
    if (step === currentStep) return "current";
    return "upcoming";
  };

  const renderStepIndicator = () => (
    <Card data-testid="step-indicator">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create New Video</CardTitle>
          <span className="text-sm text-slate-500">Step {currentStep} of 3</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          {[1, 2, 3].map((step, index) => {
            const status = getStepStatus(step);
            const labels = ["Setup", "Generate", "Preview & Download"];
            
            return (
              <div key={step} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  status === "completed" ? "bg-primary text-primary-foreground" :
                  status === "current" ? "bg-primary text-primary-foreground" :
                  "bg-slate-200 text-slate-400"
                }`} data-testid={`step-${step}`}>
                  {status === "completed" ? <Check className="h-4 w-4" /> : step}
                </div>
                <span className={`text-sm font-medium ${
                  status === "current" ? "text-primary" : "text-slate-400"
                }`}>
                  {labels[index]}
                </span>
                {index < 2 && <div className="flex-1 h-0.5 bg-slate-200 min-w-8" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderConfigurationForm = () => (
    <Card data-testid="configuration-form">
      <CardHeader>
        <CardTitle>Video Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="videoCategory">Video Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as any })}
            >
              <SelectTrigger id="videoCategory" data-testid="select-category">
                <SelectValue placeholder="Select video type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIDEO_CATEGORIES).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2 text-left w-full">
                      <span>{category.icon}</span>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-left">{category.name}</span>
                        <span className="text-xs text-muted-foreground text-left">{category.description}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.category === "news" && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs">ℹ</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>News Mode:</strong> AI will create educational background content about your topic. For current news, the video will direct viewers to trusted news sources. This helps viewers understand recent developments with proper context.
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-slate-500">
              Choose the type of video to optimize script generation and style
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoTopic">What's your video about?</Label>
            <div className="relative">
              <Textarea
                id="videoTopic"
                data-testid="input-topic"
                rows={4}
                className="resize-none"
                placeholder="e.g., How machine learning works, Benefits of renewable energy, Introduction to cryptocurrency..."
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                maxLength={500}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                <span data-testid="text-topic-length">{formData.topic.length}</span>/500
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Be specific about what you want to explain. The more detailed, the better the script will be.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoLanguage">Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData({ ...formData, language: value as any })}
            >
              <SelectTrigger id="videoLanguage" data-testid="select-language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{lang.name}</span>
                      <span className="text-sm text-muted-foreground">({lang.nativeName})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Video Duration</Label>
            <div className="space-y-3">
              {[
                { value: 30, label: "30 seconds", description: "Quick overview, 3-4 key points", words: "~75 words" },
                { value: 60, label: "1 minute", description: "Detailed explanation, 5-6 sections", words: "~150 words" },
                { value: 120, label: "2 minutes", description: "Comprehensive guide, 7-8 sections", words: "~300 words" },
                { value: 180, label: "3 minutes", description: "In-depth tutorial, 10+ sections", words: "~450 words" },
              ].map((option) => (
                <div 
                  key={option.value}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.duration === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-slate-300 hover:border-primary"
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, duration: option.value }))}
                  data-testid={`duration-${option.value}`}
                >
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      name="duration" 
                      value={option.value}
                      checked={formData.duration === option.value}
                      onChange={() => {}}
                      className="w-4 h-4 text-primary"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{option.label}</div>
                      <div className="text-sm text-slate-500">{option.description}</div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">{option.words}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm"
              data-testid="button-toggle-advanced"
            >
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Advanced Options</span>
            </Button>
            
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voiceStyle">Voice Style</Label>
                  <Select value={formData.voiceStyle} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, voiceStyle: value as any }))
                  }>
                    <SelectTrigger data-testid="select-voice-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="imageStyle">Image Style</Label>
                  <Select value={formData.imageStyle} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, imageStyle: value as any }))
                  }>
                    <SelectTrigger data-testid="select-image-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern & Clean</SelectItem>
                      <SelectItem value="illustrated">Illustrated</SelectItem>
                      <SelectItem value="photographic">Photographic</SelectItem>
                      <SelectItem value="minimalist">Minimalist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="textFont">Text Overlay Font</Label>
                  <Select value={formData.textFont} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, textFont: value as any }))
                  }>
                    <SelectTrigger data-testid="select-text-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_CATEGORIES.map((category) => (
                        <div key={category.name}>
                          <div className="px-2 py-1.5 text-xs font-medium text-slate-500 bg-slate-50">
                            {category.name}
                          </div>
                          {category.fonts.map((fontKey) => {
                            const font = AVAILABLE_FONTS[fontKey];
                            return (
                              <SelectItem key={fontKey} value={fontKey}>
                                <div className="flex flex-col">
                                  <span className={font.weight === 'bold' ? 'font-bold' : 'font-normal'}>
                                    {font.name}
                                  </span>
                                  <span className="text-xs text-slate-500">{font.description}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600 mt-1">
                    Choose the font style for text overlays that appear during video playback
                  </p>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Overlay Color</Label>
                  <Select value={formData.textColor} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, textColor: value as any }))
                  }>
                    <SelectTrigger data-testid="select-text-color">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEXT_COLORS).map(([colorKey, color]) => (
                        <SelectItem key={colorKey} value={colorKey}>
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full border border-slate-300"
                              style={{ backgroundColor: color.value }}
                            />
                            <div className="flex flex-col">
                              <span>{color.name}</span>
                              <span className="text-xs text-slate-500">{color.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600 mt-1">
                    Choose the color for text overlays - preview shows actual color
                  </p>
                </div>
                <div>
                  <Label htmlFor="imageProvider">Image Generation Provider</Label>
                  <Select value={formData.imageProvider} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, imageProvider: value as any }))
                  }>
                    <SelectTrigger data-testid="select-image-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dalle">
                        <div className="flex flex-col">
                          <span>DALL-E 3 (Premium)</span>
                          <span className="text-xs text-slate-500">40 credits per image • Highest quality</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="runware">
                        <div className="flex flex-col">
                          <span>Runware (Budget)</span>
                          <span className="text-xs text-slate-500">2 credits per image</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600 mt-1">
                    {formData.imageProvider === 'runware' ? 
                      'Ultra-fast generation. Perfect for high-volume content.' :
                      'Premium quality with OpenAI\'s latest DALL-E 3 model.'
                    }
                  </p>
                </div>
                {formData.imageProvider === 'runware' && (
                  <div>
                    <Label htmlFor="runwareModel">Runware Model</Label>
                    <Select value={formData.runwareModel} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, runwareModel: value as any }))
                    }>
                      <SelectTrigger data-testid="select-runware-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="runware:100@1">
                          <div className="flex flex-col">
                            <span>FLUX.1 Schnell (Cheapest)</span>
                            <span className="text-xs text-slate-500">Ultra-fast • 1 credit per image</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="runware:101@1">
                          <div className="flex flex-col">
                            <span>FLUX.1 Dev</span>
                            <span className="text-xs text-slate-500">Fast & high-quality • 1 credit per image</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-600 mt-1">
                      {formData.runwareModel === 'runware:100@1' && 'Ultra-fast generation - best for speed'}
                      {formData.runwareModel === 'runware:101@1' && 'Balanced speed and quality - recommended'}
                    </p>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      id="subtitles"
                      checked={formData.subtitles}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, subtitles: checked }))
                      }
                      data-testid="switch-subtitles"
                    />
                    <div>
                      <Label htmlFor="subtitles" className="font-medium">Enable Subtitles</Label>
                      <p className="text-sm text-slate-500">Display text overlay as the narration plays</p>
                      <p className="text-sm text-blue-600 font-medium">Subtitles now display as overlay on video player for better performance</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Simplified Credit Cost Preview */}
          {costData && (
            <div className="border rounded-lg p-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">This video will cost:</span>
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-primary">{costData.credits} credits</span>
                  {creditsData && (
                    <span className={`text-sm ${(creditsData.balance || 0) >= costData.credits ? 'text-green-600' : 'text-red-600'}`}>
                      (Balance: {creditsData.balance || 0})
                    </span>
                  )}
                </div>
              </div>
              


              {creditsData && (creditsData.balance || 0) < costData.credits && (
                <div className="mt-2 text-xs text-red-600">
                  ⚠️ Insufficient credits. <a href="/credits" className="underline">Purchase more credits</a> to generate this video.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t">
            <Button type="button" variant="ghost" data-testid="button-save-draft">
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <div className="space-x-3">
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createVideoMutation.isPending || !formData.topic.trim() || (costData && creditsData && (creditsData.balance || 0) < costData.credits)}
                data-testid="button-generate"
              >
                {createVideoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Video...
                  </>
                ) : costData && creditsData && (creditsData.balance || 0) < costData.credits ? (
                  `Need ${costData.credits - (creditsData.balance || 0)} More Credits`
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Video {costData ? `(${costData.credits} credits)` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderGenerationProgress = () => (
    <Card data-testid="generation-progress" className={currentStep !== 2 ? "hidden" : ""}>
      <CardHeader>
        <CardTitle>Generating Your Video</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {generationSteps.map((step, index) => (
            <div 
              key={step.name}
              className={`flex items-center space-x-4 p-4 rounded-lg border ${
                step.status === "completed" ? "bg-primary/5 border-primary/20" :
                step.status === "in-progress" ? "bg-amber-50 border-amber-200" :
                step.status === "failed" ? "bg-red-50 border-red-200" :
                "bg-slate-50 border-slate-200"
              }`}
              data-testid={`generation-step-${index}`}
            >
              <div className="flex-shrink-0">
                {step.status === "completed" ? (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                ) : step.status === "in-progress" ? (
                  <div className="w-8 h-8">
                    <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                  </div>
                ) : step.status === "failed" ? (
                  <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <X className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-slate-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">{step.name}</div>
                <div className="text-sm text-slate-600">
                  {step.status === "completed" ? "Completed successfully" :
                   step.status === "in-progress" ? "In progress..." :
                   step.status === "failed" ? (
                     <div>
                       <div className="text-red-600 font-medium">Failed to complete</div>
                       {videoDetails?.errorMessage && (
                         <div className="text-xs text-red-500 mt-1">{videoDetails.errorMessage}</div>
                       )}
                     </div>
                   ) :
                   "Waiting to start"}
                </div>
                {step.status === "in-progress" && step.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={step.progress} className="h-2" />
                    <div className="text-xs text-slate-500 mt-1">{step.progress}% complete</div>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">
                <Badge variant={
                  step.status === "completed" ? "default" :
                  step.status === "in-progress" ? "secondary" :
                  step.status === "failed" ? "destructive" :
                  "outline"
                }>
                  {step.status === "completed" ? "Done" :
                   step.status === "in-progress" ? "Active" :
                   step.status === "failed" ? "Failed" :
                   "Pending"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {videoDetails?.status === "failed" && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <X className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-red-800">Generation Failed</div>
                  <div className="text-sm text-red-700 mt-1">
                    {videoDetails.errorMessage || "An error occurred during video generation."}
                  </div>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => retryVideoMutation.mutate(videoDetails.id)}
                disabled={retryVideoMutation.isPending}
                data-testid="button-retry"
              >
                {retryVideoMutation.isPending ? "Resetting..." : "Try Again"}
              </Button>
            </div>
          </div>
        )}

        {videoDetails?.status === "generating" && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Estimated time:</strong> 2-4 minutes for script and image generation. 
                You can close this tab and continue once it's ready for editing.
              </div>
            </div>
          </div>
        )}

        {videoDetails?.status === "compiling" && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Loader2 className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0 animate-spin" />
              <div className="text-sm text-amber-800">
                <strong>Compiling Video:</strong> Creating final video with enhanced features (title page, animations, transitions). 
                This typically takes 1-3 minutes depending on video length.
              </div>
            </div>
          </div>
        )}

        {videoDetails?.status === "editing" && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Edit className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <strong>Ready for editing!</strong> Script and images have been generated. 
                  Review and customize them before final video compilation.
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => window.location.href = `/videos/${videoDetails.id}/edit`}
                data-testid="button-edit-video"
              >
                Edit & Compile
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderVideoPreview = () => {
    if (currentStep !== 3 || !videoDetails) return null;

    return (
      <Card data-testid="video-preview">
        <CardHeader>
          <CardTitle>Your Video is Ready!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
                {videoDetails.status === "completed" && videoDetails.videoUrl ? (
                  <VideoPlayer 
                    videoUrl={`/api/videos/${videoDetails.id}/file`}
                    subtitleData={videoDetails.subtitleData as any}
                    showSubtitles={videoDetails.subtitles || false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <Button 
                      size="lg" 
                      className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30"
                      data-testid="button-play-video"
                      disabled
                    >
                      <Play className="h-6 w-6 text-white ml-1" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-center space-x-3">
                <Button 
                  data-testid="button-download-video"
                  onClick={() => {
                    if (videoDetails?.id) {
                      window.open(`/api/videos/${videoDetails.id}/download`, '_blank');
                    }
                  }}
                  disabled={videoDetails?.status !== "completed"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download MP4
                </Button>
                <Button variant="outline" data-testid="button-share">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" data-testid="button-edit">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Video Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Duration:</span>
                    <span className="font-medium" data-testid="text-duration">{videoDetails.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Resolution:</span>
                    <span className="font-medium">1920x1080</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Format:</span>
                    <span className="font-medium">MP4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <Badge data-testid="badge-status">{videoDetails.status}</Badge>
                  </div>
                </div>
              </div>

              {videoDetails.script && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Script Preview</h4>
                  <div className="max-h-48 overflow-y-auto text-sm text-slate-600 bg-slate-50 rounded-lg p-3" data-testid="text-script">
                    {videoDetails.script}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecentVideos = () => (
    <Card data-testid="recent-videos">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Videos</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            data-testid="button-view-all"
            onClick={() => window.location.href = '/my-videos'}
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {videosLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : recentVideos.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No videos created yet</p>
            <p className="text-sm">Create your first explainer video above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.map((video) => (
              <div 
                key={video.id} 
                className="group cursor-pointer"
                onClick={() => {
                  if (video.status === "completed") {
                    window.location.href = `/videos/${video.id}/preview`;
                  } else {
                    setSelectedVideo(video);
                  }
                }}
                data-testid={`card-video-${video.id}`}
              >
                <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden mb-3 relative">
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-slate-400" />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}s
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant={
                      video.status === "completed" ? "default" :
                      video.status === "generating" ? "secondary" :
                      video.status === "failed" ? "destructive" :
                      "outline"
                    }>
                      {video.status}
                    </Badge>
                  </div>
                </div>
                <h4 className="font-medium text-slate-900 group-hover:text-primary transition-colors line-clamp-1" data-testid={`text-video-title-${video.id}`}>
                  {video.topic.slice(0, 50)}{video.topic.length > 50 ? "..." : ""}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Created {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {renderStepIndicator()}
      
      {currentStep === 1 && renderConfigurationForm()}
      {renderGenerationProgress()}
      {renderVideoPreview()}
      {renderRecentVideos()}
    </div>
  );
}
