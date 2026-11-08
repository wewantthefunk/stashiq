import { useState } from "react";

import { AdminBinsPanel } from "../components/admin/AdminBinsPanel";
import { AdminActionsPanel } from "../components/admin/AdminActionsPanel";
import { AdminLocationsPanel } from "../components/admin/AdminLocationsPanel";
import { AdminItemsPanel } from "../components/admin/AdminItemsPanel";
import { AdminLogsPanel } from "../components/admin/AdminLogsPanel";
import { MobileAccessPanel } from "../components/admin/MobileAccessPanel";
import { AdminUsersPanel } from "../components/admin/AdminUsersPanel";

type Tab =
  | "actions"
  | "locations"
  | "bins"
  | "items"
  | "audit"
  | "mobile"
  | "users";

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("bins");

  return (
    <div className="space-y-6">
      <AdminIntro />
      <AdminTabs tab={tab} onTab={setTab} />
      {tab === "actions" && <AdminActionsPanel />}
      {tab === "locations" && <AdminLocationsPanel />}
      {tab === "bins" && <AdminBinsPanel />}
      {tab === "items" && <AdminItemsPanel />}
      {tab === "audit" && <AdminLogsPanel />}
      {tab === "mobile" && <MobileAccessPanel />}
      {tab === "users" && <AdminUsersPanel />}
    </div>
  );
}

function AdminIntro() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Admin</h2>
      <p className="mt-1 text-sm text-slate-400">
        Actions, locations, bins, catalog, users, audit trail, and mobile access.
      </p>
    </div>
  );
}

function AdminTabs({
  tab,
  onTab,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  const items: { id: Tab; label: string }[] = [
    { id: "actions", label: "Actions" },
    { id: "locations", label: "Locations" },
    { id: "bins", label: "Bins" },
    { id: "items", label: "Items" },
    { id: "audit", label: "Audit" },
    { id: "mobile", label: "Mobile" },
    { id: "users", label: "Users" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1 sm:grid-cols-4 lg:grid-cols-7">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTab(item.id)}
          className={`rounded-lg py-2 text-sm font-medium transition ${
            tab === item.id
              ? "bg-slate-100 text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
