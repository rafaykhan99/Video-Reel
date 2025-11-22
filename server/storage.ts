import {
  users,
  videos,
  creditTransactions,
  creditPackages,
  savedImages,
  connectedAccounts,
  videoUploads,
  musicLibrary,
  type User,
  type UpsertUser,
  type Video,
  type InsertVideo,
  type CreditTransaction,
  type InsertCreditTransaction,
  type CreditPackage,
  type SavedImage,
  type InsertSavedImage,
  type ConnectedAccount,
  type InsertConnectedAccount,
  type VideoUpload,
  type InsertVideoUpload,
  type MusicTrack,
  type InsertMusicTrack,
  VIDEO_COSTS,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCredits(userId: string, creditsToAdd: number): Promise<User | undefined>;
  
  // Video operations
  getVideo(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  getUserVideos(userId?: string, limit?: number): Promise<Video[]>;
  deleteVideo(id: string): Promise<boolean>;
  
  // Credit operations
  addCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getUserCreditTransactions(userId: string, limit?: number): Promise<CreditTransaction[]>;
  getCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackage(packageId: string): Promise<CreditPackage | undefined>;
  
  // Credit calculation
  calculateVideoCredits(duration: number, imageProvider: string, imageCount: number): number;
  deductCreditsForVideo(userId: string, videoId: string, creditsToDeduct: number): Promise<boolean>;
  deductCredits(userId: string, credits: number, description: string): Promise<boolean>;
  addCredits(userId: string, credits: number, description: string): Promise<boolean>;
  purchaseCreditPackage(userId: string, packageId: string, stripePaymentIntentId?: string): Promise<boolean>;

  // Image operations
  getSavedImages(userId: string): Promise<SavedImage[]>;
  createSavedImage(image: InsertSavedImage): Promise<SavedImage>;
  deleteSavedImage(imageId: string, userId: string): Promise<void>;

  // Connected account operations
  getConnectedAccounts(userId: string): Promise<ConnectedAccount[]>;
  createConnectedAccount(account: InsertConnectedAccount): Promise<ConnectedAccount>;
  updateConnectedAccount(accountId: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount | undefined>;
  deleteConnectedAccount(accountId: string, userId: string): Promise<void>;

  // Video upload operations
  getVideoUploads(videoId: string): Promise<VideoUpload[]>;
  createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload>;
  updateVideoUpload(uploadId: string, updates: Partial<VideoUpload>): Promise<VideoUpload | undefined>;

  // Music library operations
  getMusicTracks(filters?: { search?: string; genre?: string; mood?: string }): Promise<MusicTrack[]>;
  getMusicTrack(trackId: string): Promise<MusicTrack | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private videos: Map<string, Video>;
  private savedImages: Map<string, SavedImage>;
  private connectedAccounts: Map<string, ConnectedAccount>;
  private videoUploads: Map<string, VideoUpload>;
  private musicTracks: Map<string, MusicTrack>;

  constructor() {
    this.users = new Map();
    this.videos = new Map();
    this.savedImages = new Map();
    this.connectedAccounts = new Map();
    this.videoUploads = new Map();
    this.musicTracks = new Map();
    
    // Add some sample music tracks
    this.initializeMusicLibrary();
  }

  private initializeMusicLibrary() {
    const sampleTracks: MusicTrack[] = [
      {
        id: "track-1",
        title: "Upbeat Corporate",
        artist: "Audio Artist",
        genre: "electronic",
        mood: "energetic",
        duration: 120,
        bpm: 128,
        fileUrl: "https://www.soundjay.com/misc/sounds/beep-07a.wav",
        previewUrl: "https://www.soundjay.com/misc/sounds/beep-07a.wav",
        license: "CC0",
        source: "freepd",
        tags: ["corporate", "upbeat", "background"],
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: "track-2",
        title: "Peaceful Ambient",
        artist: "Sound Designer",
        genre: "ambient",
        mood: "calm",
        duration: 180,
        bpm: 85,
        fileUrl: "https://www.soundjay.com/misc/sounds/beep-08b.wav",
        previewUrl: "https://www.soundjay.com/misc/sounds/beep-08b.wav",
        license: "CC0",
        source: "pixabay",
        tags: ["ambient", "peaceful", "meditation"],
        isActive: true,
        createdAt: new Date(),
      }
    ];

    sampleTracks.forEach(track => this.musicTracks.set(track.id, track));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id && this.users.has(userData.id)) {
      // Update existing user
      const existingUser = this.users.get(userData.id)!;
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      const id = userData.id || randomUUID();
      const now = new Date();
      const user: User = {
        id,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        credits: 30, // Give new users 30 free credits
        createdAt: now,
        updatedAt: now,
      };
      this.users.set(id, user);
      return user;
    }
  }

  async getVideo(id: string): Promise<Video | undefined> {
    return this.videos.get(id);
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const userId = insertVideo.userId;
    
    // Check and enforce 10-video limit per user
    if (userId) {
      await this.enforceVideoLimitMem(userId);
    }
    
    const id = randomUUID();
    const now = new Date();
    const video: Video = {
      id,
      userId: insertVideo.userId || null,
      topic: insertVideo.topic,
      duration: insertVideo.duration,
      language: insertVideo.language || "english",
      voiceStyle: insertVideo.voiceStyle || "professional",
      imageStyle: insertVideo.imageStyle || "modern",
      imageProvider: insertVideo.imageProvider || "dalle",
      runwareModel: insertVideo.runwareModel || "runware:100@1",
      subtitles: insertVideo.subtitles || false,
      status: "pending",
      script: null,
      videoUrl: null,
      assets: null,
      subtitleData: null,
      errorMessage: null,
      creditsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.videos.set(id, video);
    return video;
  }

  private async enforceVideoLimitMem(userId: string, maxVideos: number = 10): Promise<void> {
    const userVideos = Array.from(this.videos.values())
      .filter(video => video.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    if (userVideos.length >= maxVideos) {
      // Delete oldest videos to make room (keep maxVideos - 1)
      const videosToDelete = userVideos.slice(maxVideos - 1);
      for (const video of videosToDelete) {
        this.videos.delete(video.id);
      }
    }
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const video = this.videos.get(id);
    if (!video) return undefined;
    
    const updatedVideo = {
      ...video,
      ...updates,
      updatedAt: new Date(),
    };
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }

  async getUserVideos(userId?: string, limit: number = 10): Promise<Video[]> {
    let videos = Array.from(this.videos.values());
    
    // Filter by user ID if provided
    if (userId) {
      videos = videos.filter(video => video.userId === userId);
    }
    
    // Sort by creation date
    videos = videos.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
    
    return videos.slice(0, limit);
  }

  async deleteVideo(id: string): Promise<boolean> {
    return this.videos.delete(id);
  }

  // Credit operations (stub implementations for MemStorage)
  async updateUserCredits(userId: string, creditsToAdd: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      credits: (user.credits || 0) + creditsToAdd,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async addCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    // Stub implementation for MemStorage
    return {
      id: randomUUID(),
      ...transaction,
      createdAt: new Date(),
      videoId: transaction.videoId || null,
      stripePaymentIntentId: transaction.stripePaymentIntentId || null
    };
  }

  async getUserCreditTransactions(userId: string, limit: number = 20): Promise<CreditTransaction[]> {
    // Stub implementation for MemStorage
    return [];
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    // Return some default credit packages for MemStorage
    return [
      {
        id: "starter-100",
        name: "Starter Pack",
        credits: 100,
        priceUsd: 999, // $9.99
        bonusCredits: 0,
        popular: false,
        active: true,
        createdAt: new Date(),
      },
      {
        id: "popular-300", 
        name: "Popular Pack",
        credits: 300,
        priceUsd: 2499, // $24.99
        bonusCredits: 50,
        popular: true,
        active: true,
        createdAt: new Date(),
      },
      {
        id: "pro-1000",
        name: "Pro Pack", 
        credits: 1000,
        priceUsd: 7999, // $79.99
        bonusCredits: 200,
        popular: false,
        active: true,
        createdAt: new Date(),
      }
    ];
  }

  async getCreditPackage(packageId: string): Promise<CreditPackage | undefined> {
    const packages = await this.getCreditPackages();
    return packages.find(pkg => pkg.id === packageId);
  }

  calculateVideoCredits(duration: number, imageProvider: string, imageCount: number = 3): number {
    const baseCredits = VIDEO_COSTS.BASE_COSTS.SCRIPT_GENERATION;
    
    // TTS cost based on duration
    const ttsCredits = Math.ceil(duration / 60) * VIDEO_COSTS.BASE_COSTS.TTS_PER_MINUTE;
    
    // Image generation cost
    let imageCredits = 0;
    if (imageProvider === "dalle") {
      imageCredits = imageCount * VIDEO_COSTS.BASE_COSTS.DALLE3_STANDARD;
    } else if (imageProvider === "runware") {
      imageCredits = imageCount * VIDEO_COSTS.BASE_COSTS.RUNWARE_FLUX;
    }
    
    // Processing cost
    const processingCredits = VIDEO_COSTS.BASE_COSTS.VIDEO_PROCESSING;
    
    // Duration multiplier
    const durationKey = duration as keyof typeof VIDEO_COSTS.DURATION_MULTIPLIERS;
    const durationMultiplier = VIDEO_COSTS.DURATION_MULTIPLIERS[durationKey] || 
      (duration / 20); // Fallback calculation
    
    const totalCredits = Math.ceil(
      (baseCredits + ttsCredits + imageCredits + processingCredits) * durationMultiplier
    );
    
    return Math.max(totalCredits, 1); // Minimum 1 credit
  }

  async deductCreditsForVideo(userId: string, videoId: string, creditsToDeduct: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || (user.credits || 0) < creditsToDeduct) {
      return false; // Insufficient credits
    }

    // Deduct credits from user
    const updatedUser = {
      ...user,
      credits: (user.credits || 0) - creditsToDeduct,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);

    // Update video with credits used
    const video = this.videos.get(videoId);
    if (video) {
      this.videos.set(videoId, { ...video, creditsUsed: creditsToDeduct });
    }

    return true;
  }

  async deductCredits(userId: string, credits: number, description: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || (user.credits || 0) < credits) {
      return false; // Insufficient credits
    }

    // Deduct credits from user
    const updatedUser = {
      ...user,
      credits: (user.credits || 0) - credits,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);

    return true;
  }

  async addCredits(userId: string, credits: number, description: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false; // User not found
    }

    // Add credits to user
    const updatedUser = {
      ...user,
      credits: (user.credits || 0) + credits,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);

    return true;
  }

  async purchaseCreditPackage(userId: string, packageId: string, stripePaymentIntentId?: string): Promise<boolean> {
    const creditPackage = await this.getCreditPackage(packageId);
    if (!creditPackage) {
      return false;
    }

    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    // Add credits to user account
    const totalCredits = creditPackage.credits + creditPackage.bonusCredits;
    const updatedUser = {
      ...user,
      credits: (user.credits || 0) + totalCredits,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);

    // Add transaction record
    await this.addCreditTransaction({
      userId,
      type: "purchase",
      amount: totalCredits,
      description: `Purchased ${creditPackage.name}`,
      stripePaymentIntentId: stripePaymentIntentId || null,
      videoId: null,
    });

    console.log(`MemStorage: Credit package purchase successful for user ${userId}, package ${packageId}, credits: ${totalCredits}`);
    return true;
  }

  // Image operations
  async getSavedImages(userId: string): Promise<SavedImage[]> {
    return Array.from(this.savedImages.values()).filter(img => img.userId === userId);
  }

  async createSavedImage(image: InsertSavedImage): Promise<SavedImage> {
    const id = randomUUID();
    const now = new Date();
    const savedImage: SavedImage = {
      id,
      ...image,
      metadata: image.metadata || null,
      thumbnailUrl: image.thumbnailUrl || null,
      width: image.width || null,
      height: image.height || null,
      createdAt: now,
    };
    this.savedImages.set(id, savedImage);
    return savedImage;
  }

  async deleteSavedImage(imageId: string, userId: string): Promise<void> {
    const image = this.savedImages.get(imageId);
    if (image && image.userId === userId) {
      this.savedImages.delete(imageId);
    }
  }

  // Connected account operations
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return Array.from(this.connectedAccounts.values()).filter(account => account.userId === userId);
  }

  async createConnectedAccount(account: InsertConnectedAccount): Promise<ConnectedAccount> {
    const id = randomUUID();
    const now = new Date();
    const connectedAccount: ConnectedAccount = {
      id,
      ...account,
      createdAt: now,
      updatedAt: now,
    };
    this.connectedAccounts.set(id, connectedAccount);
    return connectedAccount;
  }

  async updateConnectedAccount(accountId: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount | undefined> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...updates, updatedAt: new Date() };
    this.connectedAccounts.set(accountId, updatedAccount);
    return updatedAccount;
  }

  async deleteConnectedAccount(accountId: string, userId: string): Promise<void> {
    const account = this.connectedAccounts.get(accountId);
    if (account && account.userId === userId) {
      this.connectedAccounts.delete(accountId);
    }
  }

  // Video upload operations
  async getVideoUploads(videoId: string): Promise<VideoUpload[]> {
    return Array.from(this.videoUploads.values()).filter(upload => upload.videoId === videoId);
  }

  async createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload> {
    const id = randomUUID();
    const now = new Date();
    const videoUpload: VideoUpload = {
      id,
      ...upload,
      createdAt: now,
      updatedAt: now,
    };
    this.videoUploads.set(id, videoUpload);
    return videoUpload;
  }

  async updateVideoUpload(uploadId: string, updates: Partial<VideoUpload>): Promise<VideoUpload | undefined> {
    const upload = this.videoUploads.get(uploadId);
    if (!upload) return undefined;
    
    const updatedUpload = { ...upload, ...updates, updatedAt: new Date() };
    this.videoUploads.set(uploadId, updatedUpload);
    return updatedUpload;
  }

  // Music library operations
  async getMusicTracks(filters?: { search?: string; genre?: string; mood?: string }): Promise<MusicTrack[]> {
    let tracks = Array.from(this.musicTracks.values()).filter(track => track.isActive);
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      tracks = tracks.filter(track => 
        track.title.toLowerCase().includes(search) ||
        track.artist?.toLowerCase().includes(search) ||
        track.genre?.toLowerCase().includes(search) ||
        track.mood?.toLowerCase().includes(search)
      );
    }
    
    if (filters?.genre && filters.genre !== "all") {
      tracks = tracks.filter(track => track.genre === filters.genre);
    }
    
    if (filters?.mood && filters.mood !== "all") {
      tracks = tracks.filter(track => track.mood === filters.mood);
    }
    
    return tracks;
  }

  async getMusicTrack(trackId: string): Promise<MusicTrack | undefined> {
    return this.musicTracks.get(trackId);
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      console.log("[DatabaseStorage.upsertUser] Upserting user:", userData.id);
      
      const [user] = await db
        .insert(users)
        .values({
          ...userData,
          credits: userData.credits || 30, // Give new users 30 free credits
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            updatedAt: new Date(),
          },
        })
        .returning();
        
      console.log("[DatabaseStorage.upsertUser] User upserted successfully:", user.id);
      return user;
    } catch (error) {
      console.error("[DatabaseStorage.upsertUser] Database error:", error);
      throw new Error(`Failed to create/update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserCredits(userId: string, creditsToAdd: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + ${creditsToAdd}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const userId = insertVideo.userId;
    
    // Check and enforce 10-video limit per user
    if (userId) {
      await this.enforceVideoLimit(userId);
    }
    
    const id = randomUUID();
    const now = new Date();
    const videoData = {
      id,
      userId: insertVideo.userId || null,
      topic: insertVideo.topic,
      category: insertVideo.category || "explainer",
      duration: insertVideo.duration,
      language: insertVideo.language || "english",
      voiceStyle: insertVideo.voiceStyle || "professional",
      imageStyle: insertVideo.imageStyle || "modern",
      imageProvider: insertVideo.imageProvider || "dalle",
      runwareModel: insertVideo.runwareModel || "runware:100@1",
      textFont: insertVideo.textFont || "dejavu-sans-bold",
      textColor: insertVideo.textColor || "yellow",
      subtitles: insertVideo.subtitles || false,
      status: "pending",
      script: null,
      videoUrl: null,
      assets: null,
      subtitleData: null,
      errorMessage: null,
      creditsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    const [video] = await db.insert(videos).values(videoData).returning();
    return video;
  }

  private async enforceVideoLimit(userId: string, maxVideos: number = 10): Promise<void> {
    const userVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt));

    if (userVideos.length >= maxVideos) {
      // Delete oldest videos to make room (keep maxVideos - 1)
      const videosToDelete = userVideos.slice(maxVideos - 1);
      for (const video of videosToDelete) {
        await this.deleteVideo(video.id);
      }
    }
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [video] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return video;
  }

  async getUserVideos(userId?: string, limit: number = 10): Promise<Video[]> {
    if (userId) {
      const videoList = await db
        .select()
        .from(videos)
        .where(eq(videos.userId, userId))
        .orderBy(desc(videos.createdAt))
        .limit(limit);
      return videoList;
    } else {
      const videoList = await db
        .select()
        .from(videos)
        .orderBy(desc(videos.createdAt))
        .limit(limit);
      return videoList;
    }
  }

  async deleteVideo(id: string): Promise<boolean> {
    try {
      // First delete related credit transactions
      await db.delete(creditTransactions).where(eq(creditTransactions.videoId, id));
      
      // Then delete the video
      const result = await db.delete(videos).where(eq(videos.id, id));
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting video:', error);
      return false;
    }
  }

  // Credit operations
  async addCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [creditTx] = await db
      .insert(creditTransactions)
      .values(transaction)
      .returning();
    return creditTx;
  }

  async getUserCreditTransactions(userId: string, limit: number = 20): Promise<CreditTransaction[]> {
    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
    return transactions;
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    const packages = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.active, true))
      .orderBy(creditPackages.priceUsd);
    return packages;
  }

  async getCreditPackage(packageId: string): Promise<CreditPackage | undefined> {
    const [creditPackage] = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.id, packageId));
    return creditPackage;
  }

  // Credit calculation based on video configuration
  calculateVideoCredits(duration: number, imageProvider: string, imageCount: number = 3): number {
    const baseCredits = VIDEO_COSTS.BASE_COSTS.SCRIPT_GENERATION;
    
    // TTS cost based on duration
    const ttsCredits = Math.ceil(duration / 60) * VIDEO_COSTS.BASE_COSTS.TTS_PER_MINUTE;
    
    // Image generation cost
    let imageCredits = 0;
    if (imageProvider === "dalle") {
      imageCredits = imageCount * VIDEO_COSTS.BASE_COSTS.DALLE3_STANDARD;
    } else if (imageProvider === "runware") {
      imageCredits = imageCount * VIDEO_COSTS.BASE_COSTS.RUNWARE_FLUX;
    }
    
    // Processing cost
    const processingCredits = VIDEO_COSTS.BASE_COSTS.VIDEO_PROCESSING;
    
    // Duration multiplier
    const durationKey = duration as keyof typeof VIDEO_COSTS.DURATION_MULTIPLIERS;
    const durationMultiplier = VIDEO_COSTS.DURATION_MULTIPLIERS[durationKey] || 
      (duration / 20); // Fallback calculation
    
    const totalCredits = Math.ceil(
      (baseCredits + ttsCredits + imageCredits + processingCredits) * durationMultiplier
    );
    
    return Math.max(totalCredits, 1); // Minimum 1 credit
  }

  async deductCreditsForVideo(userId: string, videoId: string, creditsToDeduct: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user || (user.credits || 0) < creditsToDeduct) {
        return false; // Insufficient credits
      }

      // Use database transaction to ensure both operations succeed together
      await db.transaction(async (tx) => {
        // Deduct credits from user
        await tx
          .update(users)
          .set({ 
            credits: sql`${users.credits} - ${creditsToDeduct}`,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId));

        // Update video with credits used
        await tx
          .update(videos)
          .set({ creditsUsed: creditsToDeduct })
          .where(eq(videos.id, videoId));

        // Add credit transaction record
        await tx
          .insert(creditTransactions)
          .values({
            userId,
            videoId,
            amount: -creditsToDeduct,
            type: 'usage',
            description: `Video generation credits used`,
            createdAt: new Date(),
          });
      });

      return true;
    } catch (error) {
      console.error('Error deducting credits for video:', error);
      return false;
    }
  }

  async deductCredits(userId: string, credits: number, description: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || (user.credits || 0) < credits) {
      return false; // Insufficient credits
    }

    try {
      // Use database transaction to ensure both operations succeed together
      await db.transaction(async (tx) => {
        // Deduct credits from user
        await tx
          .update(users)
          .set({ 
            credits: sql`${users.credits} - ${credits}`,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId));

        // Add credit transaction
        await tx
          .insert(creditTransactions)
          .values({
            userId,
            amount: -credits,
            type: 'debit',
            description,
            videoId: null,
            createdAt: new Date(),
          });
      });

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  async addCredits(userId: string, credits: number, description: string): Promise<boolean> {
    try {
      // Use database transaction to ensure both operations succeed together
      await db.transaction(async (tx) => {
        // Add credits to user
        await tx
          .update(users)
          .set({ 
            credits: sql`${users.credits} + ${credits}`,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId));

        // Add credit transaction
        await tx
          .insert(creditTransactions)
          .values({
            userId,
            amount: credits,
            type: 'credit',
            description,
            videoId: null,
            createdAt: new Date(),
          });
      });

      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  async purchaseCreditPackage(userId: string, packageId: string, stripePaymentIntentId?: string): Promise<boolean> {
    try {
      // Get the credit package details
      const [creditPackage] = await db
        .select()
        .from(creditPackages)
        .where(eq(creditPackages.id, packageId));

      if (!creditPackage || !creditPackage.active) {
        console.error('Credit package not found or inactive:', packageId);
        return false;
      }

      const totalCredits = creditPackage.credits + (creditPackage.bonusCredits || 0);

      // Use database transaction to ensure both operations succeed or fail together
      await db.transaction(async (tx) => {
        // Add credits to user
        await tx
          .update(users)
          .set({ 
            credits: sql`${users.credits} + ${totalCredits}`,
            updatedAt: new Date() 
          })
          .where(eq(users.id, userId));

        // Add credit transaction record
        await tx
          .insert(creditTransactions)
          .values({
            userId,
            amount: totalCredits,
            type: 'purchase',
            description: `Purchased ${creditPackage.name} package`,
            stripePaymentIntentId,
            createdAt: new Date(),
          });
      });

      console.log(`Successfully purchased credit package: ${creditPackage.name} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error purchasing credit package:', error);
      return false;
    }
  }

  // Image operations
  async getSavedImages(userId: string): Promise<SavedImage[]> {
    const images = await db
      .select()
      .from(savedImages)
      .where(eq(savedImages.userId, userId))
      .orderBy(desc(savedImages.createdAt));
    return images;
  }

  async createSavedImage(image: InsertSavedImage): Promise<SavedImage> {
    const [savedImage] = await db
      .insert(savedImages)
      .values({
        ...image,
        id: randomUUID(),
        createdAt: new Date(),
      })
      .returning();
    return savedImage;
  }

  async deleteSavedImage(imageId: string, userId: string): Promise<void> {
    await db
      .delete(savedImages)
      .where(eq(savedImages.id, imageId));
  }

  // Connected account operations
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    const accounts = await db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, userId))
      .orderBy(desc(connectedAccounts.createdAt));
    return accounts;
  }

  async createConnectedAccount(account: InsertConnectedAccount): Promise<ConnectedAccount> {
    const [connectedAccount] = await db
      .insert(connectedAccounts)
      .values({
        ...account,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return connectedAccount;
  }

  async updateConnectedAccount(accountId: string, updates: Partial<ConnectedAccount>): Promise<ConnectedAccount | undefined> {
    const [account] = await db
      .update(connectedAccounts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(connectedAccounts.id, accountId))
      .returning();
    return account;
  }

  async deleteConnectedAccount(accountId: string, userId: string): Promise<void> {
    await db
      .delete(connectedAccounts)
      .where(eq(connectedAccounts.id, accountId));
  }

  // Video upload operations
  async getVideoUploads(videoId: string): Promise<VideoUpload[]> {
    const uploads = await db
      .select()
      .from(videoUploads)
      .where(eq(videoUploads.videoId, videoId))
      .orderBy(desc(videoUploads.createdAt));
    return uploads;
  }

  async createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload> {
    const [videoUpload] = await db
      .insert(videoUploads)
      .values({
        ...upload,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return videoUpload;
  }

  async updateVideoUpload(uploadId: string, updates: Partial<VideoUpload>): Promise<VideoUpload | undefined> {
    const [upload] = await db
      .update(videoUploads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoUploads.id, uploadId))
      .returning();
    return upload;
  }

  // Music library operations
  async getMusicTracks(filters?: { search?: string; genre?: string; mood?: string }): Promise<MusicTrack[]> {
    // For now, return sample tracks from MemStorage since we're using MemStorage in development
    // In production with real database, this would query the musicLibrary table
    const memStorage = new MemStorage();
    return memStorage.getMusicTracks(filters);
  }

  async getMusicTrack(trackId: string): Promise<MusicTrack | undefined> {
    // For now, return sample tracks from MemStorage since we're using MemStorage in development
    const memStorage = new MemStorage();
    return memStorage.getMusicTrack(trackId);
  }
}

export const storage = new DatabaseStorage();
