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
  console.log(`Creating working video at ${outputPath}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    try {
      // Step 1: Create a single video from all images
      console.log("Step 1: Creating video slideshow from images");
      const slideshowPath = path.join(path.dirname(outputPath), 'slideshow.mp4');
      await createSlideshow(assets.images, slideshowPath, totalDuration);

      // Step 2: Process and concatenate audio
      console.log("Step 2: Processing audio");
      const audioPath = path.join(path.dirname(outputPath), 'final_audio.mp3');
      await processAudio(assets.audioSegments, audioPath);

      // Step 3: Combine video and audio
      console.log("Step 3: Combining video and audio");
      await combineVideoAudio(slideshowPath, audioPath, outputPath, {
        subtitles,
        textColor,
        videoTopic
      });

      // Cleanup
      if (fs.existsSync(slideshowPath)) fs.unlinkSync(slideshowPath);
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

      console.log("Working video creation completed successfully");
      resolve(outputPath);

    } catch (error) {
      console.error("Error in working video creation:", error);
      reject(error);
    }
  });
}

async function createSlideshow(imagePaths: string[], outputPath: string, totalDuration: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const durationPerImage = totalDuration / imagePaths.length;
    const ffmpegArgs = ["-y"];

    // Add all images as inputs
    imagePaths.forEach(imagePath => {
      ffmpegArgs.push("-loop", "1", "-t", durationPerImage.toString(), "-i", imagePath);
    });

    // Create enhanced filter with zoom effects
    const zoomEffects = [
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,zoompan=z=\'min(zoom+0.0015,1.5)\':d=125',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,zoompan=z=\'if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))\':d=125',
      'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,zoompan=z=\'min(zoom+0.001,1.3)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=125'
    ];
    
    const imageFilters = imagePaths.map((_, index) => {
      const effect = zoomEffects[index % zoomEffects.length];
      return `[${index}:v]${effect},format=yuv420p,setpts=PTS-STARTPTS[v${index}]`;
    }).join(';');

    const concatInputs = imagePaths.map((_, index) => `[v${index}]`).join('');
    const filterComplex = `${imageFilters};${concatInputs}concat=n=${imagePaths.length}:v=1:a=0[outv]`;

    ffmpegArgs.push(
      "-filter_complex", filterComplex,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-r", "25",
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
        console.error('Slideshow creation error:', stderr);
        reject(new Error(`Slideshow creation failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

async function processAudio(audioSegments: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = ["-y"];

    // Add all audio segments as inputs
    audioSegments.forEach(audioPath => {
      ffmpegArgs.push("-i", audioPath);
    });

    // Use simple concat filter for audio
    const filterComplex = `concat=n=${audioSegments.length}:v=0:a=1[outa]`;

    ffmpegArgs.push(
      "-filter_complex", filterComplex,
      "-map", "[outa]",
      "-c:a", "mp3",
      "-b:a", "128k",
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
        console.error('Audio processing error:', stderr);
        reject(new Error(`Audio processing failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}

async function combineVideoAudio(
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

    // Add enhanced text overlay if enabled
    if (options.subtitles?.enabled && options.videoTopic) {
      const safeText = options.videoTopic
        .replace(/['"\\:]/g, '')
        .replace(/[^\w\s\.,!?-]/g, '')
        .substring(0, 40);
      
      const textColor = options.textColor || 'yellow';
      
      // Enhanced text overlay with improved styling and positioning
      const textFilter = `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeText}':fontsize=72:fontcolor=${textColor}:x=(w-text_w)/2:y=h*0.08:shadowcolor=black@0.95:shadowx=4:shadowy=4:borderw=3:bordercolor=black@0.9:box=1:boxcolor=black@0.6:boxborderw=10`;
      
      ffmpegArgs.push(
        "-vf", textFilter,
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
        console.error('Video/audio combination error:', stderr);
        reject(new Error(`Video/audio combination failed: ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}