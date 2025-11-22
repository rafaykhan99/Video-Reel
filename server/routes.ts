import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertVideoSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import Stripe from "stripe";

// Initialize Stripe if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-07-30.basil",
  });
}
import { generateScript, generateImage } from "./services/openai";
import { generateImageWithRunware } from "./services/runware";
import { generateAudio } from "./services/textToSpeech";
import { generateFallbackScript } from "./services/fallbackScript";
import { newsService } from "./newsService";
import { createVideo, downloadImage } from "./services/enhancedVideoProcessor";
import { createVideoWithRevideo } from "./services/createVideoWithRevideo"; // Open-source alternative to Remotion
import { cleanupTempFiles, ensureTempDirectory } from "./services/videoProcessor";
import path from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import fs from "fs";

// Utility function to get actual audio duration using ffprobe
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet', 
      '-show_entries', 'format=duration', 
      '-of', 'csv=p=0',
      audioPath
    ]);

    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        if (!isNaN(duration)) {
          resolve(duration);
        } else {
          reject(new Error('Could not parse audio duration'));
        }
      } else {
        reject(new Error(`ffprobe failed with code ${code}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(error);
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Create a new video project (protected)
  app.post("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      console.log("Creating video with data:", JSON.stringify(req.body, null, 2));
      const userId = req.user.claims.sub;
      const validatedData = insertVideoSchema.parse({ ...req.body, userId });
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const video = await storage.createVideo(validatedData);
      console.log("Created video:", JSON.stringify(video, null, 2));
      res.json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Invalid video data" 
      });
    }
  });

  // Get video by ID (protected)
  app.get("/api/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error getting video:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's videos (protected)
  app.get("/api/videos", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const videos = await storage.getUserVideos(userId, limit);
      res.json(videos);
    } catch (error) {
      console.error("Error getting videos:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete video endpoint
  app.delete("/api/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.claims.sub;

      // Check if video exists and belongs to user
      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Delete the video (this will also delete associated credit transactions)
      const deleted = await storage.deleteVideo(videoId);
      if (deleted) {
        console.log(`Video ${videoId} deleted successfully by user ${userId}`);
        res.json({ message: "Video deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete video" });
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Get user's credit balance and transactions (protected)
  app.get("/api/credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const transactions = await storage.getUserCreditTransactions(userId, 10);
      
      res.json({
        balance: user?.credits || 0,
        transactions,
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get credit packages
  app.get("/api/credits/packages", async (req, res) => {
    try {
      const packages = await storage.getCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create Stripe checkout session for credit package purchase
  app.post("/api/credits/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { packageId } = req.body;
      const userId = req.user.claims.sub;

      const creditPackage = await storage.getCreditPackage(packageId);
      if (!creditPackage) {
        return res.status(404).json({ message: "Credit package not found" });
      }

      if (!stripe) {
        throw new Error('Stripe not configured');
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: creditPackage.name,
                description: `${creditPackage.credits + (creditPackage.bonusCredits || 0)} credits for video generation`,
              },
              unit_amount: creditPackage.priceUsd,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin || 'http://localhost:5000'}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || 'http://localhost:5000'}/credits?canceled=true`,
        metadata: {
          userId,
          packageId,
          credits: creditPackage.credits.toString(),
          bonusCredits: (creditPackage.bonusCredits || 0).toString(),
        },
      });

      // For development, simulate successful purchase in MemStorage
      if (req.headers.host?.includes('localhost') || req.headers.host?.includes('replit.dev')) {
        // Simulate successful purchase for development
        const purchaseSuccess = await storage.purchaseCreditPackage(
          userId, 
          packageId, 
          `mock_payment_${Date.now()}`
        );
        
        if (purchaseSuccess) {
          return res.json({ 
            sessionId: `mock_session_${Date.now()}`,
            packageInfo: creditPackage,
            mockSuccess: true // Flag for frontend to handle mock success
          });
        }
      }

      res.json({ 
        sessionId: session.id,
        packageInfo: creditPackage 
      });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Purchase credit package (protected)
  app.post("/api/credits/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { packageId, stripePaymentIntentId } = req.body;

      if (!packageId) {
        return res.status(400).json({ message: "Package ID is required" });
      }

      const success = await storage.purchaseCreditPackage(userId, packageId, stripePaymentIntentId);

      if (success) {
        // Return updated user balance and transactions
        const user = await storage.getUser(userId);
        const transactions = await storage.getUserCreditTransactions(userId, 10);
        
        res.json({
          success: true,
          balance: user?.credits || 0,
          transactions,
          message: "Credit package purchased successfully"
        });
      } else {
        res.status(400).json({ 
          success: false,
          message: "Failed to purchase credit package" 
        });
      }
    } catch (error) {
      console.error("Error purchasing credit package:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Calculate video cost preview
  app.post("/api/videos/calculate-cost", isAuthenticated, async (req, res) => {
    try {
      const { duration, imageProvider } = req.body;
      const imageCount = Math.ceil(duration / 20); // 1 image per 20 seconds
      const credits = storage.calculateVideoCredits(duration, imageProvider, imageCount);
      
      res.json({
        credits,
        estimatedUsdCost: credits * 0.002,
        breakdown: {
          scriptGeneration: 1,
          textToSpeech: Math.ceil(duration / 60),
          imageGeneration: imageProvider === "dalle" ? imageCount * 20 : imageCount * 1,
          processing: 2,
        }
      });
    } catch (error) {
      console.error("Error calculating video cost:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update video script (for editing)
  app.put("/api/videos/:id/script", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.claims.sub;
      const { script } = req.body;

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      const updatedVideo = await storage.updateVideo(videoId, {
        script,
        status: "editing"
      });

      res.json(updatedVideo);
    } catch (error) {
      console.error("Error updating script:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Regenerate images for video
  app.post("/api/videos/:id/regenerate-images", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.claims.sub;

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      // TODO: Implement image regeneration logic here
      // For now, just update status to indicate images are being regenerated
      const updatedVideo = await storage.updateVideo(videoId, {
        status: "script_generated" // Reset to script generated to trigger image regeneration
      });

      res.json({ message: "Image regeneration started", video: updatedVideo });
    } catch (error) {
      console.error("Error regenerating images:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Regenerate single image for video
  app.post("/api/videos/:id/regenerate-image/:imageIndex", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const imageIndex = parseInt(req.params.imageIndex);
      const userId = req.user.claims.sub;
      const { imageProvider, runwareModel } = req.body;
      
      console.log('Regenerate single image request:', {
        videoId,
        imageIndex,
        imageProvider,
        runwareModel,
        body: req.body
      });

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (!video.assets || typeof video.assets !== 'object') {
        return res.status(400).json({ message: "Video assets not found" });
      }

      const assets = video.assets as any;
      if (!assets.scriptSegments || !assets.images) {
        return res.status(400).json({ message: "Script segments or images not found" });
      }

      if (imageIndex < 0 || imageIndex >= assets.scriptSegments.length) {
        return res.status(400).json({ message: "Invalid image index" });
      }

      const scriptSegment = assets.scriptSegments[imageIndex];
      if (!scriptSegment || !scriptSegment.imagePrompt) {
        return res.status(400).json({ message: "Script segment or image prompt not found" });
      }

      // Calculate credit cost for single image based on selected provider
      const selectedProvider = imageProvider || video.imageProvider;
      const imageCost = selectedProvider === 'runware' ? 1 : 5;
      
      // Check user credits
      const user = await storage.getUser(userId);
      if (!user || (user.credits || 0) < imageCost) {
        return res.status(402).json({ 
          message: "Insufficient credits",
          required: imageCost,
          current: user?.credits || 0
        });
      }

      // Deduct credits
      const creditDeducted = await storage.deductCredits(userId, imageCost, `Regenerate image ${imageIndex + 1} for video ${videoId}`);
      if (!creditDeducted) {
        return res.status(402).json({ message: "Failed to deduct credits" });
      }

      try {
        // Generate new image using selected provider and model
        let newImageUrl: string;
        
        if (selectedProvider === 'runware') {
          const { generateImageWithRunware } = await import('./services/runware');
          const modelToUse = runwareModel || video.runwareModel || 'runware:100@1';
          console.log('Using Runware model:', modelToUse);
          newImageUrl = await generateImageWithRunware(
            scriptSegment.imagePrompt,
            video.imageStyle || 'modern',
            modelToUse
          );
        } else {
          const { generateImage } = await import('./services/openai');
          newImageUrl = await generateImage(scriptSegment.imagePrompt, video.imageStyle || 'modern');
        }

        // Update the specific image in assets
        const updatedImages = [...assets.images];
        updatedImages[imageIndex] = newImageUrl;

        const updatedAssets = {
          ...assets,
          images: updatedImages
        };

        // Update video with new image
        const updatedVideo = await storage.updateVideo(videoId, {
          assets: updatedAssets
        });

        res.json({ 
          message: "Image regenerated successfully", 
          video: updatedVideo,
          newImageUrl: newImageUrl,
          imageIndex: imageIndex
        });

      } catch (error) {
        // Refund credits if image generation fails
        await storage.addCredits(userId, imageCost, `Refund for failed image regeneration - video ${videoId}`);
        throw error;
      }

    } catch (error) {
      console.error("Error regenerating single image:", error);
      res.status(500).json({ message: "Failed to regenerate image" });
    }
  });

  // Serve audio files for preview
  app.get("/api/videos/:id/audio", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Look for audio files in multiple locations
      const tempDirs = [
        path.join(process.cwd(), "temp", videoId),
        path.join(process.cwd(), "temp")
      ];
      
      console.log(`[Audio] Looking for audio files for video ${videoId} in:`, tempDirs);
      
      const audioFiles = ["final_audio.mp3", "audio_0.mp3", "audio_1.mp3", "audio_2.mp3"];
      
      // First check video-specific temp directory
      for (const tempDir of tempDirs) {
        for (const audioFile of audioFiles) {
          const audioPath = path.join(tempDir, audioFile);
          if (fs.existsSync(audioPath)) {
            const stat = fs.statSync(audioPath);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'no-cache');
            
            const stream = fs.createReadStream(audioPath);
            stream.pipe(res);
            return;
          }
        }
        
        // Also check for files with video ID prefix or partial ID match
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          
          // First try exact video ID match
          let audioFile = files.find(f => f.includes(videoId) && f.endsWith('.mp3'));
          
          // If not found, try pattern matching for generated audio files
          if (!audioFile) {
            // Look for preview audio first, then any other audio files
            audioFile = files.find(f => f === 'preview_audio.mp3') ||
                       files.find(f => f.startsWith('audio-') && f.endsWith('.mp3')) ||
                       files.find(f => f.endsWith('.mp3')); // Any mp3 file as fallback
          }
          
          if (audioFile) {
            const audioPath = path.join(tempDir, audioFile);
            console.log(`[Audio] Found audio file: ${audioPath}`);
            const stat = fs.statSync(audioPath);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'no-cache');
            
            const stream = fs.createReadStream(audioPath);
            stream.pipe(res);
            return;
          }
        }
      }
      
      res.status(404).json({ message: "Audio not found" });
    } catch (error) {
      console.error("Error serving audio:", error);
      res.status(500).json({ message: "Failed to serve audio" });
    }
  });

  // Compile video (final step)
  app.post("/api/videos/:id/compile", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.claims.sub;
      const { customImages } = req.body;

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.status !== "editing") {
        return res.status(400).json({ message: "Video must be in editing status to compile" });
      }

      // Update status to generating
      await storage.updateVideo(videoId, {
        status: "generating"
      });

      // Respond immediately and compile in background
      res.json({ message: "Video compilation started", videoId });

      // Start background compilation process
      compileVideoInBackground(videoId, userId, customImages).catch(async error => {
        console.error(`Background compilation failed for video ${videoId}:`, error);
        // Update status to error with proper error handling
        try {
          await storage.updateVideo(videoId, { 
            status: "failed", 
            errorMessage: error instanceof Error ? error.message : "Unknown compilation error"
          });
        } catch (updateError) {
          console.error(`Failed to update video status after error:`, updateError);
        }
      });

    } catch (error) {
      console.error("Error starting video compilation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Background video compilation function
  async function compileVideoInBackground(videoId: string, userId: string, customImages?: Record<string, string>) {
    console.log(`[compileVideo] Starting compilation for video ${videoId}`);
    
    try {
      // Set status to compiling immediately for real-time updates
      await storage.updateVideo(videoId, { status: "compiling" });
      
      const video = await storage.getVideo(videoId);
      if (!video) {
        throw new Error("Video not found");
      }

      // Get script segments from assets (where they're actually stored)
      const videoAssets = video.assets as { images: string[]; scriptSegments?: any[] } | undefined;
      const scriptSegments = videoAssets?.scriptSegments;
      
      if (!scriptSegments || !Array.isArray(scriptSegments)) {
        console.error("No script segments found in video assets:", videoAssets);
        throw new Error("Invalid script data - no segments found in assets");
      }

      console.log(`[compileVideo] Generating audio for ${scriptSegments.length} segments`);
      
      // Create temp directory for this video
      const tempDir = path.join(process.cwd(), 'temp', videoId);
      ensureTempDirectory();

      // Generate audio for each script segment
      const audioSegments: string[] = [];
      const audioDurations: number[] = [];

      for (let i = 0; i < scriptSegments.length; i++) {
        const segment = scriptSegments[i];
        const audioPath = path.join(tempDir, `audio_${i}.mp3`);
        
        console.log(`[compileVideo] Generating audio for segment ${i + 1}/${scriptSegments.length}`);
        await generateAudio(segment.text, video.voiceStyle || 'professional', audioPath, video.language || 'english');
        
        // Get actual audio duration
        const duration = await getAudioDuration(audioPath);
        audioSegments.push(audioPath);
        audioDurations.push(duration);
        
        console.log(`[compileVideo] Audio segment ${i + 1} generated: ${duration.toFixed(2)}s`);
      }

      // Download images or use custom images
      const images: string[] = [];
      
      if (!videoAssets?.images || videoAssets.images.length === 0) {
        throw new Error("No images found in video assets");
      }

      for (let i = 0; i < videoAssets.images.length; i++) {
        const imageUrl = customImages?.[i.toString()] || videoAssets.images[i];
        const imagePath = path.join(tempDir, `image_${i}.jpg`);
        
        console.log(`[compileVideo] Downloading image ${i + 1}/${videoAssets.images.length}`);
        await downloadImage(imageUrl, imagePath);
        images.push(imagePath);
      }

      // Create subtitle data with accurate timing (calculate startTime and endTime)
      let currentTime = 0;
      const subtitleData = {
        segments: scriptSegments.map((segment: any, index: number) => {
          const duration = audioDurations[index];
          const subtitleSegment = {
            text: segment.text,
            duration: duration,
            startTime: currentTime,
            endTime: currentTime + duration
          };
          currentTime += duration; // Move to next segment start time
          return subtitleSegment;
        }),
        enabled: (video.subtitleData as any)?.enabled !== false // Default to enabled
      };

      // Prepare script segments for animated text overlays
      const scriptSegmentsForVideo = scriptSegments.map((segment: any, index: number) => ({
        text: segment.text,
        duration: audioDurations[index]
      }));

      // Prepare video assets
      const assets = {
        images,
        audioSegments,
        scriptSegments: scriptSegmentsForVideo
      };

      // Create final video with enhanced features
      const outputPath = path.join(tempDir, `${videoId}.mp4`);
      const totalAudioDuration = audioDurations.reduce((sum, duration) => sum + duration, 0);
      
      console.log(`[compileVideo] Creating enhanced video at ${outputPath}`);
      console.log(`[compileVideo] Audio segments:`, audioSegments);
      console.log(`[compileVideo] Image paths:`, images);
      console.log(`[compileVideo] Total audio duration:`, totalAudioDuration);
      // Use the working Remotion system instead of experimental Revideo
      const { createVideoWithRemotion } = await import('./services/createVideoWithRemotion');
      await createVideoWithRemotion(assets, outputPath, totalAudioDuration, subtitleData, video.topic, video.textFont || undefined, video.textColor || undefined);

      // Update video with final results
      await storage.updateVideo(videoId, {
        status: "completed",
        videoUrl: outputPath,
        subtitleData,
        assets: {
          images: videoAssets.images,
          audioSegments: audioSegments.map(segment => segment.replace(process.cwd(), '')),
          scriptSegments: videoAssets.scriptSegments
        }
      });

      console.log(`[compileVideo] Video compilation completed successfully for ${videoId}`);

    } catch (error) {
      console.error(`[compileVideo] Error compiling video ${videoId}:`, error);
      await storage.updateVideo(videoId, {
        status: "failed"
      });
      throw error;
    }
  }

  // Generate video content (initial generation)
  app.post("/api/videos/:id/generate", isAuthenticated, async (req: any, res) => {
    try {
      const videoId = req.params.id;
      const userId = req.user.claims.sub;
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.status !== "pending") {
        return res.status(400).json({ message: "Video generation already in progress or completed" });
      }

      // Calculate credits needed
      const imageCount = Math.ceil(video.duration / 20);
      const creditsNeeded = storage.calculateVideoCredits(
        video.duration, 
        video.imageProvider || "runware", 
        imageCount
      );

      // Check if user has sufficient credits
      const user = await storage.getUser(userId);
      if (!user || (user.credits || 0) < creditsNeeded) {
        return res.status(402).json({ 
          message: "Insufficient credits",
          required: creditsNeeded,
          current: user?.credits || 0
        });
      }

      // Deduct credits before starting generation
      const creditDeducted = await storage.deductCreditsForVideo(userId, videoId, creditsNeeded);
      if (!creditDeducted) {
        return res.status(402).json({ message: "Failed to deduct credits" });
      }

      // Update status to generating (during script and image generation)
      await storage.updateVideo(videoId, { status: "generating" });

      // Start script and image generation process asynchronously
      console.log(`Starting script and image generation for video ${videoId}`);
      generateScriptAndImages(videoId).catch(async (error) => {
        console.error("Video generation failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        try {
          await storage.updateVideo(videoId, { 
            status: "failed",
            errorMessage: errorMessage 
          });
        } catch (updateError) {
          console.error("Failed to update video status to failed:", updateError);
        }
      });

      res.json({ message: "Video generation started" });
    } catch (error) {
      console.error("Error starting video generation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Download video
  app.get("/api/videos/:id/download", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      
      if (!video || !video.videoUrl) {
        return res.status(404).json({ message: "Video not found or not ready" });
      }

      res.download(video.videoUrl, `video-${video.id}.mp4`);
    } catch (error) {
      console.error("Error downloading video:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Serve video file
  app.get("/api/videos/:id/file", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      
      if (!video || !video.videoUrl) {
        return res.status(404).json({ message: "Video not found or not ready" });
      }

      res.setHeader('Content-Type', 'video/mp4');
      res.sendFile(path.resolve(video.videoUrl));
    } catch (error) {
      console.error("Error serving video:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Retry video generation
  app.post("/api/videos/:id/retry", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await storage.getVideo(videoId);
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.status !== "failed" && video.status !== "generating") {
        return res.status(400).json({ message: "Can only retry failed or stuck videos" });
      }

      // Reset video to pending state and clear error message
      await storage.updateVideo(videoId, { 
        status: "pending",
        errorMessage: null,
        videoUrl: null,
        assets: null
      });

      res.json({ message: "Video reset for retry", video: await storage.getVideo(videoId) });
    } catch (error) {
      console.error("Error resetting video for retry:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete video
  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const success = await storage.deleteVideo(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Image Studio endpoints

  // Get saved images for current user
  app.get("/api/images/saved", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const images = await storage.getSavedImages(userId);
      res.json(images);
    } catch (error) {
      console.error("Error fetching saved images:", error);
      res.status(500).json({ message: "Failed to fetch saved images" });
    }
  });

  // Generate image with AI
  app.post("/api/images/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { prompt, model, style } = req.body;

      if (!prompt || !model) {
        return res.status(400).json({ message: "Prompt and model are required" });
      }

      // TODO: Implement image generation with Runware
      // For now, return a mock response to avoid the HTML error
      const mockImageResult = {
        id: randomUUID(),
        url: "https://via.placeholder.com/512x512?text=Generated+Image",
        filename: `generated_${Date.now()}.png`,
        size: 1024000,
        type: "generated"
      };

      res.json({ success: true, image: mockImageResult });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // Remove background from image
  app.post("/api/images/remove-background", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // TODO: Implement background removal with Runware runware:110@1
      // For now, return a mock response to avoid the HTML error
      const mockResult = {
        id: randomUUID(),
        url: "https://via.placeholder.com/512x512?text=Background+Removed",
        filename: `bg_removed_${Date.now()}.png`,
        size: 1024000,
        type: "background-removed"
      };

      res.json({ success: true, image: mockResult });
    } catch (error) {
      console.error("Error removing background:", error);
      res.status(500).json({ message: "Failed to remove background" });
    }
  });

  // Upscale image
  app.post("/api/images/upscale", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // TODO: Implement image upscaling when AIR tag is provided
      // For now, return a mock response to avoid the HTML error
      const mockResult = {
        id: randomUUID(),
        url: "https://via.placeholder.com/1024x1024?text=Upscaled+Image",
        filename: `upscaled_${Date.now()}.png`,
        size: 4096000,
        type: "upscaled"
      };

      res.json({ success: true, image: mockResult });
    } catch (error) {
      console.error("Error upscaling image:", error);
      res.status(500).json({ message: "Failed to upscale image" });
    }
  });

  // Delete saved image
  app.delete("/api/images/:imageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { imageId } = req.params;

      await storage.deleteSavedImage(imageId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Connected accounts endpoints
  
  // Get connected accounts for current user
  app.get("/api/connected-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const accounts = await storage.getConnectedAccounts(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching connected accounts:", error);
      res.status(500).json({ message: "Failed to fetch connected accounts" });
    }
  });

  // Initiate YouTube OAuth connection
  app.post("/api/connect/youtube", isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Implement YouTube OAuth flow
      // For now, return a mock auth URL
      const authUrl = `https://accounts.google.com/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline`;
      
      res.json({ authUrl });
    } catch (error) {
      console.error("Error initiating YouTube connection:", error);
      res.status(500).json({ message: "Failed to initiate YouTube connection" });
    }
  });

  // Handle OAuth callback (after user authorizes)
  app.get("/api/connect/youtube/callback", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.query;
      const userId = req.user.claims.sub;
      
      // TODO: Exchange code for access token and save account
      // For now, create a mock connected account
      const connectedAccount = await storage.createConnectedAccount({
        userId,
        platform: "youtube",
        platformUserId: "mock-youtube-user-id",
        platformUsername: "Mock YouTube Channel",
        platformEmail: "user@example.com",
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour
        channelId: "mock-channel-id",
        channelName: "Mock YouTube Channel",
        isActive: true,
      });

      res.redirect("/connect-accounts?success=true");
    } catch (error) {
      console.error("Error handling YouTube callback:", error);
      res.redirect("/connect-accounts?error=connection_failed");
    }
  });

  // Disconnect account
  app.delete("/api/connected-accounts/:accountId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { accountId } = req.params;

      await storage.deleteConnectedAccount(accountId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      res.status(500).json({ message: "Failed to disconnect account" });
    }
  });

  // Music library endpoints

  // Get music tracks with optional filters
  app.get("/api/music-library", async (req, res) => {
    try {
      const { search, genre, mood } = req.query;
      const filters = {
        search: search as string,
        genre: genre as string,
        mood: mood as string,
      };
      
      const tracks = await storage.getMusicTracks(filters);
      res.json(tracks);
    } catch (error) {
      console.error("Error fetching music tracks:", error);
      res.status(500).json({ message: "Failed to fetch music tracks" });
    }
  });

  // Download music track
  app.post("/api/music-library/:trackId/download", isAuthenticated, async (req: any, res) => {
    try {
      const { trackId } = req.params;
      const track = await storage.getMusicTrack(trackId);
      
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }

      // Return download URL (in real implementation, this would be a signed URL)
      res.json({
        downloadUrl: track.fileUrl,
        filename: `${track.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`
      });
    } catch (error) {
      console.error("Error downloading track:", error);
      res.status(500).json({ message: "Failed to download track" });
    }
  });

  // Add music to video
  app.post("/api/videos/:videoId/add-music", isAuthenticated, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const { musicTrackId } = req.body;
      const userId = req.user.claims.sub;

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      const track = await storage.getMusicTrack(musicTrackId);
      if (!track) {
        return res.status(404).json({ message: "Music track not found" });
      }

      // Update video with music track info
      const updatedVideo = await storage.updateVideo(videoId, {
        assets: {
          ...(video.assets as any),
          musicTrack: {
            id: track.id,
            title: track.title,
            artist: track.artist,
            fileUrl: track.fileUrl,
            license: track.license,
          }
        }
      });

      res.json({ success: true, video: updatedVideo });
    } catch (error) {
      console.error("Error adding music to video:", error);
      res.status(500).json({ message: "Failed to add music to video" });
    }
  });

  // Upload video to platform
  app.post("/api/videos/:videoId/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const { platform, connectedAccountId, title, description, tags, privacy } = req.body;
      const userId = req.user.claims.sub;

      const video = await storage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.status !== "completed") {
        return res.status(400).json({ message: "Video is not ready for upload" });
      }

      // Create upload record
      const upload = await storage.createVideoUpload({
        videoId,
        connectedAccountId,
        platform,
        title: title || video.topic,
        description: description || `Video created with Explainer AI Video Generator`,
        tags: tags || [],
        privacy: privacy || "private",
        uploadStatus: "pending",
      });

      // TODO: Implement actual upload to platform (YouTube, etc.)
      // For now, simulate upload process
      setTimeout(async () => {
        await storage.updateVideoUpload(upload.id, {
          uploadStatus: "completed",
          platformVideoId: `mock-${platform}-video-id`,
          uploadUrl: `https://youtube.com/watch?v=mock-video-id`,
        });
      }, 2000);

      res.json({ success: true, uploadId: upload.id });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ message: "Failed to upload video" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Generate only script and images (for editing workflow)
