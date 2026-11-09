"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LoyalkardMark, IconQr, IconShield, IconChart, IconSparkle, Reveal } from "@/components/ui";
import SiteFooter from "@/components/site/SiteFooter";
import { type PointerEvent } from "react";
import { SITE_LAST_UPDATED, SITE_LAST_UPDATED_LABEL } from "@/lib/site";

const FEATURED = ["Ember & Oak", "Casa Verde", "Maison Brioche", "The Copper Kettle", "Sakura Ramen", "Bloom Bakery"];

const FAQS = [
  {
    q: "What is Loyalkard?",
    a: "Loyalkard is digital stamp card software for independent cafés, restaurants, bakeries and retail shops. It replaces paper punch cards with a QR-based loyalty card that lives in the customer's phone browser — no app download required.",
  },
  {
    q: "Do customers need to download an app?",
    a: "No. Customers scan the counter QR code, save their name and phone or email, and their stamp card opens in the browser. They can return to it from the same device without installing anything.",
  },
  {
    q: "How does Loyalkard stop fake or repeated stamps?",
    a: "The counter QR code rotates every five minutes and each code works once. Returning visits also need staff approval: the customer's request appears only in the owner's Verify tab, and a stamp is added only after the staff member confirms the person is present. This blocks screenshots and photo reuse.",
  },
  {
    q: "How does the reward work?",
    a: "The owner sets how many stamps unlock a reward, such as ten coffees for a free one. When the card is full, the customer shows a one-tap reward QR, staff scan it once, and the card resets. Every redemption is logged in the dashboard.",
  },
  {
    q: "Can Loyalkard collect Google reviews and customer feedback?",
    a: "Yes. After a visit, customers can rate their experience from the stamp card. Feedback is sent automatically by rating, and customers who leave 4–5 stars can be guided to the business's Google review link. Lower ratings stay private so the owner can follow up.",
  },
  {
    q: "What data can the owner see?",
    a: "The owner dashboard shows visits, active cards, redemptions, customer names and contact details, reviews and reservations. Data can be exported to CSV for win-back campaigns.",
  },
  {
    q: "Is Loyalkard secure?",
    a: "Loyalty actions run server-side, not in the browser. A stamp or redemption is validated and written in one transaction, and card data is readable only by the device that holds the possession cookie or by the authenticated owner.",
  },
];

const COMPARISON: Array<[string, string, string]> = [
  ["Getting started", "Design, print and reprint paper cards", "Turn on a QR code and start stamping"],
  ["Customer sign-up", "Handwritten card that is easy to lose", "One scan; the card stays in the phone browser"],
  ["Fraud protection", "Staff judgement and easy-to-copy cards", "Rotating single-use QR codes plus in-person verification"],
  ["Customer data", "Usually none — no names, visits or history", "Names, contact details, visit history and redemptions"],
  ["Reward redemption", "Manual punch or signature", "One-tap reward QR, logged automatically"],
  ["Marketing follow-up", "No reliable list to contact", "Reviews, reservations and CSV exports"],
];

