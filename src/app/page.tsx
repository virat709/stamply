"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { StamplyMark, IconQr, IconShield, IconChart, IconSparkle, Reveal } from "@/components/ui";
import { type PointerEvent, useEffect } from "react";
import { ensureDemoBusiness } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

const FEATURED = ["Ember & Oak", "Casa Verde", "Maison Brioche", "The Copper Kettle", "Sakura Ramen", "Bloom Bakery"];

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
        <h3 className="mt-5 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Ember &amp; Oak</h3>
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

export default function Home() {
  // Seed the demo business into Firestore once, so every "demo" link on this
  // page (owner console, customer flow) resolves in Firebase mode too.
  useEffect(() => {
    if (isFirebaseConfigured) ensureDemoBusiness().catch(() => {});
  }, []);
  return (
    <div className="flex-1">
      {/* ---------------- nav ---------------- */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center px-4"
      >
        <div className="glass rounded-full flex items-center justify-between sm:justify-start gap-2.5 sm:gap-6 pl-4 sm:pl-5 pr-2 py-1.5 sm:py-2 max-w-xl w-full sm:w-auto shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <StamplyMark size={28} />
            <span className="font-bold text-base sm:text-lg tracking-tight">Stamply<span className="text-[#d4af37]">.</span></span>
          </Link>
          <div className="hidden sm:flex items-center gap-5 text-sm text-neutral-400">
            <a href="#magic" className="hover:text-[#f0d98c] transition">The magic</a>
            <a href="#how" className="hover:text-[#f0d98c] transition">How it works</a>
            <a href="#proof" className="hover:text-[#f0d98c] transition">Why it wins</a>
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
              Loyalty that
              <br />
              <span className="italic font-semibold text-gold-grad">feels like gold.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="mt-6 max-w-md text-lg text-neutral-400"
            >
              Digital stamp cards for cafés, restaurants and retail. No paper, no downloads — just one scan at the counter and every visit turns into gold.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
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
                ["0″", "to join — one scan"],
                ["5 min", "rotating deque codes"],
                ["100%", "in-counter verified"],
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
      <section id="proof" aria-label="Businesses running Stamply" className="relative py-8 border-y border-white/5 bg-white/[0.015] overflow-hidden">
        <div className="marquee-track">
          {[...FEATURED, ...FEATURED].map((name, i) => (
            <span key={i} className="flex items-center gap-14 whitespace-nowrap">
              <span className="text-lg font-semibold text-neutral-500 tracking-wide" style={{ fontFamily: "var(--font-display)" }}>{name}</span>
              <span className="w-1 h-1 rounded-full bg-[#d4af37]/60" />
            </span>
          ))}
        </div>
      </section>

      {/* ---------------- features ---------------- */}
      <section id="magic" className="py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The magic</p>
            <h2 className="mt-3 text-center text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Three pieces of alchemy
            </h2>
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
                body: "Returning customers request at the register; you physically confirm them and accept from your console. No photo-reuse, no % screenshots, no freebies.",
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

      {/* ---------------- how it works ---------------- */}
      <section id="how" className="pb-28 px-6">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37] text-center">The ritual</p>
            <h2 className="mt-3 text-center text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              From hello to reward
            </h2>
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

      {/* ---------------- closing CTA ---------------- */}
      <section className="pb-28 px-6">
        <Reveal>
          <div className="mx-auto max-w-4xl lux-card glow-frame rounded-[32px] px-8 py-14 text-center relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#d4af37]/15 blur-[100px]" />
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#d4af37]">Ready when you are</p>
            <h2 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Your café deserves a <span className="italic text-gold-grad">gold</span> ritual.
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/b/demo-cafe" className="btn-gold rounded-full px-8 py-4 font-bold">Try the customer flow →</Link>
              <Link href="/dashboard/demo-cafe" className="btn-ghost rounded-full px-8 py-4 font-semibold text-[#f5f0e6]">Owner console</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="px-6 pb-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-neutral-500">
            <StamplyMark size={22} /> Stamply · © 2026 · The new alchemy of loyalty
          </div>
          <p className="text-[11px] text-neutral-600 tracking-widest uppercase">Demo mode · data saved locally · add Firebase keys to go live</p>
        </div>
      </footer>
    </div>
  );
}
