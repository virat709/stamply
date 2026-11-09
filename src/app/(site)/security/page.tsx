import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_PRIVACY_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/security",
  title: "Security",
  description:
    "How Loyalkard protects loyalty data: server-trusted transactions, device-bound card access, authenticated owner actions, fraud controls and incident response.",
});

const description =
  "How Loyalkard protects loyalty data: server-trusted transactions, device-bound card access, authenticated owner actions, fraud controls and incident response.";

export default function SecurityPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/security",
          name: "Security at Loyalkard",
          description,
        })}
      />
      <LegalPage
        eyebrow="Trust"
        title="Security at Loyalkard"
        intro="Loyalkard handles loyalty balances and customer contact details, so security is built into the data flow rather than added at the edge."
      >
        <h2>Server-trusted loyalty</h2>
        <p>
          Stamps, reward redemptions, verification approvals and reviews are processed by server-side API routes. The
          browser is never trusted to mint a stamp. Each stamp code is validated and consumed in the same transaction
          as the stamp, so a failed attempt does not burn a valid code and a forged request cannot create one.
        </p>

        <h2>Device-bound card access</h2>
        <p>
          A customer&apos;s card is readable only by the device that holds the httpOnly possession cookie, or by the
          authenticated business owner. Knowing a customer&apos;s phone number alone does not reveal the card or its
          balance; it can only create a staff-verification request.
        </p>

        <h2>Authenticated owner actions</h2>
        <p>
          Owner dashboard actions verify a Firebase ID token on the server, including signature, issuer and audience,
          then re-check that the authenticated user owns the business being changed. Client-side checks are treated
          as convenience only.
        </p>

        <h2>Data access controls</h2>
        <ul>
          <li>Production Firestore rules deny direct client reads and writes, except for public business profiles.</li>
          <li>Server access uses the Firebase Admin SDK with least-privilege service credentials.</li>
          <li>Traffic is encrypted in transit with HTTPS.</li>
          <li>Cloud providers are responsible for encryption at rest and physical infrastructure security.</li>
          <li>Administrative access is limited to people who need it to operate and support the service.</li>
        </ul>

        <h2>Fraud controls</h2>
        <ul>
          <li>Counter QR codes rotate every five minutes and are single-use.</li>
          <li>Returning visits require an in-person staff approval that appears only in the owner console.</li>
          <li>Per-customer stamp cooldowns and review bonus limits are enforced server-side.</li>
          <li>Reward QR codes are single-use and logged when redeemed.</li>
        </ul>

        <h2>Demo mode</h2>
        <p>
          The public demo runs with local sample data and is not a production environment. Do not enter real customer
          records into demo mode. Production deployments use Firebase with the service-account configuration
          described in the deployment documentation.
        </p>

        <h2>Incident response</h2>
        <p>
          If we become aware of a security incident affecting personal data, we investigate, contain the issue, and
          notify affected businesses and authorities where required. We keep records of the incident and the
          remediation steps.
        </p>

        <h2>Reporting a vulnerability</h2>
        <p>
          If you believe you have found a security issue, email{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}?subject=Security%20report`}>{SITE_CONTACT_EMAIL}</a> with
          &quot;Security&quot; in the subject line. Include enough detail to reproduce the issue and avoid accessing,
          changing or sharing other people&apos;s data while testing. We will acknowledge the report and keep you
          updated on remediation.
        </p>

        <h2>Privacy</h2>
        <p>
          For how we collect and retain data, including your rights and deletion requests, read the{" "}
          <Link href="/privacy">privacy policy</Link> or email{" "}
          <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a>. For the terms that govern use of the
          service, read the <Link href="/terms">terms of service</Link>.
        </p>
      </LegalPage>
    </>
  );
}
