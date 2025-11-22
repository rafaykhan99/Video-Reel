import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

interface RevideoRenderOptions {
  script: Array<{ text: string; duration: number }>;
  images: string[];
  audioPath: string;
  outputPath: string;
  textColor: string;
  textFont: string;
  topic: string;
  totalDuration: number;
}

export async function renderVideoWithRevideo(options: RevideoRenderOptions): Promise<void> {
  try {
    console.log('[Revideo] Starting video render with open-source Revideo (best alternative to Remotion)...');
    console.log('[Revideo] Render options:', { 
      scriptLength: options.script.length, 
      imagesLength: options.images.length, 
      totalDuration: options.totalDuration,
      outputPath: options.outputPath
    });
    
    // Create a Revideo project structure
    console.log('[Revideo] Creating Revideo project structure...');
    const projectDir = path.join(path.dirname(options.outputPath), 'revideo-project');
    
    // Ensure project directory exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    // Create project.ts file
    const projectCode = createRevideoProjectCode(options);
    const projectPath = path.join(projectDir, 'project.ts');
    fs.writeFileSync(projectPath, projectCode);
    
    console.log('[Revideo] Project files created, starting render...');
    
    // Use Revideo programmatic rendering API
    await renderWithProgrammaticAPI(projectPath, options.outputPath);
    
    console.log('[Revideo] Video render completed successfully!');
    
    // Clean up temporary project directory
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    
  } catch (error) {
    console.error('[Revideo] Video render failed:', error);
    console.error('[Revideo] Error details:', (error as Error).message);
    throw error;
  }
}

function createRevideoProjectCode(options: RevideoRenderOptions): string {
  return `
import { makeProject } from '@revideo/core';
import { makeScene2D } from '@revideo/2d';
import { Img, Txt, waitFor, all } from '@revideo/2d';

const videoScene = makeScene2D(function* (view) {
  // Set black background
  view.fill('#000000');
  
  console.log('[Revideo] Scene created with ${options.script.length} segments');
  
  ${options.script.map((segment, index) => {
    const imageIndex = Math.min(index, options.images.length - 1);
    return `
  // Segment ${index + 1}: ${segment.text.substring(0, 40).replace(/'/g, "\\'")}...
  const image${index} = (
    <Img 
      src="${options.images[imageIndex]}"
      width={'100%'}
      height={'100%'}
      scale={1}
    />
  );
  
  const text${index} = (
    <Txt 
      text="${segment.text.replace(/"/g, '\\"')}"
      fontSize={48}
      fontFamily="Arial, sans-serif"
      fill="${options.textColor}"
      stroke="#000000"
      strokeWidth={3}
      y={300}
      textAlign="center"
      width={'90%'}
    />
  );
  
  yield view.add(image${index});
  yield view.add(text${index});
  
  // Animate for segment duration
  yield* all(
    image${index}.scale(1.05, ${segment.duration}),
    waitFor(${segment.duration})
  );
  
  yield view.remove(image${index});
  yield view.remove(text${index});
    `;
  }).join('')}
});

export default makeProject({
  scenes: [videoScene],
  name: '${options.topic}',
});
  `;
}

async function renderWithProgrammaticAPI(projectPath: string, outputPath: string): Promise<void> {
  try {
    console.log('[Revideo] Starting programmatic render...');
    
    // Check if the system has the required dependencies first
    const hasRequiredDependencies = await checkSystemDependencies();
    if (!hasRequiredDependencies) {
      throw new Error('Missing required system dependencies for Revideo (Chrome/Puppeteer libraries)');
    }
    
    // Import the renderer API
    const { renderVideo } = await import('@revideo/renderer');
    
    console.log('[Revideo] Renderer API loaded successfully');
    
    // Render video using Revideo's programmatic API with reduced worker count for Replit
    const resultFile = await renderVideo({
      projectFile: projectPath,
      settings: {
        logProgress: true,
        workers: 1, // Reduced for Replit environment
        outFile: outputPath,
        puppeteer: {
          // Reduced Chrome flags for Replit compatibility
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        }
      }
    });
    
    console.log('[Revideo] Programmatic render completed successfully:', resultFile);
    
  } catch (error) {
    console.error('[Revideo] Programmatic render failed:', error);
    throw error;
  }
}

async function checkSystemDependencies(): Promise<boolean> {
  try {
    // Quick check for basic Chrome dependencies
    const { execSync } = require('child_process');
    execSync('which google-chrome || which chromium-browser', { stdio: 'ignore' });
    return true;
  } catch {
    console.log('[Revideo] System dependencies check failed - Chrome/Chromium not available');
    return false;
  }
}

function createRevideoProject(options: RevideoRenderOptions): string {
  // Pre-calculate timing data outside the template
  const segmentData = options.script.map((segment, index) => {
    const imageIndex = Math.min(index, options.images.length - 1);
    return {
      index,
      text: segment.text.replace(/"/g, '\\"'),
      duration: segment.duration,
      imageUrl: options.images[imageIndex]
    };
  });

  const segmentCode = segmentData.map(segment => `
  // Segment ${segment.index + 1}: ${segment.text.substring(0, 40)}...
  const image${segment.index} = (
    <Img 
      src="${segment.imageUrl}"
      width={'100%'}
      height={'100%'}
      scale={1}
    />
  );
  
  const text${segment.index} = (
    <Txt 
      text="${segment.text}"
      fontSize={48}
      fontFamily="Arial, sans-serif"
      fill="${options.textColor}"
      stroke="#000000"
      strokeWidth={3}
      y={300}
      textAlign="center"
      width={'90%'}
    />
  );
  
  yield view.add(image${segment.index});
  yield view.add(text${segment.index});
  
  // Animate for segment duration with smooth effects
  yield* all(
    image${segment.index}.scale(1.05, ${segment.duration}),
    waitFor(${segment.duration})
  );
  
  yield view.remove(image${segment.index});
  yield view.remove(text${segment.index});
  `).join('');

  return `
import { makeProject } from '@revideo/core';
import { makeScene2D } from '@revideo/2d';
import { Img, Txt, waitFor, all } from '@revideo/2d';

// Scene definition with precise text timing
const videoScene = makeScene2D(function* (view) {
  // Set background color
  view.fill('#000000');
  
  ${segmentCode}
});

// Export project configuration
export default makeProject({
  scenes: [videoScene],
  name: '${options.topic}',
  resolution: { width: 1920, height: 1080 },
  frameRate: 30,
});
`;
}