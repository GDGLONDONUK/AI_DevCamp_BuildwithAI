import HackathonHauntShell from "@/components/hackathon/HackathonHauntShell";
import HackathonSubnav from "@/components/hackathon/HackathonSubnav";

/** Ensures halloween.css is tied to this route segment as well as globals. */
import "./halloween.css";

export default function HackathonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HackathonHauntShell>
      <HackathonSubnav />
      {children}
    </HackathonHauntShell>
  );
}
