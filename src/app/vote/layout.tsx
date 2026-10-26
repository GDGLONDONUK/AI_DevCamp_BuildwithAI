import HackathonHauntShell from "@/components/hackathon/HackathonHauntShell";
import HackathonSubnav from "@/components/hackathon/HackathonSubnav";
import "@/app/hackathon/halloween.css";

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <HackathonHauntShell>
      <HackathonSubnav />
      {children}
    </HackathonHauntShell>
  );
}
