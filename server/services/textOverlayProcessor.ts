import { getFontPath } from "@shared/fonts";

export interface TextOverlayOptions {
  textFont?: string;
  textColor?: string;
  subtitles?: {
    segments: Array<{ text: string; duration: number }>;
    enabled: boolean;
  };
}

export function createTextOverlayFilter(
  scriptSegments: Array<{ text: string; duration: number }>,
  options: TextOverlayOptions
): string {
  if (!options.subtitles?.enabled || !scriptSegments?.length) {
    return '';
  }

  const { textFont = 'dejavu-sans-bold', textColor = 'yellow' } = options;
  
  // Map color names to FFmpeg-compatible colors
  const colorMap: { [key: string]: string } = {
    "yellow": "yellow",
    "white": "white", 
    "red": "red",
    "cyan": "cyan",
    "lime": "lime",
    "orange": "orange",
    "gold": "#FFD700",
    "hotpink": "#FF69B4", 
    "purple": "purple",
    "silver": "#C0C0C0"
  };
  
  const ffmpegColor = colorMap[textColor] || 'yellow';
  const fontPath = getFontPath(textFont as any);
  
  console.log(`[TextOverlay] Using font=${textFont}, color=${textColor} -> ${ffmpegColor}`);

  let textFilters: string[] = [];
  let currentTime = 0;

  scriptSegments.forEach((segment, index) => {
    if (!segment.text) return;

    // Clean and wrap text for better readability
    const cleanText = segment.text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/['"\\:]/g, '') // Remove problematic characters including colon
      .replace(/[^\w\s\.,!?-]/g, ''); // Keep only safe characters

    const lines = wrapText(cleanText, 40);
    const startTime = currentTime;
    const endTime = currentTime + segment.duration;
    
    // Show only first 2 lines to avoid complexity
    const displayLines = lines.slice(0, 2);
    
    displayLines.forEach((line, lineIndex) => {
      const y = 200 + lineIndex * 86; // 72px font + 14px spacing
      
      textFilters.push(`drawtext=fontfile=${fontPath}:text='${line}':fontsize=72:fontcolor=${ffmpegColor}:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='between(t,${startTime},${endTime})'`);
    });

    currentTime = endTime;
  });

  return textFilters.length > 0 ? ',' + textFilters.join(',') : '';
}

function wrapText(text: string, maxLength: number = 40): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxLength) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        lines.push(word); // Single word longer than max length
      }
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines;
}