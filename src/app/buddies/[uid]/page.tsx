import { redirect } from "next/navigation";

type Props = { params: Promise<{ uid: string }> };

/** Legacy deep links open the profile modal on `/buddies`. */
export default async function BuddyProfileRedirect({ params }: Props) {
  const { uid } = await params;
  redirect(`/buddies?u=${encodeURIComponent(uid)}`);
}
