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
  console.log(`Creating reliable video at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    try {
      // Step 1: Convert all audio to consistent format first
      console.log("Step 1: Converting audio files to consistent format");
      const normalizedAudio: string[] = [];
      for (let i = 0; i < assets.audioSegments.length; i++) {
        const normalizedPath = path.join(path.dirname(outputPath), `normalized_audio_${i}.wav`);
        await normalizeAudioFile(assets.audioSegments[i], normalizedPath);
        normalizedAudio.push(normalizedPath);
      }

      // Step 2: Create one unified audio file
      console.log("Step 2: Creating unified audio file");
      const unifiedAudioPath = path.join(path.dirname(outputPath), 'unified_audio.wav');
      await createUnifiedAudio(normalizedAudio, unifiedAudioPath);

      // Step 3: Create video from images with same duration as audio
      console.log("Step 3: Creating video from images");
      const imageVideoPath = path.join(path.dirname(outputPath), 'image_video.mp4');
      await createVideoFromImages(assets.images, imageVideoPath, totalDuration);

      // Step 4: Combine video and audio
      console.log("Step 4: Combining video and audio");
      await combineVideoAndAudio(imageVideoPath, unifiedAudioPath, outputPath);

      // Cleanup temporary files
      normalizedAudio.forEach(audioPath => {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      });
      if (fs.existsSync(unifiedAudioPath)) fs.unlinkSync(unifiedAudioPath);
      if (fs.existsSync(imageVideoPath)) fs.unlinkSync(imageVideoPath);

      console.log("Reliable video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in reliable video creation:", error);
      reject(error);
    }
  });
}

async function normalizeAudioFile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-acodec", "pcm_s16le",
      "-ar", "44100",
      "-ac", "1",
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Audio normalization error:', stderr);
        reject(new Error(`Failed to normalize audio: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

async function createUnifiedAudio(audioPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const inputs: string[] = [];
    audioPaths.forEach(audioPath => {
      inputs.push("-i", audioPath);
    });

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      ...inputs,
      "-filter_complex", `concat=n=${audioPaths.length}:v=0:a=1`,
      "-acodec", "pcm_s16le",
      "-ar", "44100",
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Audio unification error:', stderr);
        reject(new Error(`Failed to create unified audio: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

async function createVideoFromImages(imagePaths: string[], outputPath: string, totalDuration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const durationPerImage = totalDuration / imagePaths.length;
    
    const inputs: string[] = [];
    imagePaths.forEach(imagePath => {
      inputs.push("-loop", "1", "-t", durationPerImage.toString(), "-i", imagePath);
    });

    // Create filter for concatenating images
    const filterInputs = imagePaths.map((_, index) => `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setpts=PTS-STARTPTS[v${index}]`).join(';');
    const concatInputs = imagePaths.map((_, index) => `[v${index}]`).join('');
    const filterComplex = `${filterInputs};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[outv]`;

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      ...inputs,
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-r", "25",
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Image video creation error:', stderr);
        reject(new Error(`Failed to create image video: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

async function combineVideoAndAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      outputPath
    ]);

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('Video/audio combination error:', stderr);
        reject(new Error(`Failed to combine video and audio: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

// Create an attractive title page for the video
export async function createTitlePage(
  topic: string,
  outputDir: string,
): Promise<string> {
  const titlePagePath = path.join(outputDir, "title_page.png");

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=black:size=1920x1080:duration=1",
      "-vf", `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${topic}':fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
      "-frames:v", "1",
      titlePagePath
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(titlePagePath);
      } else {
        reject(new Error(`Failed to create title page: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}