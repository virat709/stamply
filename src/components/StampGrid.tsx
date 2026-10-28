"use client";

import { motion } from "framer-motion";

// A coffee-stamp-style grid: earned stamps look like gold rubber stamps pressed
// on the card, unearned ones are faint hollow rounds with a ghost cup outline.

function CoffeeCup({ color, size = "62%" }: { color: string; size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h13l-1.5 7a2.5 2.5 0 0 1-2.5 2H8a2.5 2.5 0 0 1-2.5-2L4 9Z" />
      <path d="M17 10.5h1.5a2.2 2.2 0 0 1 0 4.4H17.3M8 6V4.5M11.5 6V4M15 6V4.5" />
    </svg>
  );
}

export function StampGrid({ current, total, justStamped }: { current: number; total: number; justStamped?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const active = i < current;
        const isNew = justStamped && i === current - 1;
        if (active) {
          return (
            <motion.div
              key={i}
              className="stamp-slot stamp-earned aspect-square grid place-items-center relative"
              initial={isNew ? { scale: 2.6, rotate: 30, opacity: 0 } : { scale: 0, opacity: 0, rotate: 20 }}
              animate={{ scale: 1, opacity: 1, rotate: i % 2 === 0 ? -10 : 8 }}
              transition={isNew
                ? { type: "spring", stiffness: 320, damping: 13 }
                : { type: "spring", stiffness: 300, damping: 16, delay: Math.min(i * 0.07, 0.6) }}
            >
              {/* press mark: denser inner ring like an inked stamp rim */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="rgba(58, 39, 3, 0.4)"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
              </svg>
              <CoffeeCup color="#3a2703" />
              {isNew && (
                <motion.span
                  className="absolute inset-0 rounded-[inherit]"
                  style={{ boxShadow: "0 0 0 0 rgba(240,217,140,0.8)" }}
                  animate={{ boxShadow: ["0 0 0 6px rgba(240,217,140,0.55)", "0 0 0 0 rgba(240,217,140,0)"] }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                />
              )}
            </motion.div>
          );
        }
        return (
          <motion.div
            key={i}
            className="stamp-slot aspect-square grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 + Math.max(0, i - total + 3) * 0, duration: 0.5 }}
          >
            <div className="opacity-15">
              <CoffeeCup color="#f5f0e6" size="52%" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
