import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  // The phone number is the membership id — required, and matched after
  // formatting is normalized (spaces/dashes ignored, see lib/db).
  phoneNumber: z.string().trim().regex(/^[+0-9\-\s()]{7,20}$/, "Enter a valid phone number, like +1 555 010 2233"),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const loyaltyRuleSchema = z.object({
  requiredStamps: z.coerce.number().int().min(2).max(100),
  rewardDescription: z.string().trim().min(3, "Describe the reward").max(120),
  expiresAt: z.string().optional().or(z.literal("")),
  // Empty string means "no minimum spend" -> undefined, so an empty field
  // is stored as null instead of being coerced to 0 by z.coerce.number().
  minSpend: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, "Must be zero or more").optional()
  ),
});

export type LoyaltyRuleInput = z.infer<typeof loyaltyRuleSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500, "Keep it under 500 characters").optional().or(z.literal("")),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export const reservationSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().regex(/^[+0-9\-\s()]{7,20}$/, "Enter a valid phone number"),
  partySize: z.coerce.number().int().min(1, "At least 1 guest").max(20, "Call us for parties over 20"),
  scheduledFor: z.string().min(1, "Pick a date and time"),
  notes: z.string().trim().max(300, "Keep it under 300 characters").optional().or(z.literal("")),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

// URL fields accept plain domains ("www.business.com/menu") and auto-attach
// https:// so owners aren't blocked by strict URL validation errors.
const optionalUrl = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const s = v.trim();
    if (!s) return "";
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  },
  z
    .string()
    .refine(
      (s) => s === "" || /^https?:\/\/\S+\.\S+/.test(s) || /^https?:\/\/localhost(:\d+)?(\/\S*)?$/.test(s),
      "Enter a link like www.business.com/menu"
    )
);

export const profileSchema = z.object({
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  openingHours: z.string().trim().max(300).optional().or(z.literal("")),
  websiteUrl: optionalUrl,
  menuUrl: optionalUrl,
  googleReviewUrl: optionalUrl,
  reservationsEnabled: z.boolean().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
