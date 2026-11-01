import HackathonHub from "@/components/hackathon/HackathonHub";
import { loadHackathonPublicContent } from "@/lib/server/hackathonPublicContent";
import { loadGooglePhotosPreview } from "@/lib/server/googlePhotosPreview";

export const dynamic = "force-dynamic";

export default async function HackathonPage() {
  const content = await loadHackathonPublicContent();
  const photos = await loadGooglePhotosPreview(
    content.photosAlbumUrl,
    content.photosAlbumTitle
  );
  return <HackathonHub content={content} photos={photos} />;
}
