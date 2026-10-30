# Code review agent (Firebase Cloud Functions)

Reviews each hackathon project's GitHub repo **in the background** once the team ships it, and
saves a short summary that judges read in **Admin → Projects → Details & status**. It never scores:
judges give every score.

## How it works

```
team clicks "Ship" in Hackathon → My projects
        │  projects/{id} becomes status "submitted" with a GitHub link
        ▼
onProjectShipped   (Firestore trigger)  → queues projectCodeReviews/{id}
        ▼
runCodeReviews     (Firestore trigger)  → downloads the repo once, runs the fair-play checks
                                          (copying, hidden instructions, keys, late pushes),
                                          asks Gemini for a short summary, saves it
        ▲
sweepCodeReviews   (every 3 minutes)    → retries busy/stuck reviews, queues anything missed
```

- Drafts and votes never trigger a review. Re-shipping or changing the GitHub link does.
- At most 3 reviews run at once. If Gemini or GitHub is busy, the review waits and tries again.
- The review logic is shared with the website in `src/lib/code-review/` and bundled in by esbuild.
- The website only **reads** reviews (`/api/admin/code-reviews`, `/api/projects/[id]/code-review`)
  and can queue "Review again".

## Run it locally (Firebase Emulator — no real Firebase needed)

1. Install once:
   ```bash
   npm install --prefix functions
   ```
2. Put the keys in `functions/.secret.local` (git-ignored):
   ```
   CODE_REVIEW_GEMINI_API_KEY=...
   GITHUB_TOKEN=...
   ```
3. Add these lines to the portal's `.env.local` so the site talks to the emulator:
   ```
   NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
   NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-aidevcamp.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-aidevcamp
   NEXT_PUBLIC_FIREBASE_APP_ID=1:1:web:1
   FIREBASE_ADMIN_PROJECT_ID=demo-aidevcamp
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   ```
4. Two terminals in the portal folder:
   ```bash
   npm run emulators   # Firestore + Auth + the agent; UI at http://127.0.0.1:4000
                       # test data is saved to .emulator-data/ when you stop it with Ctrl+C (once)
   npm run dev         # the portal at http://localhost:3000
   ```
5. Register on the portal, then in the Emulator UI (Firestore → `users` → your user) set
   `role` to `admin`. Ship a project with a public GitHub link in **Hackathon → My projects**,
   then open **Admin → Projects**. The terminal running the emulators shows the agent's logs.

## Deploy (Sumith)

1. The Firebase project must be on the **Blaze** plan (Cloud Functions need it; this stays in the free tier).
2. Check `REGION` at the top of `functions/src/index.ts` matches the Firestore location
   (Firebase console → Firestore → the location shown at the top). It is `europe-west2` (London).
3. Save the two secrets (asked for interactively, never committed):
   ```bash
   firebase functions:secrets:set CODE_REVIEW_GEMINI_API_KEY
   firebase functions:secrets:set GITHUB_TOKEN
   ```
   `GITHUB_TOKEN`: a fine-grained token with **Public repositories (read-only)**.
4. Deploy:
   ```bash
   firebase deploy --only functions,firestore:rules
   ```
5. Projects shipped before the deploy are picked up by the sweep within a few minutes.

## Try a review from the terminal

```bash
npm run code-review:try -- https://github.com/owner/repo
npm run code-review:try -- --models      # which Gemini models your key can use, fastest first
```
These read `CODE_REVIEW_GEMINI_API_KEY` and `GITHUB_TOKEN` from the portal's `.env.local`.
