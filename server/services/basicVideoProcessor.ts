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
  console.log(`Creating basic video with effects at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    try {
      // Step 1: Process audio
      const processedAudioPath = await processAudio(assets.audioSegments, path.dirname(outputPath));

      // Step 2: Create video with basic effects
      await createBasicVideo(assets, outputPath, processedAudioPath, totalDuration, {
        subtitles,
        textFont,
        textColor,
        videoTopic
      });

      // Cleanup
      if (fs.existsSync(processedAudioPath)) fs.unlinkSync(processedAudioPath);

      console.log("Basic video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in basic video creation:", error);
      reject(error);
    }
  });
}

async function processAudio(audioSegments: string[], outputDir: string): Promise<string> {
  const processedAudioPath = path.join(outputDir, 'processed_audio.wav');
  
  // Normalize all audio files first
  const normalizedAudio: string[] = [];
  for (let i = 0; i < audioSegments.length; i++) {
    const normalizedPath = path.join(outputDir, `norm_${i}.wav`);
    await normalizeAudio(audioSegments[i], normalizedPath);
    normalizedAudio.push(normalizedPath);
  }
  
  // Concatenate normalized audio
  await concatenateAudio(normalizedAudio, processedAudioPath);
  
  // Cleanup normalized files
  normalizedAudio.forEach(file => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
  
  return processedAudioPath;
}

async function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y", "-i", inputPath,
      "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "1",
      outputPath
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Audio normalization failed: ${code}`));
    });

    ffmpeg.on("error", reject);
  });
}

async function concatenateAudio(audioPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const inputs: string[] = [];
    audioPaths.forEach(audioPath => {
      inputs.push("-i", audioPath);
    });

    const ffmpeg = spawn("ffmpeg", [
      "-y", ...inputs,
      "-filter_complex", `concat=n=${audioPaths.length}:v=0:a=1`,
      "-acodec", "pcm_s16le", "-ar", "44100",
      outputPath
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Audio concatenation failed: ${code}`));
    });

    ffmpeg.on("error", reject);
  });
}

async function createBasicVideo(
  assets: VideoAssets,
  outputPath: string,
  audioPath: string,
  totalDuration: number,
  options: {
    subtitles?: { segments: Array<{ text: string; duration: number }>; enabled: boolean };
    textFont?: string;
    textColor?: string;
    videoTopic?: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const durationPerImage = totalDuration / assets.images.length;
    const ffmpegArgs = ["-y"];

    // Add image inputs
    assets.images.forEach((imagePath, index) => {
      ffmpegArgs.push("-loop", "1", "-t", (durationPerImage + 0.5).toString(), "-i", imagePath);
    });

    // Add audio input
    ffmpegArgs.push("-i", audioPath);

    // Create simple filter with Ken Burns effects
    const imageFilters = assets.images.map((_, index) => {
      const effect = getSimpleEffect(index);
      return `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p,${effect},setpts=PTS-STARTPTS[v${index}]`;
    }).join(';');

    // Concatenate videos
    const videoInputs = assets.images.map((_, index) => `[v${index}]`).join('');
    let filterComplex = `${imageFilters};${videoInputs}concat=n=${assets.images.length}:v=1:a=0[video]`;

    // Add simple text overlay if enabled
    if (options.subtitles?.enabled && assets.scriptSegments?.length) {
      const safeText = (options.videoTopic || 'Video')
        .replace(/['"\\:]/g, '')
        .replace(/[^\w\s\.,!?-]/g, '')
        .substring(0, 30);
      
      const textColor = options.textColor || 'yellow';
      filterComplex += `;[video]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeText}':fontsize=60:fontcolor=${textColor}:x=(w-text_w)/2:y=100:shadowcolor=black@0.8:shadowx=2:shadowy=2[outv]`;
    } else {
      filterComplex += `;[video]copy[outv]`;
    }

    console.log("Creating basic video with simple filter chain");

    ffmpegArgs.push(
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-map", `${assets.images.length}:a`,
      "-c:v", "libx264", "-preset", "medium", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-pix_fmt", "yuv420p",
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
        console.error('Basic video creation error:', stderr);
        reject(new Error(`Basic video creation failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

function getSimpleEffect(index: number): string {
  const effects = [
    'scale=1.1*iw:1.1*ih', // Slight zoom
    'scale=1920:1080', // Standard
    'scale=1.05*iw:1.05*ih', // Very slight zoom
  ];
  
  return effects[index % effects.length];
}

export async function createTitlePage(topic: string, outputDir: string): Promise<string> {
  const titlePagePath = path.join(outputDir, "title_page.png");

  return new Promise((resolve, reject) => {
    const safeText = topic.replace(/['"\\]/g, '').substring(0, 50);
    
    const ffmpeg = spawn("ffmpeg", [
      "-y", "-f", "lavfi",
      "-i", "color=c=black:size=1920x1080:duration=1",
      "-vf", `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeText}':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-frames:v", "1",
      titlePagePath
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) resolve(titlePagePath);
      else reject(new Error(`Title page creation failed: ${code}`));
    });

    ffmpeg.on("error", reject);
  });
}