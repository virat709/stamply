import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/login",
  title: "Business sign in",
  description:
    "Sign in to the Loyalkard owner console to manage digital stamp cards, staff approvals, rewards, reviews and reservations.",
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
