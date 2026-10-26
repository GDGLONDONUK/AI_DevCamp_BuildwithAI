import HackathonHauntShell from "@/components/hackathon/HackathonHauntShell";
import HackathonSubnav from "@/components/hackathon/HackathonSubnav";

export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <HackathonHauntShell>
      <HackathonSubnav />
      {children}
    </HackathonHauntShell>
  );
}
