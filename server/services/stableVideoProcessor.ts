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
  console.log(`Creating stable video at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    try {
      // Step 1: Process audio first
      console.log("Step 1: Processing audio");
      const processedAudioPath = await processAudio(assets.audioSegments, path.dirname(outputPath));

      // Step 2: Create individual video segments from each image
      console.log("Step 2: Creating video segments from images");
      const durationPerImage = totalDuration / assets.images.length;
      const videoSegments: string[] = [];
      
      for (let i = 0; i < assets.images.length; i++) {
        const segmentPath = path.join(path.dirname(outputPath), `segment_${i}.mp4`);
        await createVideoSegment(assets.images[i], segmentPath, durationPerImage);
        videoSegments.push(segmentPath);
      }

      // Step 3: Concatenate video segments
      console.log("Step 3: Concatenating video segments");
      const concatenatedVideoPath = path.join(path.dirname(outputPath), 'concatenated_video.mp4');
      await concatenateVideoSegments(videoSegments, concatenatedVideoPath);

      // Step 4: Add audio to the concatenated video
      console.log("Step 4: Adding audio to video");
      await addAudioToVideo(concatenatedVideoPath, processedAudioPath, outputPath, {
        subtitles,
        textColor,
        videoTopic
      });

      // Cleanup temporary files
      videoSegments.forEach(segment => {
        if (fs.existsSync(segment)) fs.unlinkSync(segment);
      });
      if (fs.existsSync(concatenatedVideoPath)) fs.unlinkSync(concatenatedVideoPath);
      if (fs.existsSync(processedAudioPath)) fs.unlinkSync(processedAudioPath);

      console.log("Stable video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in stable video creation:", error);
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

async function createVideoSegment(imagePath: string, outputPath: string, duration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // Add slight zoom effect for each segment
    const zoomEffects = [
      'scale=1.05*iw:1.05*ih', // Slight zoom in
      'scale=1920:1080', // Normal
      'scale=1.03*iw:1.03*ih', // Very slight zoom
    ];
    
    const segmentIndex = parseInt(path.basename(outputPath).split('_')[1]);
    const effect = zoomEffects[segmentIndex % zoomEffects.length];

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", imagePath,
      "-t", duration.toString(),
      "-vf", `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,${effect},scale=trunc(iw/2)*2:trunc(ih/2)*2`,
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
        console.error('Video segment creation error:', stderr);
        reject(new Error(`Video segment creation failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

async function concatenateVideoSegments(videoSegments: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create concat file list
    const concatFilePath = path.join(path.dirname(outputPath), 'video_concat_list.txt');
    const concatContent = videoSegments.map(segmentPath => `file '${path.basename(segmentPath)}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatFilePath,
      "-c", "copy",
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
        console.error('Video concatenation error:', stderr);
        reject(new Error(`Video concatenation failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

async function addAudioToVideo(
  videoPath: string, 
  audioPath: string, 
  outputPath: string,
  options: {
    subtitles?: { segments: Array<{ text: string; duration: number }>; enabled: boolean };
    textColor?: string;
    videoTopic?: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-y",
      "-i", videoPath,
      "-i", audioPath
    ];

    // Add simple text overlay if enabled
    if (options.subtitles?.enabled && options.videoTopic) {
      const safeText = options.videoTopic
        .replace(/['"\\:]/g, '')
        .replace(/[^\w\s\.,!?-]/g, '')
        .substring(0, 30);
      
      const textColor = options.textColor || 'yellow';
      
      ffmpegArgs.push(
        "-vf", `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeText}':fontsize=48:fontcolor=${textColor}:x=(w-text_w)/2:y=80:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
        "-map", "0:v",
        "-map", "1:a"
      );
    } else {
      ffmpegArgs.push(
        "-c:v", "copy",
        "-map", "0:v",
        "-map", "1:a"
      );
    }

    ffmpegArgs.push(
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
        console.error('Audio addition error:', stderr);
        reject(new Error(`Audio addition failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}