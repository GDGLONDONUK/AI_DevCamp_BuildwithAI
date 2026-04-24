import type { SessionSelfCheckInDocument } from "@/types";

export function isSelfCheckInWindowOpen(data: SessionSelfCheckInDocument | undefined): boolean {
  if (!data?.code?.trim()) return false;
  const now = Date.now();
  const open = new Date(data.opensAt).getTime();
  const close = new Date(data.closesAt).getTime();
  if (Number.isNaN(open) || Number.isNaN(close)) return false;
  return now >= open && now <= close;
}
