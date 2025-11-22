import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Music,
  Play,
  Pause,
  Download,
  Heart,
  Clock,
  Search,
  Filter,
  Volume2,
  Loader2
} from "lucide-react";
import { MusicTrack } from "@shared/schema";

export default function MusicLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedMood, setSelectedMood] = useState("all");
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const { data: musicTracks, isLoading } = useQuery({
    queryKey: ["/api/music-library", { search: searchQuery, genre: selectedGenre, mood: selectedMood }],
  });

  const downloadMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await apiRequest("POST", `/api/music-library/${trackId}/download`);
      return response.json();
    },
    onSuccess: (data, trackId) => {
      // Create a download link
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your music track is downloading.",
      });
    },
    onError: () => {
      toast({
        title: "Download Failed",
        description: "Failed to download the track. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToVideoMutation = useMutation({
    mutationFn: async ({ trackId, videoId }: { trackId: string; videoId: string }) => {
      await apiRequest("POST", `/api/videos/${videoId}/add-music`, { musicTrackId: trackId });
    },
    onSuccess: () => {
      toast({
        title: "Music Added",
        description: "Track added to your video successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Add Music",
        description: "Could not add music to video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const playTrack = (track: MusicTrack) => {
    if (audioElement) {
      audioElement.pause();
    }

    if (playingTrack === track.id) {
      setPlayingTrack(null);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(track.previewUrl || track.fileUrl);
    audio.play();
    setAudioElement(audio);
    setPlayingTrack(track.id);

    audio.onended = () => {
      setPlayingTrack(null);
      setAudioElement(null);
    };
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const genres = [
    { value: "all", label: "All Genres" },
    { value: "electronic", label: "Electronic" },
    { value: "acoustic", label: "Acoustic" },
    { value: "cinematic", label: "Cinematic" },
    { value: "ambient", label: "Ambient" },
    { value: "upbeat", label: "Upbeat" },
    { value: "classical", label: "Classical" },
  ];

  const moods = [
    { value: "all", label: "All Moods" },
    { value: "happy", label: "Happy" },
    { value: "calm", label: "Calm" },
    { value: "energetic", label: "Energetic" },
    { value: "dramatic", label: "Dramatic" },
    { value: "peaceful", label: "Peaceful" },
    { value: "inspiring", label: "Inspiring" },
  ];

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Music Library
        </h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Free, royalty-free background music for your videos
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6" data-testid="card-search-filters">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tracks, artists, or moods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger data-testid="select-genre">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMood} onValueChange={setSelectedMood}>
              <SelectTrigger data-testid="select-mood">
                <SelectValue placeholder="Mood" />
              </SelectTrigger>
              <SelectContent>
                {moods.map((mood) => (
                  <SelectItem key={mood.value} value={mood.value}>
                    {mood.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Music Tracks Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(musicTracks as MusicTrack[])?.map((track) => (
          <Card key={track.id} className="group hover:shadow-lg transition-shadow" data-testid={`card-track-${track.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2" data-testid={`text-track-title-${track.id}`}>
                    {track.title}
                  </CardTitle>
                  <CardDescription className="mt-1" data-testid={`text-track-artist-${track.id}`}>
                    {track.artist || "Unknown Artist"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playTrack(track)}
                  className="ml-2"
                  data-testid={`button-play-${track.id}`}
                >
                  {playingTrack === track.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Track Tags */}
                <div className="flex flex-wrap gap-1">
                  {track.genre && (
                    <Badge variant="secondary" className="text-xs">
                      {track.genre}
                    </Badge>
                  )}
                  {track.mood && (
                    <Badge variant="outline" className="text-xs">
                      {track.mood}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {track.license}
                  </Badge>
                </div>

                {/* Track Info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span data-testid={`text-duration-${track.id}`}>
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                  {track.bpm && (
                    <div className="flex items-center space-x-2">
                      <Volume2 className="h-3 w-3" />
                      <span>{track.bpm} BPM</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadMutation.mutate(track.id)}
                    disabled={downloadMutation.isPending}
                    data-testid={`button-download-${track.id}`}
                  >
                    {downloadMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download
                  </Button>
                  
                  <div className="text-xs text-muted-foreground">
                    {track.source}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!musicTracks || (musicTracks as MusicTrack[])?.length === 0) && (
        <Card className="text-center py-8" data-testid="card-no-tracks">
          <CardContent>
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tracks found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* License Information */}
      <Card className="mt-8" data-testid="card-license-info">
        <CardHeader>
          <CardTitle>License Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">CC0 (Public Domain)</h4>
              <p className="text-sm text-muted-foreground">
                No attribution required. Free for commercial use, modification, and distribution.
              </p>
            </div>
            <div>
              <h4 className="font-medium">CC-BY (Creative Commons Attribution)</h4>
              <p className="text-sm text-muted-foreground">
                Attribution required. Free for commercial use with proper credit to the artist.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Usage Guidelines</h4>
              <p className="text-sm text-muted-foreground">
                All tracks in this library are safe for YouTube, social media, and commercial projects.
                For specific licensing questions, check the source provided with each track.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}