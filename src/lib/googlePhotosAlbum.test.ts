import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicGooglePhotosAlbumUrl,
  parseGooglePhotosShareHtml,
  PUBLIC_HACKATHON_PHOTOS_ALBUM_URL,
} from "./googlePhotosAlbum";

describe("public Google Photos album URLs", () => {
  it("allows the short share link and blocks signed-in /u/ paths", () => {
    assert.equal(isPublicGooglePhotosAlbumUrl(PUBLIC_HACKATHON_PHOTOS_ALBUM_URL), true);
    assert.equal(
      isPublicGooglePhotosAlbumUrl(
        "https://photos.google.com/share/AF1QipNfa7O5MKnG05zY2sI_8r0Og-7QxjbAZ2rMieTU"
      ),
      true
    );
    assert.equal(
      isPublicGooglePhotosAlbumUrl(
        "https://photos.google.com/u/1/album/AF1QipNfa7O5MKnG05zY2sI_8r0Og-7QxjbAZ2rMieTU"
      ),
      false
    );
    assert.equal(isPublicGooglePhotosAlbumUrl("https://example.com/album"), false);
    assert.equal(isPublicGooglePhotosAlbumUrl("javascript:alert(1)"), false);
  });

  it("parses og:image and unique photo ids from share HTML", () => {
    const html = `
      <meta property="og:title" content="AI DevCamp 2026 · Halloween Hack · 31 Oct - Google Photos">
      <meta property="og:image" content="https://lh3.googleusercontent.com/pw/AP1GczCover=w600-h315-p-k">
      https://lh3.googleusercontent.com/pw/AP1GczPhotoOneABCDEFghijk=w256
      https://lh3.googleusercontent.com/pw/AP1GczPhotoOneABCDEFghijk=w512
      https://lh3.googleusercontent.com/pw/AP1GczPhotoTwoXYZABCDEFGH=w256
    `;
    const parsed = parseGooglePhotosShareHtml(html);
    assert.equal(parsed.title, "AI DevCamp 2026 · Halloween Hack · 31 Oct");
    assert.ok(parsed.ogImage?.startsWith("https://lh3.googleusercontent.com/"));
    assert.equal(parsed.photoIds.length, 2);
  });
});
