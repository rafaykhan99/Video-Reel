import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video } from "@shared/schema";
import { getLanguageName } from "@shared/languages";
import { Play, Download, Search, Filter, Video as VideoIcon, Image as ImageIcon, Edit, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function MyVideos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
    refetchInterval: 2000, // Always poll every 2 seconds
  });

  // Also add an effect to stop polling when no videos are in progress
  useEffect(() => {
    const hasVideosInProgress = videos?.some((video: Video) => 
      video.status === 'generating' || 
      video.status === 'pending' || 
      video.status === 'compiling'
    );
    
    if (!hasVideosInProgress && videos.length > 0) {
      // If no videos are in progress, we can reduce polling frequency
      // The query will automatically refetch based on the refetchInterval
    }
  }, [videos]);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || video.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" data-testid="text-videos-title">My Videos</h1>
          <p className="text-slate-600 mt-2">Manage and download your generated videos</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search videos by topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="editing">Ready to Edit</SelectItem>
                  <SelectItem value="script_generated">Script Generated</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="compiling">Compiling</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Loading your videos...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12">
          <VideoIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-900 mb-2">
            {videos.length === 0 ? "No videos created yet" : "No videos match your filters"}
          </h3>
          <p className="text-slate-600 mb-6">
            {videos.length === 0 
              ? "Start by creating your first explainer video."
              : "Try adjusting your search or filter criteria."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card key={video.id} className="group hover:shadow-lg transition-shadow" data-testid={`card-video-${video.id}`}>
              <div 
                className="aspect-video bg-slate-100 rounded-t-lg overflow-hidden relative cursor-pointer"
                onClick={() => {
                  if (video.status === "completed") {
                    window.location.href = `/videos/${video.id}/preview`;
                  }
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-slate-400" />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {video.status === "completed" ? (
                    <Play className="h-8 w-8 text-white" />
                  ) : (
                    <VideoIcon className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {video.duration}s
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant={
                    video.status === "completed" ? "default" :
                    video.status === "editing" ? "default" :
                    video.status === "script_generated" ? "secondary" :
                    video.status === "generating" || video.status === "compiling" ? "secondary" :
                    video.status === "failed" ? "destructive" :
                    "outline"
                  } className={video.status === "generating" || video.status === "compiling" ? "animate-pulse" : ""}>
                    {video.status === "generating" || video.status === "compiling" ? (
                      <div className="flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{video.status === "compiling" ? "Compiling" : "Generating"}</span>
                      </div>
                    ) : video.status === "script_generated" ? "Ready to Edit" : 
                      video.status === "editing" ? "Ready to Edit" : 
                      video.status}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-medium text-slate-900 mb-2 line-clamp-2" data-testid={`text-video-title-${video.id}`}>
                  {video.topic}
                </h3>
                <div className="text-sm text-slate-500 mb-4 space-y-1">
                  <p>Created {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  <p>Language: {getLanguageName(video.language as any) || 'English'}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {video.status === "completed" && (
                    <>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/videos/${video.id}/preview`}
                        data-testid={`button-preview-${video.id}`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/api/videos/${video.id}/download`, '_blank')}
                        data-testid={`button-download-${video.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {(video.status === "editing" || video.status === "script_generated") && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.location.href = `/videos/${video.id}/edit`}
                      data-testid={`button-edit-${video.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit & Compile
                    </Button>
                  )}
                  {video.status === "generating" && (
                    <Button size="sm" disabled className="flex-1">
                      Generating...
                    </Button>
                  )}
                  {video.status === "failed" && (
                    <Button size="sm" variant="destructive" disabled className="flex-1">
                      Failed
                    </Button>
                  )}
                  {video.status === "pending" && (
                    <Button size="sm" variant="outline" disabled className="flex-1">
                      Pending
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}