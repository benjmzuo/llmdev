import type { ReviewSettings } from "@/types/review";

export interface SettingsPreset {
  id: string;
  label: string;
  description: string;
  settings: ReviewSettings;
}

export const SETTINGS_PRESETS: SettingsPreset[] = [
  {
    id: "quick",
    label: "Quick",
    description: "Fast overview with lenient checks",
    settings: {
      strictness: "lenient",
      detail_level: "brief",
      focus_areas: [],
    },
  },
  {
    id: "thorough",
    label: "Thorough",
    description: "Deep analysis across all areas",
    settings: {
      strictness: "strict",
      detail_level: "deep",
      focus_areas: ["security", "performance", "readability", "maintainability"],
    },
  },
  {
    id: "security",
    label: "Security",
    description: "Focus on vulnerabilities and injection risks",
    settings: {
      strictness: "strict",
      detail_level: "deep",
      focus_areas: ["security"],
    },
  },
  {
    id: "performance",
    label: "Performance",
    description: "Identify bottlenecks and optimization opportunities",
    settings: {
      strictness: "normal",
      detail_level: "normal",
      focus_areas: ["performance"],
    },
  },
  {
    id: "style",
    label: "Style",
    description: "Readability and code style suggestions",
    settings: {
      strictness: "lenient",
      detail_level: "normal",
      focus_areas: ["readability"],
    },
  },
];
