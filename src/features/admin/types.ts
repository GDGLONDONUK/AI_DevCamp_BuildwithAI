import type { LucideIcon } from "lucide-react";

export type AdminTab =
  | "attendance"
  | "users"
  | "assignments"
  | "projects"
  | "sessions"
  | "preregistered";

export type PreRegFilter = "all" | "linked" | "unlinked";

export interface AdminTabConfig {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  count: number;
}
