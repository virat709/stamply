"use client";

import { useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { BILLING_PERIODS, PERIOD_LABELS, PLANS, formatINR, type BillingPeriod, type PlanDefinition } from "@/lib/plans";

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  theme: { color: string };
  handler: (response: { razorpay_subscription_id?: string }) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the payment checkout."));
    if (!existing) document.head.appendChild(script);
  });
}

export default function PricingCards() {
  const [period, setPeriod] = useState<BillingPeriod>("12m");
  const [busy, setBusy] = useState<PlanDefinition["id"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function subscribe(plan: PlanDefinition) {
    setMessage(null);
    const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!token) {
      setMessage("Sign in as an owner first, then choose a plan.");
      return;
    }
    setBusy(plan.id);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: plan.id, period }),
      });
      const data = (await res.json()) as {
        error?: string;
        subscriptionId?: string;
        keyId?: string;
      };
      if (!res.ok || !data.subscriptionId || !data.keyId) {
        setMessage(data.error ?? "Could not start checkout. Please try again.");
        return;
      }
      await loadCheckout();
      new window.Razorpay!({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "Loyalkard",
        description: `${plan.name} · ${PERIOD_LABELS[period]}`,
        theme: { color: "#d4af37" },
        handler: () => setMessage("Payment received. Your subscription is being activated — refresh your dashboard shortly."),
        modal: { ondismiss: () => undefined },
      }).open();
    } catch {
      setMessage("Could not start checkout. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const savings = formatINR(PLANS[0].prices["6m"] * 2 - PLANS[0].prices["12m"]);

  return (
    <>
      <div className="mt-9 inline-flex rounded-full border border-white/15 bg-white/5 p-1" role="group" aria-label="Billing period">
        {BILLING_PERIODS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPeriod(option)}
            aria-pressed={period === option}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              period === option ? "btn-gold" : "text-neutral-400 hover:text-neutral-100"
            }`}
          >
            {PERIOD_LABELS[option]}
            {option === "12m" && <span className="ml-2 text-xs">Save {savings}</span>}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="relative flex flex-col rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">No card required</p>
          <h2 className="mt-3 text-2xl font-bold text-neutral-100">Free demo</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Explore the full customer flow and owner console with sample data.
          </p>
          <p className="mt-5 text-2xl font-black text-neutral-100">{formatINR(0)}</p>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm text-neutral-400">
            {["Customer join and stamp flow", "Owner console preview", "Sample rewards, reviews and analytics"].map((f) => (
              <li key={f} className="flex gap-2.5">
                <span className="mt-0.5 text-[#d4af37]">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/b/demo-cafe" className="mt-7 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-bold text-neutral-200 transition hover:bg-white/10">
            Try the demo
          </Link>
        </div>

        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-[28px] border p-6 ${
              plan.featured
                ? "border-[#d4af37]/50 bg-[#d4af37]/[0.07] shadow-[0_0_40px_-20px_rgba(212,175,55,0.6)]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#211705]">
                Most popular
              </span>
            )}
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">{plan.note}</p>
            <h2 className="mt-3 text-2xl font-bold text-neutral-100">{plan.name}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{plan.description}</p>
            <p className="mt-5 text-3xl font-black text-neutral-100">{formatINR(plan.prices[period])}</p>
            <p className="mt-1 text-xs text-neutral-400">
              billed {PERIOD_LABELS[period].toLowerCase()} · per location · cancels anytime
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-neutral-400">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span className="mt-0.5 text-[#d4af37]">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => subscribe(plan)}
              disabled={busy !== null}
              className={`mt-7 rounded-full px-5 py-3 text-center text-sm font-bold transition disabled:opacity-60 ${
                plan.featured ? "btn-gold" : "border border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10"
              }`}
            >
              {busy === plan.id ? "Starting checkout…" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>

      {message && (
        <p role="status" className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-5 py-4 text-center text-sm text-neutral-200">
          {message}{" "}
          <Link href="/login" className="font-semibold text-[#d4af37] underline underline-offset-2">
            Owner sign in
          </Link>
        </p>
      )}
    </>
  );
}
