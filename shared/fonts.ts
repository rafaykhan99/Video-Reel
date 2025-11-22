// Font configuration for text overlays
export const AVAILABLE_FONTS = {
  // Professional Fonts
  "dejavu-sans-bold": {
    name: "DejaVu Sans Bold",
    description: "Strong, professional - great for emphasis",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    category: "Professional",
    weight: "bold"
  },
  "dejavu-sans": {
    name: "DejaVu Sans",
    description: "Clean, modern - easy to read",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 
    category: "Professional",
    weight: "normal"
  },
  "dejavu-serif-bold": {
    name: "DejaVu Serif Bold",
    description: "Classic, elegant - traditional feel",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    category: "Professional",
    weight: "bold"
  },
  "dejavu-serif": {
    name: "DejaVu Serif", 
    description: "Traditional, readable - formal style",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    category: "Professional", 
    weight: "normal"
  },
  
  // Exciting/Creative Fonts - Using DejaVu with special styling hints
  "dejavu-impact": {
    name: "Impact Bold",
    description: "💥 Bold & powerful - perfect for action topics",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    category: "Exciting",
    weight: "bold"
  },
  "dejavu-bubbly": {
    name: "Bubbly Fun",
    description: "🎈 Playful & fun - great for kids content", 
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    category: "Exciting",
    weight: "normal"
  },
  "dejavu-scary": {
    name: "Spooky Horror", 
    description: "👻 Scary & mysterious - horror/thriller content",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    category: "Exciting",
    weight: "normal"
  },
  "dejavu-elegant": {
    name: "Stylish Script",
    description: "✨ Elegant & stylish - luxury/fashion content",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    category: "Exciting", 
    weight: "bold"
  },
  
  // Technical Fonts
  "dejavu-mono-bold": {
    name: "Code Bold",
    description: "💻 Technical, monospace - great for code topics",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
    category: "Technical",
    weight: "bold"
  },
  "dejavu-mono": {
    name: "Code Regular",
    description: "⚡ Code-style, monospace - technical content",
    path: "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    category: "Technical",
    weight: "normal"
  }
} as const;

export type FontKey = keyof typeof AVAILABLE_FONTS;

// Get font path from font key
export function getFontPath(fontKey: FontKey): string {
  return AVAILABLE_FONTS[fontKey]?.path || AVAILABLE_FONTS["dejavu-sans-bold"].path;
}

// Font categories for organizing the dropdown
export const FONT_CATEGORIES = [
  {
    name: "Professional",
    description: "Clean, business-ready fonts", 
    fonts: ["dejavu-sans-bold", "dejavu-sans", "dejavu-serif-bold", "dejavu-serif"] as FontKey[]
  },
  {
    name: "Exciting", 
    description: "Fun, creative fonts for engaging content",
    fonts: ["dejavu-impact", "dejavu-bubbly", "dejavu-scary", "dejavu-elegant"] as FontKey[]
  },
  {
    name: "Technical",
    description: "Monospace fonts, great for code & tech content", 
    fonts: ["dejavu-mono-bold", "dejavu-mono"] as FontKey[]
  }
];

// Text overlay color options
export const TEXT_COLORS = {
  // Bright & Bold
  "yellow": {
    name: "Bright Yellow",
    value: "yellow",
    description: "⭐ Classic YouTube-style, high visibility"
  },
  "white": {
    name: "Pure White", 
    value: "white",
    description: "✨ Clean & professional, works on any background"
  },
  "red": {
    name: "Bold Red",
    value: "red", 
    description: "🔥 Attention-grabbing, perfect for urgent content"
  },
  "cyan": {
    name: "Electric Cyan",
    value: "cyan",
    description: "⚡ Modern tech vibe, great for innovation topics"
  },
  "lime": {
    name: "Neon Lime",
    value: "lime",
    description: "🌟 Eye-catching green, perfect for energy content"
  },
  "orange": {
    name: "Vibrant Orange",
    value: "orange",
    description: "🧡 Warm & inviting, great for lifestyle content"
  },
  
  // Stylish Options
  "gold": {
    name: "Golden Glow",
    value: "gold",
    description: "👑 Luxury feel, perfect for premium content"
  },
  "hotpink": {
    name: "Hot Pink", 
    value: "hotpink",
    description: "💖 Fun & playful, great for entertainment"
  },
  "purple": {
    name: "Royal Purple",
    value: "purple",
    description: "💜 Creative & mysterious, perfect for art topics"
  },
  "silver": {
    name: "Silver Shine",
    value: "silver", 
    description: "✨ Sleek & modern, great for tech content"
  }
} as const;

export type TextColorKey = keyof typeof TEXT_COLORS;