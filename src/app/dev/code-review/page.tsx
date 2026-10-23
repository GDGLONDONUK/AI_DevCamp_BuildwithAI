import { notFound } from "next/navigation";
import CodeReviewPreview from "./CodeReviewPreview";

/**
 * /dev/code-review — LOCAL PREVIEW ONLY (`npm run dev`). 404 in production.
 * Try the hackathon code review on any public repo, in the real admin UI, without Firebase.
 */
export default function CodeReviewPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CodeReviewPreview />;
}
