import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const baseNav = [
  { to: "/", label: "Home" },
  { to: "/scan", label: "Scan" },
  { to: "/account", label: "Account" },
];

export function AppShell() {
  const { logout, isAdmin, user, loading } = useAuth();
  const location = useLocation();

  const nav = isAdmin
    ? [...baseNav, { to: "/admin", label: "Admin" }]
    : baseNav;
  const cols = nav.length;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-8 pt-4">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Amazing Athletes
          </p>
          <h1 className="text-2xl font-bold text-white">StashIQ</h1>
          {!loading && user && (
            <p className="text-xs text-slate-500">
              {user.email}
              {isAdmin ? " · admin" : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Sign out
        </button>
      </header>

      <nav
        className="mb-6 grid gap-2 rounded-xl bg-slate-900 p-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => {
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-lg py-2 text-center text-sm font-medium transition ${
                active
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
