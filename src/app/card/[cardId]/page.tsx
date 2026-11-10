"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { getCard, getBusiness, submitReview, getVerificationRequest, claimAfterVerification } from "@/lib/db";
import { celebrate } from "@/lib/confetti";
import { downloadQrPng } from "@/lib/qr";
import { BusinessAvatar, IconSparkle } from "@/components/ui";
import type { SubmitReviewResult, VerificationRequest } from "@/lib/types";
import type { StampCard, Business } from "@/lib/types";
import { detectRestaurantType } from "@/lib/types";
import { StampGrid } from "@/components/StampGrid";

function CardInner() {
  const params = useParams<{ cardId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [card, setCard] = useState<StampCard | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [justStamped, setJustStamped] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewResult, setReviewResult] = useState<SubmitReviewResult | null>(null);
  const [pendingVerification, setPendingVerification] = useState<VerificationRequest | null>(null);
  const [rewardQrEl, setRewardQrEl] = useState<SVGSVGElement | null>(null);
  const [unclaimed, setUnclaimed] = useState(false);
  const verifyId = search.get("verify");

  useEffect(() => {
    let alive = true;
    let notFoundRetries = 0;
    async function load() {
      try {
        const c = await getCard(params.cardId);
        if (!alive) return;
        setCard(c);
        setUnclaimed(false);
        setNotFound(false);
      } catch (e) {
        if (!alive) return;
        const status = (e as Error & { status?: number }).status;
        if (status === 404) {
          // Grace period: retry 4 times (6s) before declaring 404 in case database write is settling
          if (notFoundRetries < 4) {
            notFoundRetries++;
            return;
          }
          setNotFound(true);
        } else if (status === 401) {
          setCard(null);
          setUnclaimed(true);
        }
      }
    }
    load();
    const t = setInterval(load, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [params.cardId]);

  const businessIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!card || card.businessId === businessIdRef.current) return;
    businessIdRef.current = card.businessId;
    getBusiness(card.businessId).then(setBusiness).catch(() => { });
  }, [card]);

  useEffect(() => {
    if (!justStamped) return;
    const t = setTimeout(() => setJustStamped(false), 1200);
    return () => clearTimeout(t);
  }, [justStamped]);

  // detect stamp growth between polls
  const prevStamps = useRef<number | null>(null);
  useEffect(() => {
    if (card) {
      if (prevStamps.current !== null && card.currentStamps > prevStamps.current) setJustStamped(true);
      prevStamps.current = card.currentStamps;
    }
  }, [card]);

  // poll the staff verification request: while pending show the approval
  // banner; once approved the stamp appears automatically via card polling
  useEffect(() => {
    if (!verifyId) return;
    let cancelled = false;
    async function poll() {
      const req = await getVerificationRequest(verifyId!);
      if (cancelled) return;
      if (!req || req.status === "rejected") setPendingVerification(null);
      else if (req.status === "pending") setPendingVerification(req);
      else {
        setPendingVerification(null);
        // Ask the server for our possession cookie — this device now gets
        // its card back (new rules: access only via cookie or owner).
        try {
          const claimed = await claimAfterVerification(verifyId!);
          if (claimed.cardId) setUnclaimed(false);
        } catch {
          /* handled by cards-cookie/claim route */
        }
        router.replace(`/card/${params.cardId}`);
      }
    }
    poll();
    const t = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [verifyId, params.cardId, router]);

  // celebrate once when the reward unlocks live (hook kept BEFORE any early
  // returns so hook order stays stable across renders)
  const wasUnlocked = useRef(false);
  useEffect(() => {
    if (!card) return;
    const unlockedNow = !!business && card.currentStamps >= business.loyaltyRule.requiredStamps;
    if (unlockedNow && !wasUnlocked.current) {
      wasUnlocked.current = true;
      celebrate();
    }
    if (!unlockedNow) wasUnlocked.current = false;
  }, [card, business]);

  if (notFound)
    return (
      <main className="p-8 text-center">
        <p className="text-neutral-500">Stamp card not found.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-[#d4af37] hover:underline">← Back home</Link>
      </main>
    );
  if (!card || !business) {
    if (unclaimed) {
      return (
        <main className="p-8 text-center">
          {pendingVerification ? (
            <>
              <p className="text-2xl">⏳</p>
              <p className="mt-2 text-sm font-semibold text-[#f0d98c]">Waiting for staff approval…</p>
              <p className="mt-1 text-xs text-neutral-500">Your card will open here the moment staff accepts you.</p>
            </>
          ) : (
            <>
              <p className="text-2xl">🔒</p>
              <p className="mt-2 text-sm text-neutral-400 max-w-xs mx-auto">
                This card is private. It opens automatically on the device where you joined — or scan the counter
                code and enter your phone number to verify with staff.
              </p>
              <p className="mt-1 text-xs text-neutral-600">Stamps visible here would let anyone claim your reward — that&apos;s why it&apos;s locked.</p>
              {params.cardId?.includes("__") && (
                <div className="mt-5">
                  <Link
                    href={`/b/${params.cardId.split("__")[0]}`}
                    className="btn-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold active:scale-[0.98] transition-transform touch-manipulation cursor-pointer select-none"
                  >
                    📱 Enter phone number to open
                  </Link>
                </div>
              )}
            </>
          )}
        </main>
      );
    }
    return <main className="p-8 text-center text-neutral-500">Loading your card…</main>;
  }

  const max = business.loyaltyRule.requiredStamps;
  const unlocked = card.currentStamps >= max;
  const pct = Math.min(100, Math.round((card.currentStamps / max) * 100));
  const profile = business.profile ?? {};
  const restaurantType = detectRestaurantType(
    business.name,
    business.loyaltyRule?.rewardDescription,
    business.profile?.restaurantType
  );

  const directionsUrl = profile.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`
    : null;

  /** Ensure URLs entered by owners without a scheme open correctly and can't
   *  be javascript: injection vectors. */
  function safeUrl(raw: string | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Block javascript: and data: schemes.
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
    // If no protocol is present, prepend https://.
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  const whatsappUrl = profile.phone
    ? `https://wa.me/${profile.phone.replace(/\D/g, "")}`
    : null;

  async function handleReviewSubmitted(result: SubmitReviewResult) {
    setReviewOpen(false);
    setReviewResult(result);
    // bonus stamp was applied server-side — refresh the card immediately
    if (result.bonusStamp?.card) setCard((prev) => (prev ? { ...prev, ...result.bonusStamp!.card } : prev));
  }

  const services = [
    safeUrl(profile.communityUrl) && { href: safeUrl(profile.communityUrl)!, label: "Join community", emoji: "👥" },
    safeUrl(profile.websiteUrl) && { href: safeUrl(profile.websiteUrl)!, label: "Website", emoji: "🌐" },
    directionsUrl && { href: directionsUrl, label: "Directions", emoji: "📍" },
    whatsappUrl && { href: whatsappUrl, label: "WhatsApp", emoji: "💬" },
    safeUrl(profile.menuUrl) && { href: safeUrl(profile.menuUrl)!, label: "View menu", emoji: "🍽️" },
  ].filter(Boolean) as { href: string; label: string; emoji: string }[];

  return (
    <main className="flex-1 px-4 py-10 flex flex-col items-center">
      {/* waiting-for-staff ribbon */}
      <AnimatePresence>
        {pendingVerification && (
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="w-full max-w-sm mb-5 lux-card rounded-3xl p-5 text-center relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  className="w-2 h-2 rounded-full bg-[#d4af37]"
                  animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.22 }}
                />
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-[#f0d98c]">Waiting for staff approval</p>
            <p className="mt-1 text-xs text-neutral-400">
              Tell our staff your name — once they accept at the counter, your stamp appears here automatically.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the card */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full max-w-sm lux-card rounded-[30px] p-7 ${unlocked ? "glow-frame" : ""}`}
      >
        <div className="flex items-center gap-4">
          <BusinessAvatar name={business.name} logoUrl={business.logoUrl} size={54} />
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Members Club</p>
            <h1 className="mt-0.5 text-xl font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>
              {business.name}
            </h1>
          </div>
        </div>

        <div className="gold-line my-6" />

        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={card.currentStamps}
                initial={{ scale: 1.7, opacity: 0.2 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 15 }}
                className="text-5xl font-black text-gold-grad"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {card.currentStamps}
              </motion.span>
              <span className="text-lg font-bold text-neutral-500">/{max}</span>
            </div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-500 mt-1">Stamps collected</p>
          </div>
          <IconSparkle size={22} className="text-[#d4af37]/70" />
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-white/8 overflow-hidden bar-shimmer">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#b8952c] via-[#d4af37] to-[#f7e7ae]"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          />
        </div>
        <p className="mt-2.5 text-sm text-neutral-300">
          {unlocked
            ? "Your reward is waiting — no more stamps needed 🎉"
            : (
              <span>
                {max - card.currentStamps} more stamp{max - card.currentStamps === 1 ? "" : "s"} until{" "}
                <span className="text-[#f0d98c]">{business.loyaltyRule.rewardDescription}</span>
              </span>
            )}
        </p>

        <div className="mt-7">
          <StampGrid
            current={card.currentStamps}
            total={max}
            justStamped={justStamped}
            restaurantType={restaurantType}
          />
        </div>

        <AnimatePresence>
          {unlocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.15 }}
              className="mt-8 rounded-3xl p-[1px] bg-gradient-to-br from-[#f7e7ae] via-[#8a6d1f] to-[#6366f1]"
            >
              <div className="rounded-[23px] bg-[#0d0c14]/95 p-6 text-center relative overflow-hidden">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full bg-[#d4af37]/25 blur-[70px]" />
                <div className="text-3xl relative">🎉</div>
                <h2 className="mt-1 font-bold text-lg relative" style={{ fontFamily: "var(--font-display)" }}>
                  <span className="text-gold-grad">{business.loyaltyRule.rewardDescription}</span> unlocked
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Show this QR to the cashier to claim it.</p>
                <div className="mt-4 flex justify-center relative">
                  <motion.div
                    className="bg-white rounded-2xl p-3 shadow-[0_0_50px_-8px_rgba(212,175,55,0.6)]"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <QRCodeSVG ref={setRewardQrEl} value={JSON.stringify({ redeem: true, cardId: card.id, businessId: business.id })} size={132} />
                  </motion.div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2 chip px-3 py-1 text-[10px] tracking-[0.25em] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  redeemable now
                </div>
                <div className="mt-2">
                  <button
                    onClick={async () => {
                      if (!rewardQrEl) return;
                      try {
                        await downloadQrPng(rewardQrEl, `loyalkard-reward-qr-${business.name.replace(/\W+/g, "-").toLowerCase()}`);
                      } catch {
                        /* silent */
                      }
                    }}
                    className="text-[11px] text-neutral-500 hover:text-[#f0d98c] underline underline-offset-4 transition-colors"
                  >
                    ⬇ Save QR image
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* services */}
      <motion.div
        initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="w-full max-w-sm mt-4 lux-card rounded-3xl p-5"
      >
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Good to know</p>
        {profile.openingHours && <p className="mt-2.5 text-sm text-neutral-300">🕒 {profile.openingHours}</p>}
        <p className="mt-2 text-xs text-neutral-500">Stamps are collected at the counter — please ask our staff to add yours.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setReviewOpen(true)} className={`btn-gold rounded-xl px-4 py-3 font-bold ${services.length === 0 ? "col-span-2" : ""}`}>
            ⭐ Leave a review
          </button>
          {services.map((s) => (
            <motion.a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -3 }}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-semibold text-center hover:border-[#d4af37]/30 transition-colors"
            >
              {s.emoji} {s.label}
            </motion.a>
          ))}
        </div>
        {profile.address && <p className="mt-3 text-xs text-neutral-500">{profile.address}</p>}
      </motion.div>

      {/* automated feedback after a review */}
      <AnimatePresence>
        {reviewResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm mt-4 lux-card rounded-3xl p-5 relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <p className="text-[10px] tracking-[0.35em] uppercase text-[#f0d98c]">Message from {business.name}</p>
            <p className="mt-2 text-sm text-neutral-200">{reviewResult.feedback}</p>
            {reviewResult.bonusStamp && !reviewResult.bonusStamp.error && (
              <p className="mt-2 text-sm text-[#f0d98c] font-semibold">🎉 Bonus stamp added for your review!</p>
            )}
            {reviewResult.googleUrl && (
              <a
                href={reviewResult.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-sm font-semibold hover:bg-neutral-200 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
              >
                Post your review on Google Maps →
              </a>
            )}
            <div className="mt-4">
              <button onClick={() => setReviewResult(null)} className="text-xs text-neutral-500 hover:text-neutral-300">
                dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reviewOpen && (
        <ReviewModal
          business={business}
          card={card}
          onClose={() => setReviewOpen(false)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      <div className="mt-6 flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-neutral-600">
        <span>lifetime rewards · {card.totalRedemptions}</span>
        <span className="w-10 h-px bg-white/10" />
        <span>verified in person</span>
      </div>
    </main>
  );
}

function ReviewModal({
  business,
  card,
  onClose,
  onSubmitted,
}: {
  business: Business;
  card: StampCard;
  onClose: () => void;
  onSubmitted: (result: SubmitReviewResult) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1) {
      setError("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await submitReview(business.id, { rating, comment, cardId: card.id, customerId: card.customerId });
      onSubmitted(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md px-4 pb-4 sm:pb-0" onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="w-full max-w-sm rounded-[28px] bg-[#12121a] border border-white/10 p-6 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-[#d4af37]/15 blur-[60px]" />
        <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Review</p>
        <h2 className="mt-1 text-xl font-bold relative" style={{ fontFamily: "var(--font-display)" }}>
          How was {business.name}?
        </h2>
        <div className="mt-5 flex justify-center gap-2" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            const lit = n <= (hover || rating);
            return (
              <motion.button
                key={n}
                disabled={busy}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                whileHover={{ scale: 1.25, rotate: 8 }}
                whileTap={{ scale: 0.85 }}
                animate={lit ? { y: [-1, -6, -1] } : { y: 0 }}
                transition={lit ? { duration: 1.6, repeat: Infinity, delay: (5 - n) * 0.12 } : {}}
                className={`text-4xl transition-colors ${lit ? "text-[#d4af37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" : "text-neutral-700"}`}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                ★
              </motion.button>
            );
          })}
        </div>
        <div className="mt-4 relative">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more (optional)"
            rows={3}
            maxLength={500}
            className="input-lux w-full rounded-xl px-4 py-3 text-base touch-manipulation cursor-text"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <p className="mt-3 text-[11px] text-neutral-500 flex items-center gap-1.5">
          <span className="text-neutral-500">⭐</span> 4★ or more rewards you with a bonus stamp and sends you to Google Maps.
        </p>
        <div className="mt-4 flex gap-2.5">
          <button onClick={onClose} disabled={busy} className="flex-1 btn-ghost rounded-full py-3 text-sm font-semibold">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="flex-1 btn-gold rounded-full py-3 text-sm font-bold disabled:opacity-50">
            {busy ? "Sending…" : "Send review"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// useSearchParams needs a Suspense boundary when the page is statically rendered
export default function CardPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-neutral-500">Loading your card…</main>}>
      <CardInner />
    </Suspense>
  );
}
