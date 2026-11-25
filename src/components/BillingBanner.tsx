"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebase";

type PlanStatus = "none" | "pending" | "created" | "active" | "cancelled" | "expired";

interface StatusItem {
  businessId: string;
  status: PlanStatus;
  planId: string | null;
  period: string | null;
  currentEnd: string | null;
}

export default function BillingBanner({ businessId }: { businessId: string }) {
  const [plan, setPlan] = useState<StatusItem | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
        if (!token) return;
        const res = await fetch("/api/billing/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { subscriptions: StatusItem[] };
        if (alive) setPlan(data.subscriptions.find((p) => p.businessId === businessId) ?? null);
      } catch {
        /* billing status is informational — never block the console */
      }
    })();
    return () => { alive = false; };
  }, [businessId]);

  if (!plan || plan.status === "active") {
    return plan?.status === "active" ? (
      <p className="mb-3 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.05] px-3 py-2 text-center text-[11px] text-[#d4af37]">
        {plan.planId === "multi" ? "Multi-location" : "Counter"} plan active
        {plan.currentEnd ? ` until ${new Date(plan.currentEnd).toLocaleDateString("en-IN")}` : ""}
      </p>
    ) : null;
  }

  const message =
    plan.status === "pending" || plan.status === "created"
      ? "Checkout started — complete payment to activate your plan."
      : plan.status === "cancelled" || plan.status === "expired"
        ? "Your subscription is no longer active."
        : "You're on the free demo. Upgrade to keep your console running after launch.";

  return (
    <p className="mb-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/[0.08] px-3 py-2 text-center text-[11px] text-neutral-200">
      {message}{" "}
      <Link href="/pricing" className="font-bold text-[#d4af37] underline underline-offset-2">
        View plans
      </Link>
    </p>
  );
}
