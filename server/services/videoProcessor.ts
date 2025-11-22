import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";

import {
  generateSubtitleFile,
  createSubtitleSegments,
  SubtitleSegment,
} from "./subtitleProcessor";
import { getFontPath } from "@shared/fonts";

export interface VideoAssets {
  images: string[];
  audioSegments: string[];
  scriptSegments?: Array<{ text: string; duration: number }>;
}

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  startTime: number;
  endTime: number;
  color: string;
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
  console.log(
    `Creating video at ${outputPath}, subtitles enabled: ${subtitles?.enabled || false}`,
  );
  console.log(`[createVideo] Text Font: ${textFont || 'dejavu-sans-bold'}`);
  console.log(`[createVideo] Text Color: ${textColor || 'yellow'}`);

  return new Promise(async (resolve, reject) => {
    if (assets.images.length === 0 || assets.audioSegments.length === 0) {
      reject(new Error("No assets provided for video creation"));
      return;
    }

    // Create title page if topic is provided
    let titlePagePath: string | null = null;
    if (videoTopic) {
      titlePagePath = await createTitlePage(
        videoTopic,
        path.dirname(outputPath),
      );
    }

    // Calculate duration per image (reserve 2 seconds for title if exists)
    const titleDuration = titlePagePath ? 2 : 0;
    const contentDuration = totalDuration - titleDuration;
    const durationPerImage = contentDuration / assets.images.length;

    // Create FFmpeg command
    const ffmpegArgs = [
      "-y", // Overwrite output file
    ];

    // Add title page input if it exists
    if (titlePagePath) {
      ffmpegArgs.push(
        "-loop",
        "1",
        "-t",
        titleDuration.toString(),
        "-i",
        titlePagePath,
      );
    }

    // Add image inputs with enhanced transitions
    assets.images.forEach((imagePath, index) => {
      ffmpegArgs.push(
        "-loop",
        "1",
        "-t",
        (durationPerImage + 0.5).toString(),
        "-i",
        imagePath,
      );
    });

    // Add audio inputs
    assets.audioSegments.forEach((audioPath) => {
      ffmpegArgs.push("-i", audioPath);
    });

    // Enhanced video filter with animations and transitions
    const titleIndex = titlePagePath ? 0 : -1;
    const imageStartIndex = titlePagePath ? 1 : 0;

    let filterComplex = "";

    // Title page filter (with fade-in effect) - ensure consistent 1920x1080 output
    if (titlePagePath) {
      filterComplex += `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p,fade=in:0:30,setpts=PTS-STARTPTS[title];`;
    }

    // Simplified image filters - no text overlays, minimal effects
    const imageFilters = assets.images
      .map((_, index) => {
        const inputIndex = imageStartIndex + index;
        let filter = `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p,setpts=PTS-STARTPTS[v${index}]`;
        return filter;
      })
      .join(";");

    filterComplex += imageFilters;

    // Create concatenation filter
    const videoInputs = [];
    if (titlePagePath) {
      videoInputs.push("[title]");
    }
    videoInputs.push(...assets.images.map((_, index) => `[v${index}]`));

    const concatFilter = `${videoInputs.join("")}concat=n=${videoInputs.length}:v=1:a=0[outv]`;

    // Simplified video creation - focus on stability
    console.log(
      "Creating simplified video with stable processing",
    );

    // Audio filter to concatenate all audio segments (accounting for title page)
    const audioStartIndex = assets.images.length + (titlePagePath ? 1 : 0);
    const audioInputs = assets.audioSegments
      .map((_, index) => `[${audioStartIndex + index}:a]`)
      .join("");
    let audioFilter = `${audioInputs}concat=n=${assets.audioSegments.length}:v=0:a=1[concatenated_audio]`;

    // Add silence for title page if it exists
    if (titlePagePath) {
      audioFilter += `;aevalsrc=0:d=${titleDuration}[silence];[silence][concatenated_audio]concat=n=2:v=0:a=1[outa]`;
    } else {
      audioFilter += ";[concatenated_audio]acopy[outa]";
    }

    const finalVideoMap = "[outv]"; // Always use [outv] since subtitles are client-side

    ffmpegArgs.push(
      "-filter_complex",
      `${filterComplex};${concatFilter};${audioFilter}`,
      "-map",
      finalVideoMap,
      "-map",
      "[outa]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    );

    // Clean up title page after video creation
    const cleanup = () => {
      if (titlePagePath && fs.existsSync(titlePagePath)) {
        fs.unlink(titlePagePath, () => {});
      }
    };

    // Simplified filter complex
    const fullFilterComplex = `${filterComplex};${concatFilter};${audioFilter}`;
    console.log("=== SIMPLIFIED FILTER COMPLEX ===");
    console.log("Filter length:", fullFilterComplex.length);
    console.log("=== END FILTER DEBUG ===");
    
    console.log("Starting enhanced FFmpeg with args:", ffmpegArgs.join(" "));
    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    let errorOutput = "";

    // Add a timeout for FFmpeg process (5 minutes)
    const timeoutId = setTimeout(
      () => {
        console.log("FFmpeg process timed out, killing...");
        ffmpeg.kill("SIGKILL");
        reject(new Error("Video creation timed out after 5 minutes"));
      },
      5 * 60 * 1000,
    );

    ffmpeg.stderr.on("data", (data) => {
      const stderr = data.toString();
      console.log("[FFMPEG STDERR]:", stderr);
      errorOutput += stderr;
    });

    ffmpeg.on("close", (code) => {
      clearTimeout(timeoutId);
      cleanup(); // Clean up title page
      console.log(`Enhanced FFmpeg process closed with code: ${code}`);

      if (code === 0) {
        console.log("Enhanced FFmpeg completed successfully");
        resolve(outputPath);
      } else {
        console.error("FFmpeg error:", errorOutput);
        let errorMessage = `FFmpeg process failed (exit code: ${code})`;

        // Parse common FFmpeg errors for more helpful messages
        if (errorOutput.includes("No such file or directory")) {
          errorMessage = "Video compilation failed: Missing input files";
        } else if (errorOutput.includes("Invalid data")) {
          errorMessage =
            "Video compilation failed: Corrupted audio or image data";
        } else if (errorOutput.includes("Permission denied")) {
          errorMessage =
            "Video compilation failed: File access permission error";
        } else if (errorOutput.includes("Disk full")) {
          errorMessage = "Video compilation failed: Insufficient disk space";
        } else if (errorOutput.includes("codec")) {
          errorMessage = "Video compilation failed: Audio/video encoding error";
        }

        reject(new Error(errorMessage));
      }
    });

    ffmpeg.on("error", (error) => {
      clearTimeout(timeoutId);
      cleanup(); // Clean up title page
      console.error("FFmpeg spawn error:", error);
      reject(new Error(`Failed to start FFmpeg: ${error.message}`));
    });
  });
}

