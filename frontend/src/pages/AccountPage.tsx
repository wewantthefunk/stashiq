import { useState, type FormEvent } from "react";

import { changePassword, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function AccountPage() {
  const { token, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await changePassword(
        { current_password: currentPassword, new_password: newPassword },
        token,
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setSuccess("Password updated.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        {user && (
          <p className="text-sm text-slate-400">
            Signed in as <span className="text-slate-200">{user.email}</span>
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Change password</h3>
        <label className="block text-left text-sm text-slate-300">
          Current password
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          New password
          <input
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Confirm new password
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
        {success && (
          <p className="text-sm text-emerald-300" role="status">
            {success}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
