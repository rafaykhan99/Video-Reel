import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';

interface VideoCompositionProps {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  topic: string;
  textColor: string;
  textFont: string;
  audioPath?: string;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ 
  script, 
  images, 
  topic, 
  textColor, 
  textFont 
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Calculate which image/text segment should be shown based on script timing
  let currentSegmentIndex = 0;
  let frameOffset = 0;
  
  for (let i = 0; i < script.length; i++) {
    const segmentFrames = script[i].duration * fps;
    if (frame >= frameOffset && frame < frameOffset + segmentFrames) {
      currentSegmentIndex = i;
      break;
    }
    frameOffset += segmentFrames;
  }
  
  // Use corresponding image for current script segment
  const currentImageIndex = Math.min(currentSegmentIndex, images.length - 1);
  
  // Calculate segment progress for current segment
  const currentSegmentFrames = script[currentSegmentIndex]?.duration * fps || fps;
  const currentSegmentStartFrame = script.slice(0, currentSegmentIndex).reduce((sum, s) => sum + (s.duration * fps), 0);
  const segmentProgress = Math.max(0, Math.min(1, (frame - currentSegmentStartFrame) / currentSegmentFrames));
  
  // Subtle zoom effect without shaking
  const zoom = interpolate(segmentProgress, [0, 1], [1, 1.05]);
  
  // Fade transition between segments
  const fadeProgress = interpolate(segmentProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {/* Background Image with subtle zoom */}
      <AbsoluteFill>
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${images[currentImageIndex]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `scale(${zoom})`,
            opacity: fadeProgress,
          }}
        />
      </AbsoluteFill>
      
      {/* Text overlays with proper timing based on script durations */}
      {script.map((segment, index) => {
        // Calculate actual timing based on segment durations
        const segmentStartFrame = script.slice(0, index).reduce((sum, s) => sum + (s.duration * fps), 0);
        const segmentEndFrame = segmentStartFrame + (segment.duration * fps);
        
        if (frame >= segmentStartFrame && frame < segmentEndFrame) {
          const segmentProgress = (frame - segmentStartFrame) / (segment.duration * fps);
          const textOpacity = interpolate(
            segmentProgress, 
            [0, 0.1, 0.9, 1], 
            [0, 1, 1, 0]
          );
          
          return (
            <AbsoluteFill key={index}>
              <div
                style={{
                  position: 'absolute',
                  bottom: '15%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: textColor,
                  fontSize: '36px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
                  opacity: textOpacity,
                  maxWidth: '90%',
                  wordWrap: 'break-word',
                  fontFamily: textFont === 'dejavu-sans-bold' ? 'DejaVu Sans, sans-serif' : 'Arial, sans-serif',
                  lineHeight: 1.2,
                  padding: '0 20px',
                }}
              >
                {segment.text}
              </div>
            </AbsoluteFill>
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};