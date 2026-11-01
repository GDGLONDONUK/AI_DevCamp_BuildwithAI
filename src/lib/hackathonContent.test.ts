import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HACKATHON_PUBLIC_CONTENT,
  HACKATHON_STARTER_LINKS,
  hackathonStarterResourcesPayload,
  normalizeHackathonPublicContent,
} from "./hackathonContent";

describe("hackathon starter links", () => {
  it("seed defaults have the emailed starter pack without luma tracking", () => {
    const urls = HACKATHON_STARTER_LINKS.map((l) => l.href);
    assert.equal(HACKATHON_STARTER_LINKS.length, 5);
    assert.ok(urls.some((u) => u.includes("claude.ai/artifact")));
    assert.ok(urls.some((u) => u.includes("sonikajanagill.com/ai-devcamp-labs")));
    assert.ok(urls.some((u) => u.includes("aidevcamp-halloween-hack.vercel.app/build")));
    assert.ok(urls.some((u) => u.includes("aidevcamp.gdg.london/hackathon")));
    for (const url of urls) {
      assert.equal(url.includes("utm_source"), false, url);
    }
  });

  it("payload uses stored starter links when provided", () => {
    const p = hackathonStarterResourcesPayload(DEFAULT_HACKATHON_PUBLIC_CONTENT);
    assert.equal(p.links.length, 5);
    assert.equal(p.closingSessionId, "sept-2026-hackathon");
  });

  it("normalize reads Firestore fields and rejects unsafe hrefs", () => {
    const normalized = normalizeHackathonPublicContent({
      prizes: [{ id: "jbl-go", name: "JBL Go from DB", imageSrc: "/hackathon/prizes/JBL_Go.png", sortOrder: 1 }],
      starterLinks: [
        {
          id: "hackathon-hub",
          audience: "Event hub",
          title: "Hub",
          blurb: "From DB",
          href: "javascript:alert(1)",
          label: "Open",
        },
      ],
      hauntedKioskUrl: "javascript:alert(1)",
    });
    assert.equal(normalized.prizes[0]?.name, "JBL Go from DB");
    assert.notEqual(normalized.starterLinks[0]?.href.startsWith("javascript:"), true);
    assert.ok(normalized.hauntedKioskUrl.startsWith("https://"));
    assert.ok(normalized.photosAlbumUrl.startsWith("https://photos.app.goo.gl/"));
  });
});
