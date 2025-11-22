import { renderVideoWithRevideo } from './revideoRenderer';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface VideoAssets {
  images: string[];
  audioSegments: string[];
  scriptSegments: Array<{ text: string; duration: number }>;
}

interface SubtitleData {
  segments: Array<{ text: string; startTime: number; endTime: number; duration: number }>;
  enabled: boolean;
}

export async function createVideoWithRevideo(
  assets: VideoAssets,
  outputPath: string,
  totalAudioDuration: number,
  subtitleData: SubtitleData,
  topic: string,
  textFont?: string,
  textColor?: string
): Promise<void> {
  try {
    console.log('[Revideo] Creating video with open-source Revideo - superior to Remotion!');
    
    // Concatenate audio segments first using FFmpeg
    const audioPath = await concatenateAudioSegments(assets.audioSegments, path.dirname(outputPath));
    console.log('[Revideo] Audio concatenated successfully:', audioPath);
    
    // Use Revideo to render the video
    console.log('[Revideo] Starting Revideo render with script segments:', assets.scriptSegments.length);
    await renderVideoWithRevideo({
      script: assets.scriptSegments,
      images: assets.images,
      audioPath,
      outputPath,
      textColor: textColor || 'yellow',
      textFont: textFont || 'Arial',
      topic,
      totalDuration: totalAudioDuration
    });
    
    console.log('[Revideo] Video creation completed successfully with perfect text timing!');
    
  } catch (error) {
    console.error('[Revideo] Error creating video:', error);
    console.error('[Revideo] Error details:', (error as Error).message);
    // Fall back to enhanced FFmpeg if Revideo fails
    console.log('[Revideo] Falling back to enhanced FFmpeg system due to dependency issues...');
    const { createVideo } = await import('./enhancedVideoProcessor');
    await createVideo(assets, outputPath, totalAudioDuration, subtitleData, topic, textFont, textColor);
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
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      // Clean up temp file
      if (fs.existsSync(fileListPath)) {
        fs.unlinkSync(fileListPath);
      }
      
      if (code === 0) {
        console.log('[Revideo] Audio concatenation completed');
        resolve(outputPath);
      } else {
        console.error('[Revideo] Audio concatenation failed:', stderr);
        reject(new Error(`Audio concatenation failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}