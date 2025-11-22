import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
// Re-enable the original renderer that was working

interface VideoAssets {
  images: string[];
  audioSegments: string[];
  scriptSegments: Array<{ text: string; duration: number }>;
}

interface SubtitleData {
  segments: Array<{ text: string; startTime: number; endTime: number; duration: number }>;
  enabled: boolean;
}

export async function createVideoWithRemotion(
  assets: VideoAssets,
  outputPath: string,
  totalAudioDuration: number,
  subtitleData: SubtitleData,
  topic: string,
  textFont?: string,
  textColor?: string
): Promise<void> {
  try {
    console.log('[Remotion] Creating video with Remotion - the best video package for 2024-2025...');
    
    // Concatenate audio segments first using FFmpeg
    const audioPath = await concatenateAudioSegments(assets.audioSegments, path.dirname(outputPath));
    
    // Re-enable Remotion - it was working perfectly before!
    const { renderVideoWithRemotion } = await import('./remotionRenderer');
    console.log('[Remotion] Using working Remotion system for high-quality video generation');
    
    await renderVideoWithRemotion({
      script: assets.scriptSegments,
      images: assets.images,
      audioPath,
      outputPath,
      textColor: textColor || 'yellow',
      textFont: textFont || 'Arial',
      topic,
      totalDuration: totalAudioDuration
    });
    
    console.log('[Remotion] Video creation completed successfully');
    
  } catch (error) {
    console.error('[Remotion] Error creating video:', error);
    const errorMessage = (error as Error).message;
    
    // Don't use fallback - just let it fail and show the real error
    // The original Remotion was working, so let's see what the actual issue is
    throw error;
  }
}

async function concatenateAudioSegments(audioSegments: string[], outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, 'final_audio.wav');
    
    // Create a file list for ffmpeg concat
    const fileListPath = path.join(outputDir, 'audio_files.txt');
    const fileListContent = audioSegments.map(segment => `file '${segment}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);
    
    const ffmpegArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c:a', 'pcm_s16le',
      '-ar', '44100',
      '-ac', '1',
      outputPath
    ];
    
    console.log('[FFmpeg] Concatenating audio segments...');
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('close', (code: number) => {
      // Clean up temp file
      try {
        fs.unlinkSync(fileListPath);
      } catch (err) {
        console.warn('Could not clean up file list:', err);
      }
      
      if (code === 0) {
        console.log('[FFmpeg] Audio concatenation successful');
        resolve(outputPath);
      } else {
        console.error('[FFmpeg] Audio concatenation failed, code:', code);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}