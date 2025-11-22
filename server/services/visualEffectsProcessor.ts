export interface VisualEffect {
  name: string;
  filter: string;
}

export const kenBurnsEffects: VisualEffect[] = [
  {
    name: 'zoom_in',
    filter: 'scale=1.1*iw*(1+0.1*t/10):1.1*ih*(1+0.1*t/10)'
  },
  {
    name: 'zoom_out', 
    filter: 'scale=1.3*iw*(1-0.2*t/10):1.3*ih*(1-0.2*t/10)'
  },
  {
    name: 'pan_right',
    filter: 'scale=1.2*iw:1.2*ih,crop=iw/1.2:ih/1.2:iw*0.1*t/10:ih*0.05'
  },
  {
    name: 'pan_left',
    filter: 'scale=1.2*iw:1.2*ih,crop=iw/1.2:ih/1.2:iw*0.1*(1-t/10):ih*0.05'
  },
  {
    name: 'stable',
    filter: 'scale=1.05*iw:1.05*ih'
  }
];

export function getKenBurnsEffect(index: number): VisualEffect {
  return kenBurnsEffects[index % kenBurnsEffects.length];
}

export function createFadeTransitions(
  isFirst: boolean, 
  isLast: boolean, 
  durationPerImage: number
): string {
  let transitions = '';
  
  if (!isFirst) {
    transitions += ',fade=in:0:15'; // Fade in
  }
  if (!isLast) {
    transitions += `,fade=out:st=${durationPerImage - 0.5}:d=15`; // Fade out
  }
  
  return transitions;
}

export function createImageFilter(
  inputIndex: number,
  imageIndex: number, 
  isFirst: boolean,
  isLast: boolean,
  durationPerImage: number,
  enableEffects: boolean = true
): string {
  // Base scaling and padding
  let filter = `[${inputIndex}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`;

  if (enableEffects) {
    // Add Ken Burns effect
    const kenBurnsEffect = getKenBurnsEffect(imageIndex);
    filter += `,${kenBurnsEffect.filter}`;
    
    // Add fade transitions
    filter += createFadeTransitions(isFirst, isLast, durationPerImage);
  }

  filter += `,setpts=PTS-STARTPTS[v${imageIndex}]`;
  return filter;
}