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
  listReviews, listVerificationRequests, approveVerificationRequest,
} from "@/lib/db";
import { loyaltyRuleSchema, profileSchema } from "@/lib/schemas";
import { whatsappLink } from "@/lib/whatsapp";
import { currentOwner, signOutOwner } from "@/lib/auth";
import { CountUp, Skeleton, Toast, IconChart, IconQr, IconShield, IconTicket, IconSparkle, Monogram } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import type { Business, BusinessStats, Review, StampCard, StampToken, VerificationRequest } from "@/lib/types";

type Tab = "overview" | "station" | "verify" | "redeem" | "reviews" | "settings";

const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 focus:outline-none focus:border-[#d4af37]/60 focus:ring-1 focus:ring-[#d4af37]/40 input-lux";
const cardCls = "lux-card rounded-2xl p-5";

const TAB_META: { t: Tab; label: string; icon: React.ReactNode }[] = [
  { t: "overview", label: "Overview", icon: <IconChart size={15} /> },
  { t: "station", label: "Stamp station", icon: <IconQr size={15} /> },
  { t: "verify", label: "Verify", icon: <IconShield size={15} /> },
  { t: "redeem", label: "Redeem", icon: <IconTicket size={15} /> },
  { t: "reviews", label: "Reviews", icon: <IconSparkle size={15} /> },
  { t: "settings", label: "Settings", icon: <span className="text-[13px] leading-none">⚙️</span> },
];

export function QrDownloadButtons({ svg, filenameBase, onDone }: { svg: SVGSVGElement | null; filenameBase: string; onDone: (msg: string, kind?: "ok" | "error") => void }) {
  async function png() {
    if (!svg) return;
    try {
      await downloadQrPng(svg, `${filenameBase}.png`);
      onDone("QR saved as PNG");
    } catch (e) {
      onDone((e as Error).message || "Download failed", "error");
    }
  }
  function svgdl() {
    if (!svg) return;
    try {
      downloadQrSvg(svg, `${filenameBase}.svg`);
      onDone("QR saved as SVG");
    } catch {
      onDone("Download failed", "error");
    }
  }
  return (
    <div className="flex gap-2 justify-center mt-3">
      <motion.button whileTap={{ scale: 0.95 }} onClick={png} className="btn-ghost rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        ⬇ PNG
      </motion.button>
      <motion.button whileTap={{ scale: 0.95 }} onClick={svgdl} className="btn-ghost rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        ⬇ SVG (print)
      </motion.button>
    </div>
  );
}
export default function Dashboard() {
  const params = useParams<{ businessId: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileView, setMobileView] = useState<"qr" | "console">("qr"); // phones start on the QR
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [denied, setDenied] = useState(false);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);

  useEffect(() => {
    getBusiness(params.businessId).then((b) => {
      if (!b) setNotFound(true);
      setBusiness(b);
    });
  }, [params.businessId]);

  useEffect(() => {
    currentOwner().then(setOwnerUid);
  }, []);

  useEffect(() => {
    // ownership check resolves after the session lookup (async → allowed)
    if (!business) return;
    let alive = true;
    (async () => {
      const owner = await currentOwner();
      if (!alive) return;
      setOwnerUid(owner);
      // guard: signed-in owners can only open their own business
      // (demo businesses with no ownerId stay public for the demo links)
      if (business.ownerId && owner !== business.ownerId) setDenied(true);
    })();
    return () => {
      alive = false;
    };
  }, [business]);

  useEffect(() => {
    if (tab === "overview") getBusinessStats(params.businessId).then(setStats);
  }, [tab, params.businessId]);

  if (notFound)
    return (
      <main className="p-8 text-center">
        <p className="text-neutral-500">Business not found.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-[#d4af37] hover:underline">← Back home</Link>
      </main>
    );
  if (denied)
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="lux-card rounded-[30px] p-8 max-w-sm text-center">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-3 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>This console belongs to another restaurant</h1>
          <p className="mt-2 text-sm text-neutral-400">Sign in with the account that owns it, or create your own free console.</p>
          <button
            onClick={async () => {
              await signOutOwner();
              router.push("/login");
            }}
            className="btn-gold mt-6 rounded-full px-6 py-3 font-bold w-full"
          >
            Sign in to my console
          </button>
          <Link href="/" className="mt-4 inline-block text-sm text-neutral-500 hover:text-neutral-300">← Back home</Link>
        </div>
      </main>
    );
  if (!business) return <main className="p-8 text-center text-neutral-500">Loading your console…</main>;

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-4">
          <Monogram name={business.name} size={48} />
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Owner Console</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight truncate" style={{ fontFamily: "var(--font-display)" }}>{business.name}</h1>
          </div>
          <button
            onClick={async () => {
              if (ownerUid) await signOutOwner();
              router.push("/login");
            }}
            className="btn-ghost ml-auto shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-neutral-400"
          >
            {ownerUid ? "Sign out" : "Sign in"}
          </button>
        </motion.div>
        {/* ---- mobile-first: big counter QR leads, home icon opens the rest ---- */}
        <section className="sm:hidden mt-6">
          <CounterQrCard businessId={params.businessId} size={220} />
          <p className="mt-3 text-center text-xs text-neutral-500">
            scan · stamp · refresh — one customer per code
          </p>
        </section>

        <div className={`mt-6 flex gap-2 overflow-x-auto text-sm pb-1 ${mobileView === "console" ? "" : "hidden sm:flex"}`}>
          {TAB_META.map(({ t, label, icon }) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 font-medium inline-flex items-center gap-2 transition-all relative ${
                tab === t ? "btn-gold" : "btn-ghost text-neutral-300"
              }`}
            >
              <span className={tab === t ? "opacity-80" : "text-[#d4af37]"}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        <div className={mobileView === "console" ? "" : "hidden sm:block"}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {tab === "overview" && <Overview stats={stats} />}
              {tab === "station" && <StampStation businessId={params.businessId} />}
              {tab === "verify" && <VerificationPanel businessId={params.businessId} />}
              {tab === "redeem" && <RedeemPanel businessId={params.businessId} />}
              {tab === "reviews" && <ReviewsPanel businessId={params.businessId} />}
              {tab === "settings" && (
                <section className="mt-6 space-y-6">
                  <RulesForm business={business} onSaved={(b) => setBusiness(b)} />
                  <ProfileForm business={business} onSaved={(b) => setBusiness(b)} />
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* floating mobile control: home icon reveals the console sections,
            ✕ takes the owner back to the QR screen */}
        <button
          onClick={() => {
            setMobileView((v) => (v === "qr" ? "console" : "qr"));
            if (mobileView === "qr") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          title={mobileView === "qr" ? "Open owner console" : "Back to QR"}
          aria-label={mobileView === "qr" ? "Open owner console" : "Back to QR"}
          className="sm:hidden fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#d4af37] text-black shadow-[0_10px_40px_-10px_rgba(212,175,55,0.9)] grid place-items-center text-xl active:scale-95 transition-transform"
        >
          {mobileView === "qr" ? "🏠" : "✕"}
        </button>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardCls + " hover-lift"}>
      <div className="text-3xl font-extrabold text-gold-grad" style={{ fontFamily: "var(--font-display)" }}>
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">{label}</span>
        <span className="flex-1 gold-line opacity-60" />
      </div>
    </div>
  );
}

function Overview({ stats }: { stats: BusinessStats | null }) {
  return (
    <section className="mt-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Customers" value={stats?.totalCustomers ?? 0} />
        <Stat label="Visits" value={stats?.totalVisits ?? 0} />
        <Stat label="Rewards" value={stats?.totalRedemptions ?? 0} />
        <Stat label="Redemption" value={stats ? `${stats.redemptionRate}%` : "0%"} />
      </div>
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2.5">
            <span className="text-[#d4af37]"><IconChart size={17} /></span> Customers
          </h2>
          <button
            onClick={() => {
              if (!stats) return;
              const csv = ["id,name,whatsappNumber,email,createdAt,lastVisitedAt", ...stats.customers.map((c) => [c.id, c.name ?? "", c.phoneNumber ?? "", c.email ?? "", c.createdAt, c.lastVisitedAt].join(","))].join("\n");
              const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "customers.csv";
              a.click();
            }}
            className="btn-gold rounded-full px-4 py-1.5 text-sm font-bold"
          >
            Export CSV
          </button>
        </div>
        <ul className="mt-4 divide-y divide-white/5 text-sm max-h-96 overflow-auto">
          {stats === null
            ? [0, 1, 2, 3].map((i) => (
                <li key={i} className="py-3 flex justify-between">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-16" />
                </li>
              ))
            : stats.customers.map((c, i) => {
                const wa = c.phoneNumber ? whatsappLink(c.phoneNumber) : null;
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="py-2.5 flex justify-between gap-3"
                  >
                    <span className="min-w-0 truncate inline-flex items-center gap-2">
                      <span className="font-medium">{c.name || "Guest"}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" title={c.phoneNumber} className="text-[#f0d98c] hover:text-[#d4af37] shrink-0 inline-flex items-center gap-1">
                          <span className="text-[13px]">💬</span>WhatsApp
                        </a>
                      )}
                      {!wa && <span className="text-neutral-500">{c.email}</span>}
                    </span>
                    <span className="text-neutral-500 shrink-0">{new Date(c.lastVisitedAt).toLocaleDateString()}</span>
                  </motion.li>
                );
              })}
          {stats && stats.customers.length === 0 && <li className="py-4 text-neutral-500">No customers yet — your first stamp brings the first name.</li>}
        </ul>
      </div>
    </section>
  );
}

function CounterQrCard({ businessId, size = 180 }: { businessId: string; size?: number }) {
  const [token, setToken] = useState<StampToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [counterQrEl, setCounterQrEl] = useState<SVGSVGElement | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);

  async function generate() {
    setBusy(true);
    setToken(await createStampToken(businessId));
    setBusy(false);
  }

  // Single-use by scan: poll the token so the dashboard shows "used ✓" the
  // moment a customer consumes the code (owner then refreshes for next one).
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
    <div className={cardCls}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Counter QR code</h2>
        {token && (
          <button
            onClick={generate}
            disabled={busy}
            title="Mint a fresh one-scan code for the next customer"
            className="btn-ghost shrink-0 rounded-full px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
          >
            🔁 Refresh{busy ? "…" : ""}
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-400 mt-1">
        One customer per code — it stamps the first person who scans it, new or returning. Press Refresh for the next
        customer.
      </p>
      {!token ? (
        <button disabled={busy} className="btn-gold mt-4 rounded-full px-5 py-2 font-bold" onClick={generate}>
          {busy ? "Generating…" : "Generate code"}
        </button>
      ) : (
        <div className="mt-5 flex flex-col items-center">
          <div className={`bg-white rounded-xl p-3 ${tokenUsed ? "opacity-30 grayscale" : "pulse-ring"}`}>
            <QRCodeSVG ref={setCounterQrEl} value={`${window.location.origin}/b/${businessId}?collect=${token.code}`} size={size} />
          </div>
          <p className={`mt-3 font-mono text-lg tracking-[0.3em] ${tokenUsed ? "text-neutral-600 line-through" : "text-[#f0d98c]"}`}>
            {token.code}
          </p>
          {tokenUsed ? (
            <p className="mt-1 text-sm text-emerald-300 font-semibold">✓ Used — stamp delivered. Refresh for the next customer.</p>
          ) : (
            <p className="text-xs text-neutral-500">
              Waiting for first scan · expires {new Date(token.expiresAt).toLocaleTimeString()}
            </p>
          )}
          <QrDownloadButtons svg={counterQrEl} filenameBase={`stamply-counter-qr-${businessId}`} onDone={(m, k) => setToast({ msg: m, kind: k })} />
          <p className="mt-2 text-[11px] text-neutral-600">Tip: PNG for a table card, SVG to scale in any print shop.</p>
        </div>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function StampStation({ businessId }: { businessId: string }) {
  const [lookup, setLookup] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="mt-6 grid gap-6 sm:grid-cols-2">
      <CounterQrCard businessId={businessId} />

      <StaticJoinQr businessId={businessId} />

      <div className={cardCls}>
        <h2 className="font-bold">Manual stamp</h2>
        <p className="text-sm text-neutral-400 mt-1">Look up a customer by phone or email and add a stamp.</p>
        <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Phone or email" className={`${inputCls} mt-4`} />
        <button
          className="mt-3 btn-ghost rounded-full px-5 py-2 font-semibold"
          onClick={async () => {
            if (!lookup.trim()) return setMsg("Enter a phone number or email.");
            const res = await addStampByContact(businessId, lookup.includes("@") ? { email: lookup.trim() } : { phone: lookup.trim() });
            setMsg(res.message);
          }}
        >
          Add stamp
        </button>
        {msg && <p className="mt-3 text-sm text-[#f0d98c]">{msg}</p>}
      </div>
    </section>
  );
}

function StaticJoinQr({ businessId }: { businessId: string }) {
  const [visibility, setVisibility] = useState<"hidden" | "shown">("hidden");
  const [joinQrEl, setJoinQrEl] = useState<SVGSVGElement | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);

  return (
    <div className={cardCls}>
      <h2 className="font-bold">Join QR for posters &amp; menus</h2>
      <p className="text-sm text-neutral-400 mt-1">
        A permanent code that never rotates — print it on menu stands, receipts or the window. It only registers new members; returning customers still stamp via the rotating counter code.
      </p>
      {visibility === "hidden" ? (
        <button onClick={() => setVisibility("shown")} className="btn-ghost mt-4 rounded-full px-5 py-2 font-semibold">
          Show join QR
        </button>
      ) : (
        <div className="mt-5 flex flex-col items-center">
          <div className="bg-white rounded-xl p-3">
            <QRCodeSVG ref={setJoinQrEl} value={`${window.location.origin}/b/${businessId}`} size={180} />
          </div>
          <QrDownloadButtons svg={joinQrEl} filenameBase={`stamply-join-qr-${businessId}`} onDone={(m, k) => setToast({ msg: m, kind: k })} />
        </div>
      )}
      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function RedeemPanel({ businessId }: { businessId: string }) {
  const [qrText, setQrText] = useState("");
  const [contact, setContact] = useState("");
  const [card, setCard] = useState<StampCard | null>(null);
  const [reward, setReward] = useState("the free reward");
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "error" } | null>(null);

  // The server parses + validates everything (QR JSON, card link, bare code,
  // or phone/email) and throws with a counter-friendly error message.
  async function checkReward(code: string) {
    setCard(null);
    setMsg(null);
    setChecking(true);
    try {
      const c = await lookupCard(businessId, code.trim());
      const b = await getBusiness(businessId);
      const max = b?.loyaltyRule.requiredStamps ?? 10;
      setReward(b?.loyaltyRule.rewardDescription || "the free reward");
      if (c.currentStamps < max) {
        setMsg({ text: `The card only has ${c.currentStamps} of ${max} stamps — the reward isn't ready yet. No free item is owed.`, kind: "error" });
        return;
      }
      setCard(c);
      setMsg({ text: `Card verified — ${c.currentStamps}/${max} stamps. See step 2 below.`, kind: "ok" });
    } catch (e) {
      setMsg({ text: (e as Error).message, kind: "error" });
    } finally {
      setChecking(false);
    }
  }

  async function findByContact() {
    setCard(null);
    setMsg(null);
    if (!contact.trim()) return;
    await checkReward(contact.trim());
  }

  async function confirmRedeem() {
    if (!card) return;
    const res = await redeemReward(businessId, card.customerId);
    if (res.error) {
      setMsg({ text: res.error, kind: "error" });
      return;
    }
    setMsg({ text: `Done! They received ${reward}. Their card is back to 0 stamps and they can start collecting again.`, kind: "ok" });
    setCard(null);
    setQrText("");
    setContact("");
  }

  return (
    <section className="mt-6 space-y-4">
      <div className={cardCls}>
        <h2 className="font-bold">Redeem a free reward</h2>
        <p className="text-sm text-neutral-400 mt-1">
          When a customer fills their stamp card, they show you a reward code at the counter. Check it here, hand over
          the free item, then confirm — their card resets to 0 stamps so they can start collecting again.
        </p>
      </div>

      <div className={cardCls}>
        <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-500">Step 1 · Check the customer&apos;s card</p>
        <p className="mt-2 text-sm text-neutral-300">
          The customer shows a golden <strong className="text-[#f0d98c]">reward QR</strong> on their phone. Point your
          phone camera at it, copy the text it displays, and paste it below.
        </p>
        <textarea
          value={qrText}
          onChange={(e) => setQrText(e.target.value)}
          placeholder={`Paste the QR text here\n(their card link or a short code also works)`}
          rows={2}
          className={`${inputCls} mt-3 font-mono text-sm`}
        />
        <div className="mt-3">
          <button
            onClick={() => checkReward(qrText)}
            disabled={checking}
            className="btn-gold rounded-full px-6 py-2 font-bold disabled:opacity-50"
          >
            {checking ? "Checking…" : "Check card"}
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-neutral-600">
          <span className="h-px flex-1 bg-white/10" /> or find them by phone <span className="h-px flex-1 bg-white/10" />
        </div>
        <p className="text-sm text-neutral-300">QR not working? Search for the customer by their phone number or email instead.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Phone number or email"
            className={`${inputCls} flex-1`}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findByContact(); } }}
          />
          <button
            onClick={findByContact}
            disabled={checking}
            className="shrink-0 rounded-full border border-white/15 bg-white/10 px-5 py-2 font-semibold hover:bg-white/15 transition disabled:opacity-50"
          >
            {checking ? "Looking…" : "Find card"}
          </button>
        </div>
      </div>

      {card && (
        <motion.div layout className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
          <p className="text-[10px] tracking-[0.3em] uppercase text-emerald-300">Step 2 · Give them their free item</p>
          <p className="mt-2 text-sm text-neutral-200">
            The card is full — the customer is entitled to{" "}
            <strong className="text-[#f0d98c]">{reward}</strong>. Hand it over, then press confirm.
          </p>
          <motion.button
            onClick={confirmRedeem}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full rounded-full bg-emerald-500 text-black px-5 py-3 font-bold hover:bg-emerald-400 transition"
          >
            ✓ Confirm — {reward} given, card reset to 0
          </motion.button>
        </motion.div>
      )}

      {msg && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-medium ${msg.kind === "ok" ? "text-emerald-300" : "text-red-400"}`}
        >
          {msg.text}
        </motion.p>
      )}
    </section>
  );
}

function RulesForm({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof loyaltyRuleSchema>, unknown, z.output<typeof loyaltyRuleSchema>>({
    resolver: zodResolver(loyaltyRuleSchema),
    defaultValues: {
      requiredStamps: business.loyaltyRule.requiredStamps,
      rewardDescription: business.loyaltyRule.rewardDescription,
      expiresAt: business.loyaltyRule.expiresAt ?? "",
      minSpend: business.loyaltyRule.minSpend ?? "",
    },
  });
  return (
    <form
      className={cardCls + " space-y-4"}
      onSubmit={handleSubmit(async (v) => {
        setSaving(true);
        setToast(null);
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
          setToast({ msg: (e as Error).message || "Could not save rules", kind: "error" });
        } finally {
          setSaving(false);
        }
      })}
    >
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
      <button disabled={saving} className="btn-gold rounded-full px-6 py-2.5 font-bold">
        {saving ? "Saving…" : "Save rules"}
      </button>
    </form>
  );
}

function VerificationPanel({ businessId }: { businessId: string }) {
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // auto-refresh so new customer requests appear without a manual reload
    const t = setInterval(async () => {
      const v = await listVerificationRequests(businessId);
      setRequests(v);
    }, 3000);
    return () => clearInterval(t);
  }, [businessId]);

  async function accept(id: string) {
    setMsg(null);
    const res = await approveVerificationRequest(businessId, id);
    setMsg(res.ok ? "Accepted — stamp added to the customer's card." : (res.error ?? "Could not accept."));
    setRequests(await listVerificationRequests(businessId));
  }

  return (
    <section className="mt-6">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2.5">
              <span className="text-[#d4af37]"><IconShield size={17} /></span> Verify returning customers
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Customers who visit again send a stamp request here. Confirm the person is standing at your counter, then accept — the stamp lands on their card instantly.
            </p>
          </div>
          <button
            onClick={async () => setRequests(await listVerificationRequests(businessId))}
            className="btn-ghost shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
        {requests === null ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-4/5" />
          </div>
        ) : requests.length === 0 ? (
          <div className="mt-6 py-10 text-center border border-dashed border-white/10 rounded-2xl">
            <p className="text-3xl opacity-40">🛡️</p>
            <p className="mt-2 text-sm text-neutral-500">No stamp requests right now.</p>
            <p className="text-xs text-neutral-600 mt-1">New requests appear here automatically within seconds.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-white/5 text-sm">
            {requests.map((r, i) => {
              const wa = r.phone ? whatsappLink(r.phone) : null;
              return (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.08, 0.4) }}
                  className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[15px]">{r.name}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-[#f0d98c] hover:text-[#d4af37] transition-colors">
                          💬 {r.phone} · WhatsApp
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      requested {new Date(r.createdAt).toLocaleTimeString()} ·{" "}
                      expires {new Date(r.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => accept(r.id)}
                    whileTap={{ scale: 0.95 }}
                    className="btn-accept rounded-full px-5 py-2.5 text-sm font-bold"
                  >
                    ✓ Accept — give stamp
                  </motion.button>
                </motion.li>
              );
            })}
          </ul>
        )}
        {msg && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-[#f0d98c]">
            {msg}
          </motion.p>
        )}
      </div>
    </section>
  );
}

function Stars({ value, className = "text-[#d4af37]" }: { value: number; className?: string }) {  return (
    <span className={className} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(value)}
      <span className="text-neutral-600">{"★".repeat(5 - value)}</span>
    </span>
  );
}

function ReviewsPanel({ businessId }: { businessId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    listReviews(businessId).then(setReviews);
  }, [businessId]);

  const average = reviews && reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;

  return (
    <section className="mt-6 space-y-4">
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Customer reviews</h2>
          {average !== null && (
            <div className="text-right">
              <Stars value={Math.round(average)} className="text-lg text-[#d4af37]" />
              <p className="text-xs text-neutral-500">{average} / 5 · {reviews!.length} review{reviews!.length === 1 ? "" : "s"}</p>
            </div>
          )}
        </div>
        {reviews === null ? (
          <p className="mt-4 text-sm text-neutral-500">Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No reviews yet. Customers can leave one from their stamp card.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5 text-sm max-h-96 overflow-auto">
            {reviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <Stars value={r.rating} />
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {[r.customerName, r.customerContact].filter(Boolean).join(" · ") || "Guest"} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-neutral-600 shrink-0 mt-1">auto-reply sent</span>
                </div>
                {r.comment && <p className="mt-2 text-neutral-200">“{r.comment}”</p>}
                <p className="mt-1.5 text-xs text-[#f0d98c]">↩︎ {r.autoReply}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProfileForm({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const p = business.profile ?? {};
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof profileSchema>, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: p.phone ?? "",
      address: p.address ?? "",
      openingHours: p.openingHours ?? "",
      websiteUrl: p.websiteUrl ?? "",
      menuUrl: p.menuUrl ?? "",
      googleReviewUrl: p.googleReviewUrl ?? "",
    },
  });
  const orUndef = (s: string | undefined) => (s && s.trim() !== "" ? s : undefined);
  return (
    <form
      className={cardCls + " space-y-4"}
      onSubmit={handleSubmit(async (v) => {
        setSaving(true);
        setToast(null);
        try {
          const updated: Business = {
            ...business,
            profile: {
              phone: orUndef(v.phone),
              address: orUndef(v.address),
              openingHours: orUndef(v.openingHours),
              websiteUrl: orUndef(v.websiteUrl),
              menuUrl: orUndef(v.menuUrl),
              googleReviewUrl: orUndef(v.googleReviewUrl),
              reservationsEnabled: false, // table reservations were removed from the card
            },
          };
          await saveBusiness(updated);
          onSaved(updated);
          setToast({ msg: "Profile saved" });
        } catch (e) {
          setToast({ msg: (e as Error).message || "Could not save profile", kind: "error" });
        } finally {
          setSaving(false);
        }
      })}
    >
      <h2 className="font-bold">Restaurant profile</h2>
      <p className="text-sm text-neutral-400">Shown to customers on their stamp card. They can get directions, view the menu and leave a Google review.</p>
      <label className="block text-sm text-neutral-300">
        WhatsApp number
        <input {...register("phone")} placeholder="+1 555 010 2233" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Address
        <input {...register("address")} placeholder="12 Bean Street, Springfield" className={`${inputCls} mt-1`} />
      </label>
      <label className="block text-sm text-neutral-300">
        Opening hours
        <input {...register("openingHours")} placeholder="Mon–Fri 7am–7pm · Sat–Sun 8am–5pm" className={`${inputCls} mt-1`} />
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
        <input {...register("googleReviewUrl")} placeholder="https://search.google.com/local/writereview?placeid=…" className={`${inputCls} mt-1`} />
      </label>
      <p className="text-xs text-neutral-500 -mt-2">
        After a customer rates you they&apos;ll see a &ldquo;Post your review on Google Maps&rdquo; button that opens this link. Best is the write-a-review link from Google Business Profile; a plain Maps link of your place also works — it opens your listing with the Reviews tab.
      </p>
      {Object.values(errors)[0] && <p className="text-sm text-red-400">{String(Object.values(errors)[0]?.message ?? "")}</p>}
      <Toast toast={toast} onDone={() => setToast(null)} />
      <button disabled={saving} className="btn-gold rounded-full px-6 py-2.5 font-bold">
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
