import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface VoiceConfig {
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  description: string;
}

const voiceConfigs: Record<string, VoiceConfig> = {
  professional: {
    voice: 'onyx',
    description: 'Professional, clear male voice',
  },
  casual: {
    voice: 'alloy',
    description: 'Friendly, conversational voice',
  },
  enthusiastic: {
    voice: 'nova',
    description: 'Energetic, enthusiastic female voice',
  },
  educational: {
    voice: 'echo',
    description: 'Clear, authoritative voice for learning',
  },
};

export async function generateAudio(
  text: string,
  voiceStyle: string = 'professional',
  outputPath: string,
  language: string = 'english'
): Promise<string> {
  try {
    const voiceConfig = voiceConfigs[voiceStyle] || voiceConfigs.professional;
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voiceConfig.voice,
      input: text,
      speed: 1.0,
    });

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Convert the response to a buffer and write to file
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    
    return outputPath;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw new Error('Failed to generate audio');
  }
}

export function estimateAudioDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // Convert to seconds
}
