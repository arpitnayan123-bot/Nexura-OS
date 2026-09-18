import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Nexura OS",
  description:
    "The terms that govern use of the Nexura OS platform: informational-only health tools, no emergency use, account responsibilities, acceptable use, and disclaimers.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Acceptance of these terms",
    body: [
      "By accessing or using the Nexura OS platform — the public website, Know Your Health tools, the patient Portal, Connect, or any clinic, pharmacy, or hospital console — you agree to these Terms of Service. If you use Nexura on behalf of a healthcare organisation, you confirm you are authorised to bind that organisation to these terms.",
      "These terms, together with the Privacy Policy, form the agreement between you and Nexura for use of the software platform. Separate agreements govern the relationship between you and any hospital, clinic, or pharmacy providing your care.",
    ],
  },
  {
    heading: "2. Health information is not medical advice",
    body: [
      "Nexura is a software platform for health information, communication, and operations. Nothing on it — including AI-generated explanations, risk scores, triage suggestions, lab interpretations, or wellness plans — constitutes medical advice, a diagnosis, or a prescription, and the platform is not a substitute for a qualified clinician.",
      "AI-assisted output can be wrong or incomplete. Always seek the advice of a physician or other qualified health provider with any questions about a medical condition, and follow your clinician's instructions over anything the platform displays. Licensed professionals remain fully responsible for every clinical decision made in their workflows.",
      "In an emergency, do not use the platform. Call your local emergency number immediately — in India, dial 108 or 112. The platform does not monitor messages for emergencies and cannot dispatch help.",
    ],
  },
  {
    heading: "3. Accounts and security",
    body: [
      "You are responsible for the accuracy of the information you provide, for keeping your credentials and one-time codes confidential, and for all activity under your account. Sessions can be revoked; report suspected unauthorised access immediately.",
      "Healthcare staff accounts carry elevated responsibilities: access every record only when there is a legitimate care, operations, or audit reason. Every access is logged in a tamper-evident audit trail, and misuse — including browsing records out of curiosity or acting outside your role — is grounds for immediate suspension and may be unlawful.",
      "Family features: a family head may invite members, but a member is always joined only through their own verified account and a one-time invitation code. Never invite someone who has not consented.",
    ],
  },
  {
    heading: "4. Acceptable use",
    body: [
      "Do not attempt to access data you are not authorised for, probe or scan the platform for vulnerabilities without written permission, interfere with service availability, upload malicious content, scrape at scale, or use the platform to harass, defraud, or mislead anyone.",
      "Automated access is supported only through the documented, credentialed partner API and its rate limits. Automated access through patient-facing surfaces is not permitted.",
      "We may suspend or terminate access that violates these terms, and we may report unlawful activity to the appropriate authorities.",
    ],
  },
  {
    heading: "5. Disclaimers and limitation of liability",
    body: [
      'The platform is provided "as is" and "as available". To the maximum extent permitted by law, Nexura disclaims all warranties not stated here, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted or error-free.',
      "To the maximum extent permitted by law, Nexura will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill arising from use of the platform. Clinical outcomes remain the responsibility of the treating clinicians and the organisations that employ them.",
      "Some features depend on third-party services (for example, AI model providers, SMS/email delivery, or government health rails) and on hospitals' own networks; outages or errors in those services may affect availability or output.",
    ],
  },
  {
    heading: "6. Changes, governing law, and contact",
    body: [
      "We may update these terms as the platform evolves. Material changes will be announced on the platform or by email before they take effect; continued use after that date constitutes acceptance.",
      "These terms are governed by the laws of India, with courts at the platform operator's registered office having exclusive jurisdiction — pending adaptation by professional legal counsel for the operating entity.",
      "Questions, notices, and security reports (responsible disclosure) can be sent through the contact channels published on this site.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-primary">
        Nexura OS
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The agreement for using the Nexura platform. Last updated:{" "}
        {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
        .
      </p>

      <div className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
        <strong className="font-semibold">Template pending professional legal review.</strong>{" "}
        Prepared by engineers to describe how the platform actually behaves. It is{" "}
        <strong className="font-semibold">not legal advice</strong> and must be reviewed and adapted
        by qualified legal counsel for the operating entity before production use.
      </div>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl font-semibold text-foreground">{s.heading}</h2>
            <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-muted-foreground">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-foreground">
        <strong className="font-semibold">Medical emergency?</strong> Do not wait, do not type —
        call
        <strong className="font-semibold"> 108</strong> or{" "}
        <strong className="font-semibold">112</strong> (India) or your local emergency number now.
      </div>
    </main>
  );
}
