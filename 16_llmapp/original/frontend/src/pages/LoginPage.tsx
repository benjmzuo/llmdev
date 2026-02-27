import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { login } from "@/services/auth";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const { access_token } = await login(email, password);
      await signIn(access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-od-surface">
      <div className="w-full max-w-sm rounded-lg border border-od-border bg-od-base p-8 shadow-lg">
        <h1 className="mb-6 text-center text-xl font-semibold text-od-fg-bright">
          Sign in to Code Reviewer
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-od-red/30 bg-od-red/5 p-3 text-sm text-od-red">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-od-fg"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-od-border bg-od-surface px-3 py-2 text-sm text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-od-fg"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-od-border bg-od-surface px-3 py-2 text-sm text-od-fg shadow-sm focus:border-od-accent focus:ring-1 focus:ring-od-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-od-green py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-od-fg-muted">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-od-accent hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
