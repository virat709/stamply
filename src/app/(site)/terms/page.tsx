import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_OWNER } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Service",
  description:
    "The terms that govern use of Loyalkard by business owners, staff and customers, including accounts, loyalty rewards, acceptable use and liability.",
});

const description =
  "The terms that govern use of Loyalkard by business owners, staff and customers, including accounts, loyalty rewards, acceptable use and liability.";

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/terms",
          name: "Terms of Service",
          description,
        })}
      />
      <LegalPage
        eyebrow="Legal"
        title="Terms of Service"
        intro="These terms govern your use of Loyalkard. By using the website, owner console or customer stamp card, you agree to them."
      >
        <h2>1. Agreement</h2>
        <p>
          These terms form an agreement between you and {SITE_OWNER} (&quot;Loyalkard&quot;, &quot;we&quot;,
          &quot;us&quot; or &quot;our&quot;) for the Loyalkard website, owner console, customer stamp cards and
          related services (together, the &quot;Service&quot;). If you use the Service for a business, you confirm
          that you are authorised to accept these terms for that business.
        </p>

        <h2>2. Eligibility and accounts</h2>
        <ul>
          <li>You must be legally able to enter into a contract to create an owner account.</li>
          <li>You must provide accurate account and business information and keep it up to date.</li>
          <li>You are responsible for activity under your account and for keeping sign-in credentials secure.</li>
          <li>Tell us promptly if you believe your account or a stamp card has been compromised.</li>
        </ul>

        <h2>3. The Service</h2>
        <p>
          Loyalkard provides tools for digital stamp cards, staff-verified visits, reward redemption, customer
          feedback, Google review prompts, reservations and reporting. The Service is software; it does not itself
          sell goods or provide the rewards a business advertises.
        </p>

        <h2>4. Business responsibilities</h2>
        <p>If you operate a loyalty program on Loyalkard, you are responsible for:</p>
        <ul>
          <li>Setting clear, lawful reward rules and honouring rewards you offer to customers.</li>
          <li>Obtaining any consent required to collect customer names, phone numbers or email addresses.</li>
          <li>Using customer data only for your loyalty program and in line with applicable law.</li>
          <li>Training staff on verification and redemption procedures.</li>
          <li>Responding to customer questions about stamps, rewards and their data.</li>
          <li>Keeping your business profile, opening hours, links and review settings accurate.</li>
        </ul>

        <h2>5. Customer use</h2>
        <p>
          Customers may use a Loyalkard card only for their own genuine visits to the business that issued it.
          Customers must not copy, share, automate or manipulate QR codes, verification requests or reward codes, or
          attempt to obtain stamps they did not earn.
        </p>

        <h2>6. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>Use the Service to break the law, infringe rights, or mislead customers.</li>
          <li>Attempt to access accounts, cards or data that are not yours.</li>
          <li>Probe, scan, overload or disrupt the Service or its security measures.</li>
          <li>Reverse engineer the Service except where the law expressly allows it.</li>
          <li>Upload malicious code or use the Service to send spam.</li>
          <li>Resell or provide the Service to third parties without our written permission.</li>
        </ul>

        <h2>7. Fees and billing</h2>
        <p>
          Some features may be offered on a paid plan. Any fees, billing cycle, taxes and cancellation terms will be
          shown before you subscribe. Unless stated otherwise or required by law, fees are non-refundable. We may
          change paid plans with reasonable notice, and you may cancel before the next billing period.
        </p>

        <h2>8. Intellectual property</h2>
        <p>
          The Service, including its software, design, text and branding, is owned by {SITE_OWNER} or its licensors
          and is protected by intellectual property laws. We grant you a limited, non-exclusive, non-transferable
          right to use the Service during your subscription or permitted use. You keep ownership of your business
          content and customer data, subject to the licence needed for us to operate the Service.
        </p>

        <h2>9. Customer data and privacy</h2>
        <p>
          Our <Link href="/privacy">privacy policy</Link> explains how we handle personal data. A business using
          Loyalkard is responsible for its own customer relationships and for giving customers any notices required
          by law. We process customer data to provide the Service and as described in the privacy policy.
        </p>

        <h2>10. Third-party services</h2>
        <p>
          The Service relies on third-party providers, including Google Firebase for authentication and data storage
          and, where configured, Google review links. Third-party services have their own terms and availability.
          We are not responsible for third-party websites or services you choose to link to.
        </p>

        <h2>11. Availability, changes and beta features</h2>
        <p>
          We work to keep the Service available, but we do not guarantee uninterrupted or error-free operation.
          Maintenance, security work, provider outages and events outside our control may affect availability. We
          may add, change or remove features. Features labelled beta or demo are provided as-is and may change
          without notice.
        </p>

        <h2>12. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as
          available&quot;. We disclaim implied warranties of merchantability, fitness for a particular purpose,
          non-infringement and uninterrupted availability. We do not guarantee that the Service will increase
          revenue, visits or reviews.
        </p>

        <h2>13. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {SITE_OWNER} will not be liable for indirect, incidental, special,
          consequential or punitive damages, or for lost profits, revenue, data or goodwill. Our total liability for
          claims relating to the Service will not exceed the amount you paid us for the Service in the twelve months
          before the claim, or a reasonable amount if the Service was free.
        </p>

        <h2>14. Indemnity</h2>
        <p>
          You agree to indemnify and hold {SITE_OWNER} harmless from claims, losses and costs arising from your
          loyalty program, your content, your customer data, or your breach of these terms or applicable law, except
          to the extent caused by our own misconduct.
        </p>

        <h2>15. Suspension and termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you breach these terms,
          if required by law, or if your use threatens the security or integrity of the Service. On termination, we
          may delete data after a reasonable period, subject to backup and legal retention requirements. Sections
          that by their nature should survive termination will survive.
        </p>

        <h2>16. Governing law and disputes</h2>
        <p>
          These terms are governed by the laws of India, without regard to conflict-of-law rules. Disputes will be
          subject to the exclusive jurisdiction of the courts of competent jurisdiction in India, unless mandatory
          consumer law gives you another forum.
        </p>

        <h2>17. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. The effective date at the top of this page shows the latest
          revision. If a change is material, we will provide reasonable notice through the Service or by email.
          Continued use after the effective date means you accept the updated terms.
        </p>

        <h2>18. Contact</h2>
        <p>
          Questions about these terms: <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>. You can also
          read more <Link href="/about">about {SITE_OWNER}</Link> or use the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </LegalPage>
    </>
  );
}
