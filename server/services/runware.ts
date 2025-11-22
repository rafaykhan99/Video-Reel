import fetch from 'node-fetch';

export interface RunwareImageRequest {
  positivePrompt: string;
  imageStyle?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
  numberResults?: number;
}

export interface RunwareImageResponse {
  taskUUID: string;
  imageURL: string;
  imageUUID: string;
  cost?: number;
  seed?: number;
}

export async function generateImageWithRunware(
  prompt: string, 
  style: string = "modern",
  model: string = "runware:100@1"
): Promise<string> {
  const apiKey = process.env.RUNWARE_API_KEY;
  
  if (!apiKey) {
    throw new Error("RUNWARE_API_KEY is not configured");
  }

  // Map style to appropriate model and prompt adjustments
  const stylePrompts = {
    modern: "modern, clean, professional, high-tech",
    illustrated: "illustration, artistic, colorful, stylized",
    photographic: "realistic, photographic, high detail, sharp focus",
    minimalist: "minimalist, simple, clean lines, uncluttered"
  };

  const stylePrompt = stylePrompts[style as keyof typeof stylePrompts] || stylePrompts.modern;
  const fullPrompt = `${prompt}, ${stylePrompt}`;

  const requestBody = [{
    taskType: "authentication",
    apiKey: apiKey
  }, {
    taskType: "imageInference",
    taskUUID: generateUUID(),
    positivePrompt: fullPrompt,
    width: 1024,
    height: 1024,
    model: model, // Selected Runware model
    steps: 25,
    CFGScale: 4.0,
    numberResults: 1,
    includeCost: true
  }];

  console.log("Making Runware API call for image generation...");
  console.log("Using model:", model);

  try {
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Runware API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log("Runware API call completed successfully");

    // Find the image result in the response
    const imageResult = data.data?.find((item: any) => item.taskType === "imageInference");
    
    if (!imageResult || !imageResult.imageURL) {
      console.error("Runware API response:", JSON.stringify(data, null, 2));
      throw new Error("No image URL found in Runware response");
    }

    if (imageResult.cost) {
      console.log(`Runware image generation cost: $${imageResult.cost}`);
    }

    return imageResult.imageURL;
  } catch (error) {
    console.error("Runware API error details:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image with Runware: ${error.message}`);
    }
    throw new Error("Failed to generate image with Runware: Unknown error occurred");
  }
}

// Generate UUID v4 for task identification
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}