import OpenAI from "openai";
import { getLanguageInstruction } from "@shared/languages";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-api-key" 
});

export interface ScriptSegment {
  text: string;
  englishText?: string; // For non-English scripts, store English version for reference
  imagePrompt: string;
  duration: number; // in seconds
}

export async function generateScript(topic: string, durationSeconds: number, language: string = "english"): Promise<ScriptSegment[]> {
  const wordsPerMinute = 150; // Average speaking rate
  const targetWords = Math.floor((durationSeconds / 60) * wordsPerMinute);
  const segmentCount = Math.max(3, Math.floor(durationSeconds / 15)); // At least 3 segments, or one per 15 seconds

  console.log(`Generating dual-language script for topic: "${topic}", duration: ${durationSeconds}s, segments: ${segmentCount}`);

  // For non-English languages, generate both versions for better image generation
  const needsDualScript = language !== "english";
  
  const prompt = `Create a script for an explainer video about "${topic}" that is exactly ${durationSeconds} seconds long (approximately ${targetWords} words).

Requirements:
- Break the script into ${segmentCount} segments
- Each segment should be engaging and informative
- Include image prompts that describe visual elements for each segment (always in English for optimal image generation)
- Make it suitable for text-to-speech narration
- Ensure smooth transitions between segments
- JUMP STRAIGHT INTO THE CONTENT - no introductions like "Welcome to..." or "In this video..."
- Make it immediately engaging and hook viewers from the first sentence
- Use compelling storytelling techniques and vivid descriptions
- For stories: Create unique, creative narratives that capture attention immediately
- For educational content: Start with surprising facts or intriguing questions
- Focus on creating "scroll-stopping" content that grabs attention instantly
${needsDualScript ? `- Provide both English text and ${language} text for each segment` : ''}

IMPORTANT: Keep each segment text concise and punchy - maximum 2 sentences that will display as subtitles. Make every word count for maximum impact.

Return the response in JSON format with this structure:
{
  "segments": [
    {
      ${needsDualScript ? '"text": "Narration text in ' + language + ' for this segment",' : '"text": "Narration text for this segment",'}
      ${needsDualScript ? '"englishText": "Same narration text in English for reference",' : ''}
      "imagePrompt": "Detailed English description of the image to generate for this segment",
      "duration": estimated_duration_in_seconds
    }
  ]
}`;

  try {
    console.log("Making OpenAI API call for script generation...");
    
    // Add timeout to the OpenAI call
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Script generation timed out after 2 minutes"));
      }, 2 * 60 * 1000); // 2 minute timeout
    });

    const apiPromise = openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert script writer for explainer videos. Create engaging, informative scripts with detailed visual descriptions. ${getLanguageInstruction(language as any)} ${needsDualScript ? 'Always provide image prompts in English for optimal image generation quality, regardless of the script language.' : ''}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log("OpenAI API call completed successfully");
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const segments = result.segments || [];
    
    console.log(`Generated ${segments.length} script segments with ${needsDualScript ? 'dual-language' : 'single-language'} content`);
    return segments;
  } catch (error) {
    console.error("Error generating script:", error);
    
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }
    
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateImage(prompt: string, style: string = "modern"): Promise<string> {
  try {
    let enhancedPrompt = prompt;
    
    switch (style) {
      case "illustrated":
        enhancedPrompt = `Illustrated style, clean vector art: ${prompt}`;
        break;
      case "photographic":
        enhancedPrompt = `Photographic style, high quality photo: ${prompt}`;
        break;
      case "minimalist":
        enhancedPrompt = `Minimalist design, simple and clean: ${prompt}`;
        break;
      default:
        enhancedPrompt = `Modern, clean design: ${prompt}`;
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data?.[0]?.url || "";
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image");
  }
}
