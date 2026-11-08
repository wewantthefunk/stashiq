import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { forgotPassword, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ForgotPasswordPage() {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not request a reset.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Password reset
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Forgot your password?</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your email and we will send a link to set a new one.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
      >
        <label className="block text-left text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </label>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-emerald-300" role="status">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-center text-sm">
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
