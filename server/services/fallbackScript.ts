import { getLanguageInstruction } from "@shared/languages";

// Fallback script generator for when OpenAI is not available
export function generateFallbackScript(topic: string, duration: number, language: string = "english"): any[] {
  const segmentsCount = Math.max(2, Math.floor(duration / 15)); // 15 seconds per segment
  const timePerSegment = duration / segmentsCount;
  
  // Simple script templates based on common educational topics
  const templates = {
    photosynthesis: [
      {
        text: "Photosynthesis is the amazing process plants use to make their own food using sunlight, water, and carbon dioxide.",
        imagePrompt: "Green plants with sunlight rays, showing leaves absorbing light energy"
      },
      {
        text: "Chloroplasts in plant leaves contain chlorophyll, the green pigment that captures light energy from the sun.",
        imagePrompt: "Microscopic view of plant cells showing green chloroplasts inside leaf structure"
      },
      {
        text: "Plants take in carbon dioxide through their leaves and water through their roots to create glucose and oxygen.",
        imagePrompt: "Plant diagram showing CO2 entering leaves and water entering through roots"
      },
      {
        text: "The oxygen we breathe is actually a byproduct of photosynthesis, making plants essential for all life on Earth.",
        imagePrompt: "Forest scene with oxygen molecules being released from trees into the atmosphere"
      }
    ],
    water: [
      {
        text: "The water cycle is nature's way of recycling water, moving it continuously between oceans, atmosphere, and land.",
        imagePrompt: "Diagram of the water cycle showing evaporation, condensation, and precipitation"
      },
      {
        text: "Evaporation occurs when the sun heats water in oceans, lakes, and rivers, turning it into invisible water vapor.",
        imagePrompt: "Sunny day over ocean with water vapor rising invisibly from the surface"
      },
      {
        text: "Water vapor rises into the atmosphere where it cools and condenses into tiny droplets, forming clouds.",
        imagePrompt: "White fluffy clouds forming in blue sky from condensed water vapor"
      },
      {
        text: "When clouds become heavy with water, precipitation falls as rain or snow, returning water to Earth's surface.",
        imagePrompt: "Rain falling from dark clouds onto landscape with rivers and lakes"
      }
    ],
    plants: [
      {
        text: "Plants grow through an amazing process that starts with a tiny seed containing all the genetic information needed.",
        imagePrompt: "Cross-section of a seed showing the embryo and stored nutrients inside"
      },
      {
        text: "When seeds get the right amount of water, warmth, and oxygen, they begin to germinate and sprout.",
        imagePrompt: "Seed sprouting in soil with tiny green shoot emerging and roots growing downward"
      },
      {
        text: "Roots grow downward to absorb water and nutrients while the stem grows upward toward sunlight.",
        imagePrompt: "Young plant with visible root system underground and green stem reaching for sunlight"
      },
      {
        text: "Through photosynthesis and cellular growth, plants develop leaves, flowers, and eventually produce new seeds.",
        imagePrompt: "Mature plant with full leaves, colorful flowers, and seeds ready for dispersal"
      }
    ]
  };

  // Find matching template or create generic one
  let segments = templates.plants; // default
  const topicLower = topic.toLowerCase();
  
  if (topicLower.includes('photosynthesis') || topicLower.includes('plant food') || topicLower.includes('chlorophyll')) {
    segments = templates.photosynthesis;
  } else if (topicLower.includes('water cycle') || topicLower.includes('evaporation') || topicLower.includes('precipitation')) {
    segments = templates.water;
  } else if (topicLower.includes('plant') || topicLower.includes('grow') || topicLower.includes('seed')) {
    segments = templates.plants;
  } else {
    // Generic template for any topic
    segments = [
      {
        text: `Let's explore the fascinating topic of ${topic} and understand its key concepts.`,
        imagePrompt: `Educational illustration about ${topic}, clean and informative style`
      },
      {
        text: `Understanding ${topic} requires looking at its fundamental principles and how they work together.`,
        imagePrompt: `Diagram or visual representation of ${topic} concepts, modern educational style`
      },
      {
        text: `The practical applications of ${topic} can be seen in many aspects of our daily lives.`,
        imagePrompt: `Real-world examples of ${topic} in action, professional illustration`
      },
      {
        text: `In conclusion, ${topic} demonstrates the incredible complexity and beauty of the world around us.`,
        imagePrompt: `Summary visual of ${topic} showing its importance and connections, inspiring illustration`
      }
    ];
  }

  // Trim to requested number of segments
  segments = segments.slice(0, segmentsCount);

  // Add timing information
  return segments.map((segment, index) => ({
    ...segment,
    startTime: index * timePerSegment,
    endTime: (index + 1) * timePerSegment,
    duration: timePerSegment
  }));
}