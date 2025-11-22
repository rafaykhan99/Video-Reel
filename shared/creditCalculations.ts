/**
 * Credit calculation utilities for the video generation system
 * 
 * Credit System Design:
 * - 1 Credit = $0.02 USD
 * - Simple 30-second video with Runware: 15 credits ($0.30)
 * - Premium 30-second video with DALL-E: ~90 credits ($1.80)
 * - $10 package = 500 credits = ~33 simple videos
 */

import { VIDEO_COSTS } from "./schema";

export interface VideoConfig {
  duration: number;
  imageProvider: "dalle" | "runware";
  imageStyle: "standard" | "hd";
  language: string;
  voiceStyle: string;
  subtitles: boolean;
}

export interface CostBreakdown {
  scriptGeneration: number;
  textToSpeech: number;
  imageGeneration: number;
  videoProcessing: number;
  total: number;
  estimatedUsdCost: number;
}

export function calculateVideoCredits(config: VideoConfig): CostBreakdown {
  // Base costs
  const scriptGeneration = VIDEO_COSTS.BASE_COSTS.SCRIPT_GENERATION;
  
  // TTS cost based on duration
  const ttsMinutes = Math.ceil(config.duration / 60);
  const textToSpeech = ttsMinutes * VIDEO_COSTS.BASE_COSTS.TTS_PER_MINUTE;
  
  // Image generation cost (typically 3 images per video)
  const imageCount = Math.ceil(config.duration / 20); // 1 image per 20 seconds
  let imageGeneration = 0;
  
  if (config.imageProvider === "dalle") {
    const imageCredits = config.imageStyle === "hd" 
      ? VIDEO_COSTS.BASE_COSTS.DALLE3_HD 
      : VIDEO_COSTS.BASE_COSTS.DALLE3_STANDARD;
    imageGeneration = imageCount * imageCredits;
  } else if (config.imageProvider === "runware") {
    imageGeneration = imageCount * VIDEO_COSTS.BASE_COSTS.RUNWARE_FLUX;
  }
  
  // Processing cost
  const videoProcessing = VIDEO_COSTS.BASE_COSTS.VIDEO_PROCESSING;
  
  // Apply duration multiplier
  const durationMultiplier = VIDEO_COSTS.DURATION_MULTIPLIERS[config.duration] || 
    Math.max(1, config.duration / 20);
  
  // Calculate totals
  const baseTotal = scriptGeneration + textToSpeech + imageGeneration + videoProcessing;
  const total = Math.ceil(baseTotal * durationMultiplier);
  
  // Estimated USD cost (1 credit = $0.02)
  const estimatedUsdCost = total * 0.02;
  
  return {
    scriptGeneration,
    textToSpeech,
    imageGeneration,
    videoProcessing,
    total: Math.max(total, 1), // Minimum 1 credit
    estimatedUsdCost,
  };
}

export function formatCreditsWithUsd(credits: number): string {
  const usdValue = credits * 0.02;
  return `${credits} credits (~$${usdValue.toFixed(2)})`;
}

export const CREDIT_PACKAGES = [
  {
    name: "Basic Pack",
    credits: 500,
    priceUsd: 1000, // $10.00
    bonusCredits: 0,
    popular: false,
    description: "Perfect for trying out our AI video generator",
    estimatedVideos: "~33 simple videos",
  },
  {
    name: "Popular Pack", 
    credits: 1250,
    priceUsd: 2500, // $25.00
    bonusCredits: 250, // Total: 1500 credits
    popular: true,
    description: "Most popular choice for regular content creators",
    estimatedVideos: "~100 simple videos",
  },
  {
    name: "Pro Pack",
    credits: 2500,
    priceUsd: 5000, // $50.00  
    bonusCredits: 500, // Total: 3000 credits
    popular: false,
    description: "Great for professional content creators",
    estimatedVideos: "~200 simple videos",
  },
  {
    name: "Business Pack",
    credits: 5000,
    priceUsd: 10000, // $100.00
    bonusCredits: 1500, // Total: 6500 credits
    popular: false,
    description: "Ideal for businesses and agencies",
    estimatedVideos: "~433 simple videos",
  },
  {
    name: "Enterprise Pack",
    credits: 10000,
    priceUsd: 20000, // $200.00
    bonusCredits: 5000, // Total: 15000 credits
    popular: false,
    description: "Maximum value for high-volume users",
    estimatedVideos: "~1000 simple videos",
  },
] as const;