async function generateScriptAndImages(videoId: string): Promise<void> {
  console.log(`[generateScriptAndImages] Starting for video ${videoId}`);
  const video = await storage.getVideo(videoId);
  if (!video) {
    console.error(`[generateScriptAndImages] Video ${videoId} not found`);
    throw new Error("Video not found");
  }

  try {
    // Step 1: Generate script
    console.log(`[generateScriptAndImages] Generating script for video: ${videoId}, category: ${video.category}`);
    let scriptSegments;
    
    try {
      // Special handling for news category
      if (video.category === "news") {
        console.log(`[News Generation] Searching for current news on: ${video.topic}`);
        
        // Search for current news about the topic
        const newsData = await newsService.searchCurrentNews(video.topic);
        console.log(`[News Generation] Found news: ${newsData.headline}`);
        
        // Generate news-style script based on the search results
        const newsScript = await newsService.generateNewsScript(
          newsData,
          video.duration,
          video.language || "english"
        );
        
        scriptSegments = newsScript.segments;
        console.log(`[News Generation] Script generated with ${scriptSegments.length} segments`);
      } else {
        // Generate regular script using the category-specific prompt
        scriptSegments = await generateScript(video.topic, video.duration, video.language || "english");
        console.log("Using OpenAI generated script");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        console.log("OpenAI quota exceeded, using fallback script generator");
        scriptSegments = generateFallbackScript(video.topic, video.duration, video.language || "english");
      } else {
        throw error;
      }
    }
    
    await storage.updateVideo(videoId, { 
      script: scriptSegments.map(s => s.text).join(' ') 
    });

    // Step 2: Generate images
    console.log("Generating images for video:", videoId);
    const imageUrls: string[] = [];
    
    for (let i = 0; i < scriptSegments.length; i++) {
      const segment = scriptSegments[i];
      try {
        let imageUrl: string;
        const imageStyle = video.imageStyle || 'modern';
        const imageProvider = video.imageProvider || 'runware';

        // Use English image prompts for better generation quality (check if dual-language script)
        const promptToUse = segment.imagePromptEnglish || segment.imagePrompt;
        console.log(`Generating image ${i} with English prompt: "${promptToUse}"`);

        if (imageProvider === 'runware') {
          imageUrl = await generateImageWithRunware(
            promptToUse, // Use English prompt for better results
            imageStyle, 
            video.runwareModel || 'runware:100@1'
          );
        } else {
          imageUrl = await generateImage(promptToUse, imageStyle); // Use English prompt for better results
        }
        
        imageUrls.push(imageUrl);
        console.log(`Image ${i} generated successfully with ${imageProvider} using English prompt`);
      } catch (error) {
        console.error(`Failed to generate image ${i}:`, error);
        throw error;
      }
    }

    // Generate preview audio for the first script segment only (for audio preview)
    console.log(`[generateScriptAndImages] Generating preview audio for video ${videoId}`);
    const tempDir = path.join(process.cwd(), 'temp', videoId);
    ensureTempDirectory();
    
    try {
      if (scriptSegments.length > 0) {
        const firstSegment = scriptSegments[0];
        const previewAudioPath = path.join(tempDir, 'preview_audio.mp3');
        await generateAudio(firstSegment.text, video.voiceStyle || 'professional', previewAudioPath, video.language || 'english');
        console.log(`[generateScriptAndImages] Preview audio generated at ${previewAudioPath}`);
      }
    } catch (audioError) {
      console.warn(`[generateScriptAndImages] Failed to generate preview audio:`, audioError);
      // Don't fail the entire process if preview audio fails
    }

    // Update video with generated content and set status to editing
    await storage.updateVideo(videoId, {
      script: scriptSegments.map(s => s.text).join(' '),
      assets: { images: imageUrls, scriptSegments },
      status: "editing"
    });

    console.log(`[generateScriptAndImages] Script and images generated successfully for editing. Video ${videoId} status set to 'editing'`);
  } catch (error) {
    console.error(`[generateScriptAndImages] Script and image generation failed for video ${videoId}:`, error);
    await storage.updateVideo(videoId, { 
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error occurred"
    });
    throw error;
  }
}

