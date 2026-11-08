import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { acceptInvite, verifyInvite, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function WelcomePage() {
  const { token, loginWithToken } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteToken = searchParams.get("token") ?? "";

  const [email, setEmail] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setValid(false);
      return;
    }
    let cancelled = false;
    verifyInvite(inviteToken)
      .then((res) => {
        if (!cancelled) {
          setEmail(res.email);
          setValid(res.valid);
        }
      })
      .catch(() => {
        if (!cancelled) setValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginWithToken(
        (await acceptInvite({ token: inviteToken, password })).access_token,
      );
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not set password.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg items-center justify-center px-4 text-slate-400">
        Checking invite…
      </div>
    );
  }

  if (!valid || !inviteToken) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 text-center">
        <h1 className="text-xl font-semibold text-white">Invalid invite</h1>
        <p className="mt-2 text-sm text-slate-400">
          This link is invalid or has expired. Ask an admin to send a new invite.
        </p>
        <Link
          to="/login"
          className="mt-6 text-sm text-amber-400 hover:text-amber-300"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Welcome
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Choose your password</h1>
        <p className="mt-2 text-sm text-slate-400">{email}</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
      >
        <label className="block text-left text-sm text-slate-300">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Confirm password
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Create password & sign in"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
