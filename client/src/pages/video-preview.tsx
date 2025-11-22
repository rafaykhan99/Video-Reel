import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VideoPlayer from "@/components/VideoPlayer";
import { Video } from "@shared/schema";
import { ArrowLeft, Download, Calendar, Clock, Type, Camera, Volume2 } from "lucide-react";
import { Link } from "wouter";

export default function VideoPreview() {
  const [match, params] = useRoute("/videos/:id/preview");
  const videoId = params?.id;

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/videos", videoId],
    enabled: !!videoId,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8 text-slate-500">Loading video...</div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8 text-slate-500">Video not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/my-videos">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Videos
            </Button>
          </Link>
          <Badge variant={
            video.status === "completed" ? "default" :
            video.status === "generating" ? "secondary" :
            video.status === "failed" ? "destructive" :
            "outline"
          }>
            {video.status}
          </Badge>
        </div>
        
        {video.status === "completed" && (
          <Button 
            onClick={() => window.open(`/api/videos/${video.id}/download`, '_blank')}
            data-testid="button-download"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* Video Player */}
      {video.status === "completed" && video.videoUrl && (
        <Card className="mb-6">
          <CardContent className="p-0">
            <VideoPlayer 
              videoUrl={`/api/videos/${video.id}/file`}
              subtitleData={video.subtitleData as any}
              showSubtitles={video.subtitles || false}
            />
          </CardContent>
        </Card>
      )}

      {/* Video Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl" data-testid="text-video-title">
            {video.topic}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-slate-600">{video.duration} seconds</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-slate-600">
                  {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Volume2 className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Voice Style</p>
                <p className="text-sm text-slate-600 capitalize">{video.voiceStyle || 'Professional'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Camera className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Image Style</p>
                <p className="text-sm text-slate-600 capitalize">{video.imageStyle || 'Modern'}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Type className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium">Subtitles</p>
                <p className="text-sm text-slate-600">{video.subtitles ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>

          {/* Script Content */}
          {video.script && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Generated Script</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{video.script}</p>
            </div>
          )}

          {/* Subtitle Segments */}
          {video.subtitles && video.subtitleData && (video.subtitleData as any).segments && (
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Subtitle Segments</h3>
              <div className="space-y-2">
                {((video.subtitleData as any).segments || []).map((segment: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs font-mono text-slate-500 min-w-[80px]">
                      {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s
                    </div>
                    <div className="text-sm text-slate-700 flex-1">
                      {segment.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {video.status === "failed" && video.errorMessage && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-red-600 mb-2">Error Details</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{video.errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}