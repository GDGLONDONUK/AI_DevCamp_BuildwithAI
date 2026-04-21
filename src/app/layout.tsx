import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import AuthenticatedMain from "@/components/AuthenticatedMain";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "AI DevCamp – Build with AI | GDG London",
  description:
    "A hands-on AI learning program by GDG London & Build with AI. Build multi-agent AI apps with TypeScript, Google ADK, Vertex AI, and the Model Context Protocol.",
  openGraph: {
    title: "AI DevCamp – Build with AI",
    description: "3-week hands-on AI learning program by GDG London",
    images: ["/banner.jpeg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="bg-gray-950 text-white font-poppins antialiased">
        <AuthProvider>
          <Navbar />
          <AuthenticatedMain>{children}</AuthenticatedMain>
          <Toaster
            position="bottom-right"
            gutter={10}
            toastOptions={{
              duration: 3500,
              style: {
                background: "#111827",
                color: "#f9fafb",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "14px",
                fontSize: "15px",
                fontWeight: "500",
                padding: "14px 18px",
                maxWidth: "400px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
              },
              success: {
                duration: 3000,
                style: {
                  background: "#052e16",
                  color: "#bbf7d0",
                  border: "1px solid rgba(34,197,94,0.35)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(34,197,94,0.12)",
                },
                iconTheme: {
                  primary: "#22c55e",
                  secondary: "#052e16",
                },
              },
              error: {
                duration: 4500,
                style: {
                  background: "#2d0a0a",
                  color: "#fca5a5",
                  border: "1px solid rgba(239,68,68,0.35)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(239,68,68,0.12)",
                },
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#2d0a0a",
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
