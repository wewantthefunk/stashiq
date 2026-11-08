import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  ApiError,
  createUser,
  deleteUser,
  listUsers,
  resendInvite,
  updateUser,
} from "../../api/client";
import type { UserListEntry } from "../../api/types";
import { useAuth } from "../../context/AuthContext";

export function AdminUsersPanel() {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [creating, setCreating] = useState(false);
  const [pendingInviteUrl, setPendingInviteUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setUsers(await listUsers(token));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refresh()
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, [token, refresh]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    setPendingInviteUrl(null);
    try {
      const address = email.trim().toLowerCase();
      const created = await createUser({ email: address, role }, token);
      setEmail("");
      setRole("operator");
      await refresh();
      if (created.email_sent) {
        setSuccess(`Invite email sent to ${address}.`);
      } else {
        setSuccess(
          `User created. Email is not configured — share this link with them:`,
        );
        setPendingInviteUrl(created.invite_url);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create user.");
    } finally {
      setCreating(false);
    }
  }

  async function handleResend(u: UserListEntry) {
    if (!token) return;
    setError(null);
    setSuccess(null);
    setPendingInviteUrl(null);
    try {
      const res = await resendInvite(u.id, token);
      if (res.email_sent) {
        setSuccess(`Invite resent to ${u.email}.`);
      } else {
        setSuccess(`Share this invite link with ${u.email}:`);
        setPendingInviteUrl(res.invite_url);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend invite.");
    }
  }

  async function changeRole(u: UserListEntry, newRole: "admin" | "operator") {
    if (!token || u.role === newRole) return;
    setError(null);
    setSuccess(null);
    try {
      await updateUser(u.id, { role: newRole }, token);
      await refresh();
      setSuccess(`Updated access for ${u.email}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update user.");
    }
  }

  async function removeUser(u: UserListEntry) {
    if (!token) return;
    if (
      !window.confirm(
        `Delete user “${u.email}”? They will no longer be able to sign in.`,
      )
    ) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await deleteUser(u.id, token);
      await refresh();
      setSuccess(`Deleted ${u.email}.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete user.");
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-semibold text-white">Create user</h3>
        <p className="text-xs text-slate-500">
          They will receive an email to set a password and sign in.
        </p>
        <label className="block text-left text-sm text-slate-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <label className="block text-left text-sm text-slate-300">
          Access
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "admin" | "operator")
            }
            className={inputClass}
          >
            <option value="operator">Coach (operator)</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {creating ? "Sending invite…" : "Send invite"}
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}
      {pendingInviteUrl && (
        <p className="break-all rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-100">
          {pendingInviteUrl}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-400">Users</h3>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {!loading && users.length === 0 && (
          <p className="text-sm text-slate-500">No users yet.</p>
        )}
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
          {users.map((u) => {
            const isSelf = u.id === me?.id;
            const pending = !u.password_set;
            return (
              <li
                key={u.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-left">
                  <p className="font-medium text-white">
                    {u.email}
                    {isSelf && (
                      <span className="ml-2 text-xs text-slate-500">(you)</span>
                    )}
                    {pending && (
                      <span className="ml-2 text-xs text-amber-400">
                        invite pending
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {u.role === "admin" ? "Admin" : "Coach"}{" "}
                    · joined{" "}
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pending && (
                    <button
                      type="button"
                      onClick={() => void handleResend(u)}
                      className="rounded-lg border border-amber-500/40 px-2 py-1.5 text-xs text-amber-300"
                    >
                      Resend invite
                    </button>
                  )}
                  <select
                    value={u.role}
                    disabled={isSelf}
                    onChange={(e) =>
                      void changeRole(
                        u,
                        e.target.value as "admin" | "operator",
                      )
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white disabled:opacity-50"
                    title={isSelf ? "Use another admin to change your role" : ""}
                  >
                    <option value="operator">Coach</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => void removeUser(u)}
                    className="rounded-lg border border-red-500/40 px-2 py-1.5 text-xs text-red-300 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-amber-500";
