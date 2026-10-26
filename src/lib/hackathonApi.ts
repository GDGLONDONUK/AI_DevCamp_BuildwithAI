import { auth } from "@/lib/firebase";

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required");
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body && (body.error || body.message)) || `Request failed (${res.status})`
    );
  }
  return (body.data ?? body) as T;
}

export async function fetchHackathonIdeas(openOnly = false) {
  const q = openOnly ? "?open=1" : "";
  const res = await fetch(`/api/hackathon/ideas${q}`);
  return parseJson<{ count: number; ideas: HackathonIdea[] }>(res);
}

export type HackathonIdea = {
  id: string;
  title: string;
  teamName: string;
  description: string;
  projectType: "solo" | "team";
  openToMembers: boolean;
  techStack: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshotUrls: string[];
  userName: string;
  voteTotal: number;
  status: string;
};

export async function fetchMyHackathonProject() {
  const headers = await authHeaders();
  const res = await fetch("/api/hackathon/my-project", { headers });
  return parseJson<{ project: (HackathonIdea & { weekCompleted?: number }) | null }>(
    res
  );
}

export type SaveHackathonProjectInput = {
  ship?: boolean;
  title: string;
  teamName?: string;
  description: string;
  projectType: "solo" | "team";
  openToMembers?: boolean;
  techStack?: string[];
  githubUrl?: string;
  demoUrl?: string;
  screenshotUrls?: string[];
  weekCompleted?: number;
};

export async function saveMyHackathonProject(input: SaveHackathonProjectInput) {
  const headers = await authHeaders();
  const res = await fetch("/api/hackathon/my-project", {
    method: "PUT",
    headers,
    body: JSON.stringify(input),
  });
  return parseJson<{ id: string; status: string; shipped: boolean; project: HackathonIdea }>(
    res
  );
}

export async function joinHackathon() {
  const headers = await authHeaders();
  const res = await fetch("/api/me/join-hackathon", { method: "POST", headers });
  return parseJson<{
    joined: boolean;
    alreadyEligible: boolean;
    message: string;
  }>(res);
}

export async function fetchVoteState() {
  const headers = await authHeaders();
  const res = await fetch("/api/hackathon/vote", { headers });
  return parseJson<{
    projects: HackathonIdea[];
    votingOpen: boolean;
    message?: string;
    allocations: Record<string, number>;
    budget: number;
    maxPerProject: number;
  }>(res);
}

export async function castVotes(allocations: Record<string, number>) {
  const headers = await authHeaders();
  const res = await fetch("/api/hackathon/vote", {
    method: "POST",
    headers,
    body: JSON.stringify({ allocations }),
  });
  return parseJson<{
    ok: boolean;
    allocations: Record<string, number>;
    used: number;
    remaining: number;
  }>(res);
}
