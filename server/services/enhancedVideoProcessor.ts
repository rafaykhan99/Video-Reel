import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";

export interface VideoAssets {
  images: string[];
  audioSegments: string[];
  scriptSegments?: Array<{ text: string; duration: number }>;
}

export async function downloadImage(
  url: string,
  outputPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    https
      .get(url, (response) => {
        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(outputPath);
        });
      })
      .on("error", (error) => {
        fs.unlink(outputPath, () => {}); // Delete the file on error
        reject(error);
      });
  });
}

export async function createVideo(
  assets: VideoAssets,
  outputPath: string,
  totalDuration: number,
  subtitles?: {
    segments: Array<{ text: string; duration: number }>;
    enabled: boolean;
  },
  videoTopic?: string,
  textFont?: string,
  textColor?: string,
): Promise<string> {
  console.log(`Creating enhanced video with word-by-word subtitles at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    try {
      // Step 1: Process and concatenate audio first
      console.log("Step 1: Processing audio");
      const audioPath = path.join(path.dirname(outputPath), 'final_audio.wav');
      await processAudio(assets.audioSegments, audioPath);

      // Step 2: Create video with advanced effects and word-by-word subtitles
      console.log("Step 2: Creating video with advanced effects");
      await createAdvancedVideo(assets.images, audioPath, outputPath, {
        subtitles,
        textColor,
        videoTopic,
        totalDuration
      });

      // Keep audio file for preview - don't cleanup immediately
      // if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      console.log("Enhanced video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in enhanced video creation:", error);
      reject(error);
    }
  });
}

async function processAudio(audioSegments: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Validate all audio files exist and have content
    for (const audioPath of audioSegments) {
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }
      const stats = fs.statSync(audioPath);
      if (stats.size === 0) {
        throw new Error(`Audio file is empty: ${audioPath}`);
      }
    }

    console.log(`Processing ${audioSegments.length} audio segments:`, audioSegments);

    if (audioSegments.length === 1) {
      // Single audio file - just copy with normalization
      const ffmpegArgs = [
        "-y",
        "-i", audioSegments[0],
        "-c:a", "pcm_s16le",
        "-ar", "44100",
        "-af", "volume=0.8", // Normalize volume
        outputPath
      ];
      
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error('Single audio processing error:', stderr);
          reject(new Error(`Single audio processing failed: ${code}`));
        }
      });

      ffmpeg.on("error", reject);
    } else {
      // Multiple audio files - use a simpler approach that works reliably
      // Create a text file listing all inputs
      const listFilePath = path.join(path.dirname(outputPath), 'audio_list.txt');
      const listContent = audioSegments.map(audioPath => `file '${audioPath}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent);

      const ffmpegArgs = [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listFilePath,
        "-c:a", "pcm_s16le",
        "-ar", "44100",
        "-af", "volume=0.8",
        outputPath
      ];
      
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on("close", (code) => {
        // Clean up list file
        try {
          fs.unlinkSync(listFilePath);
        } catch (e) {
          console.warn('Could not delete audio list file:', e);
        }
        
        if (code === 0) {
          resolve();
        } else {
          console.error('Multi audio processing error:', stderr);
          reject(new Error(`Multi audio processing failed: ${code}`));
        }
      });

      ffmpeg.on("error", (error) => {
        // Clean up list file on error
        try {
          fs.unlinkSync(listFilePath);
        } catch (e) {
          console.warn('Could not delete audio list file on error:', e);
        }
        reject(error);
      });
    }
  });
}

async function createAdvancedVideo(
  imagePaths: string[],
  audioPath: string,
  outputPath: string,
  options: {
    subtitles?: { segments: Array<{ text: string; duration: number }>; enabled: boolean };
    textColor?: string;
    videoTopic?: string;
    totalDuration: number;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const durationPerImage = options.totalDuration / imagePaths.length;
    const ffmpegArgs = ["-y"];

    // Add audio first
    ffmpegArgs.push("-i", audioPath);

    // Validate all image files exist
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
    }

    // Add all images as inputs with proper duration
    imagePaths.forEach(imagePath => {
      ffmpegArgs.push("-loop", "1", "-t", (durationPerImage + 1).toString(), "-i", imagePath);
    });

    // Add subtle zoom and fade effects without shaking
    const videoFilters = imagePaths.map((_, index) => {
      const inputIndex = index + 1; // +1 because audio is input 0
      // Subtle zoom without movement - just a gentle zoom in
      return `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,zoompan=z='min(zoom+0.001,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=1920x1080,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${durationPerImage-0.5}:d=0.5,setpts=PTS-STARTPTS[v${index}]`;
    }).join(';');

    const concatInputs = imagePaths.map((_, index) => `[v${index}]`).join('');
    
    let filterComplex = `${videoFilters};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[video]`;

    // Add timed text overlays if subtitles are enabled
    if (options.subtitles && options.subtitles.enabled && options.subtitles.segments.length > 0) {
      const textColor = options.textColor || 'yellow';
      const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      
      // Create multiple text overlays with PRECISE timing based on actual segment durations
      let currentTime = 0;
      const textFilters = [];
      
      console.log("Creating precise text overlays for segments:", options.subtitles.segments.map(s => ({ text: s.text.substring(0, 30) + "...", duration: s.duration })));
      
      for (let i = 0; i < options.subtitles.segments.length; i++) {
        const segment = options.subtitles.segments[i];
        const startTime = currentTime.toFixed(2);
        const endTime = (currentTime + segment.duration).toFixed(2);
        currentTime += segment.duration;
        
        console.log(`Text overlay ${i}: "${segment.text.substring(0, 30)}..." from ${startTime}s to ${endTime}s`);
        
        // Better text cleaning and escaping
        let cleanText = segment.text
          .replace(/['"]/g, '')
          .replace(/[^\w\s\.\!\?\-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanText.length > 55) {
          cleanText = cleanText.substring(0, 52) + "...";
        }
        
        // Enhanced text filter with better visibility and precise timing
        textFilters.push(`drawtext=text='${cleanText}':fontfile=${fontPath}:fontsize=32:fontcolor=${textColor}:x=(w-text_w)/2:y=h-th-80:borderw=3:bordercolor=black:shadowcolor=black:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`);
      }
      
      // Chain text filters using comma separation
      const textFilterChain = textFilters.join(',');
      
      // Add text overlays to filter complex
      filterComplex = `${videoFilters};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[video];[video]${textFilterChain}[final]`;
      
      ffmpegArgs.push(
        "-filter_complex", filterComplex,
        "-map", "[final]",
        "-map", "0:a"
      );
    } else {
      // No subtitles
      ffmpegArgs.push(
        "-filter_complex", filterComplex,
        "-map", "[video]",
        "-map", "0:a"
      );
    }

    ffmpegArgs.push(
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20", // Higher quality
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      outputPath
    );

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Advanced video creation error:', stderr);
        reject(new Error(`Advanced video creation failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}