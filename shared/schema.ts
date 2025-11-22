import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table updated for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email"), // Removed unique constraint that was causing issues
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  credits: integer("credits").notNull().default(30), // User's current credit balance (30 free credits for new users)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  topic: text("topic").notNull(),
  category: text("category").default("explainer"), // explainer, tutorial, story, product-review, educational, promotional, news
  duration: integer("duration").notNull(), // in seconds
  status: text("status").notNull().default("pending"), // pending, script_generated, editing, generating, compiling, completed, failed
  script: text("script"),
  language: text("language").default("english"), // english, spanish, french, german, chinese, japanese, portuguese, italian
  voiceStyle: text("voice_style").default("professional"),
  imageStyle: text("image_style").default("modern"),
  imageProvider: text("image_provider"), // dalle, runware
  runwareModel: text("runware_model"), // FLUX.1 [dev]
  textFont: text("text_font").default("dejavu-sans-bold"), // Font for text overlays
  textColor: text("text_color").default("yellow"), // Color for text overlays
  subtitles: boolean("subtitles").default(false),
  videoUrl: text("video_url"),
  assets: jsonb("assets"), // { images: string[], audioSegments: string[] }
  subtitleData: jsonb("subtitle_data"), // { segments: Array<{ text: string, startTime: number, endTime: number }> }
  errorMessage: text("error_message"),
  creditsUsed: integer("credits_used").default(0), // Credits consumed for this video
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit transactions table for tracking purchases and usage
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'purchase', 'usage', 'refund', 'bonus'
  amount: integer("amount").notNull(), // Credits added (+) or deducted (-)
  description: text("description").notNull(),
  videoId: varchar("video_id").references(() => videos.id), // Only for usage transactions
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // For purchase transactions
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit packages table for different purchase options
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  credits: integer("credits").notNull(),
  priceUsd: integer("price_usd").notNull(), // Price in cents
  bonusCredits: integer("bonus_credits").default(0), // Extra credits for larger packages
  popular: boolean("popular").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Saved images table for Image Studio
