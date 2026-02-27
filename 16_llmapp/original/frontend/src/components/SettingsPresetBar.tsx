import { SETTINGS_PRESETS } from "@/constants/settingsPresets";
import type { ReviewSettings } from "@/types/review";

interface SettingsPresetBarProps {
  currentSettings: ReviewSettings;
  onSelect: (settings: ReviewSettings) => void;
}

function settingsMatch(a: ReviewSettings, b: ReviewSettings): boolean {
  return (
    a.strictness === b.strictness &&
    a.detail_level === b.detail_level &&
    a.focus_areas.length === b.focus_areas.length &&
    a.focus_areas.every((area) => b.focus_areas.includes(area))
  );
}

export function SettingsPresetBar({
  currentSettings,
  onSelect,
}: SettingsPresetBarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {SETTINGS_PRESETS.map((preset) => {
        const isActive = settingsMatch(currentSettings, preset.settings);
        return (
          <button
            key={preset.id}
            onClick={() =>
              onSelect({
                ...preset.settings,
                output_language: currentSettings.output_language,
              })
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "border-od-accent bg-od-accent/15 text-od-accent"
                : "border-od-border text-od-fg shadow-sm hover:bg-od-float"
            }`}
            title={preset.description}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
