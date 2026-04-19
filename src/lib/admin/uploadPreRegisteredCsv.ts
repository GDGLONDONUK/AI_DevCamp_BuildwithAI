import toast from "react-hot-toast";
import { parseCSVText, buildPreRegisteredUsersFromRows } from "./csvPreRegistered";

export async function uploadPreRegisteredCsv(
  file: File,
  getToken: () => Promise<string | undefined>,
  onSuccess: () => void | Promise<void>
): Promise<void> {
  const text = await file.text();
  const rows = parseCSVText(text);
  const { unique, duplicateCount } = buildPreRegisteredUsersFromRows(rows);

  const token = await getToken();
  const res = await fetch("/api/admin/preregistered", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ users: unique }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  toast.success(
    `Uploaded ${unique.length} users${duplicateCount > 0 ? ` (${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""} removed)` : ""}`
  );
  await onSuccess();
}
