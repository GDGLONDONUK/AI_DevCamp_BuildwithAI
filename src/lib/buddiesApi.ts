import { auth } from "@/lib/firebase";

async function getBearer(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  return token;
}

async function parseJson<T>(res: Response): Promise<{ ok: boolean; data?: T; error?: string }> {
  return (await res.json()) as { ok: boolean; data?: T; error?: string };
}

export type BuddyCard = {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  linkedinUrl?: string;
  city?: string;
  country?: string;
  location?: string;
  experienceLevel?: string;
  skills?: string[];
  expertise?: string[];
  wantToLearn?: string[];
  canOffer?: string[];
  priorAIKnowledgeTags?: string[];
  handle?: string;
  /** True when this row is already an accepted buddy of the signed-in viewer. */
  isBuddy?: boolean;
};

export type BuddyProjectSummary = {
  id: string;
  title: string;
  githubUrl?: string;
  demoUrl?: string;
  weekCompleted: number;
  status: string;
};

export async function fetchBuddyDirectory(q?: string): Promise<{ profiles: BuddyCard[] }> {
  const token = await getBearer();
  const url = q?.trim()
    ? `/api/buddies/directory?q=${encodeURIComponent(q.trim())}`
    : "/api/buddies/directory";
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await parseJson<{ profiles: BuddyCard[] }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load directory");
  return json.data;
}

export async function fetchBuddyProfile(uid: string): Promise<{
  profile: BuddyCard;
  viewerIsSelf: boolean;
  isBuddy: boolean;
  buddyExtras?: {
    githubUrl?: string;
    websiteUrl?: string;
    projects: BuddyProjectSummary[];
  };
}> {
  const token = await getBearer();
  const res = await fetch(`/api/buddies/profile/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{
    profile: BuddyCard;
    viewerIsSelf: boolean;
    isBuddy: boolean;
    buddyExtras?: {
      githubUrl?: string;
      websiteUrl?: string;
      projects: BuddyProjectSummary[];
    };
  }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load profile");
  return json.data;
}

export type BuddyRequestRow = {
  id: string;
  fromUid: string;
  toUid: string;
  status: string;
  createdAt?: string;
  respondedAt?: string;
  fromDisplayName?: string;
  toDisplayName?: string;
};

export async function fetchBuddyRequests(): Promise<{
  incoming: BuddyRequestRow[];
  outgoing: BuddyRequestRow[];
}> {
  const token = await getBearer();
  const res = await fetch("/api/buddies/requests", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ incoming: BuddyRequestRow[]; outgoing: BuddyRequestRow[] }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load requests");
  return json.data;
}

export async function sendBuddyRequest(
  toUid: string
): Promise<
  | { status: "pending"; requestId: string }
  | { status: "connected"; requestId: string; message?: string }
  | { status: "duplicate"; requestId: string; message?: string }
> {
  const token = await getBearer();
  const res = await fetch("/api/buddies/requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ toUid }),
  });
  const json = await parseJson<{
    status: "pending" | "connected" | "duplicate";
    requestId: string;
    message?: string;
  }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Request failed");
  return json.data;
}

export async function respondToBuddyRequest(
  requestId: string,
  action: "accept" | "reject"
): Promise<void> {
  const token = await getBearer();
  const res = await fetch(`/api/buddies/requests/${encodeURIComponent(requestId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const json = await parseJson<unknown>(res);
  if (!json.ok) throw new Error(json.error || "Update failed");
}

export type ConnectionRow = BuddyCard & {
  pairSince?: string;
  buddyExtras: {
    githubUrl?: string;
    websiteUrl?: string;
    projects: BuddyProjectSummary[];
  };
};

export async function fetchBuddyConnections(): Promise<{ buddies: ConnectionRow[] }> {
  const token = await getBearer();
  const res = await fetch("/api/buddies/connections", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await parseJson<{ buddies: ConnectionRow[] }>(res);
  if (!json.ok || !json.data) throw new Error(json.error || "Failed to load buddies");
  return json.data;
}
