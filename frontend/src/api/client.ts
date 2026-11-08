import type {
  BinCreate,
  BinDetail,
  BinSummary,
  BinUpdate,
  Location,
  LocationCreate,
  InventoryAdjust,
  Item,
  InventoryLog,
  ItemBinSearchHit,
  ItemCreate,
  PublicConfig,
  AcceptInvitePayload,
  ActionCreate,
  ChangePasswordPayload,
  InventoryAction,
  ForgotPasswordResponse,
  InviteVerifyResponse,
  UserCreatePayload,
  UserCreatedResponse,
  UserListEntry,
  UserProfile,
  UserUpdatePayload,
} from "./types";

/** Empty base = same origin; Vite proxies /api to the backend (works from phone on LAN). */
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body instanceof URLSearchParams) {
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  } else if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((e: { msg?: string }) => e.msg)
          .filter(Boolean)
          .join("; ");
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function getPublicConfig() {
  return request<PublicConfig>("/api/config/public");
}

export function getMe(token: string) {
  return request<UserProfile>("/api/auth/me", {}, token);
}

export function listUsers(token: string) {
  return request<UserListEntry[]>("/api/users", {}, token);
}

export function createUser(payload: UserCreatePayload, token: string) {
  return request<UserCreatedResponse>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function resendInvite(userId: string, token: string) {
  return request<UserCreatedResponse>(
    `/api/users/${encodeURIComponent(userId)}/resend-invite`,
    { method: "POST" },
    token,
  );
}

export function verifyInvite(inviteToken: string) {
  const q = encodeURIComponent(inviteToken);
  return request<InviteVerifyResponse>(`/api/auth/invite?token=${q}`);
}

export function acceptInvite(payload: AcceptInvitePayload) {
  return request<{ access_token: string }>("/api/auth/invite/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload: ChangePasswordPayload, token: string) {
  return request<void>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function forgotPassword(email: string) {
  return request<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function updateUser(
  userId: string,
  payload: UserUpdatePayload,
  token: string,
) {
  return request<UserProfile>(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteUser(userId: string, token: string) {
  return request<void>(`/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  }, token);
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email.trim().toLowerCase());
  body.set("password", password);
  return request<{ access_token: string }>("/api/auth/login", {
    method: "POST",
    body,
  });
}

export function searchItemsInBins(
  query: string,
  token: string,
  locationId?: string | null,
) {
  const params = new URLSearchParams();
  params.set("q", query.trim());
  if (locationId !== undefined && locationId !== null) {
    params.set("location_id", locationId);
  }
  return request<ItemBinSearchHit[]>(
    `/api/search/items?${params.toString()}`,
    {},
    token,
  );
}

export function listActions(token: string) {
  return request<InventoryAction[]>("/api/actions", {}, token);
}

export function createAction(payload: ActionCreate, token: string) {
  return request<InventoryAction>("/api/actions", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteAction(actionId: string, token: string) {
  return request<void>(
    `/api/actions/${encodeURIComponent(actionId)}`,
    { method: "DELETE" },
    token,
  );
}

export function listLocations(token: string) {
  return request<Location[]>("/api/locations", {}, token);
}

export function createLocation(payload: LocationCreate, token: string) {
  return request<Location>("/api/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteLocation(locationId: string, token: string) {
  return request<void>(
    `/api/locations/${encodeURIComponent(locationId)}`,
    { method: "DELETE" },
    token,
  );
}

export function listBins(token: string, locationId?: string | null) {
  const params = new URLSearchParams();
  if (locationId !== undefined && locationId !== null) {
    params.set("location_id", locationId);
  }
  const qs = params.toString();
  return request<BinSummary[]>(`/api/bins${qs ? `?${qs}` : ""}`, {}, token);
}

export function updateBin(
  binId: string,
  payload: BinUpdate,
  token: string,
) {
  return request<BinSummary>(`/api/bins/${encodeURIComponent(binId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export function deleteBin(binId: string, token: string) {
  return request<void>(`/api/bins/${encodeURIComponent(binId)}`, {
    method: "DELETE",
  }, token);
}

export function createBin(payload: BinCreate, token: string) {
  return request<BinSummary>("/api/bins", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function fetchBinQrObjectUrl(binId: string, token: string) {
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const response = await fetch(
    `${API_BASE}/api/bins/${encodeURIComponent(binId)}/qr`,
    { headers },
  );
  if (!response.ok) {
    throw new ApiError("Could not load QR code", response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function getBin(binId: string, token: string) {
  return request<BinDetail>(`/api/bins/${encodeURIComponent(binId)}`, {}, token);
}

export function listItems(token: string) {
  return request<Item[]>("/api/items", {}, token);
}

export function createItem(payload: ItemCreate, token: string) {
  return request<Item>("/api/items", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export function listLogs(
  token: string,
  params?: { bin_id?: string; limit?: number },
) {
  const search = new URLSearchParams();
  if (params?.bin_id) search.set("bin_id", params.bin_id);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return request<InventoryLog[]>(`/api/logs${qs ? `?${qs}` : ""}`, {}, token);
}

export function adjustInventory(
  binId: string,
  payload: InventoryAdjust,
  token: string,
) {
  return request(`/api/bins/${encodeURIComponent(binId)}/adjust`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}
