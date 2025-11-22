import fs from 'fs';
import path from 'path';

export interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export function generateSubtitleFile(segments: SubtitleSegment[], outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Generate SRT format subtitles
      let srtContent = '';
      
      segments.forEach((segment, index) => {
        const startTime = formatSRTTime(segment.startTime);
        const endTime = formatSRTTime(segment.endTime);
        
        srtContent += `${index + 1}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${segment.text}\n\n`;
      });
      
      fs.writeFileSync(outputPath, srtContent, 'utf8');
      resolve(outputPath);
    } catch (error) {
      reject(new Error(`Failed to generate subtitle file: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}

function formatSRTTime(timeInSeconds: number): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

export function createSubtitleSegments(scriptSegments: Array<{ text: string; duration: number }>, startTime: number = 0): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  let currentTime = startTime;
  
  scriptSegments.forEach(segment => {
    // Split long text into shorter subtitle lines (max ~60 characters per line)
    const words = segment.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).length <= 60) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    // Calculate duration per line based on reading speed (approximately 3 words per second)
    const totalWords = words.length;
    const lineDuration = segment.duration / lines.length;
    
    lines.forEach(line => {
      segments.push({
        startTime: currentTime,
        endTime: currentTime + lineDuration,
        text: line
      });
      currentTime += lineDuration;
    });
  });
  
  return segments;
}