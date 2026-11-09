import type { ReactNode } from "react";
import { SITE_LAST_UPDATED, SITE_LAST_UPDATED_LABEL } from "@/lib/site";

export default function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37]">{eyebrow}</p>
      <h1
        className="mt-4 text-4xl font-black tracking-tight sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-neutral-400">{intro}</p>
      <p className="mt-4 text-xs text-neutral-500">
        Last updated: <time dateTime={SITE_LAST_UPDATED}>{SITE_LAST_UPDATED_LABEL}</time>
      </p>

      <div className="mt-10 space-y-5 text-sm leading-7 text-neutral-400 [&_a]:text-[#f0d98c] [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-white [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-neutral-100 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-neutral-200 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:text-neutral-200 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
