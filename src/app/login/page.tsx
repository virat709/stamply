"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signInOwner, signUpOwner, signInOwnerWithGoogle, handleGoogleRedirectResult, firstDashboardPath, currentOwner, resetOwnerPassword } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { StamplyMark, IconMail, IconQr, IconShield, IconChart, Toast } from "@/components/ui";

const inputCls = "input-lux w-full rounded-xl pl-11 pr-4 py-3.5 text-base touch-manipulation";
const labelCls = "label-lux";

/** Official multi-color Google "G" mark. */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await resetOwnerPassword(forgotEmail);
      if (!res.ok) {
        setError(res.error ?? "Could not send reset email.");
        return;
      }
      setForgotSuccess(true);
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setForgotBusy(false);
    }
  }

  // Already signed in (e.g. returned from a Google redirect)? Go home.
  useEffect(() => {
    async function init() {
      // 1. Collect any pending Google redirect result first.
      const redirectRes = await handleGoogleRedirectResult();
      if (redirectRes?.ok && redirectRes.uid) {
        router.replace(await firstDashboardPath(redirectRes.uid));
        return;
      }
      if (redirectRes && !redirectRes.ok && redirectRes.error) {
        setError(redirectRes.error);
      }
      // 2. Already signed in from a previous session.
      const uid = await currentOwner();
      if (uid) router.replace(await firstDashboardPath(uid));
    }
    init();
  }, [router]);

  async function google() {
    setGoogleBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await signInOwnerWithGoogle();
      if (res.redirecting) {
        setInfo("Opening Google sign-in…");
        setTimeout(() => setGoogleBusy(false), 8000);
        return;
      }
      if (!res.ok) {
        setError(res.error ?? "Could not sign in with Google.");
        setGoogleBusy(false);
        return;
      }
      const path = await firstDashboardPath(res.uid!);
      router.push(path);
    } catch (e) {
      setError((e as Error).message || "Could not open your console — try again.");
      setGoogleBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const res = await signUpOwner(restaurantName, email, password);
        if (!res.ok) {
          setError(res.error ?? "Could not create the account.");
          return;
        }
        const path = res.business?.id ? `/dashboard/${res.business.id}` : await firstDashboardPath(res.uid!);
        router.push(path); // straight into their brand-new dashboard
      } else {
        const res = await signInOwner(email, password);
        if (!res.ok) {
          setError(res.error ?? "Could not sign in.");
          return;
        }
        const path = await firstDashboardPath(res.uid!);
        router.push(path);
      }
    } catch (e) {
      // never fail silently — surface whatever broke the redirect
      setError((e as Error).message || "Could not open your console — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 grid lg:grid-cols-2 min-h-[calc(100vh-0px)]">
      {/* ---------- brand panel ---------- */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[500px] h-[500px] rounded-full bg-[#d4af37]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[110px]" />

        <Link href="/" className="relative flex items-center gap-2.5 w-fit">
          <StamplyMark size={34} />
          <span className="font-bold text-2xl tracking-tight">Stamply<span className="text-[#d4af37]">.</span></span>
        </Link>

        <div className="relative max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl font-black leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your restaurant.
            <br />
            <span className="italic font-semibold text-gold-grad">Your loyalty gold.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="mt-5 text-neutral-400 leading-relaxed"
          >
            One account per restaurant, fully isolated. Create yours and your private owner console opens — loyalty rules, counter QR codes, customer verification and insights, all yours alone.
          </motion.p>
          <div className="mt-10 space-y-4">
            {[
              { icon: <IconQr size={18} />, title: "Rotating counter QR", body: "Single-use, 5-minute codes keep photo-sharers honest." },
              { icon: <IconShield size={18} />, title: "Verified stamps", body: "You accept each returning customer from your console." },
              { icon: <IconChart size={18} />, title: "Insights & exports", body: "Names + WhatsApp numbers, ready for win-back campaigns." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.12 }}
                className="flex items-start gap-4"
              >
                <span className="glass rounded-xl w-10 h-10 grid place-items-center text-[#f0d98c] shrink-0">{f.icon}</span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-neutral-500">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] tracking-widest uppercase text-neutral-600">
          {isFirebaseConfigured ? "Secured by Firebase Auth" : "Demo mode · accounts saved locally · add Firebase keys to go live"}
        </p>
      </div>

      {/* ---------- form panel ---------- */}
      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm relative"
        >
          <div className="lux-card glow-frame rounded-[30px] p-7 relative overflow-hidden">
            <div className="relative z-10">
              <div className="lg:hidden mb-5 flex items-center gap-2.5">
                <StamplyMark size={28} />
                <span className="font-bold text-lg">Stamply<span className="text-[#d4af37]">.</span></span>
              </div>

            {forgotMode ? (
              <form onSubmit={handleResetPassword} className="mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#d4af37]">Account recovery</p>
                    <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: "var(--font-display)" }}>
                      Reset password
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setError(null); setInfo(null); setForgotSuccess(false); }}
                    className="text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer"
                  >
                    ← Back to sign in
                  </button>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Enter your account email and we&apos;ll send you an instant link to choose a new password.
                </p>

                <div>
                  <label className={labelCls} htmlFor="forgot-email">Your email</label>
                  <div className="mt-1.5 relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"><IconMail size={17} /></span>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@yourrestaurant.com"
                      required
                      autoFocus
                      className={inputCls}
                    />
                  </div>
                </div>

                {forgotSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"
                  >
                    ✓ Password reset link sent! Check your email inbox (and spam folder) in a few seconds.
                  </motion.div>
                )}

                {error && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-red-400 overflow-hidden">
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={forgotBusy || forgotSuccess}
                  className="btn-gold w-full rounded-full py-3.5 font-bold cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60 relative z-30 touch-manipulation select-none"
                >
                  {forgotBusy ? "Sending reset link…" : "Send password reset link →"}
                </button>
              </form>
            ) : (
              <>
                <div className="glass rounded-2xl p-1 flex text-sm relative z-10">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setError(null); }}
                      className={`relative flex-1 rounded-xl py-2.5 font-semibold transition-colors cursor-pointer ${mode === m ? "text-black" : "text-neutral-400 hover:text-neutral-200"}`}
                    >
                      {mode === m && (
                        <motion.span
                          layoutId="auth-pill"
                          className="absolute inset-0 rounded-xl btn-gold"
                          style={{ boxShadow: "none" }}
                        />
                      )}
                      <span className="relative">{m === "signin" ? "Sign in" : "Create account"}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="mt-6 space-y-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {mode === "signup" && (
                      <motion.div
                        key="restaurant"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <label className={labelCls} htmlFor="auth-restaurant">Restaurant name</label>
                        <div className="mt-1.5 relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-[15px]">🏪</span>
                          <input
                            id="auth-restaurant"
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            placeholder="Ember & Oak"
                            required
                            className={inputCls}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className={labelCls} htmlFor="auth-email">Email</label>
                    <div className="mt-1.5 relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"><IconMail size={17} /></span>
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@yourrestaurant.com"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="auth-password">Password</label>
                    <div className="mt-1.5 relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 text-[15px]">🔑</span>
                      <input
                        id="auth-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {mode === "signin" && (
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-neutral-200">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-[#d4af37] focus:ring-0 cursor-pointer"
                        />
                        <span>Stay signed in</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true);
                          setError(null);
                          setInfo(null);
                          setForgotSuccess(false);
                          if (email) setForgotEmail(email);
                        }}
                        className="text-[#d4af37] hover:underline cursor-pointer font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {error && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-red-400 overflow-hidden">
                      {error}
                    </motion.p>
                  )}
                  {info && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="text-sm text-[#f0d98c] overflow-hidden">
                      {info}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="btn-gold w-full rounded-full py-4 font-bold cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-60 relative z-30 touch-manipulation select-none"
                  >
                    {busy
                      ? (mode === "signup" ? "Building your console…" : "Unlocking…")
                      : (mode === "signup" ? "Create my restaurant →" : "Sign in →")}
                  </button>

                  <p className="text-xs text-neutral-500 text-center leading-relaxed">
                    {mode === "signup"
                      ? "One account per restaurant — your customers only see your brand."
                      : "New here? Switch to “Create account” — it sets up your whole console."}
                  </p>
                </form>

                {isFirebaseConfigured && (
                  <>
                    <div className="mt-5 flex items-center gap-3 text-[10px] tracking-[0.25em] uppercase text-neutral-600">
                      <span className="h-px flex-1 bg-white/10" />
                      or
                      <span className="h-px flex-1 bg-white/10" />
                    </div>
                    <button
                      type="button"
                      onClick={google}
                      disabled={busy || googleBusy}
                      className="mt-4 w-full rounded-full bg-white text-black py-3.5 font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 active:scale-[0.98] transition-all disabled:opacity-50 relative z-30 cursor-pointer disabled:cursor-not-allowed shadow-md touch-manipulation select-none"
                    >
                      <GoogleG />
                      {googleBusy ? "Opening Google…" : "Continue with Google"}
                    </button>
                    <p className="mt-2.5 text-xs text-neutral-500 text-center">
                      Gmail or Google Workspace — first time? You&apos;ll name your restaurant right after.
                    </p>
                  </>
                )}
              </>
            )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Just exploring?{" "}
            <Link href="/dashboard/demo-cafe" className="text-[#d4af37] hover:text-[#f0d98c] font-semibold">
              Try the demo console →
            </Link>
          </p>
        </motion.div>
      </div>
      <Toast toast={null} onDone={() => {}} />
    </main>
  );
}
