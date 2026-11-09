import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_OWNER, SITE_OWNER_URL, SITE_PRIVACY_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy Policy",
  description:
    "How Loyalkard collects, uses, stores and protects business and customer data, the cookies we use, retention periods, and your privacy rights.",
});

const description =
  "How Loyalkard collects, uses, stores and protects business and customer data, the cookies we use, retention periods, and your privacy rights.";

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/privacy",
          name: "Privacy Policy",
          description,
        })}
      />
      <LegalPage
        eyebrow="Legal"
        title="Privacy Policy"
        intro="This policy explains what data Loyalkard collects, why we collect it, how it is protected, and the choices available to businesses and their customers."
      >
        <h2>1. Who we are</h2>
        <p>
          Loyalkard is digital loyalty software operated by{" "}
          <a href={SITE_OWNER_URL} target="_blank" rel="noopener noreferrer">
            {SITE_OWNER}
          </a>{" "}
          (&quot;Loyalkard&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;). This policy applies to the
          Loyalkard website, the owner console, the customer stamp-card experience, and related support
          communications.
        </p>
        <p>
          A business that uses Loyalkard is the controller of its own loyalty program and customer relationships.
          Loyalkard processes that data on the business&apos;s behalf and for our own limited purposes described
          below.
        </p>

        <h2>2. Information we collect</h2>
        <h3>Business account information</h3>
        <ul>
          <li>Owner name, email address, authentication identifiers and sign-in method.</li>
          <li>
            Business profile details such as business name, logo, phone number, address, opening hours, website,
            menu link and Google review link.
          </li>
          <li>Loyalty settings such as the number of stamps required, reward description and expiry rules.</li>
        </ul>

        <h3>Customer and loyalty information</h3>
        <ul>
          <li>Customer name and phone number or email address provided when joining a stamp card.</li>
          <li>Stamp card balance, visit history, reward redemptions and last-visit timestamps.</li>
          <li>Staff verification requests and approvals associated with a visit.</li>
        </ul>

        <h3>Feedback and reservations</h3>
        <ul>
          <li>Ratings, comments and automated replies submitted through the review flow.</li>
          <li>Reservation name, phone number, party size, requested date and time, and notes.</li>
        </ul>

        <h3>Technical and security information</h3>
        <ul>
          <li>Essential session data, the possession cookie that grants access to a card on a device, and request logs.</li>
          <li>Limited device and browser information needed to deliver and secure the service.</li>
        </ul>

        <h3>Payment information</h3>
        <p>
          If a paid plan is offered and you subscribe, payment details are processed by our payment provider. We do
          not store full payment card numbers on Loyalkard servers.
        </p>

        <h3>Demo mode</h3>
        <p>
          When Loyalkard runs in local demo mode, data may be stored in your browser or in a local server file instead
          of a production cloud database. Demo data should not be used for real customer records.
        </p>

        <h2>3. How we use information</h2>
        <ul>
          <li>Create and operate stamp cards, rewards and staff verification.</li>
          <li>Authenticate owners and protect accounts and customer cards from unauthorised access.</li>
          <li>Show owners visit, redemption, review and reservation information in the dashboard.</li>
          <li>Send service messages, respond to support requests and investigate abuse or fraud.</li>
          <li>Produce aggregated reporting and improve the product&apos;s reliability and usability.</li>
          <li>Comply with legal obligations and enforce our terms.</li>
        </ul>

        <h2>4. Legal bases</h2>
        <p>
          Where data protection law requires a legal basis, we rely on: performance of a contract (providing the
          service you requested), legitimate interests (securing the service, preventing fraud and improving the
          product), consent (where we ask for it, such as optional review prompts), and legal obligation (records we
          must keep).
        </p>

        <h2>5. Cookies and local storage</h2>
        <p>
          We use essential cookies and similar storage to keep owners signed in and to let a customer&apos;s device
          access its stamp card. We do not use advertising or cross-site tracking cookies. See the{" "}
          <Link href="/cookies">cookie policy</Link> for details and controls.
        </p>

        <h2>6. How we share information</h2>
        <p>We do not sell personal data. We share data only as needed to run Loyalkard:</p>
        <ul>
          <li>
            <strong>Hosting and infrastructure providers:</strong> including Google Firebase for authentication and
            database services.
          </li>
          <li>
            <strong>Payment providers:</strong> if you subscribe to a paid plan, to process billing securely.
          </li>
          <li>
            <strong>The business you joined:</strong> that business can see the customer data associated with its own
            loyalty program.
          </li>
          <li>
            <strong>Professional advisers and authorities:</strong> where required by law, legal process, or to
            protect rights, safety and security.
          </li>
          <li>
            <strong>Successors:</strong> in connection with a merger, acquisition or sale of assets, subject to
            appropriate safeguards.
          </li>
        </ul>

        <h2>7. International transfers</h2>
        <p>
          Our service providers may process data in countries other than yours. Where required, we use contractual
          safeguards and provider security commitments for those transfers.
        </p>

        <h2>8. How long we keep data</h2>
        <p>
          We keep business account data while the account is active and for a reasonable period afterwards for
          backups, dispute resolution and legal compliance. Customer and loyalty data is kept while the business
          uses Loyalkard or until a valid deletion request is completed. Demo data may be reset or deleted at any
          time.
        </p>

        <h2>9. How we protect data</h2>
        <ul>
          <li>Loyalty mutations are processed server-side, not trusted from the browser.</li>
          <li>Stamps and redemptions are validated and written in a single transaction.</li>
          <li>
            Card data is readable only by the device that holds the possession cookie or by the authenticated owner.
          </li>
          <li>Production database rules deny direct client access except for public business profiles.</li>
          <li>Access to administrative systems is limited to people who need it to operate and support the service.</li>
        </ul>
        <p>
          No system is completely secure. If we become aware of a breach that affects personal data, we will
          investigate and notify affected parties and authorities where required.
        </p>

        <h2>10. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, delete or restrict the use
          of your personal data, to object to certain processing, or to withdraw consent. Business owners can update
          much of their profile in the console. To make a request, email{" "}
          <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a>. We may need to verify your identity
          before acting.
        </p>
        <p>
          Customers should contact the business that issued their card first, because that business controls the
          loyalty program. You may also have the right to complain to your local data protection authority.
        </p>

        <h2>11. Children&apos;s privacy</h2>
        <p>
          Loyalkard is intended for businesses and their adult customers. It is not directed to children, and we do
          not knowingly collect personal data from children. If you believe a child has provided personal data,
          contact us so we can remove it.
        </p>

        <h2>12. Changes to this policy</h2>
        <p>
          We may update this policy as the product or the law changes. The effective date at the top of this page
          shows when it was last revised. Material changes will be communicated through the service or by email
          where appropriate.
        </p>

        <h2>13. Contact</h2>
        <p>
          Privacy questions and data requests:{" "}
          <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a>. General support:{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>. You can also use the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </LegalPage>
    </>
  );
}
