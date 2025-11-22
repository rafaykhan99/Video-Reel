import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoPreviewProps {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  audioUrl?: string;
  topic: string;
  textColor?: string;
  textFont?: string;
  duration: number;
}

// Remotion composition for video preview
const VideoComposition: React.FC<{
  script: Array<{ text: string; duration: number }>;
  images: string[];
  topic: string;
  textColor: string;
  textFont: string;
}> = ({ script, images, topic, textColor, textFont }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Calculate which image should be shown
  const segmentDuration = durationInFrames / images.length;
  const currentImageIndex = Math.min(
    Math.floor(frame / segmentDuration),
    images.length - 1
  );
  
  // Ken Burns effect progress
  const segmentProgress = (frame % segmentDuration) / segmentDuration;
  const zoomEffects = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'];
  const currentEffect = zoomEffects[currentImageIndex % zoomEffects.length];
  
  // Calculate zoom and pan values
  const zoom = interpolate(segmentProgress, [0, 1], 
    currentEffect === 'zoom-in' ? [1, 1.2] :
    currentEffect === 'zoom-out' ? [1.2, 1] :
    [1.1, 1.1]
  );
  
  const panX = interpolate(segmentProgress, [0, 1],
    currentEffect === 'pan-left' ? [0, -50] :
    currentEffect === 'pan-right' ? [0, 50] :
    [0, 0]
  );
  
  // Text animation
  const titleOpacity = interpolate(frame, [0, 30, durationInFrames - 30, durationInFrames], [0, 1, 1, 0]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Image with Ken Burns Effect */}
      <AbsoluteFill>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${images[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${zoom}) translateX(${panX}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      </AbsoluteFill>
      
      {/* Remove Title Overlay - not needed as per user request */}
      
      {/* Enhanced Script Text Overlay with Word Highlighting */}
      {script.map((segment, index) => {
        const segmentStart = index * segmentDuration;
        const segmentEnd = (index + 1) * segmentDuration;
        
        if (frame >= segmentStart && frame < segmentEnd) {
          const segmentFrame = frame - segmentStart;
          const textOpacity = interpolate(segmentFrame, [0, 15, segmentDuration - 15, segmentDuration], [0, 1, 1, 0]);
          
          // Calculate word highlighting
          const words = segment.text.split(' ');
          const wordsPerSecond = words.length / segment.duration;
          const currentWordIndex = Math.floor((segmentFrame / fps) * wordsPerSecond);
          
          return (
            <AbsoluteFill
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingBottom: 80,
                opacity: textOpacity,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: '700',
                  textAlign: 'center',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '15px 25px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  lineHeight: 1.4,
                  border: '2px solid rgba(255,255,255,0.2)',
                  margin: '0 auto',
                  width: 'fit-content',
                }}
              >
                {words.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    style={{
                      color: wordIndex <= currentWordIndex ? textColor : 'white',
                      transition: 'color 0.3s ease',
                      marginRight: wordIndex < words.length - 1 ? '8px' : '0',
                      textShadow: wordIndex <= currentWordIndex 
                        ? `0 0 10px ${textColor}, 2px 2px 4px rgba(0,0,0,0.8)` 
                        : '2px 2px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </AbsoluteFill>
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  script,
  images,
  audioUrl,
  topic,
  textColor = 'yellow',
  textFont = 'dejavu-sans-bold',
  duration
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<any>(null);

  const fps = 25;
  const durationInFrames = Math.round(duration * fps);

  const handlePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = (frame: number) => {
    setCurrentTime(frame / fps);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="text-lg font-semibold">Video Preview</div>
      
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={VideoComposition}
          inputProps={{
            script,
            images,
            topic,
            textColor,
            textFont
          }}
          durationInFrames={durationInFrames}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          style={{
            width: '100%',
            aspectRatio: '16/9',
          }}
          controls={false}
          loop
          acknowledgeRemotionLicense={true}
        />
        
        {/* Custom Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
            
            <div className="text-sm">
              {Math.floor(currentTime)}s / {duration}s
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2 w-full bg-white/20 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Audio Player (if available) */}
      {audioUrl && (
        <div className="mt-4">
          <audio
            controls
            src={audioUrl}
            className="w-full"
            ref={(audio) => {
              if (audio) {
                audio.muted = isMuted;
                audio.volume = 0.7;
                if (isPlaying) {
                  audio.play().catch(console.error);
                } else {
                  audio.pause();
                }
              }
            }}
          />
          <div className="text-sm text-muted-foreground mt-2">
            Audio narration (play manually for now)
          </div>
        </div>
      )}
      
      {/* Effects Info */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div><strong>Effects:</strong> Ken Burns (zoom in/out, pan left/right)</div>
        <div><strong>Text Overlays:</strong> Topic title + Script segments</div>
        <div><strong>Transitions:</strong> Smooth fade in/out</div>
      </div>
    </Card>
  );
};

export default VideoPreview;