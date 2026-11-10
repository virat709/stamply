import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_OWNER, SITE_PRIVACY_EMAIL } from "@/lib/site";

const contactDescription = `Contact Loyalkard for product support, account help, privacy requests or business onboarding. Email ${SITE_CONTACT_EMAIL}.`;

export const metadata: Metadata = pageMetadata({
  path: "/contact",
  title: "Contact",
  description: contactDescription,
});

const description = contactDescription;

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/contact",
          name: "Contact Loyalkard",
          description,
          type: "ContactPage",
        })}
      />
      <LegalPage
        eyebrow="Contact"
        title="Contact Loyalkard"
        intro="Questions about the product, your account, or your data? Here is how to reach the right team."
      >
        <h2>Product and account support</h2>
        <p>
          Email <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a> for help with the owner console,
          onboarding, stamp cards, QR codes, reviews, reservations or exports. We aim to reply within two business
          days.
        </p>

        <h2>Privacy and data requests</h2>
        <p>
          Email <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a> to request access, correction,
          export or deletion of personal data, or to ask a privacy question. Include the business name and the email
          or phone number associated with the account so we can verify the request. See the{" "}
          <Link href="/privacy">privacy policy</Link> for details.
        </p>

        <h2>For customers of a business using Loyalkard</h2>
        <p>
          Stamps, rewards and card access are managed by the business you visited, not by {SITE_OWNER} directly. If a
          stamp is missing, a reward was declined, or you need your card reset, contact that business first. If they
          cannot help, email us with the business name and a short description, and we will point you in the right
          direction.
        </p>

        <h2>For business owners</h2>
        <ul>
          <li>Onboarding and demo walkthroughs for your team.</li>
          <li>Console access, staff approvals and QR setup.</li>
          <li>Data export and deletion requests.</li>
          <li>Security, privacy and data-processing questions.</li>
          <li>Feedback on features you need for your loyalty program.</li>
        </ul>

        <h2>What to include in your message</h2>
        <ul>
          <li>The business name and the email used for the owner account.</li>
          <li>A clear description of the issue and what you expected to happen.</li>
          <li>The approximate date and time of the visit or transaction.</li>
          <li>For data requests, the customer name and contact method on the card.</li>
        </ul>
        <p>
          Please do not send full payment card numbers, passwords, or screenshots that show other customers&apos;
          personal data. We will never ask for your password by email.
        </p>

        <h2>Response times</h2>
        <p>
          Support is handled by email during business days. Most product questions receive a reply within two
          business days. Privacy and data requests are acknowledged as soon as possible and completed within the
          period required by applicable law.
        </p>

        <h2>Useful links</h2>
        <ul>
          <li>
            <Link href="/about">About Loyalkard and {SITE_OWNER}</Link>
          </li>
          <li>
            <Link href="/#faq">Frequently asked questions</Link>
          </li>
          <li>
            <Link href="/terms">Terms of service</Link>
          </li>
          <li>
            <Link href="/cookies">Cookie policy</Link>
          </li>
          <li>
            <Link href="/login">Business sign in</Link>
          </li>
        </ul>
      </LegalPage>
    </>
  );
}
