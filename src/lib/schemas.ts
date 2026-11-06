import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  // The phone number is the membership id — requires at least 10 digits
  phoneNumber: z
    .string()
    .trim()
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    }, "Enter a valid 10-digit phone number"),
});

export type ContactInput = z.infer<typeof contactSchema>;

export const loyaltyRuleSchema = z.object({
  requiredStamps: z.coerce.number().int().min(2).max(100),
  rewardDescription: z.string().trim().min(3, "Describe the reward").max(120),
  expiresAt: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().nullable().optional()
  ),
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
    if (v === undefined || v === null) return "";
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
  communityUrl: optionalUrl,
  googleReviewUrl: optionalUrl,
  reservationsEnabled: z.boolean().optional(),
  restaurantType: z.enum(["coffee", "pizza", "food", "juice", "dessert", "bar", "star"]).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Server-side allow-list for dashboard business saves. Unknown fields such as
 *  ownerId/createdAt are stripped before they reach the store. */
export const businessSaveSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1, "Enter your restaurant's name.").max(80),
  logoUrl: z.string().trim().max(500).optional(),
  loyaltyRule: loyaltyRuleSchema,
  profile: profileSchema.optional(),
});

export type BusinessSaveInput = z.infer<typeof businessSaveSchema>;
