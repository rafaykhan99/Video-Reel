import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface RenderOptions {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  audioPath: string;
  outputPath: string;
  textColor: string;
  textFont: string;
  topic: string;
  totalDuration: number;
}

export async function renderVideoWithRemotion(options: RenderOptions): Promise<void> {
  try {
    console.log('[Remotion] Starting video render...');
    
    // Calculate FPS and duration in frames
    const fps = 30;
    const durationInFrames = Math.ceil(options.totalDuration * fps);
    
    // Bundle the Remotion project
    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'server/remotion/index.tsx'),
      publicDir: null,
      webpackOverride: (config) => config,
    });
    
    console.log('[Remotion] Bundle created at:', bundleLocation);
    
    // Get the composition
    const comps = await selectComposition({
      serveUrl: bundleLocation,
      id: 'VideoComposition',
      inputProps: {
        script: options.script,
        images: options.images,
        topic: options.topic,
        textColor: options.textColor,
        textFont: options.textFont,
      },
    });
    
    // Override composition duration based on actual content
    const actualComposition = {
      ...comps,
      durationInFrames: Math.ceil(options.totalDuration * 30), // Use actual duration
    };

    // Render the video with Remotion
    await renderMedia({
      composition: actualComposition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: options.outputPath,
      // Remove Chrome flags that may be causing the dependency issues
      // Let's try the original Remotion settings that worked before
    });
    
    console.log('[Remotion] Video render completed successfully');
    
    // Add audio using FFmpeg (since Remotion might not handle audio properly)
    if (options.audioPath && fs.existsSync(options.audioPath)) {
      await addAudioToVideo(options.outputPath, options.audioPath);
    }
    
  } catch (error) {
    console.error('[Remotion] Video render failed:', error);
    throw error;
  }
}

async function addAudioToVideo(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tempOutput = videoPath.replace('.mp4', '_with_audio.mp4');
    
    const ffmpegArgs = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      tempOutput
    ];
    
    console.log('[FFmpeg] Adding audio to video...');
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('close', (code: number) => {
      if (code === 0) {
        // Replace original with audio version
        fs.renameSync(tempOutput, videoPath);
        console.log('[FFmpeg] Audio added successfully');
        resolve();
      } else {
        console.error('[FFmpeg] Failed to add audio, code:', code);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}