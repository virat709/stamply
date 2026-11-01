"use client";

import { motion } from "framer-motion";
import type { RestaurantType } from "@/lib/types";

// ─── Stamp Icons per restaurant type ──────────────────────────────────────────

type IconProps = { color?: string; size?: string | number };

function CoffeeCup({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h13l-1.5 7a2.5 2.5 0 0 1-2.5 2H8a2.5 2.5 0 0 1-2.5-2L4 9Z" />
      <path d="M17 10.5h1.5a2.2 2.2 0 0 1 0 4.4H17.3M8 6V4.5M11.5 6V4M15 6V4.5" />
    </svg>
  );
}

function PizzaSlice({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 20a16.5 16.5 0 0 0 20 0L12 2Z" />
      <circle cx="12" cy="11" r="1.5" fill={color} />
      <circle cx="9" cy="16" r="1.2" fill={color} />
      <circle cx="15" cy="16" r="1.2" fill={color} />
    </svg>
  );
}

function FoodBurger({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a8 8 0 0 1 16 0H4Z" />
      <path d="M3 14h18" strokeWidth="2.5" />
      <path d="M5 14c0 3.8 3.1 6 7 6s7-2.2 7-6H5Z" />
      <circle cx="8" cy="8" r="0.8" fill={color} />
      <circle cx="12" cy="6.5" r="0.8" fill={color} />
      <circle cx="16" cy="8" r="0.8" fill={color} />
    </svg>
  );
}

function JuiceCup({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8l1.5 12a2 2 0 0 0 2 1.8h5a2 2 0 0 0 2-1.8L18 8" />
      <path d="M5 8h14" strokeWidth="2.5" />
      <path d="M14 2l-3 6" />
      <circle cx="11" cy="13" r="1" fill={color} />
      <circle cx="13" cy="16" r="1" fill={color} />
      <circle cx="10" cy="18" r="1" fill={color} />
    </svg>
  );
}

function DessertCupcake({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12l1.2 8.5a1.5 1.5 0 0 0 1.5 1.3h6.6a1.5 1.5 0 0 0 1.5-1.3L18 12" />
      <path d="M4 12a4 4 0 0 1 8-2 4 4 0 0 1 8 2H4Z" />
      <circle cx="12" cy="4.5" r="1.5" fill={color} />
    </svg>
  );
}

function BarBeer({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8v11a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V8H5Z" />
      <path d="M16 11h2.5a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H16" />
      <path d="M4 8c0-1.5 1.5-2.5 3-2.5h7c1.5 0 3 1 3 2.5H4Z" />
    </svg>
  );
}

function StarStamp({ color = "currentColor", size = "60%" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} stroke={color} strokeWidth="1">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function StampIcon({
  type,
  color = "currentColor",
  size = "60%",
}: {
  type?: RestaurantType | string;
  color?: string;
  size?: string | number;
}) {
  switch (type) {
    case "pizza": return <PizzaSlice color={color} size={size} />;
    case "food": return <FoodBurger color={color} size={size} />;
    case "juice": return <JuiceCup color={color} size={size} />;
    case "dessert": return <DessertCupcake color={color} size={size} />;
    case "bar": return <BarBeer color={color} size={size} />;
    case "star": return <StarStamp color={color} size={size} />;
    default: return <CoffeeCup color={color} size={size} />;
  }
}

export function StampGrid({
  current,
  total,
  justStamped,
  restaurantType = "coffee",
}: {
  current: number;
  total: number;
  justStamped?: boolean;
  restaurantType?: RestaurantType | string;
}) {
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
              <StampIcon type={restaurantType} color="#3a2703" size="62%" />
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
              <StampIcon type={restaurantType} color="#f5f0e6" size="52%" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