// Create an attractive title page for the video
async function createTitlePage(
  topic: string,
  outputDir: string,
): Promise<string> {
  const titlePagePath = path.join(outputDir, "title_page.png");

  // Create title page using ImageMagick-style commands via FFmpeg
  return new Promise((resolve, reject) => {
    // Clean and format the topic text
    const cleanTopic = topic.replace(/['"]/g, "").substring(0, 50); // Limit length and remove quotes

    // Create a simple solid color background with text overlay using FFmpeg
    // Simplified approach to avoid complex gradient overlays that may cause issues
    const ffmpegArgs = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x1e3a8a:size=1920x1080:duration=0.1`, // Solid blue background at 1920x1080
      "-filter_complex",
      [
        // Add main title text with shadow
        `[0:v]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${cleanTopic}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-50:shadowcolor=black:shadowx=3:shadowy=3[title]`,
        // Add "Explainer Video" subtitle with animation
        `[title]drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Explainer Video':fontsize=36:fontcolor=0xe2e8f0:x=(w-text_w)/2:y=(h-text_h)/2+50+5*sin(t*2):shadowcolor=black:shadowx=2:shadowy=2:alpha='if(between(t,0.5,2),1,0)'[final]`,
      ].join(";"),
      "-map",
      "[final]",
      "-frames:v",
      "1",
      "-pix_fmt",
      "yuv420p", // Ensure consistent pixel format
      titlePagePath,
    ];

    console.log("Creating title page with FFmpeg:", ffmpegArgs.join(" "));
    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    let errorOutput = "";

    ffmpeg.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log("Title page created successfully");
        resolve(titlePagePath);
      } else {
        console.error("Title page creation failed:", errorOutput);
        // Return null if title page creation fails, video can continue without it
        resolve(null as any);
      }
    });

    ffmpeg.on("error", (error) => {
      console.error("Title page FFmpeg error:", error);
      resolve(null as any); // Don't fail the whole video creation
    });
  });
}

// Note: Subtitle functionality now integrated into main createVideo function using burn-in text overlay
// This eliminates the problematic two-step SRT subtitle processing that was causing timeouts

export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map((filePath) => {
      return new Promise<void>((resolve) => {
        fs.unlink(filePath, () => resolve()); // Ignore errors, just cleanup
      });
    }),
  );
}

export function ensureTempDirectory(): string {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

// Client-side subtitle implementation - no FFmpeg subtitle processing needed
function createSubtitleDrawtextFilters(
  segments: Array<{ text: string; duration: number }>,
  totalDuration: number,
): string {
  // Subtitles are now handled client-side via VideoPlayer component
  // Return empty string to skip any FFmpeg subtitle processing
  console.log(
    "Using client-side subtitle display - no FFmpeg subtitle processing needed",
  );
  return "";
}
