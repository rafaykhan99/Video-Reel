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
  console.log(`Creating simple video at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    // Calculate duration per image
    const durationPerImage = totalDuration / assets.images.length;

    try {
      // Step 1: Create individual video segments from images
      const videoSegments: string[] = [];
      for (let i = 0; i < assets.images.length; i++) {
        const segmentPath = path.join(path.dirname(outputPath), `segment_${i}.mp4`);
        await createImageSegment(assets.images[i], segmentPath, durationPerImage);
        videoSegments.push(segmentPath);
      }

      // Step 2: Concatenate audio files
      const concatenatedAudioPath = path.join(path.dirname(outputPath), 'concatenated_audio.mp3');
      await concatenateAudio(assets.audioSegments, concatenatedAudioPath);

      // Step 3: Combine video segments
      const concatenatedVideoPath = path.join(path.dirname(outputPath), 'concatenated_video.mp4');
      await concatenateVideos(videoSegments, concatenatedVideoPath);

      // Step 4: Add audio to video
      await addAudioToVideo(concatenatedVideoPath, concatenatedAudioPath, outputPath);

      // Cleanup temporary files
      videoSegments.forEach(segment => {
        if (fs.existsSync(segment)) fs.unlinkSync(segment);
      });
      if (fs.existsSync(concatenatedAudioPath)) fs.unlinkSync(concatenatedAudioPath);
      if (fs.existsSync(concatenatedVideoPath)) fs.unlinkSync(concatenatedVideoPath);

      console.log("Simple video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in simple video creation:", error);
      reject(error);
    }
  });
}

async function createImageSegment(imagePath: string, outputPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-t", duration.toString(),
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
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
        console.error('Image segment creation error:', stderr);
        reject(new Error(`Failed to create image segment: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error('Image segment creation spawn error:', error);
      reject(error);
    });
  });
}

async function concatenateAudio(audioPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use concat demuxer for better compatibility
    const concatFilePath = path.join(path.dirname(outputPath), 'audio_concat_list.txt');
    const concatContent = audioPaths.map(audioPath => `file '${path.basename(audioPath)}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatFilePath,
      "-c:a", "aac",
      "-b:a", "128k",
      outputPath
    ], { cwd: path.dirname(outputPath) });

    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("close", (code) => {
      // Cleanup concat file
      if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
      
      if (code === 0) {
        resolve();
      } else {
        console.error('Audio concatenation error:', stderr);
        reject(new Error(`Failed to concatenate audio: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      console.error('Audio concatenation spawn error:', error);
      reject(error);
    });
  });
}

async function concatenateVideos(videoPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create concat demuxer file
    const concatFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = videoPaths.map(videoPath => `file '${path.basename(videoPath)}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatFilePath,
      "-c", "copy",
      outputPath
    ], { cwd: path.dirname(outputPath) });

    ffmpeg.on("close", (code) => {
      // Cleanup concat file
      if (fs.existsSync(concatFilePath)) fs.unlinkSync(concatFilePath);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to concatenate videos: ${code}`));
      }
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });
  });
}

async function addAudioToVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
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

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to add audio to video: ${code}`));
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