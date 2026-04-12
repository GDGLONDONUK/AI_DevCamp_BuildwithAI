import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "AI DevCamp – Build with AI | GDG London",
  description:
    "A 3-week hands-on AI learning program by GDG London & Build with AI. Learn Python for AI, Machine Learning fundamentals, and build your first AI models.",
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
          <main className="pt-16">{children}</main>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1f2937",
                color: "#f9fafb",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "16px",
                padding: "14px 18px",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