function HeroCardMock() {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rx = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(px, [-0.5, 0.5], [-11, 11]), { stiffness: 180, damping: 18 });

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <div
      className="relative [perspective:1200px] w-full max-w-[340px] mx-auto"
      onPointerMove={onMove}
      onPointerLeave={() => { px.set(0); py.set(0); }}
    >
      {/* rotating halo */}
      <div className="absolute -inset-10 -z-10 grid place-items-center opacity-70">
        <svg viewBox="0 0 300 300" className="w-full h-full spin-slow">
          <defs>
            <linearGradient id="halo" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#d4af37" stopOpacity="0.55" />
              <stop offset="1" stopColor="#6366f1" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="150" r="128" fill="none" stroke="url(#halo)" strokeWidth="1.4" strokeDasharray="2 7" />
          <circle cx="150" cy="150" r="104" fill="none" stroke="url(#halo)" strokeWidth="0.8" strokeDasharray="1 5" />
        </svg>
      </div>

      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 40, rotateX: 14 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        className="lux-card rounded-[28px] p-7"
      >
        <div className="flex items-center justify-between">
          <MonogramMini />
          <span className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Stamp Card</span>
        </div>
        <p className="mt-5 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Ember &amp; Oak</p>
        <p className="text-sm text-neutral-400">10th coffee is on us ☕</p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gold-grad">7</span>
          <span className="text-sm text-neutral-500">/ 10 stamps</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden bar-shimmer">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f7e7ae]"
            style={{ width: "72%" }}
            initial={{ width: 0 }}
            animate={{ width: "72%" }}
            transition={{ duration: 1.4, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="mt-5 grid grid-cols-5 gap-2.5" style={{ transform: "translateZ(30px)" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.08, type: "spring", stiffness: 320, damping: 16 }}
            >
              <div
                className={`aspect-square rounded-full grid place-items-center ${i < 7 ? "stamp-earned" : "stamp-slot"}`}
              >
                {i < 7 ? (
                  <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="#3a2703" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9h13l-1.5 7a2.5 2.5 0 0 1-2.5 2H8a2.5 2.5 0 0 1-2.5-2L4 9Z" />
                    <path d="M17 10.5h1.5a2.2 2.2 0 0 1 0 4.4H17.3M8 6V4.5M11.5 6V4M15 6V4.5" />
                  </svg>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>

        {/* floating prove-it chips */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7 }}
          className="float-y absolute -right-4 top-24 glass rounded-2xl px-3.5 py-2.5 text-xs"
        >
          <span className="text-[#d4af37]">★ New stamp</span>
          <p className="text-neutral-400">verified in person</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}
          className="float-y absolute -left-6 bottom-20 glass rounded-2xl px-3.5 py-2.5 text-xs"
          style={{ animationDelay: "1.4s" }}
        >
          <span className="text-emerald-300">Reward unlocked</span>
          <p className="text-neutral-400">one-tap QR redeem</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function MonogramMini() {
  return (
    <div className="w-10 h-10 rounded-full grid place-items-center stamp-earned">
      <span className="text-[#211705] font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>E</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex-1">
      {/* ---------------- nav ---------------- */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
      >
        <div className="glass rounded-full flex items-center justify-between sm:justify-start gap-2.5 sm:gap-6 pl-4 sm:pl-5 pr-2 py-1.5 sm:py-2 max-w-xl w-full sm:w-auto shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <LoyalkardMark size={28} />
            <span className="font-bold text-base sm:text-lg tracking-tight">Loyalkard<span className="text-[#d4af37]">.</span></span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm text-neutral-400">
            <a href="#what" className="hover:text-[#f0d98c] transition">What it is</a>
            <a href="#how" className="hover:text-[#f0d98c] transition">How it works</a>
            <a href="#compare" className="hover:text-[#f0d98c] transition">Why it wins</a>
            <a href="#faq" className="hover:text-[#f0d98c] transition">FAQ</a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-neutral-300 hover:text-[#f0d98c] transition cursor-pointer">
              Sign in
            </Link>
            <Link href="/login" className="btn-gold rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold cursor-pointer">
              Console
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ---------------- hero ---------------- */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <span className="chip px-4 py-1.5 text-xs tracking-[0.25em] uppercase">
                <IconSparkle size={14} /> Est. 2026 · Members Club
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-5xl sm:text-7xl font-black leading-[1.02] tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Digital stamp cards{" "}
              <br />
              <span className="italic font-semibold text-gold-grad">that make loyalty feel like gold.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="mt-6 max-w-md text-lg text-neutral-400"
            >
              Digital stamp cards for cafés, restaurants and retail. No paper, no downloads — just one scan at the counter and every visit turns into gold.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
              className="mt-6 max-w-xl rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-5 py-4 text-sm leading-relaxed text-neutral-300"
            >
              <strong className="text-[#f0d98c]">In short:</strong> Loyalkard is cloud-based digital stamp card software for independent cafés, restaurants, bakeries and retail shops. Customers join with one QR scan — no app download — and owners verify every stamp in person while tracking visits, reviews and redemptions from one dashboard.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
              className="mt-3 text-xs text-neutral-500"
            >
              Published by{" "}
              <a href="https://v4stay.com" target="_blank" rel="noopener noreferrer" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">
                V4Stay
              </a>
              {" · "}Last updated <time dateTime={SITE_LAST_UPDATED}>{SITE_LAST_UPDATED_LABEL}</time>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-4"
            >
              <Link href="/b/demo-cafe" className="btn-gold rounded-full px-8 py-4 font-bold text-center shadow-2xl">
                Try the customer flow →
              </Link>
              <Link href="/dashboard/demo-cafe" className="btn-ghost rounded-full px-8 py-4 font-semibold text-center text-[#f5f0e6]">
                See the owner console
              </Link>
            </motion.div>

            {/* live strip */}
            <motion.dl
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
              className="mt-12 grid grid-cols-3 max-w-md divide-x divide-white/10"
            >
              {[
                ["0 sec", "to join — one scan"],
                ["5 min", "single-use QR codes"],
                ["100%", "staff-verified in person"],
              ].map(([v, l]) => (
                <div key={l} className="px-5 first:pl-0">
                  <dt className="text-2xl font-extrabold text-gold-grad">{v}</dt>
                  <dd className="mt-1 text-xs text-neutral-500">{l}</dd>
                </div>
              ))}
            </motion.dl>
          </div>
          <HeroCardMock />
        </div>
      </section>

      {/* ---------------- marquee ---------------- */}
      <section id="clients" aria-label="Businesses running Loyalkard" className="relative py-8 border-y border-white/5 bg-white/[0.015] overflow-hidden">
        <div className="marquee-track">
          {[...FEATURED, ...FEATURED].map((name, i) => (
            <span key={i} className="flex items-center gap-14 whitespace-nowrap">
              <span className="text-lg font-semibold text-neutral-500 tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{name}</span>
              <span className="w-1 h-1 rounded-full bg-[#d4af37]/60" />
            </span>
          ))}
        </div>
      </section>

      {/* ---------------- definition / what is ---------------- */}
      <section id="what" className="py-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The definition</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              What is Loyalkard?
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-neutral-400">
              Loyalkard is a digital loyalty platform that replaces paper stamp cards with a QR code customers keep in their phone browser. A business sets how many visits unlock a reward, staff verify each visit in person, and the owner sees every stamp, redemption and customer in a live dashboard.
            </p>
          </Reveal>

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              {
                title: "For business owners",
                body: "Launch a branded loyalty card in minutes, set the reward rule, and track repeat visits, reviews and reservations from one place.",
              },
              {
                title: "For customers",
                body: "Join with a single scan and keep collecting stamps on the same phone — no app store, no password, no paper card to lose.",
              },
              {
                title: "For counter staff",
                body: "One rotating QR code and one approval tap. Stamps land in under a second, and reward redemptions take a single scan.",
              },
            ].map((item) => (
              <div key={item.title} className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 lux-card rounded-3xl p-7">
            <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>What you get with a digital stamp card</h3>
            <ul className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-neutral-300">
              {[
                "One-scan joining with name and phone or email",
                "Rotating, single-use counter QR codes",
                "In-person staff verification for returning visits",
                "One-tap reward QR and automatic card reset",
                "Visit, redemption and customer analytics",
                "Google review prompts and private feedback",
                "Table reservations for restaurants",
                "CSV export for win-back campaigns",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="text-[#d4af37]" aria-hidden>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section id="magic" className="pb-28 px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The magic</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Why do cafés choose Loyalkard?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-neutral-400">
              Owners choose Loyalkard for three practical reasons: faster counter service, loyalty fraud prevention, and customer data they can actually use.
            </p>
          </Reveal>
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <IconQr size={26} />,
                title: "Scan. Stamp. Gone.",
                body: "A gold QR on your counter rotates every 5 minutes and works once. Customers scan, in the door — their card lands stamped in under a second.",
                accent: "from-[#d4af37]/25",
              },
              {
                icon: <IconShield size={26} />,
                title: "Fraud-proof returns",
                body: "Returning customers request at the register; you physically confirm them and accept from your console. No photo reuse, no screenshots, no freebies.",
                accent: "from-emerald-500/25",
              },
              {
                icon: <IconChart size={26} />,
                title: "Insights & exports",
                body: "Visits, redemptions and churn at a glance. Every customer saved with name + WhatsApp, exportable to CSV for win-back campaigns.",
                accent: "from-indigo-500/25",
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 0.12}>
                <div className={`lux-card hover-lift p-7 rounded-3xl relative overflow-hidden h-full group`}>
                  <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${f.accent} to-transparent blur-2xl opacity-70 group-hover:opacity-100 transition-opacity`} />
                  <div className="glass rounded-2xl w-14 h-14 grid place-items-center text-[#f0d98c]">{f.icon}</div>
                  <h3 className="mt-6 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
                  <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- audience ---------------- */}
      <section id="audience" className="pb-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">Who it is for</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Who is Loyalkard for?
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-neutral-400">
              Loyalkard is built for independent businesses that rely on repeat local customers. It fits best when you want a simple loyalty card without building a custom app or printing new cards every month.
            </p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Cafés and coffee shops",
                body: "Replace the paper coffee card with a 10-stamp digital card, then reward the regulars who come back every morning.",
              },
              {
                title: "Restaurants and bakeries",
                body: "Track visits, collect post-meal feedback and offer a reward that brings guests back — with optional table reservations.",
              },
              {
                title: "Independent retail",
                body: "Use visit-based rewards for salons, barbers, bookshops and local stores without investing in a custom loyalty app.",
              },
              {
                title: "Single-location owners",
                body: "Start in demo mode, set your own reward rule, and run the whole program from one owner console.",
              },
            ].map((item) => (
              <div key={item.title} className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section id="how" className="pb-28 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The ritual</p>
            <h2 className="mt-3 text-center text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              How does Loyalkard work?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-neutral-400">
              A visit takes three steps: the customer scans, staff verify, and the stamp lands. The first visit registers the card; later visits add stamps until the reward unlocks.
            </p>
          </Reveal>
          <div className="mt-16 relative">
            <div className="absolute top-7 left-[2.2rem] right-[2.2rem] gold-line hidden sm:block" />
            <div className="grid sm:grid-cols-3 gap-10">
              {[
                ["01", "Join in one scan", "Customer scans the counter QR, types name + WhatsApp, card is theirs instantly."],
                ["02", "Return & verify", "Next visit: they scan again, staff taps ✓ Accept — stamp lands via anti-fraud check."],
                ["03", "Unlock & toast", "At the last stamp the card glows; cashier scans the reward QR, the cup is on the house."],
              ].map(([n, t, b], i) => (
                <Reveal key={n} delay={i * 0.14}>
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full grid place-items-center stamp-earned text-[#211705] font-bold text-lg relative z-10" style={{ fontFamily: "var(--font-display)" }}>
                      {n}
                    </div>
                    <h3 className="mt-5 font-bold text-lg">{t}</h3>
                    <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{b}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- comparison ---------------- */}
      <section id="compare" className="pb-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The difference</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Loyalkard vs paper stamp cards
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-neutral-400">
              Paper cards are cheap to start but expensive to run: they get lost, copied and never tell you who your best customers are. Loyalkard keeps the same simple habit while adding verification and data.
            </p>
          </Reveal>
          <div className="mt-10 overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Comparison of paper stamp cards and Loyalkard digital stamp cards</caption>
              <thead className="bg-white/[0.04] text-neutral-200">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">Feature</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Paper stamp card</th>
                  <th scope="col" className="px-5 py-4 font-semibold text-[#f0d98c]">Loyalkard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-neutral-400">
                {COMPARISON.map(([feature, paper, loyalkard]) => (
                  <tr key={feature}>
                    <th scope="row" className="px-5 py-4 font-medium text-neutral-200">{feature}</th>
                    <td className="px-5 py-4">{paper}</td>
                    <td className="px-5 py-4 text-neutral-300">{loyalkard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------- trust ---------------- */}
      <section id="trust" className="pb-28 px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">Trust</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Is Loyalkard secure and privacy-friendly?
            </h2>
            <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-neutral-400">
              Yes. Loyalty actions run on the server, card access stays with the customer&apos;s device, and we use
              essential cookies only. We do not sell customer data or run advertising trackers.
            </p>
          </Reveal>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Server-verified stamps",
                body: "Stamps and redemptions are validated and written in one server-side transaction, so forged requests cannot mint stamps.",
              },
              {
                title: "Card access stays on-device",
                body: "A card is readable only by the device that holds the possession cookie or by the authenticated business owner.",
              },
              {
                title: "Privacy by default",
                body: "No advertising cookies, no cross-site tracking, and no selling personal data. Customers can request access or deletion.",
              },
            ].map((item) => (
              <div key={item.title} className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-neutral-500">
            Read the <Link href="/privacy" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">privacy policy</Link>,{" "}
            <Link href="/terms" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">terms of service</Link>,{" "}
            <Link href="/cookies" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">cookie policy</Link>,{" "}
            <Link href="/security" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">security overview</Link>, or{" "}
            <Link href="/contact" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">contact us</Link>.
          </p>
        </div>
      </section>

      {/* ---------------- company ---------------- */}
      <section id="company" className="pb-28 px-6">
        <div className="mx-auto max-w-4xl glass rounded-3xl p-8 sm:p-10">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37]">The company</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Who builds Loyalkard?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Loyalkard is designed and operated by V4Stay, a team building hospitality and loyalty software. We are
            responsible for the product, the policies on this site, and the support inbox — not an anonymous reseller.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-neutral-400">
            Read more <Link href="/about" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">about Loyalkard and V4Stay</Link>, or{" "}
            <Link href="/contact" className="text-[#f0d98c] underline underline-offset-4 hover:text-white">contact the team</Link> with a product or rollout question.
          </p>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="pb-28 px-6">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">Answers</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Frequently asked questions
            </h2>
          </Reveal>
          <div className="mt-12 space-y-6">
            {FAQS.map((item, i) => (
              <Reveal key={item.q} delay={i * 0.05}>
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-neutral-100">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.a}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 p-6 text-sm leading-relaxed text-neutral-500">
            <p className="font-semibold text-neutral-300">Sources and further reading</p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://support.google.com/business/answer/3474122"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f0d98c] underline underline-offset-4 hover:text-white"
                >
                  Google Business Profile Help — manage customer reviews
                </a>
              </li>
              <li>
                <a
                  href="https://firebase.google.com/docs/firestore/security/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f0d98c] underline underline-offset-4 hover:text-white"
                >
                  Firebase documentation — Firestore security rules
                </a>
              </li>
              <li>
                <a
                  href="https://schema.org/FAQPage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f0d98c] underline underline-offset-4 hover:text-white"
                >
                  Schema.org — FAQPage structured data
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- closing CTA ---------------- */}
      <section className="pb-28 px-6">
        <Reveal>
          <div className="mx-auto max-w-4xl lux-card glow-frame rounded-[32px] px-8 py-14 text-center relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#d4af37]/15 blur-[100px]" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37]">Ready when you are</p>
            <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Your café deserves a <span className="italic text-gold-grad">gold</span> ritual.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-neutral-400">
              Open the interactive customer demo or explore the owner console. No signup is needed to see how a digital stamp card works.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/b/demo-cafe" className="btn-gold rounded-full px-8 py-4 font-bold">Try the customer flow →</Link>
              <Link href="/dashboard/demo-cafe" className="btn-ghost rounded-full px-8 py-4 font-semibold text-[#f5f0e6]">Owner console</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- footer ---------------- */}
      <SiteFooter />
    </div>
  );
}
