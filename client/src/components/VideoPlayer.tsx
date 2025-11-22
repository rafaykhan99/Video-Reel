import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX, ToggleLeft, ToggleRight } from 'lucide-react';

interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
}

interface VideoPlayerProps {
  videoUrl: string;
  subtitleData?: {
    segments: SubtitleSegment[];
  };
  showSubtitles?: boolean;
}

export default function VideoPlayer({ videoUrl, subtitleData, showSubtitles = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(showSubtitles);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  // Update current subtitle based on video time
  useEffect(() => {
    if (subtitlesEnabled && subtitleData?.segments) {
      const currentSegment = subtitleData.segments.find(
        segment => currentTime >= segment.startTime && currentTime <= segment.endTime
      );
      setCurrentSubtitle(currentSegment?.text || '');
    } else {
      setCurrentSubtitle('');
    }
  }, [currentTime, subtitlesEnabled, subtitleData]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto rounded-lg"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        data-testid="video-player"
      />

      {/* Subtitle Overlay */}
      {subtitlesEnabled && currentSubtitle && (
        <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
          <div className="inline-block bg-black bg-opacity-80 text-white px-6 py-3 rounded-lg mx-4 shadow-lg">
            <p className="text-lg font-medium leading-relaxed tracking-wide" 
               style={{
                 textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                 lineHeight: '1.4',
                 maxWidth: '80vw'
               }}>
              {currentSubtitle}
            </p>
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
        <div className="flex items-center space-x-4">
          {/* Play/Pause Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={togglePlay}
            className="text-white hover:bg-white/20"
            data-testid="button-play-pause"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {/* Progress Bar */}
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer"
              data-testid="input-progress"
            />
          </div>

          {/* Time Display */}
          <span className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Mute Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMute}
            className="text-white hover:bg-white/20"
            data-testid="button-mute"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Subtitle Toggle */}
          {subtitleData?.segments && subtitleData.segments.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
              className="text-white hover:bg-white/20"
              data-testid="button-subtitles"
            >
              {subtitlesEnabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              <span className="ml-1 text-xs">CC</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}