export const savedImages = pgTable("saved_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  filename: varchar("filename").notNull(),
  originalUrl: text("original_url").notNull(), // Original image URL
  thumbnailUrl: text("thumbnail_url"), // Optional thumbnail URL
  fileSize: integer("file_size").notNull(), // File size in bytes
  width: integer("width"), // Image width in pixels
  height: integer("height"), // Image height in pixels
  mimeType: varchar("mime_type").notNull(), // e.g., 'image/png', 'image/jpeg'
  type: text("type").notNull(), // 'generated', 'background-removed', 'upscaled', 'uploaded'
  metadata: jsonb("metadata"), // Additional metadata (prompt, model used, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  userId: true,
  type: true,
  amount: true,
  description: true,
  videoId: true,
  stripePaymentIntentId: true,
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).pick({
  name: true,
  credits: true,
  priceUsd: true,
  bonusCredits: true,
  popular: true,
  active: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;

// Saved Images schema types
export const insertSavedImageSchema = createInsertSchema(savedImages).pick({
  userId: true,
  filename: true,
  originalUrl: true,
  thumbnailUrl: true,
  fileSize: true,
  width: true,
  height: true,
  mimeType: true,
  type: true,
  metadata: true,
});

export type SavedImage = typeof savedImages.$inferSelect;
export type InsertSavedImage = z.infer<typeof insertSavedImageSchema>;

// Connected accounts table for social media integrations
export const connectedAccounts = pgTable("connected_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  platform: text("platform").notNull(), // "youtube", "tiktok", "instagram", etc.
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username"),
  platformEmail: text("platform_email"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  channelId: text("channel_id"), // YouTube channel ID
  channelName: text("channel_name"), // YouTube channel name
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Video uploads table for tracking social media uploads
export const videoUploads = pgTable("video_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").references(() => videos.id).notNull(),
  connectedAccountId: varchar("connected_account_id").references(() => connectedAccounts.id).notNull(),
  platform: text("platform").notNull(), // "youtube", "tiktok", "instagram"
  platformVideoId: text("platform_video_id"), // Video ID on the platform
  uploadStatus: text("upload_status").default("pending"), // pending, uploading, completed, failed
  uploadUrl: text("upload_url"), // URL to the uploaded video
  title: text("title"),
  description: text("description"),
  tags: jsonb("tags"), // Array of tags
  privacy: text("privacy").default("private"), // public, private, unlisted
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Free music library table
export const musicLibrary = pgTable("music_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artist: text("artist"),
  genre: text("genre"),
  mood: text("mood"), // "upbeat", "calm", "dramatic", "happy", "sad", etc.
  duration: integer("duration").notNull(), // in seconds
  bpm: integer("bpm"), // beats per minute
  fileUrl: text("file_url").notNull(),
  previewUrl: text("preview_url"), // 30-second preview
  license: text("license").default("CC0"), // "CC0", "CC-BY", "Custom"
  source: text("source").notNull(), // "freepd", "pixabay", "custom", etc.
  tags: jsonb("tags"), // Array of descriptive tags
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ConnectedAccount = typeof connectedAccounts.$inferSelect;
export type InsertConnectedAccount = typeof connectedAccounts.$inferInsert;
export type VideoUpload = typeof videoUploads.$inferSelect;
export type InsertVideoUpload = typeof videoUploads.$inferInsert;
export type MusicTrack = typeof musicLibrary.$inferSelect;
export type InsertMusicTrack = typeof musicLibrary.$inferInsert;

export const insertVideoSchema = createInsertSchema(videos).pick({
  topic: true,
  category: true,
  duration: true,
  language: true,
  voiceStyle: true,
  imageStyle: true,
  imageProvider: true,
  runwareModel: true,
  textFont: true,
  textColor: true,
  subtitles: true,
  userId: true,
}).extend({
  topic: z.string().min(10, "Topic must be at least 10 characters").max(500, "Topic must be less than 500 characters"),
  category: z.enum([
    "explainer",           // Educational explainer videos
    "tutorial",            // Step-by-step how-to guides  
    "story",               // Narrative storytelling videos
    "product-review",      // Product demonstrations and reviews
    "educational",         // Academic and learning content
    "promotional",         // Marketing and promotional videos
    "news"                 // Current events and news videos
  ]).optional(),
  duration: z.number().min(20, "Duration must be at least 20 seconds").max(180, "Duration must be at most 3 minutes"),
  language: z.enum([
    "english", "spanish", "french", "german", "chinese", "japanese", "portuguese", "italian", "hindi", "urdu"
  ]).optional(),
  voiceStyle: z.enum(["professional", "casual", "enthusiastic", "educational"]).optional(),
  imageStyle: z.enum(["modern", "illustrated", "photographic", "minimalist"]).optional(),
  imageProvider: z.enum(["dalle", "runware"]).optional(),
  runwareModel: z.enum([
    "runware:100@1",        // FLUX.1 Schnell - Ultra-fast & cheapest ($0.0006)
    "runware:101@1"         // FLUX.1 Dev - Fast & high-quality ($0.0006)  
  ]).optional(),
  textFont: z.enum([
    "dejavu-sans-bold",     // DejaVu Sans Bold - Strong, professional
    "dejavu-sans",          // DejaVu Sans - Clean, modern
    "dejavu-serif-bold",    // DejaVu Serif Bold - Classic, elegant
    "dejavu-serif",         // DejaVu Serif - Traditional, readable
    "dejavu-impact",        // Impact Bold - Bold & powerful
    "dejavu-bubbly",        // Bubbly Fun - Playful & fun
    "dejavu-scary",         // Spooky Horror - Scary & mysterious
    "dejavu-elegant",       // Stylish Script - Elegant & stylish
    "dejavu-mono-bold",     // DejaVu Sans Mono Bold - Technical, monospace
    "dejavu-mono"           // DejaVu Sans Mono - Code-style, monospace
  ]).optional(),
  textColor: z.enum([
    "yellow",               // Bright Yellow - Classic YouTube-style
    "white",                // Pure White - Clean & professional
    "red",                  // Bold Red - Attention-grabbing
    "cyan",                 // Electric Cyan - Modern tech vibe
    "lime",                 // Neon Lime - Eye-catching green
    "orange",               // Vibrant Orange - Warm & inviting
    "gold",                 // Golden Glow - Luxury feel
    "hotpink",              // Hot Pink - Fun & playful
    "purple",               // Royal Purple - Creative & mysterious
    "silver"                // Silver Shine - Sleek & modern
  ]).optional(),
  subtitles: z.boolean().optional(),
});

// Video cost calculation constants (in credits)
export const VIDEO_COSTS = {
  // Base costs per video segment at $0.02 per credit
  BASE_COSTS: {
    // Script generation 
    SCRIPT_GENERATION: 4, // $0.08 value
    
    // Text-to-speech per minute
    TTS_PER_MINUTE: 5, // $0.10 per minute
    
    // Image generation costs
    DALLE3_STANDARD: 40, // $0.80 per image
    DALLE3_HD: 60, // $1.20 per image  
    RUNWARE_FLUX: 2, // $0.04 per image
    
    // Processing and hosting
    VIDEO_PROCESSING: 2, // $0.04 value
  },
  
  // Multipliers for different durations
  DURATION_MULTIPLIERS: {
    20: 1.0,   // 20 seconds (base)
    30: 1.0,   // 30 seconds (simplified - no multiplier)
    60: 2.0,   // 1 minute
    90: 3.0,   // 1.5 minutes
    120: 4.0,  // 2 minutes
    180: 6.0,  // 3 minutes
  }
} as const;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;
