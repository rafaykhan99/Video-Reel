export const VIDEO_CATEGORIES = {
  explainer: {
    name: "Explainer Video",
    description: "Educational content that explains concepts, ideas, or processes",
    icon: "🎓",
    scriptPrompt: "Create an educational explainer video script that breaks down complex topics into easy-to-understand segments"
  },
  tutorial: {
    name: "Tutorial",
    description: "Step-by-step guides and how-to content",
    icon: "📋",
    scriptPrompt: "Create a tutorial video script with clear step-by-step instructions and practical examples"
  },
  story: {
    name: "Story",
    description: "Narrative storytelling with characters and plot",
    icon: "📖",
    scriptPrompt: "Create an engaging story video script with compelling narrative, characters, and visual storytelling"
  },
  "product-review": {
    name: "Product Review",
    description: "Product demonstrations, reviews, and comparisons",
    icon: "⭐",
    scriptPrompt: "Create a product review video script that highlights features, benefits, and provides honest evaluation"
  },
  educational: {
    name: "Educational",
    description: "Academic content and learning materials",
    icon: "🎯",
    scriptPrompt: "Create an educational video script with structured learning objectives and clear explanations"
  },
  promotional: {
    name: "Promotional",
    description: "Marketing content and brand promotion",
    icon: "📢",
    scriptPrompt: "Create a promotional video script that effectively communicates value propositions and calls-to-action"
  },
  news: {
    name: "News",
    description: "Current events and breaking news coverage",
    icon: "📰",
    scriptPrompt: "Create a news video script covering current events with factual reporting and engaging presentation"
  }
} as const;

export type VideoCategory = keyof typeof VIDEO_CATEGORIES;