import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video } from "@shared/schema";
import { Play, Clock, Download, Video as VideoIcon } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const stats = {
    total: videos.length,
    completed: videos.filter(v => v.status === "completed").length,
    generating: videos.filter(v => v.status === "generating").length,
    failed: videos.filter(v => v.status === "failed").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-slate-600 mt-2">Overview of your video generation activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <VideoIcon className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Generating</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-generating">{stats.generating}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <VideoIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-failed">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
        <Link to="/">
          <Button data-testid="button-create-video">Create New Video</Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Videos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8">
              <VideoIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No videos yet</h3>
              <p className="text-slate-600 mb-4">Create your first explainer video to get started.</p>
              <Link to="/">
                <Button data-testid="button-get-started">Get Started</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.slice(0, 5).map((video) => (
                <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`video-item-${video.id}`}>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{video.topic.slice(0, 60)}{video.topic.length > 60 ? "..." : ""}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                      <span>{video.duration}s duration</span>
                      <span>Created {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      video.status === "completed" ? "default" :
                      video.status === "generating" ? "secondary" :
                      video.status === "failed" ? "destructive" :
                      "outline"
                    }>
                      {video.status}
                    </Badge>
                    {video.status === "completed" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`/api/videos/${video.id}/download`, '_blank')}
                        data-testid={`button-download-${video.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}