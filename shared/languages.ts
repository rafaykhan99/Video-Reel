export const SUPPORTED_LANGUAGES = {
  english: {
    code: "en",
    name: "English",
    nativeName: "English",
    gptInstruction: "Generate content in English.",
    ttsSupported: true,
    tier: 1
  },
  spanish: {
    code: "es", 
    name: "Spanish",
    nativeName: "Español",
    gptInstruction: "Generate content in Spanish. Use proper Spanish grammar and vocabulary.",
    ttsSupported: true,
    tier: 1
  },
  french: {
    code: "fr",
    name: "French", 
    nativeName: "Français",
    gptInstruction: "Generate content in French. Use proper French grammar and vocabulary.",
    ttsSupported: true,
    tier: 1
  },
  german: {
    code: "de",
    name: "German",
    nativeName: "Deutsch", 
    gptInstruction: "Generate content in German. Use proper German grammar and vocabulary.",
    ttsSupported: true,
    tier: 1
  },
  chinese: {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    gptInstruction: "Generate content in Simplified Chinese. Use proper Chinese grammar and vocabulary.",
    ttsSupported: true,
    tier: 1
  },
  japanese: {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    gptInstruction: "Generate content in Japanese. Use proper Japanese grammar and vocabulary including hiragana, katakana, and kanji as appropriate.",
    ttsSupported: true,
    tier: 1
  },
  portuguese: {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    gptInstruction: "Generate content in Portuguese. Use proper Portuguese grammar and vocabulary.",
    ttsSupported: true,
    tier: 2
  },
  italian: {
    code: "it",
    name: "Italian", 
    nativeName: "Italiano",
    gptInstruction: "Generate content in Italian. Use proper Italian grammar and vocabulary.",
    ttsSupported: true,
    tier: 2
  },
  hindi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    gptInstruction: "Generate content in Hindi. Use proper Hindi grammar and vocabulary written in Devanagari script.",
    ttsSupported: true,
    tier: 2
  },
  urdu: {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    gptInstruction: "Generate content in Urdu. Use proper Urdu grammar and vocabulary written in Arabic script.",
    ttsSupported: true,
    tier: 2
  }
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export function getLanguageInstruction(language: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES[language]?.gptInstruction || SUPPORTED_LANGUAGES.english.gptInstruction;
}

export function getLanguageName(language: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES[language]?.name || "English";
}

export function getLanguageNativeName(language: SupportedLanguage): string {
  return SUPPORTED_LANGUAGES[language]?.nativeName || "English";
}

export function isTTSSupported(language: SupportedLanguage): boolean {
  return SUPPORTED_LANGUAGES[language]?.ttsSupported || false;
}