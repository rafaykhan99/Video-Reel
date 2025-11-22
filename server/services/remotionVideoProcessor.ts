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

export async function createVideoWithRemotion(
  assets: VideoAssets,
  outputPath: string,
  totalAudioDuration: number,
  subtitleData: SubtitleData,
  topic: string,
  textFont?: string,
  textColor?: string
): Promise<void> {
  console.log('[Remotion Fallback] Using server-side Remotion rendering (Chrome-free)');
  
  // Concatenate audio segments first
  const audioPath = await concatenateAudioSegments(assets.audioSegments, path.dirname(outputPath));
  
  return renderVideoWithRemotionCLI({
    script: assets.scriptSegments,
    images: assets.images,
    audioPath,
    outputPath,
    textColor: textColor || 'yellow',
    textFont: textFont || 'Arial',
    topic,
    totalDuration: totalAudioDuration
  });
}

async function renderVideoWithRemotionCLI(options: {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  audioPath: string;
  outputPath: string;
  textColor: string;
  textFont: string;
  topic: string;
  totalDuration: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Calculate FPS and duration in frames
    const fps = 30;
    const durationInFrames = Math.ceil(options.totalDuration * fps);
    
    // Create a temporary composition file with the video data
    const compositionData = {
      script: options.script,
      images: options.images,
      topic: options.topic,
      textColor: options.textColor,
      textFont: options.textFont,
      audioPath: options.audioPath
    };
    
    const tempDir = path.dirname(options.outputPath);
    const compositionFile = path.join(tempDir, 'composition-data.json');
    
    // Write composition data to file
    fs.writeFileSync(compositionFile, JSON.stringify(compositionData, null, 2));
    
    // Use Remotion CLI to render the video
    const remotionArgs = [
      'render',
      '--composition=VideoComposition',
      '--props=' + compositionFile,
      '--output=' + options.outputPath,
      '--width=1920',
      '--height=1080',
      '--fps=' + fps,
      '--frames=' + durationInFrames,
      '--audio=' + options.audioPath,
      '--codec=h264',
      '--crf=23',
      '--pixel-format=yuv420p'
    ];
    
    console.log('[Remotion] Starting video render with Remotion CLI...');
    console.log('[Remotion] Command: npx remotion', remotionArgs.join(' '));
    
    const remotionProcess = spawn('npx', ['remotion', ...remotionArgs], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let stdout = '';
    let stderr = '';
    
    remotionProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log('[Remotion stdout]', data.toString().trim());
    });
    
    remotionProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.log('[Remotion stderr]', data.toString().trim());
    });
    
    remotionProcess.on('close', (code) => {
      // Clean up temporary files
      try {
        fs.unlinkSync(compositionFile);
      } catch (err) {
        console.warn('[Remotion] Could not clean up composition file:', err);
      }
      
      if (code === 0) {
        console.log('[Remotion] Video render completed successfully');
        resolve();
      } else {
        console.error('[Remotion] Video render failed with code:', code);
        console.error('[Remotion] stderr:', stderr);
        reject(new Error(`Remotion render failed with code ${code}: ${stderr}`));
      }
    });
    
    remotionProcess.on('error', (error) => {
      console.error('[Remotion] Process error:', error);
      reject(error);
    });
  });
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
    
    console.log('[Remotion Fallback] Concatenating audio segments...');
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    ffmpeg.on('close', (code: number) => {
      // Clean up temp file
      try {
        fs.unlinkSync(fileListPath);
      } catch (err) {
        console.warn('Could not clean up file list:', err);
      }
      
      if (code === 0) {
        console.log('[Remotion Fallback] Audio concatenation successful');
        resolve(outputPath);
      } else {
        console.error('[Remotion Fallback] Audio concatenation failed, code:', code);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}