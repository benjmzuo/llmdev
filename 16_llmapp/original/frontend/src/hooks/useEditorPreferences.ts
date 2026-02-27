import { useCallback, useState } from "react";

export interface EditorPreferences {
  fontSize: number;
  wordWrap: "on" | "off";
}

const STORAGE_KEY = "code-editor-preferences";
const DEFAULT_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  wordWrap: "off",
};

function clampFontSize(size: number): number {
  return Math.min(24, Math.max(10, size));
}

function loadPreferences(): EditorPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFERENCES;
    const obj = parsed as Record<string, unknown>;
    return {
      fontSize: clampFontSize(
        typeof obj["fontSize"] === "number" ? obj["fontSize"] : DEFAULT_PREFERENCES.fontSize,
      ),
      wordWrap:
        obj["wordWrap"] === "on" || obj["wordWrap"] === "off"
          ? obj["wordWrap"]
          : DEFAULT_PREFERENCES.wordWrap,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function savePreferences(prefs: EditorPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore quota errors
  }
}

export function useEditorPreferences() {
  const [prefs, setPrefs] = useState<EditorPreferences>(loadPreferences);

  const increaseFontSize = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: clampFontSize(prev.fontSize + 1) };
      savePreferences(next);
      return next;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: clampFontSize(prev.fontSize - 1) };
      savePreferences(next);
      return next;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, fontSize: DEFAULT_PREFERENCES.fontSize };
      savePreferences(next);
      return next;
    });
  }, []);

  const toggleWordWrap = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, wordWrap: prev.wordWrap === "on" ? "off" : "on" } as const;
      savePreferences(next);
      return next;
    });
  }, []);

  return { prefs, increaseFontSize, decreaseFontSize, resetFontSize, toggleWordWrap };
}
