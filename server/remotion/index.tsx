import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { VideoComposition } from './VideoComposition';

interface VideoCompositionProps {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  topic: string;
  textColor: string;
  textFont: string;
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition as any}
        durationInFrames={30 * 30} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: [
            { text: "Sample text", duration: 5 }
          ],
          images: ["https://via.placeholder.com/1920x1080"],
          topic: "Sample Topic",
          textColor: "yellow",
          textFont: "dejavu-sans-bold"
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);