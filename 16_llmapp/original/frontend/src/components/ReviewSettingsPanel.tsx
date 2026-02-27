import { useState } from "react";

import { SettingsPresetBar } from "@/components/SettingsPresetBar";
import { FOCUS_AREA_OPTIONS } from "@/constants/review";
import type { OutputLanguage, ReviewSettings } from "@/types/review";

interface ReviewSettingsPanelProps {
  settings: ReviewSettings;
  onChange: (settings: ReviewSettings) => void;
  disabled: boolean;
}

export function ReviewSettingsPanel({
  settings,
  onChange,
  disabled,
}: ReviewSettingsPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  function toggleFocusArea(area: (typeof FOCUS_AREA_OPTIONS)[number]) {
    onChange({
      ...settings,
      focus_areas: settings.focus_areas.includes(area)
        ? settings.focus_areas.filter((a) => a !== area)
        : [...settings.focus_areas, area],
    });
  }

  return (
    <div className="rounded-md border border-od-border bg-od-base p-4 shadow-sm">
      {/* Presets */}
      <div className="mb-3">
        <label className="mb-2 block text-xs font-medium text-od-fg-muted">
          Presets
        </label>
        <SettingsPresetBar currentSettings={settings} onSelect={onChange} />
      </div>

      {/* Toggle details */}
      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="mb-2 text-xs font-medium text-od-accent hover:underline"
      >
        {showDetails ? "Hide details" : "Customize..."}
      </button>

      {showDetails && (
        <fieldset
          disabled={disabled}
          className="disabled:opacity-50"
        >
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-od-fg-muted">
                Strictness
              </label>
              <select
                value={settings.strictness}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    strictness: e.target
                      .value as ReviewSettings["strictness"],
                  })
                }
                className="rounded-md border border-od-border bg-od-base px-2 py-1.5 text-sm text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
              >
                <option value="lenient">Lenient</option>
                <option value="normal">Normal</option>
                <option value="strict">Strict</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-od-fg-muted">
                Detail Level
              </label>
              <select
                value={settings.detail_level}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    detail_level: e.target
                      .value as ReviewSettings["detail_level"],
                  })
                }
                className="rounded-md border border-od-border bg-od-base px-2 py-1.5 text-sm text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
              >
                <option value="brief">Brief</option>
                <option value="normal">Normal</option>
                <option value="deep">Deep</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-od-fg-muted">
                Focus Areas
              </label>
              <div className="flex flex-wrap gap-3">
                {FOCUS_AREA_OPTIONS.map((area) => (
                  <label key={area} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={settings.focus_areas.includes(area)}
                      onChange={() => toggleFocusArea(area)}
                      className="rounded border-od-border"
                    />
                    <span className="text-sm capitalize text-od-fg">
                      {area}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-od-fg-muted">
                Output Language
              </label>
              <select
                value={settings.output_language ?? "en"}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    output_language: e.target.value as OutputLanguage,
                  })
                }
                className="rounded-md border border-od-border bg-od-base px-2 py-1.5 text-sm text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
              >
                <option value="en">English</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}
