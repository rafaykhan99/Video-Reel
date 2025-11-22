export const IMAGE_MODELS = {
  "runware:100@1": {
    name: "FLUX.1 Schnell",
    description: "Ultra-fast generation with good quality",
    speed: "Fast",
    quality: "Good",
    cost: "$0.0006"
  },
  "runware:101@1": {
    name: "FLUX.1 Dev", 
    description: "Balanced speed and high quality",
    speed: "Medium",
    quality: "High", 
    cost: "$0.0006"
  }
} as const;

export const BACKGROUND_REMOVAL_MODEL = "runware:110@1";

export const UPSCALE_MODEL = "undefined"; // Will be updated when AIR tag is provided

export type ImageModel = keyof typeof IMAGE_MODELS;