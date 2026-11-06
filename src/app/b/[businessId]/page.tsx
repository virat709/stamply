"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { contactSchema, type ContactInput } from "@/lib/schemas";
import { getBusiness, submitCollect } from "@/lib/db";
import { Monogram, LoyalkardMark, IconUser, IconWhatsapp, IconSparkle } from "@/components/ui";
import type { Business } from "@/lib/types";
import { detectRestaurantType } from "@/lib/types";
import { StampIcon } from "@/components/StampGrid";

// First visit: register (name + phone) and collect the stamped code.
// Returning visits: staff must verify the customer before the stamp lands.

function JoinInner() {
  const params = useParams<{ businessId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { requiredStamps, rewardDescription } = business?.loyaltyRule ?? { requiredStamps: 10, rewardDescription: "" };
  const restaurantType = detectRestaurantType(
    business?.name,
    business?.loyaltyRule?.rewardDescription,
    business?.profile?.restaurantType
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  // Returning customers on their own device get the form pre-filled from
  // what they registered with last time — they just confirm and go.
  const [savedContact, setSavedContact] = useState<{ name?: string; phone?: string; email?: string } | null>(null);
  useEffect(() => {
    // Async so the setState isn't synchronous within the effect body
    // (avoids cascading renders; reads local storage once mounted).
    let cancelled = false;
    (async () => {
      try {
        const raw = localStorage.getItem(`currentCustomer_${params.businessId}`);
        if (raw && !cancelled) setSavedContact(JSON.parse(raw));
      } catch {
        /* unreadable/absent record — plain form */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.businessId]);
  useEffect(() => {
    if (savedContact) {
      reset({
        name: savedContact.name ?? "",
        phoneNumber: savedContact.phone ?? "",
      });
    }
  }, [savedContact, reset]);

  useEffect(() => {
    getBusiness(params.businessId)
      .then((b) => {
        if (!b) setNotFound(true);
        setBusiness(b);
      })
      .catch(() => setNotFound(true));
  }, [params.businessId]);

  async function onSubmit(values: ContactInput) {
    setBusy(true);
    setError(null);
    try {
      // The server owns the whole flow now: identity lookups, token
      // validation, card creation, verification requests. It also grants
      // card access only to the device that legitimately earned it.
      const res = await submitCollect({
        businessId: params.businessId,
        name: values.name,
        phoneNumber: values.phoneNumber,
        code: search.get("collect"),
      });
      if (!res.cardId) throw new Error(res.error ?? "Could not create your card.");
      try {
        const payload = JSON.stringify({
          customerId: res.customerId,
          cardId: res.cardId,
          name: values.name,
          phone: values.phoneNumber || "",
        });
        const bKey = params.businessId ? decodeURIComponent(params.businessId) : "";
        if (bKey) {
          localStorage.setItem(`currentCustomer_${bKey}`, payload);
          localStorage.setItem(`currentCustomer_${bKey.toLowerCase()}`, payload);
        }
        if (business?.id && business.id !== bKey) {
          localStorage.setItem(`currentCustomer_${business.id}`, payload);
          localStorage.setItem(`currentCustomer_${business.id.toLowerCase()}`, payload);
        }
      } catch {
        /* private mode — the flow still works via cookies */
      }
      if (res.status === "pending_verification" && res.verificationId) {
        router.push(`/card/${res.cardId}?verify=${res.verificationId}`);
        return;
      }
      router.push(`/card/${res.cardId}`);
      if (res.error) setError(res.error); // stamp failed (expired code) — card still shown
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (notFound)
    return (
      <main className="p-8 text-center">
        <p className="text-neutral-500">This loyalty program doesn&apos;t exist.</p>
        <Link href="/" className="mt-3 inline-block text-sm text-[#d4af37] hover:underline">← Back home</Link>
      </main>
    );
  if (!business) return <main className="p-8 text-center text-neutral-500">Loading…</main>;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative"
      >
        {/* halo */}
        <div className="absolute -inset-8 -z-10 grid place-items-center opacity-60 pointer-events-none">
          <div className="w-full h-full rounded-[44px] bg-[#d4af37]/10 blur-[70px]" />
        </div>

        <div className="lux-card rounded-[30px] p-7 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

          {/* invitation header */}
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ rotate: -12, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
            >
              <Monogram name={business.name} size={56} />
            </motion.div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Members Club</p>
              <h1 className="mt-0.5 text-xl font-bold truncate" style={{ fontFamily: "var(--font-display)" }}>{business.name}</h1>
            </div>
          </div>

          {/* reward banner */}
          <div className="mt-5 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.07] px-4 py-3.5 flex items-center gap-3">
            <span className="text-[#f0d98c]"><StampIcon type={restaurantType} size={18} /></span>
            <p className="text-sm text-neutral-300">
              Collect <span className="font-bold text-[#f0d98c]">{requiredStamps} stamps</span> — {rewardDescription}.
            </p>
          </div>

          {/* welcome back — details pre-filled from this device's last visit */}
          {savedContact?.name && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 flex items-center gap-3"
            >
              <span className="text-emerald-300">👋</span>
              <p className="text-sm text-emerald-200">
                Welcome back, <strong>{savedContact.name}</strong>! Your details are pre-filled — just check them and tap.
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label className="label-lux cursor-pointer" htmlFor="join-name">Your name</label>
              <div className={`mt-1.5 relative ${errors.name ? "animate-[shake_0.4s]" : ""}`}>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"><IconUser size={17} /></span>
                <input
                  id="join-name"
                  {...register("name")}
                  placeholder="Jane Doe"
                  className="input-lux w-full rounded-xl pl-11 pr-4 py-3.5 text-base touch-manipulation relative z-20 cursor-text"
                />
              </div>
            </div>
            <div>
              <label className="label-lux cursor-pointer" htmlFor="join-phone">WhatsApp / Phone number (10 digits)</label>
              <div className="mt-1.5 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"><IconWhatsapp size={17} /></span>
                <input
                  id="join-phone"
                  {...register("phoneNumber")}
                  placeholder="e.g. 9876543210"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={15}
                  className="input-lux w-full rounded-xl pl-11 pr-4 py-3.5 text-base touch-manipulation relative z-20 cursor-text"
                />
              </div>
            </div>
            <div className="text-center flex items-center gap-3">
              <span className="flex-1 gold-line" />
              <span className="text-[10px] tracking-[0.3em] text-neutral-600">phone number is your membership id</span>
              <span className="flex-1 gold-line" />
            </div>

            <AnimatePresence>
              {(errors.name || errors.phoneNumber || errors.root || error) && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-red-400 overflow-hidden"
                >
                  {errors.name?.message ?? errors.root?.message ?? errors.phoneNumber?.message ?? error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={busy}
              className="btn-gold w-full rounded-full py-4 font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation select-none relative z-30"
            >
              {busy ? (
                <>
                  <Spinner /> Please wait…
                </>
              ) : (
                <>
                  <IconSparkle size={16} /> Get my stamp card
                </>
              )}
            </button>
            <p className="text-xs text-neutral-500 text-center leading-relaxed">
              Enter your 10-digit number to instantly receive your stamp and access your rewards card.
            </p>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] uppercase text-neutral-600">
          <LoyalkardMark size={16} /> powered by loyalkard
        </div>
      </motion.div>
    </main>
  );
}

function Spinner() {
  return (
    <motion.span
      className="inline-block w-4 h-4 rounded-full border-2 border-black/25 border-t-black"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
    />
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-neutral-500">Loading…</main>}>
      <JoinInner />
    </Suspense>
  );
}
