import HackathonHub from "@/components/hackathon/HackathonHub";
import { loadHackathonPublicContent } from "@/lib/server/hackathonPublicContent";

export const dynamic = "force-dynamic";

export default async function HackathonPage() {
  const content = await loadHackathonPublicContent();
  return <HackathonHub content={content} />;
}
