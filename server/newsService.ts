import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface NewsSearchResult {
  headline: string;
  summary: string;
  keyPoints: string[];
  sources: string[];
  publishedDate: string;
}

export class NewsService {
  
  /**
   * Search for current news on a given topic using web search
   */
  async searchCurrentNews(topic: string): Promise<NewsSearchResult> {
    try {
      console.log(`[NewsService] Searching for current news on: ${topic}`);
      
      // Use real web search for current news
      const { webSearch } = await import('./webSearch');
      
      // Search for current news on the topic
      const searchQuery = `latest news ${topic} today ${new Date().getFullYear()}`;
      const searchResults = await webSearch(searchQuery);
      
      console.log(`[NewsService] Found ${searchResults.length} search results`);
      
      // Use OpenAI to analyze and summarize the search results
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a professional news analyst and script writer. Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} (${new Date().getFullYear()}).

Analyze the provided search results and create compelling news content that:
1. Focuses on the most recent and credible information
2. Creates an engaging, attention-grabbing headline
3. Summarizes key developments clearly and concisely
4. Identifies the most important points for a video audience
5. Is suitable for a 30-60 second explainer video

Guidelines:
- Prioritize verified, recent information
- Make headlines compelling and clickable
- Focus on impact and significance
- Create content that hooks viewers immediately
- Be factual but engaging
- Structure for video narrative flow

Respond with a JSON object containing:
- headline: A compelling, news-worthy headline
- summary: A concise summary of the latest developments (2-3 sentences)
- keyPoints: Array of 4-6 key points that tell the complete story
- sources: Array of the most credible sources mentioned
- publishedDate: Today's date`
          },
          {
            role: "user",
            content: `Analyze these search results about "${topic}" and create compelling news content:

${searchResults.map((result: any, i: number) => `
${i + 1}. ${result.title}
   ${result.snippet}
   Source: ${result.source || 'Web'}
`).join('\n')}

Create engaging news content from this information that would work well for a short explainer video.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.3,
      });

      const newsData = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log(`[NewsService] Successfully gathered news for: ${topic}`);
      
      return {
        headline: newsData.headline || `Educational Context: ${topic}`,
        summary: newsData.summary || `Educational background and context about ${topic}. For current news, please check trusted news sources.`,
        keyPoints: newsData.keyPoints || [
          "Educational background about the topic",
          "Key concepts and important context", 
          "Where to find current information",
          "Significance and implications"
        ],
        sources: newsData.sources || ["BBC News", "Reuters", "Associated Press"],
        publishedDate: newsData.publishedDate || new Date().toISOString().split('T')[0],
      };
      
    } catch (error) {
      console.error('[NewsService] Error searching for news:', error);
      
      // Fallback response if API fails
      return {
        headline: `Educational Context: ${topic}`,
        summary: `This video provides educational background and context about ${topic}. For the most current news and developments, please check reliable news sources like BBC, Reuters, AP News, or other trusted outlets. This content offers important background information to help understand recent developments in this area.`,
        keyPoints: [
          "Educational background about the topic",
          "Key concepts and important context",
          "Historical background and significance",  
          "Where to find current news and updates",
        ],
        sources: ["BBC News", "Reuters", "Associated Press", "Other major news outlets"],
        publishedDate: new Date().toISOString().split('T')[0],
      };
    }
  }

  /**
   * Generate a news-style video script based on the search results
   */
  async generateNewsScript(
    newsData: NewsSearchResult, 
    duration: number,
    language: string = "english"
  ): Promise<{
    segments: Array<{
      text: string;
      duration: number;
      imagePrompt: string;
      imagePromptEnglish?: string;
    }>;
    fullScript: string;
  }> {
    try {
      console.log(`[NewsService] Generating news script for: ${newsData.headline}`);
      
      const segmentCount = Math.max(3, Math.min(8, Math.floor(duration / 15)));
      const avgSegmentDuration = Math.floor(duration / segmentCount);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a professional news script writer creating video content in ${language}. 

Create a compelling news video script that:
- Opens with a strong hook about the current news
- Presents facts objectively and clearly
- Maintains viewer engagement throughout
- Uses professional news presentation style
- Includes visual cues for accompanying imagery
- Concludes with implications or next steps

For each segment, provide:
- Clear, engaging narration text
- Duration for pacing
- Specific visual description for image generation

Generate exactly ${segmentCount} segments with approximately ${avgSegmentDuration} seconds each.

${language !== "english" ? `
IMPORTANT: Generate the script in ${language}, but ALSO provide English versions of image prompts for optimal image generation quality.
` : ""}

Respond with a JSON object containing:
- segments: Array of segment objects with text, duration, imagePrompt${language !== "english" ? ", and imagePromptEnglish" : ""}
- fullScript: Complete script text

Base the content on this news information:
Headline: ${newsData.headline}
Summary: ${newsData.summary}
Key Points: ${newsData.keyPoints.join(", ")}
Date: ${newsData.publishedDate}`
          },
          {
            role: "user",
            content: `Create a ${duration}-second news video script about: ${newsData.headline}

Make it engaging, factual, and appropriate for a news segment format.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.4,
      });

      const scriptData = JSON.parse(response.choices[0].message.content || '{}');
      
      console.log(`[NewsService] Successfully generated news script with ${scriptData.segments?.length || 0} segments`);
      
      return {
        segments: scriptData.segments || [],
        fullScript: scriptData.fullScript || `News coverage of ${newsData.headline}`,
      };
      
    } catch (error) {
      console.error('[NewsService] Error generating news script:', error);
      throw error;
    }
  }
}

export const newsService = new NewsService();