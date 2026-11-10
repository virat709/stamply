import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ---------- Brand ----------
export function LoyalkardMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="lk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7e7ae" />
          <stop offset="0.55" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#lk-gold)" strokeWidth="2" strokeDasharray="4 3" opacity="0.7" />
      <rect x="9" y="13" width="22" height="16" rx="3.5" stroke="url(#lk-gold)" strokeWidth="1.8" fill="url(#lk-gold)" fillOpacity="0.12" />
      <path
        d="M20 24.6c-3.7-2.3-5.9-4.4-5.9-6.6 0-1.6 1.3-2.9 2.9-2.9 1.1 0 2.1.6 3 1.5.9-.9 1.9-1.5 3-1.5 1.6 0 2.9 1.3 2.9 2.9 0 2.2-2.2 4.3-5.9 6.6Z"
        fill="url(#lk-gold)"
      />
      <path d="M12 13v-2.2M28 13v-2.2" stroke="url(#lk-gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Initials medallion used wherever a business avatar is needed
export function Monogram({ name, size = 56 }: { name: string; size?: number }) {
  const initials = (name || "V")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      className="relative shrink-0 grid place-items-center rounded-full select-none"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 28%, #faf0c8 0%, #ecd174 30%, #d4af37 64%, #8a6d1f 100%)",
        boxShadow: "inset 0 2px 5px rgba(255,255,255,0.5), inset 0 -4px 9px rgba(80,55,0,0.4), 0 12px 30px -10px rgba(212,175,55,0.5)",
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(60,40,0,0.35)" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
      <span
        className="font-semibold text-[#211705]"
        style={{ fontFamily: "var(--font-display)", fontSize: size * 0.34, letterSpacing: "0.02em" }}
      >
        {initials}
      </span>
    </div>
  );
}

/** Business avatar: uploaded/pasted logo with a Monogram fallback. */
export function BusinessAvatar({
  name,
  logoUrl,
  size = 56,
  className = "",
}: {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!logoUrl || failedUrl === logoUrl) return <Monogram name={name} size={size} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${name} logo`}
      width={size}
      height={size}
      onError={() => setFailedUrl(logoUrl)}
      className={`shrink-0 rounded-full bg-white/5 object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ---------- Icons (stroke = currentColor) ----------
export function IconQr({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM19 19h2v2h-2zM14 21v-2M19 14h2" />
    </svg>
  );
}

export function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3Z" />
      <path d="M9.4 12.2l1.9 1.9 3.6-3.9" />
    </svg>
  );
}

export function IconChart({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V8M17 20v-9" />
      <path d="M5 9c3.5.6 6-2.6 7.5-5 2.5 4 6.5 4.6 9 4" opacity="0.55" />
    </svg>
  );
}

export function IconSparkle({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.7 5.4L19 9l-5.3 1.6L12 16l-1.7-5.4L5 9l5.3-1.6L12 2Z" opacity="0.95" />
      <path d="M19 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z" opacity="0.6" />
    </svg>
  );
}

export function IconWhatsapp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.5 13.1l-.5-.3-2.7.7.7-2.6-.3-.5A7 7 0 0 1 12 5Zm-2.4 3.4c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 1.9 3 4.6 4.1 2.3 1 2.8.8 3.3.8.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3 0-.2-.2-.2-.5-.4l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1-.2-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.6l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5Z" />
    </svg>
  );
}

export function IconUser({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.2-3.4 4-5 7.5-5s6.3 1.6 7.5 5" />
    </svg>
  );
}

export function IconMail({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function IconCoffee({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9h13l-1.5 7a2.5 2.5 0 0 1-2.5 2H8a2.5 2.5 0 0 1-2.5-2L4 9Z" />
      <path d="M17 10.5h1.5a2.2 2.2 0 0 1 0 4.4H17.3M7.5 6V4.5M11 6V4M14.5 6V4.6M7 21h8" />
    </svg>
  );
}

export function IconTicket({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.2 2.2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.2 2.2 0 0 0 0-6Z" />
      <path d="M14 5v2M14 10v2M14 17v2" strokeDasharray="0.1 2.8" />
    </svg>
  );
}

// Animated number for stats
export function CountUp({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
}

export function Skeleton({ className = "h-4 w-24" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-white/10 overflow-hidden bar-shimmer ${className}`}
      aria-label="loading"
    />
  );
}

// Bottom-center glass toast
export function Toast({ toast, onDone }: { toast: { msg: string; kind?: "ok" | "error" } | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.msg + toast.kind}
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="fixed bottom-6 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div
            className={`glass rounded-full px-5 py-3 text-sm font-semibold flex items-center gap-2.5 pointer-events-auto ${
              toast.kind === "error" ? "text-red-300 border-red-400/30" : "text-[#f0d98c]"
            }`}
          >
            <span className={toast.kind === "error" ? "" : "text-emerald-300"}>{toast.kind === "error" ? "✕" : "✓"}</span>
            {toast.msg}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// In-view reveal wrapper used across pages
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
