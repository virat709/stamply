"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useForm } from "react-hook-form";
import { downloadQrPng, downloadQrSvg } from "@/lib/qr";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getBusiness, saveBusiness, addStampByContact, redeemReward,
  createStampToken, getStampToken, getBusinessStats, lookupCard,
  listReviews,
} from "@/lib/db";
import { loyaltyRuleSchema, profileSchema } from "@/lib/schemas";
import { whatsappLink } from "@/lib/whatsapp";
import { currentOwner, signOutOwner } from "@/lib/auth";
import { CountUp, Skeleton, Toast, IconChart, IconQr, IconTicket, IconSparkle, Monogram } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import type { Business, BusinessStats, Review, StampCard, StampToken } from "@/lib/types";

// ─── layout constants ─────────────────────────────────────────────────────────
type Tab = "home" | "redeem" | "overview" | "settings";

const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base focus:outline-none focus:border-[#d4af37]/60 focus:ring-1 focus:ring-[#d4af37]/40 input-lux";
const cardCls  = "lux-card rounded-2xl p-5";

// Bottom-nav items (no verify)
const NAV: { t: Tab; label: string; emoji: string }[] = [
  { t: "home",     label: "Home",     emoji: "🏠" },
  { t: "redeem",   label: "Redeem",   emoji: "🎁" },
  { t: "overview", label: "Overview", emoji: "📊" },
  { t: "settings", label: "Settings", emoji: "⚙️" },
];

// ─── QR download helper (shared) ─────────────────────────────────────────────
export function QrDownloadButtons({ svg, filenameBase, onDone }: {
  svg: SVGSVGElement | null;
  filenameBase: string;
  onDone: (msg: string, kind?: "ok" | "error") => void;
}) {
  function resolveSvg(): SVGSVGElement | null {
    return svg ?? document.querySelector("svg");
  }
  async function png() {
    const el = resolveSvg();
    if (!el) { onDone("QR not ready yet — try again in a moment.", "error"); return; }
    try {
      await downloadQrPng(el, `${filenameBase}.png`);
      onDone("QR saved as PNG");
    } catch (e) {
      onDone((e as Error).message || "Download failed", "error");
    }
  }
  function svgdl() {
    const el = resolveSvg();
    if (!el) { onDone("QR not ready yet — try again in a moment.", "error"); return; }
    try {
      downloadQrSvg(el, `${filenameBase}.svg`);
      onDone("QR saved as SVG");
    } catch {
      onDone("Download failed", "error");
    }
  }
  return (
    <div className="flex gap-2 justify-center mt-3">
      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={png}
        className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold">
        ⬇ PNG
      </motion.button>
      <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={svgdl}
        className="btn-ghost rounded-full px-4 py-2 text-xs font-semibold">
        ⬇ SVG
      </motion.button>
    </div>
  );
}

// ─── Root dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const params   = useParams<{ businessId: string }>();
  const router   = useRouter();
  const [tab, setTab]         = useState<Tab>("home");
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied]     = useState(false);
  const [stats, setStats]       = useState<BusinessStats | null>(null);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    getBusiness(params.businessId)
      .then((b) => { if (!b) setNotFound(true); setBusiness(b); })
      .catch(() => setNotFound(true));
  }, [params.businessId]);

  useEffect(() => { currentOwner().then(setOwnerUid).catch(() => {}); }, []);

  useEffect(() => {
    if (!business) return;
    let alive = true;
    (async () => {
      const owner = await currentOwner();
      if (!alive) return;
      setOwnerUid(owner);
      if (business.ownerId && owner !== business.ownerId) setDenied(true);
    })();
    return () => { alive = false; };
  }, [business]);

  useEffect(() => {
    if (tab === "overview") {
      getBusinessStats(params.businessId).then(setStats).catch(() => setStats(null));
    }
  }, [tab, params.businessId]);

  // ── error states ──
  if (notFound) return (
    <main className="p-8 text-center">
      <p className="text-neutral-500">Business not found.</p>
      <Link href="/" className="mt-3 inline-block text-sm text-[#d4af37] hover:underline">← Back home</Link>
    </main>
  );
  if (denied) return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="lux-card rounded-[30px] p-8 max-w-sm text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          This console belongs to another restaurant
        </h1>
        <p className="mt-2 text-sm text-neutral-400">Sign in with the account that owns it.</p>
        <button onClick={async () => { await signOutOwner(); router.push("/login"); }}
          className="btn-gold mt-6 rounded-full px-6 py-3 font-bold w-full">
          Sign in to my console
        </button>
        <Link href="/" className="mt-4 inline-block text-sm text-neutral-500 hover:text-neutral-300">← Back home</Link>
      </div>
    </main>
  );
  if (!business) return <main className="p-8 text-center text-neutral-500">Loading your console…</main>;

  return (
    // pb-20 leaves room for the fixed bottom nav bar
    <main className="flex-1 flex flex-col pb-20">
      {/* ── top header ── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3
                         bg-[#0d0c14]/90 backdrop-blur border-b border-white/[0.06]">
        <Monogram name={business.name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] tracking-[0.35em] uppercase text-[#d4af37] leading-none">Owner Console</p>
          <h1 className="mt-0.5 text-base font-extrabold tracking-tight truncate"
            style={{ fontFamily: "var(--font-display)" }}>{business.name}</h1>
        </div>
        <button
          type="button"
          onClick={async () => { if (ownerUid) await signOutOwner(); router.push("/login"); }}
          className="btn-ghost shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-400">
          {ownerUid ? "Sign out" : "Sign in"}
        </button>
      </header>

      {/* ── page content ── */}
      <div className="flex-1 px-4 pt-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {tab === "home"     && <HomeTab     businessId={params.businessId} />}
            {tab === "redeem"   && <RedeemPanel businessId={params.businessId} />}
            {tab === "overview" && <Overview    stats={stats} businessId={params.businessId} />}
            {tab === "settings" && (
              <section className="space-y-5 pt-2">
                <RulesForm   business={business} onSaved={setBusiness} />
                <ProfileForm business={business} onSaved={setBusiness} />
                <ManualStamp businessId={params.businessId} />
                <ReviewsPanel businessId={params.businessId} />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── bottom navigation bar ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex
                      bg-[#111019]/95 backdrop-blur border-t border-white/[0.08]
                      safe-bottom">
        {NAV.map(({ t, label, emoji }) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3
                        text-[10px] font-semibold tracking-wide transition-colors
                        active:scale-95 ${tab === t ? "text-[#d4af37]" : "text-neutral-500"}`}
          >
            <span className="text-xl leading-none">{emoji}</span>
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}

// ─── Home tab: full QR + join QR below ────────────────────────────────────────
function HomeTab({ businessId }: { businessId: string }) {
  return (
    <div className="space-y-5 pt-2">
      <CounterQrCard businessId={businessId} size={260} prominent />
      <StaticJoinQr  businessId={businessId} />
    </div>
  );
}

// ─── Counter QR card ──────────────────────────────────────────────────────────
function CounterQrCard({ businessId, size = 220, prominent = false }: {
  businessId: string; size?: number; prominent?: boolean;
}) {
  const [token, setToken]         = useState<StampToken | null>(null);
  const [busy, setBusy]           = useState(false);
  const [counterQrEl, setCounterQrEl] = useState<SVGSVGElement | null>(null);
  const [toast, setToast]         = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);

  async function generate() {
    setBusy(true);
    try {
      setToken(await createStampToken(businessId));
    } catch (e) {
      setToast({ msg: (e as Error).message || "Could not generate code", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const tokenCode = token?.code;
  const tokenUsed = !!token?.used;
  useEffect(() => {
    if (!tokenCode || tokenUsed) return;
    const t = setInterval(async () => {
      const fresh = await getStampToken(businessId, tokenCode);
      if (fresh?.used) setToken({ ...fresh });
    }, 2000);
    return () => clearInterval(t);
  }, [businessId, tokenCode, tokenUsed]);

  return (
    <div className={prominent
      ? "lux-card rounded-3xl p-6 flex flex-col items-center text-center"
      : `${cardCls} flex flex-col items-center text-center`}>

      {/* header row */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="text-left">
          <p className="text-[9px] tracking-[0.3em] uppercase text-[#d4af37]">Counter QR</p>
          <p className="text-xs text-neutral-400 mt-0.5">One scan per customer</p>
        </div>
        {token && (
          <button type="button" onClick={generate} disabled={busy}
            className="btn-gold rounded-full px-4 py-2 text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-60">
            🔁 {busy ? "…" : "Refresh"}
          </button>
        )}
      </div>

      {!token ? (
        <button type="button" disabled={busy} onClick={generate}
          className="btn-gold w-full rounded-full py-4 text-base font-bold mt-2">
          {busy ? "Generating…" : "Generate QR code"}
        </button>
      ) : (
        <>
          <div className={`bg-white rounded-2xl p-4 ${tokenUsed ? "opacity-30 grayscale" : "pulse-ring"}`}>
            <QRCodeSVG
              ref={setCounterQrEl}
              value={`${window.location.origin}/b/${businessId}?collect=${token.code}`}
              size={size}
            />
          </div>

          <p className={`mt-4 font-mono text-2xl tracking-[0.35em] font-bold
                         ${tokenUsed ? "text-neutral-600 line-through" : "text-[#f0d98c]"}`}>
            {token.code}
          </p>

          {tokenUsed ? (
            <p className="mt-2 text-sm text-emerald-300 font-semibold">
              ✓ Stamp delivered — tap Refresh for next customer
            </p>
          ) : (
            <p className="text-xs text-neutral-500 mt-1.5">
              Expires {new Date(token.expiresAt).toLocaleTimeString()}
            </p>
          )}

          <QrDownloadButtons
            svg={counterQrEl}
            filenameBase={`stamply-counter-qr-${businessId}`}
            onDone={(m, k) => setToast({ msg: m, kind: k })}
          />
        </>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// ─── Static join QR ───────────────────────────────────────────────────────────
function StaticJoinQr({ businessId }: { businessId: string }) {
  const [shown, setShown]     = useState(false);
  const [joinQrEl, setJoinQrEl] = useState<SVGSVGElement | null>(null);
  const [toast, setToast]     = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm">Join QR — posters &amp; menus</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Permanent code for new members. Print on receipts, stands, or windows.
          </p>
        </div>
        <button type="button" onClick={() => setShown((v) => !v)}
          className="btn-ghost shrink-0 rounded-full px-4 py-2 text-xs font-semibold ml-3">
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col items-center">
              <div className="bg-white rounded-xl p-3">
                <QRCodeSVG ref={setJoinQrEl} value={`${window.location.origin}/b/${businessId}`} size={180} />
              </div>
              <QrDownloadButtons
                svg={joinQrEl}
                filenameBase={`stamply-join-qr-${businessId}`}
                onDone={(m, k) => setToast({ msg: m, kind: k })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

// ─── Manual stamp (inside Settings) ──────────────────────────────────────────
function ManualStamp({ businessId }: { businessId: string }) {
  const [lookup, setLookup] = useState("");
  const [msg, setMsg]       = useState<string | null>(null);
  const [busy, setBusy]     = useState(false);

  async function doStamp() {
    if (!lookup.trim()) { setMsg("Enter a phone number or email."); return; }
    setBusy(true);
    setMsg(null);
    try {
      const res = await addStampByContact(businessId,
        lookup.includes("@") ? { email: lookup.trim() } : { phone: lookup.trim() });
      setMsg(res.message);
      setLookup("");
    } catch (e) {
      setMsg((e as Error).message || "Could not add stamp. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cardCls}>
      <h2 className="font-bold">Manual stamp</h2>
      <p className="text-sm text-neutral-400 mt-1">Look up a customer by phone or email and add a stamp.</p>
      <input
        value={lookup}
        onChange={(e) => setLookup(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doStamp(); } }}
        placeholder="Phone or email"
        className={`${inputCls} mt-4`}
        disabled={busy}
      />
      <button type="button" className="mt-3 btn-ghost rounded-full px-5 py-2.5 font-semibold disabled:opacity-50 w-full"
        onClick={doStamp} disabled={busy}>
        {busy ? "Stamping…" : "Add stamp"}
      </button>
      {msg && <p className="mt-3 text-sm text-[#f0d98c]">{msg}</p>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function Overview({ stats, businessId }: { stats: BusinessStats | null; businessId: string }) {
  return (
    <section className="pt-2 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Customers"  value={stats?.totalCustomers ?? 0} />
        <Stat label="Visits"     value={stats?.totalVisits ?? 0} />
        <Stat label="Rewards"    value={stats?.totalRedemptions ?? 0} />
        <Stat label="Redemption" value={stats ? `${stats.redemptionRate}%` : "0%"} />
      </div>
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <span className="text-[#d4af37]"><IconChart size={16} /></span> Customers
          </h2>
          <button
            type="button"
            disabled={!stats || stats.customers.length === 0}
            onClick={() => {
              if (!stats) return;
              const csv = ["id,name,whatsappNumber,email,createdAt,lastVisitedAt",
                ...stats.customers.map((c) =>
                  [c.id, c.name ?? "", c.phoneNumber ?? "", c.email ?? "", c.createdAt, c.lastVisitedAt].join(",")
                )].join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              const a = document.createElement("a");
              a.href = url; a.download = "customers.csv";
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 4000);
            }}
            className="btn-gold rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            Export CSV
          </button>
        </div>
        <ul className="mt-4 divide-y divide-white/5 text-sm max-h-80 overflow-auto">
          {stats === null
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="py-3 flex justify-between">
                  <Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-16" />
                </li>
              ))
            : stats.customers.map((c, i) => {
                const wa = c.phoneNumber ? whatsappLink(c.phoneNumber) : null;
                return (
                  <motion.li key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className="py-2.5 flex justify-between gap-3 items-center">
                    <span className="min-w-0 truncate flex items-center gap-2">
                      <span className="font-medium">{c.name || "Guest"}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="text-[#f0d98c] hover:text-[#d4af37] shrink-0 text-sm">💬</a>
                      )}
                    </span>
                    <span className="text-neutral-500 shrink-0 text-xs">
                      {new Date(c.lastVisitedAt).toLocaleDateString()}
                    </span>
                  </motion.li>
                );
              })}
          {stats && stats.customers.length === 0 && (
            <li className="py-4 text-neutral-500 text-sm">No customers yet — first stamp brings the first name.</li>
          )}
        </ul>
      </div>
      {/* also show counter QR in overview for quick access */}
      <div className={cardCls}>
        <p className="text-xs text-neutral-500 mb-3">Quick stamp — show counter QR</p>
        <CounterQrCard businessId={businessId} size={180} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardCls + " hover-lift"}>
      <div className="text-2xl font-extrabold text-gold-grad" style={{ fontFamily: "var(--font-display)" }}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">{label}</span>
      </div>
    </div>
  );
}

// ─── Redeem tab ───────────────────────────────────────────────────────────────
function RedeemPanel({ businessId }: { businessId: string }) {
  const [qrText, setQrText]   = useState("");
  const [contact, setContact] = useState("");
  const [card, setCard]       = useState<StampCard | null>(null);
  const [reward, setReward]   = useState("the free reward");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg]         = useState<{ text: string; kind: "ok" | "error" } | null>(null);

  async function checkReward(code: string) {
    setCard(null); setMsg(null); setChecking(true);
    try {
      const c = await lookupCard(businessId, code.trim());
      const b = await getBusiness(businessId);
      const max = b?.loyaltyRule.requiredStamps ?? 10;
      setReward(b?.loyaltyRule.rewardDescription || "the free reward");
      if (c.currentStamps < max) {
        setMsg({ text: `Only ${c.currentStamps}/${max} stamps — reward not ready yet.`, kind: "error" });
        return;
      }
      setCard(c);
      setMsg({ text: `✓ Card verified — ${c.currentStamps}/${max} stamps. Hand over reward below.`, kind: "ok" });
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: "error" });
    } finally { setChecking(false); }
  }

  async function confirmRedeem() {
    if (!card) return;
    setChecking(true);
    try {
      const res = await redeemReward(businessId, card.customerId);
      if (res.error) { setMsg({ text: res.error, kind: "error" }); return; }
      setMsg({ text: `Done! ${reward} given. Card reset to 0 stamps. 🎉`, kind: "ok" });
      setCard(null); setQrText(""); setContact("");
    } catch (e) {
      setMsg({ text: (e as Error).message || "Could not redeem. Try again.", kind: "error" });
    } finally { setChecking(false); }
  }

  return (
    <section className="pt-2 space-y-4">
      <div className={cardCls}>
        <h2 className="font-bold flex items-center gap-2">
          <span className="text-[#d4af37]"><IconTicket size={16} /></span> Redeem a reward
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Customer shows their reward QR. Scan or paste below, then confirm.
        </p>

        <textarea
          value={qrText}
          onChange={(e) => setQrText(e.target.value)}
          placeholder={"Paste QR text / card link / short code…"}
          rows={2}
          className={`${inputCls} mt-4 font-mono text-sm`}
        />
        <button type="button" onClick={() => checkReward(qrText)} disabled={checking}
          className="mt-3 btn-gold w-full rounded-full py-3 font-bold disabled:opacity-50 text-sm">
          {checking ? "Checking…" : "Check card"}
        </button>

        <div className="my-4 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-neutral-600">
          <span className="h-px flex-1 bg-white/10" /> or by phone / email <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex gap-2">
          <input value={contact} onChange={(e) => setContact(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); checkReward(contact.trim()); } }}
            placeholder="Phone or email"
            className={`${inputCls} flex-1`} />
          <button type="button" onClick={() => checkReward(contact.trim())} disabled={checking}
            className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold disabled:opacity-50">
            {checking ? "…" : "Find"}
          </button>
        </div>
      </div>

      {/* step 2 confirm */}
      <AnimatePresence>
        {card && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-emerald-300">Hand over reward</p>
            <p className="mt-2 text-sm text-neutral-200">
              Give them <strong className="text-[#f0d98c]">{reward}</strong> then confirm.
            </p>
            <motion.button onClick={confirmRedeem} disabled={checking} whileTap={{ scale: 0.97 }}
              className="mt-4 w-full rounded-full bg-emerald-500 text-black px-5 py-3.5 font-bold
                         hover:bg-emerald-400 transition disabled:opacity-50 text-sm">
              {checking ? "Confirming…" : `✓ Confirm — ${reward} given`}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {msg && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-medium rounded-xl px-4 py-3
            ${msg.kind === "ok" ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-400"}`}>
          {msg.text}
        </motion.p>
      )}
    </section>
  );
}

// ─── Settings tab contents ────────────────────────────────────────────────────
function RulesForm({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<
    z.input<typeof loyaltyRuleSchema>, unknown, z.output<typeof loyaltyRuleSchema>
  >({
    resolver: zodResolver(loyaltyRuleSchema),
    defaultValues: {
      requiredStamps:    business.loyaltyRule.requiredStamps,
      rewardDescription: business.loyaltyRule.rewardDescription,
      expiresAt:         business.loyaltyRule.expiresAt ?? "",
      minSpend:          business.loyaltyRule.minSpend ?? "",
    },
  });
  return (
    <form className={cardCls + " space-y-4"}
      onSubmit={handleSubmit(async (v) => {
        setSaving(true); setToast(null);
        try {
          const updated: Business = {
            ...business,
            loyaltyRule: {
              requiredStamps: Number(v.requiredStamps),
              rewardDescription: v.rewardDescription,
              expiresAt: v.expiresAt || null,
              minSpend: v.minSpend ?? null,
            },
          };
          await saveBusiness(updated);
          onSaved(updated);
          setToast({ msg: "Loyalty rules saved" });
        } catch (e) {
          setToast({ msg: (e as Error).message || "Could not save", kind: "error" });
        } finally { setSaving(false); }
      })}>
      <h2 className="font-bold">Loyalty rules</h2>
      <label className="block text-sm text-neutral-300">
        Required stamps
        <input type="number" {...register("requiredStamps")} className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Reward description
        <input {...register("rewardDescription")} className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Expiration date (optional)
        <input type="date" {...register("expiresAt")} className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Minimum spend (optional)
        <input type="number" step="0.01" {...register("minSpend")} className={`${inputCls} mt-1`} />
      </label>
      {Object.values(errors)[0] && <p className="text-sm text-red-400">{String(Object.values(errors)[0]?.message ?? "")}</p>}
      <Toast toast={toast} onDone={() => setToast(null)} />
      <button disabled={saving} className="btn-gold rounded-full px-6 py-3 font-bold w-full">
        {saving ? "Saving…" : "Save rules"}
      </button>
    </form>
  );
}

function ProfileForm({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const p = business.profile ?? {};
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<
    z.input<typeof profileSchema>, unknown, z.output<typeof profileSchema>
  >({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: p.phone ?? "", address: p.address ?? "",
      openingHours: p.openingHours ?? "", websiteUrl: p.websiteUrl ?? "",
      menuUrl: p.menuUrl ?? "", googleReviewUrl: p.googleReviewUrl ?? "",
    },
  });
  const orUndef = (s: string | undefined) => (s && s.trim() !== "" ? s : undefined);
  return (
    <form className={cardCls + " space-y-4"}
      onSubmit={handleSubmit(async (v) => {
        setSaving(true); setToast(null);
        try {
          const updated: Business = {
            ...business,
            profile: {
              phone: orUndef(v.phone), address: orUndef(v.address),
              openingHours: orUndef(v.openingHours), websiteUrl: orUndef(v.websiteUrl),
              menuUrl: orUndef(v.menuUrl), googleReviewUrl: orUndef(v.googleReviewUrl),
              reservationsEnabled: false,
            },
          };
          await saveBusiness(updated);
          onSaved(updated);
          setToast({ msg: "Profile saved" });
        } catch (e) {
          setToast({ msg: (e as Error).message || "Could not save profile", kind: "error" });
        } finally { setSaving(false); }
      })}>
      <h2 className="font-bold">Restaurant profile</h2>
      <p className="text-sm text-neutral-400">Shown on customer stamp cards.</p>
      <label className="block text-sm text-neutral-300">
        WhatsApp number
        <input {...register("phone")} placeholder="+1 555 010 2233" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Address
        <input {...register("address")} placeholder="12 Bean Street" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Opening hours
        <input {...register("openingHours")} placeholder="Mon–Fri 7am–7pm" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Menu URL (optional)
        <input {...register("menuUrl")} placeholder="https://…/menu.pdf" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Website URL (optional)
        <input {...register("websiteUrl")} placeholder="https://…" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Google Maps review link
        <input {...register("googleReviewUrl")}
          placeholder="https://search.google.com/local/writereview?placeid=…"
          className={`${inputCls} mt-1`} />
      </label>
      {Object.values(errors)[0] && <p className="text-sm text-red-400">{String(Object.values(errors)[0]?.message ?? "")}</p>}
      <Toast toast={toast} onDone={() => setToast(null)} />
      <button disabled={saving} className="btn-gold rounded-full px-6 py-3 font-bold w-full">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

// ─── Reviews (inside Settings) ────────────────────────────────────────────────
function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`}>
      <span className="text-[#d4af37]">{"★".repeat(value)}</span>
      <span className="text-neutral-600">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function ReviewsPanel({ businessId }: { businessId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  useEffect(() => {
    listReviews(businessId).then(setReviews).catch(() => setReviews([]));
  }, [businessId]);

  const average = reviews && reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <span className="text-[#d4af37]"><IconSparkle size={15} /></span> Reviews
        </h2>
        {average !== null && (
          <div className="text-right">
            <Stars value={Math.round(average)} />
            <p className="text-xs text-neutral-500">{average}/5 · {reviews!.length} review{reviews!.length === 1 ? "" : "s"}</p>
          </div>
        )}
      </div>
      {reviews === null ? (
        <p className="mt-4 text-sm text-neutral-500">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No reviews yet. Customers leave them from their stamp card.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/5 text-sm max-h-72 overflow-auto">
          {reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <Stars value={r.rating} />
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {[r.customerName, r.customerContact].filter(Boolean).join(" · ") || "Guest"} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-600 shrink-0 mt-1">auto-reply ✓</span>
              </div>
              {r.comment && <p className="mt-2 text-neutral-200">"{r.comment}"</p>}
              <p className="mt-1.5 text-xs text-[#f0d98c]">↩︎ {r.autoReply}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