async function generateVideoContent(videoId: string): Promise<void> {
  const video = await storage.getVideo(videoId);
  if (!video) throw new Error("Video not found");

  const tempDir = ensureTempDirectory();
  const tempFiles: string[] = [];

  try {
    // Set overall timeout for the entire process (10 minutes)
    let timeoutId: NodeJS.Timeout | null = null;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Video generation timed out after 10 minutes"));
      }, 10 * 60 * 1000);
    });
    
    const generationPromise = async () => {
      // Step 1: Generate script (try OpenAI first, fallback if quota exceeded)
      console.log("Generating script for video:", videoId);
      let scriptSegments;
      
      try {
        scriptSegments = await generateScript(video.topic, video.duration, video.language || "english");
        console.log("Using OpenAI generated script");
      } catch (error) {
        if (error instanceof Error && error.message.includes('quota')) {
          console.log("OpenAI quota exceeded, using fallback script generator");
          scriptSegments = generateFallbackScript(video.topic, video.duration, video.language || "english");
        } else {
          throw error;
        }
      }
      console.log(`Script generated successfully. Segments: ${scriptSegments.length}`);
      
      await storage.updateVideo(videoId, { 
        script: scriptSegments.map(s => s.text).join(' ') 
      });
      console.log("Script saved to storage");

      // Step 2: Generate images for each script segment
      console.log("Generating images for video:", videoId);
      const imagePaths: string[] = [];
      
      for (let i = 0; i < scriptSegments.length; i++) {
        const segment = scriptSegments[i];
        try {
          let imageUrl: string;
          const imageStyle = video.imageStyle || 'modern';
          const imageProvider = video.imageProvider || 'dalle';

          console.log(`Generating image ${i} with ${imageProvider} provider (style: ${imageStyle})`);

          if (imageProvider === 'runware') {
            imageUrl = await generateImageWithRunware(
              segment.imagePrompt, 
              imageStyle, 
              video.runwareModel || 'runware:100@1'
            );
          } else {
            imageUrl = await generateImage(segment.imagePrompt, imageStyle);
          }

          const imagePath = path.join(tempDir, `image-${videoId}-${i}.jpg`);
          await downloadImage(imageUrl, imagePath);
          imagePaths.push(imagePath);
          tempFiles.push(imagePath);
          console.log(`Image ${i} generated successfully with ${imageProvider}`);
        } catch (error) {
          console.error(`Error generating image ${i} with ${video.imageProvider || 'dalle'}:`, error);
          throw error;
        }
      }

      // Step 3: Generate audio for each script segment
      console.log("Generating audio for video:", videoId);
      const audioPaths: string[] = [];
      
      for (let i = 0; i < scriptSegments.length; i++) {
        const segment = scriptSegments[i];
        try {
          const audioPath = path.join(tempDir, `audio-${videoId}-${i}.mp3`);
          await generateAudio(segment.text, video.voiceStyle || 'professional', audioPath, video.language || "english");
          audioPaths.push(audioPath);
          tempFiles.push(audioPath);
        } catch (error) {
          console.error(`Error generating audio ${i}:`, error);
          throw error;
        }
      }

      // Step 4: Compile video
      console.log("Compiling video:", videoId);
      const videoPath = path.join(tempDir, `video-${videoId}.mp4`);
      
      await createVideo(
        { images: imagePaths, audioSegments: audioPaths },
        videoPath,
        video.duration,
        video.subtitles ? {
          segments: scriptSegments,
          enabled: true
        } : undefined
      );

      // Step 5: Create subtitle timing data for client-side display using actual audio durations
      let subtitleData = null;
      if (video.subtitles && scriptSegments.length > 0) {
        const segments = [];
        let currentStartTime = 0;

        for (let i = 0; i < scriptSegments.length; i++) {
          const audioPath = audioPaths[i];
          let audioDuration = scriptSegments[i].duration; // fallback to script duration

          // Get actual audio duration using ffprobe
          try {
            audioDuration = await getAudioDuration(audioPath);
            console.log(`Audio segment ${i} actual duration: ${audioDuration}s`);
          } catch (error) {
            console.log(`Could not get audio duration for segment ${i}, using script duration: ${audioDuration}s`);
          }

          segments.push({
            text: scriptSegments[i].text,
            startTime: currentStartTime,
            endTime: currentStartTime + audioDuration
          });

          currentStartTime += audioDuration;
        }

        subtitleData = { segments };
        console.log('Subtitle timing data created with actual audio durations:', JSON.stringify(subtitleData, null, 2));
      }

      // Step 6: Update video record
      await storage.updateVideo(videoId, {
        status: "completed",
        videoUrl: videoPath,
        assets: {
          images: imagePaths,
          audioSegments: audioPaths
        },
        subtitleData
      });

      console.log("Video generation completed:", videoId);
    };

    // Race between generation and timeout
    try {
      await Promise.race([generationPromise(), timeoutPromise]);
      
      // Clear timeout if generation completed successfully
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error generating video content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    await storage.updateVideo(videoId, { 
      status: "failed",
      errorMessage: errorMessage
    });
    
    // Cleanup temporary files on error
    await cleanupTempFiles(tempFiles);
    throw error;
  }
}
