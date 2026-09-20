import { auth } from "@/lib/firebase";

export async function postLearningChat(opts: {
  message: string;
  focusSessionId?: string;
  pathname?: string;
  cohortId?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in to use the learning assistant");

  const res = await fetch("/api/learning-chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts),
  });

  const json = (await res.json()) as {
    ok?: boolean;
    data?: { text?: string };
    error?: string;
  };

  if (!res.ok || !json.ok) {
    throw new Error(json.error || "Learning chat request failed");
  }

  return json.data?.text || "Done.";
}
