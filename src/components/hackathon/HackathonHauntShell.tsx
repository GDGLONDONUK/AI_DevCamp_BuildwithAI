import { Creepster, Space_Grotesk } from "next/font/google";
import "@/app/hackathon/halloween.css";

const creepster = Creepster({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-creepster",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export default function HackathonHauntShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`hackathon-haunt ${creepster.variable} ${spaceGrotesk.variable}`}>
      <div className="hh-fog" aria-hidden />
      <div className="hh-bats" aria-hidden>
        <span>🦇</span>
        <span>🦇</span>
        <span>🦇</span>
      </div>
      <div className="hh-content">{children}</div>
    </div>
  );
}
