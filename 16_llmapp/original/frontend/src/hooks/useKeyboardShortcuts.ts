import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).getAttribute?.("contenteditable") === "true")
    return true;
  // Monaco editor uses a textarea inside .monaco-editor
  if (el.closest?.(".monaco-editor")) return true;
  return false;
}

function getShortcutKey(e: KeyboardEvent): string | null {
  const mod = e.metaKey || e.ctrlKey;

  if (mod && e.key === "Enter") return "mod+enter";
  if (e.key === "Escape") return "escape";
  if (e.key === "F8" && e.shiftKey) return "shift+f8";
  if (e.key === "F8") return "f8";
  return null;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = getShortcutKey(e);
      if (!key) return;

      // mod+enter and escape work even when editor is focused
      const alwaysActive = key === "mod+enter" || key === "escape";
      if (!alwaysActive && isInputFocused()) return;

      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        action();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
