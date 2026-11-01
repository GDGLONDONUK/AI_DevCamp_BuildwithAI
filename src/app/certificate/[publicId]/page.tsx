import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCertificateShare } from "@/lib/server/publicCertified";
import ShareButtons from "@/components/ShareButtons";
import { linkedinAddCertificationUrl } from "@/lib/linkedinShare";
import { publicSiteUrl } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const revalidate = 300;

type Params = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { publicId } = await params;
  const cert = await loadCertificateShare(publicId);
  const title = cert
    ? `${cert.name} — Certified, AI DevCamp September 2026`
    : "AI DevCamp certificate";
  return {
    title,
    description: "Certified attendee of AI DevCamp September 2026, GDG London.",
    openGraph: {
      title,
      images: [`/certificate/${publicId}/opengraph-image`],
    },
  };
}

export default async function CertificateSharePage({ params }: Params) {
  const { publicId } = await params;
  const cert = await loadCertificateShare(publicId);
  if (!cert) notFound();

  const pageUrl = `${publicSiteUrl()}/certificate/${publicId}`;
  const issued = cert.certifiedAt ? new Date(cert.certifiedAt) : new Date("2026-11-01");
  const addUrl = linkedinAddCertificationUrl({
    name: "AI DevCamp September 2026",
    organizationName: "GDG London",
    issueYear: issued.getUTCFullYear(),
    issueMonth: issued.getUTCMonth() + 1,
    certUrl: cert.credsverseUrl || pageUrl,
    certId: cert.publicId || publicId,
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white py-16 px-4">
      <div className="max-w-xl mx-auto rounded-3xl border border-green-500/30 bg-gradient-to-b from-green-500/10 to-transparent p-8 space-y-5 text-center">
        <p className="font-mono text-xs tracking-widest text-green-400">CERTIFIED</p>
        <h1 className="text-3xl font-extrabold">{cert.name}</h1>
        <p className="text-gray-300">
          AI DevCamp — September 2026
          <br />
          GDG London · Google ADK
        </p>
        {cert.certifiedAt ? (
          <p className="text-sm text-gray-400">
            Issued {issued.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        ) : null}
        {cert.credsverseUrl ? (
          <p>
            <a
              href={cert.credsverseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:underline"
            >
              View Certifier credential
            </a>
          </p>
        ) : (
          <p className="text-sm text-gray-500">Digital credential will appear here once issued.</p>
        )}
        <div className="flex justify-center">
          <ShareButtons
            url={pageUrl}
            text={`I'm certified from AI DevCamp September 2026 🚀 #AIDevCamp #GDGLondon`}
            linkedinAddUrl={addUrl}
          />
        </div>
        <p className="text-sm">
          <Link href="/cohorts/september-2026/certified" className="text-gray-400 hover:text-white">
            All graduates
          </Link>
        </p>
      </div>
    </div>
  );
}
