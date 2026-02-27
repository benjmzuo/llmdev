export const FOCUS_AREA_OPTIONS = [
  "security",
  "performance",
  "readability",
  "maintainability",
] as const;

export type FocusArea = (typeof FOCUS_AREA_OPTIONS)[number];

export const SEVERITY_STYLES: Record<string, string> = {
  error: "bg-od-red/10 text-od-red",
  warning: "bg-od-yellow/10 text-od-yellow",
  info: "bg-od-accent/10 text-od-accent",
};
