/**
 * Maps Firebase Auth errors to short, actionable copy (especially for production debugging).
 */

export function firebaseAuthErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";

  switch (code) {
    case "auth/unauthorized-domain":
      return "This site’s domain is not allowed for sign-in. In Firebase Console → Authentication → Settings → Authorized domains, add your production host (e.g. your-app.vercel.app).";
    case "auth/operation-not-allowed":
      return "Google sign-in is turned off in Firebase. Enable Google under Authentication → Sign-in method.";
    case "auth/popup-blocked":
      return "The sign-in popup was blocked. Allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Try email/password or the provider you used before.";
    default:
      if (code) return `Sign-in failed (${code}). If this persists, check Firebase settings and browser console.`;
      return "Google sign-in failed. Please try again.";
  }
}
