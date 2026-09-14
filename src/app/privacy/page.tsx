import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Nexura OS",
  description:
    "How Nexura OS handles health and personal data: collection, purpose limitation, retention, security controls, and your rights under India's DPDP Act 2023.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. Who this policy covers",
    body: [
      "This policy describes how the Nexura OS platform (\"Nexura\", \"we\") handles personal and health-related data across its products: the public website, Know Your Health tools, the patient Portal and family features, Connect (doctor–patient messaging and teleconsultation), and the clinic, pharmacy, and hospital operations consoles. It applies to visitors, patients, family members, and staff who use these surfaces.",
      "Nexura is designed around the principles of India's Digital Personal Data Protection (DPDP) Act 2023 and informed by global practices such as GDPR: purpose limitation, data minimisation, storage limitation, and security safeguards. Where you interact with a hospital, clinic, or pharmacy that uses Nexura, that organisation acts as the data fiduciary for your clinical records and this policy describes the platform's role in processing them.",
    ],
  },
  {
    heading: "2. What we collect, and why",
    body: [
      "Account and contact data — name, phone number, email, date of birth — to create and secure your account, verify your identity (one-time passwords), and contact you about care you have requested.",
      "Health data you or your care providers enter — symptoms you type into health tools, reports you upload or link, prescriptions, visit records, family links — to provide the feature you asked for. Health tools such as the symptom checker, lab analyser, or food scanner process what you submit only to generate that tool's output.",
      "Technical data — request identifiers, coarse device signals, and security events — to keep the platform safe: rate limiting, session revocation, tamper-evident audit trails, and abuse prevention.",
      "We do not collect health data through covert means, we do not sell personal or health data, and we do not use patient records for advertising. Where a feature works without identifying you, we prefer it that way.",
    ],
  },
  {
    heading: "3. AI features and their limits",
    body: [
      "Some features use artificial-intelligence models (for example, to explain lab results, structure a food photo, or draft a symptom summary). AI output is informational support, not a diagnosis, not a prescription, and not medical advice. It can be wrong, incomplete, or miss something important.",
      "Always confirm AI-generated health information with a qualified clinician before acting on it, and never delay seeking care because of an AI result. Clinical decisions on Nexura remain human decisions: licensed professionals review, sign, and act on clinical information within their own hospital's workflows.",
      "We clearly label AI-generated content inside the product, keep explanations available (\"why did the system say this?\"), and provide feedback channels — every AI surface lets you flag a wrong or harmful output.",
    ],
  },
  {
    heading: "4. Sharing and access control",
    body: [
      "Your clinical records are visible to the staff of the organisation holding them, strictly by role: a receptionist sees demographics and appointments, a doctor sees the clinical chart, an administrator sees operational views — every access is recorded in a hash-chained audit log that cannot be quietly edited.",
      "Family features work by invitation only: a family head can invite a member, and the member must accept the invitation from their own verified account before any linkage happens. Nobody can attach your account to their family by knowing your phone number.",
      "Integration partners (laboratory systems, government health rails such as ABDM, or a pharmacy's suppliers) only receive the minimum data a specific consented workflow requires, and only when your hospital enables that integration.",
    ],
  },
  {
    heading: "5. Retention and security",
    body: [
      "We keep personal data only as long as needed for the purpose it was collected, plus any legally required retention period. Expired sessions, aged audit events, and stale technical records are purged automatically by scheduled retention jobs; clinical record retention follows the requirements of the hospital that holds your record.",
      "Security controls include encrypted transport (HTTPS/TLS), hashed passwords and device secrets (we never store your password or device key in readable form), signed session cookies that can be revoked, per-device HMAC authentication for medical sensor data, structured secret handling, and least-privilege access enforced in code on every request.",
      "No system is perfectly secure. If a breach affecting your data ever occurs, we will notify affected users and the appropriate authorities as required by law.",
    ],
  },
  {
    heading: "6. Your rights",
    body: [
      "You can access and correct your profile and family details in the Portal at any time, and request deletion of data that is no longer required. You can withdraw a family invitation link, sign out sessions remotely, and ask what data of yours is held by an organisation using Nexura.",
      "To exercise rights that rest with a hospital or clinic (for example, correcting a clinical note written by a doctor), contact that organisation directly — the platform supports their obligations but does not overrule the treating clinician's record.",
      "Questions or requests about this policy can be sent to the contact address published on this site. If you are located in India and believe your rights under the DPDP Act were violated, you may also approach the Data Protection Board of India.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-primary">Nexura OS</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        How we handle personal and health data across the Nexura platform. Last updated:{" "}
        {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}.
      </p>

      <div className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
        <strong className="font-semibold">Template pending professional legal review.</strong> This document is a
        technically accurate description of the platform&apos;s current data handling, prepared by engineers. It is
        <strong className="font-semibold"> not legal advice and not a compliance certification</strong>. Have it
        reviewed and adapted by a qualified legal professional for your jurisdiction and organisation before relying
        on it operationally.
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
        <strong className="font-semibold">Medical emergency?</strong> Nexura is not an emergency service. If you or
        someone else may be seriously ill or injured, call your local emergency number immediately — in India, dial
        <strong className="font-semibold"> 108</strong> or <strong className="font-semibold">112</strong>.
      </div>
    </main>
  );
}
