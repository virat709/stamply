"use client";

import { useEffect, useState, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    currentOwner().then((uid) => {
      if (!active) return;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setUid(uid);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    setBusy(true);
    try {
      let uid = _uid;
      if (!uid) {
        uid = await currentOwner();
      }
      if (!uid) {
        router.replace("/login");
        return;
      }
      const b = await createRestaurantForOwner(uid, cleanName);
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="lux-card glow-frame rounded-[30px] p-7 relative overflow-hidden">
          <div className="relative z-10">
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
              <div onClick={() => inputRef.current?.focus()}>
                <label className="label-lux cursor-pointer" htmlFor="ob-name">Restaurant name</label>
                <input
                  ref={inputRef}
                  id="ob-name"
                  type="text"
                  autoComplete="organization"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ember & Oak"
                  required
                  className="input-lux w-full rounded-xl px-4 py-3.5 mt-1.5 relative z-30 cursor-text touch-manipulation text-base"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn-gold w-full rounded-full py-4 font-bold relative z-30 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation select-none"
              >
                {busy ? "Opening your console…" : (
                  <span className="inline-flex items-center gap-2 justify-center"><IconSparkle size={16} /> Create my console →</span>
                )}
              </button>
            </form>
            <div className="mt-5 flex items-center justify-between text-xs text-neutral-500 relative z-30">
              <Link href="/" className="hover:text-neutral-300">← Back home</Link>
              <button
                type="button"
                onClick={async () => {
                  await signOutOwner();
                  router.push("/login");
                }}
                className="hover:text-neutral-300 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-[11px] tracking-widest uppercase text-neutral-600">your account is already secured — this step just names the venue</p>
      </motion.div>
      <Toast toast={toast} onDone={() => setToast(null)} />
    </main>
  );
}
