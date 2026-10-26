import { Creepster, Space_Grotesk } from "next/font/google";

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

/**
 * Haunted Kiosk look for /hackathon/* and /vote.
 * Theme CSS is also imported from globals.css so styles always ship.
 */
export default function HackathonHauntShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`hackathon-haunt ${creepster.variable} ${spaceGrotesk.variable} relative isolate min-h-[100dvh] overflow-x-hidden text-[#f4ecff]`}
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgba(255, 122, 26, 0.22), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(140, 255, 102, 0.1), transparent 60%), linear-gradient(180deg, #160d22, #0c0712)",
        fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
      }}
    >
      <div
        className="hh-fog pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[45vh]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 100%, rgba(200, 190, 230, 0.14), transparent 60%), radial-gradient(ellipse at 75% 100%, rgba(200, 190, 230, 0.1), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="hh-bats pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <span className="absolute top-[12%] left-[-10%] text-2xl opacity-70">🦇</span>
        <span className="absolute top-[22%] left-[-10%] text-lg opacity-70 [animation-delay:-8s]">
          🦇
        </span>
        <span className="absolute top-[7%] left-[-10%] text-xl opacity-70 [animation-delay:-15s]">
          🦇
        </span>
      </div>
      <div className="hh-content relative z-[1]">{children}</div>
    </div>
  );
}
