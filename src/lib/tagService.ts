/**
 * Client-side access to the Firestore `tags` collection.
 * Falls back to empty array if rules block or collection is empty (seed from Admin first).
 */

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TagCategoryDocument } from "@/types";

export async function fetchTagCategoriesFromFirestore(): Promise<TagCategoryDocument[]> {
  const snap = await getDocs(query(collection(db, "tags"), orderBy("order", "asc")));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      label: (data.label as string) ?? d.id,
      userField: (data.userField as string) ?? "",
      values: Array.isArray(data.values) ? (data.values as string[]) : [],
      order: typeof data.order === "number" ? data.order : 0,
      updatedAt: data.updatedAt as string | undefined,
    };
  });
}

/** Fetch via public API (no Firestore client reads) — works before rules deploy. */
export async function fetchTagCategoriesFromApi(): Promise<TagCategoryDocument[]> {
  const res = await fetch("/api/tags", { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as TagCategoryDocument[];
}
