"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { currentOwner, createRestaurantForOwner, signOutOwner } from "@/lib/auth";
import { Monogram, IconSparkle, Toast } from "@/components/ui";

export default function Onboarding() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [_uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentOwner().then((uid) => {
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUid(uid);
      setReady(true);
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!_uid || !name.trim()) return;
    setBusy(true);
    try {
      const b = await createRestaurantForOwner(_uid, name);
      router.push(`/dashboard/${b.id}`);
    } catch {
      setToast({ msg: "Could not create the restaurant — try again", kind: "error" });
      setBusy(false);
    }
  }

  const [toast, setToast] = useState<{ msg: string; kind?: "ok" | "error" } | null>(null);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: ready ? 1 : 0.4, y: ready ? 0 : 24 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="lux-card glow-frame rounded-[30px] p-7 relative overflow-hidden">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[#d4af37]">Getting started</p>
          <h1 className="mt-1 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Set up your restaurant
          </h1>
          <p className="text-sm text-neutral-400 mt-1.5">
            One quick detail and your private loyalty console is open.
          </p>

          <div className="mt-7 flex items-center gap-4">
            <Monogram name={name || "V"} size={62} />
            <div>
              <p className="font-semibold text-lg">{name.trim() || "Your restaurant"}</p>
              <p className="text-xs text-neutral-500">10-stamp card · 10th drink free</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label-lux" htmlFor="ob-name">Restaurant name</label>
              <input
                id="ob-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ember & Oak"
                required
                className="input-lux w-full rounded-xl px-4 py-3.5 mt-1.5"
              />
            </div>
            <motion.button disabled={busy || !ready} whileTap={{ scale: 0.97 }} className="btn-gold w-full rounded-full py-4 font-bold">
              {busy ? "Opening your console…" : (
                <span className="inline-flex items-center gap-2"><IconSparkle size={16} /> Create my console →</span>
              )}
            </motion.button>
          </form>
          <div className="mt-5 flex items-center justify-between text-xs text-neutral-500">
            <Link href="/" className="hover:text-neutral-300">← Back home</Link>
            <button
              onClick={async () => {
                await signOutOwner();
                router.push("/login");
              }}
              className="hover:text-neutral-300"
            >
              Sign out
            </button>
          </div>
        </div>
        <p className="mt-5 text-center text-[11px] tracking-widest uppercase text-neutral-600">your account is already secured — this step just names the venue</p>
      </motion.div>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </main>
  );
}
