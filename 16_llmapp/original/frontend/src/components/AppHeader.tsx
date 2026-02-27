import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" className="text-od-fg-bright">
          <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.28 5.78l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.75 8.19l3.47-3.47a.75.75 0 011.06 1.06z" />
        </svg>
        <h1 className="text-base font-semibold text-od-fg-bright">Code Reviewer</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-od-fg-muted">{user?.email}</span>
        <button
          onClick={toggleTheme}
          className="rounded-md border border-od-border bg-od-base px-3 py-1.5 text-sm font-medium text-od-fg shadow-sm hover:bg-od-float"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          onClick={signOut}
          className="rounded-md border border-od-border bg-od-base px-3 py-1.5 text-sm font-medium text-od-fg shadow-sm hover:bg-od-float"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
