export type PublicConfig = {
  public_url: string;
  public_url_configured: string | null;
  frontend_base_url: string;
  frontend_port: number;
  lan_ip: string | null;
  phone_url: string;
  localhost_url: string;
  note: string;
};

export type UserProfile = {
  id: string;
  email: string;
  role: "admin" | "operator";
  password_set?: boolean;
};

export type UserListEntry = UserProfile & {
  created_at: string;
};

export type UserCreatePayload = {
  email: string;
  role: "admin" | "operator";
};

export type UserCreatedResponse = UserProfile & {
  email_sent: boolean;
  invite_url: string | null;
};

export type InviteVerifyResponse = {
  email: string;
  valid: boolean;
};

export type AcceptInvitePayload = {
  token: string;
  password: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type UserUpdatePayload = {
  role?: "admin" | "operator";
  password?: string;
};

export type InventoryAction = {
  id: string;
  name: string;
};

export type ActionCreate = {
  id: string;
  name: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
};

export type LocationCreate = {
  id: string;
  name: string;
  address: string;
};

export type BinCreate = {
  id: string;
  name: string;
  location_notes?: string | null;
  location_id?: string | null;
};

export type BinUpdate = {
  location_id?: string | null;
  name?: string;
  location_notes?: string | null;
};

export type ItemCreate = {
  name: string;
  category: string;
  sku?: string | null;
};

export type ItemBinSearchHit = {
  bin_id: string;
  bin_name: string;
  location_id: string | null;
  location_name: string | null;
  item: Item;
  quantity: number;
};

export type BinSummary = {
  id: string;
  name: string;
  location_notes: string | null;
  location_id: string | null;
  location: Location | null;
  updated_at: string;
  is_empty: boolean;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
};

export type BinContent = {
  item: Item;
  quantity: number;
  updated_at: string;
};

export type BinDetail = BinSummary & {
  contents: BinContent[];
};

export type InventoryLog = {
  id: string;
  bin_id: string;
  bin_name: string;
  action_id: string | null;
  action_name: string | null;
  item_id: string;
  item_name: string;
  user_id: string;
  username: string;
  change_amount: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  timestamp: string;
};

export type InventoryAdjust = {
  item_id: string;
  change_amount: number;
  action_id: string;
  notes?: string | null;
};
