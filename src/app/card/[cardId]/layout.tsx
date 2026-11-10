import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your stamp card",
  robots: { index: false, follow: false },
};

export default function CardLayout({ children }: { children: ReactNode }) {
  return children;
}
