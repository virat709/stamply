import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_PRIVACY_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/cookies",
  title: "Cookie Policy",
  description:
    "Which cookies and local storage Loyalkard uses, why they are essential, and how you can control them in your browser.",
});

const description =
  "Which cookies and local storage Loyalkard uses, why they are essential, and how you can control them in your browser.";

export default function CookiesPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/cookies",
          name: "Cookie Policy",
          description,
        })}
      />
      <LegalPage
        eyebrow="Legal"
        title="Cookie Policy"
        intro="Loyalkard uses a small number of essential cookies and browser storage so owners can sign in and customers can keep access to their stamp card."
      >
        <h2>1. What cookies are</h2>
        <p>
          Cookies are small files a website stores in your browser. Similar technologies, such as local storage and
          session storage, can store data in the browser without using a traditional cookie. This policy covers both.
        </p>

        <h2>2. Cookies and storage we use</h2>
        <ul>
          <li>
            <strong>Owner authentication:</strong> Firebase Authentication may store a session identifier so you stay
            signed in to the owner console.
          </li>
          <li>
            <strong>Card possession cookie:</strong> an httpOnly cookie that lets the device that joined a card read
            that card and collect stamps after staff approval.
          </li>
          <li>
            <strong>Demo-mode local storage:</strong> when the app runs without Firebase configuration, demo data may
            be saved in your browser so the sample experience persists between reloads.
          </li>
          <li>
            <strong>Security and request handling:</strong> limited technical data used to route requests, prevent
            abuse and keep the service reliable.
          </li>
        </ul>

        <h2>3. What we do not use</h2>
        <p>
          We do not use advertising cookies, cross-site tracking pixels or third-party marketing cookies. We do not
          sell data or build advertising profiles from your loyalty activity.
        </p>

        <h2>4. Third-party services</h2>
        <p>
          Authentication and data storage are provided by Google Firebase. Firebase may process technical identifiers
          needed to deliver those services. Links to external sites, such as Google review pages, are governed by
          those sites&apos; own cookie policies once you leave Loyalkard.
        </p>

        <h2>5. Managing cookies</h2>
        <p>
          You can block or delete cookies in your browser settings. Because the cookies we use are essential,
          blocking them may prevent you from signing in to the owner console or accessing a stamp card on that
          device. Clearing site data in demo mode may reset the sample card.
        </p>
        <p>
          To remove data associated with a real loyalty card, contact the business that issued it or email{" "}
          <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a>. See the{" "}
          <Link href="/privacy">privacy policy</Link> for your broader rights.
        </p>

        <h2>6. Changes and contact</h2>
        <p>
          If we add a new category of cookie, we will update this page and, where required, ask for consent before
          using it. Questions about cookies or privacy can be sent to{" "}
          <a href={`mailto:${SITE_PRIVACY_EMAIL}`}>{SITE_PRIVACY_EMAIL}</a> or through the{" "}
          <Link href="/contact">contact page</Link>.
        </p>
      </LegalPage>
    </>
  );
}
