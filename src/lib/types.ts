export type EventRow = {
  id: string;
  slug: string;
  status: "draft" | "published";
  title: string;
  promoter: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  poster_url: string | null;
  description: string | null;
  artists: string | null;
  price_text: string | null;
  min_age: number | null;
  access_conditions: string | null;
  ticket_url: string | null;
  guestlist_enabled: boolean;
  guestlist_open: boolean;
  guestlist_conditions: string | null;
  guestlist_perk: string | null;
  guestlist_auto_confirm: boolean;
  rewards_enabled: boolean;
  rewards_open: boolean;
  rewards_conditions: string | null;
  reward_threshold: number;
  reward_cap: number | null;
  genres: string[];
  videos: { src: string; poster?: string | null }[];
  recommendation: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestlistRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "confirmed" | "rejected";
  reviewed_at: string | null;
  created_at: string;
  phone: string | null;
  contact_consent: boolean;
};

export type ParticipationSummary = {
  id: string;
  event_id: string;
  user_id: string;
  status: "pending" | "active" | "inactive";
  public_code: string;
  channel_url: string | null;
  confirmed_tickets: number;
  last_reviewed_at: string | null;
  delivery_instructions: string | null;
  activated_at: string | null;
  created_at: string;
  reward_threshold: number;
  reward_cap: number | null;
  rewards_enabled: boolean;
  earned: number;
  delivered: number;
  pending_invitations: number;
  needs_review: boolean;
};

export type Profile = { id: string; full_name: string; email: string | null };

export type SalesAdjustment = {
  id: number;
  participation_id: string;
  previous_total: number;
  new_total: number;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

export type Delivery = { id: string; participation_id: string; seq: number; delivered_at: string; delivered_by: string | null };

export type SavedPlan = { id: string; user_id: string; event_id: string; has_ticket: boolean | null; created_at: string };
