/**
 * Mint a Firebase ID token for MCP (email/password).
 *
 * Usage (repo root):
 *   npx tsx --env-file=.env.local scripts/mcp-mint-id-token.ts --email=you@example.com
 *
 * Password: DEVCAMP_MCP_PASSWORD env, or --password=... (avoid shell history).
 * Needs NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.
 */

const emailArg = process.argv.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const passwordArg = process.argv
  .find((a) => a.startsWith("--password="))
  ?.slice("--password=".length);

const email = (emailArg || process.env.DEVCAMP_MCP_EMAIL || "").trim();
const password = (passwordArg || process.env.DEVCAMP_MCP_PASSWORD || "").trim();
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();

if (!email || !password) {
  console.error("Provide --email= and password via DEVCAMP_MCP_PASSWORD (or --password=).");
  process.exit(1);
}
if (!apiKey) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
  process.exit(1);
}

async function main() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = (await res.json()) as {
    idToken?: string;
    refreshToken?: string;
    expiresIn?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.idToken) {
    console.error("Sign-in failed:", body.error?.message || res.status);
    process.exit(1);
  }
  console.log(body.idToken);
  console.error(
    `\n# expires in ~${body.expiresIn || "3600"}s — set DEVCAMP_MCP_ID_TOKEN to the token above\n`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
