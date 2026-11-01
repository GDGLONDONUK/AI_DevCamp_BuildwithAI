export function linkedinShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function xShareUrl(text: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function linkedinAddCertificationUrl(opts: {
  name: string;
  organizationName: string;
  issueYear: number;
  issueMonth: number;
  certUrl: string;
  certId: string;
}): string {
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: opts.name,
    organizationName: opts.organizationName,
    issueYear: String(opts.issueYear),
    issueMonth: String(opts.issueMonth),
    certUrl: opts.certUrl,
    certId: opts.certId,
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}
