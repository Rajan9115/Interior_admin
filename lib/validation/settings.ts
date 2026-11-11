import { z } from "zod";

/**
 * Strictly defined settings allowlist to prevent arbitrary JSON,
 * script injections, or unauthorized theme/behavior manipulation.
 */
export const settingsAllowlistSchema = z
  .object({
    business_name: z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters")
      .max(100, "Business name cannot exceed 100 characters")
      .optional(),
    tagline: z
      .string()
      .trim()
      .max(200, "Tagline cannot exceed 200 characters")
      .optional()
      .nullable(),
    hero_title: z
      .string()
      .trim()
      .max(200, "Hero title cannot exceed 200 characters")
      .optional()
      .nullable(),
    hero_description: z
      .string()
      .trim()
      .max(500, "Hero description cannot exceed 500 characters")
      .optional()
      .nullable(),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9\s\-()]{8,25}$/, "Please provide a valid contact number (e.g. +91 80818 70179)")
      .optional(),
    whatsapp: z
      .string()
      .trim()
      .regex(/^[+0-9\s\-()]{8,25}$/, "Please provide a valid WhatsApp number (e.g. +91 80818 70179)")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .optional(),
    address: z
      .string()
      .trim()
      .max(255, "Address cannot exceed 255 characters")
      .optional(),
    service_areas: z
      .string()
      .trim()
      .max(255, "Service areas cannot exceed 255 characters")
      .optional(),
    hours: z
      .string()
      .trim()
      .max(100, "Operating hours cannot exceed 100 characters")
      .optional(),
    gstin: z
      .string()
      .trim()
      .max(25, "GSTIN cannot exceed 25 characters")
      .optional()
      .nullable(),
    seo_defaults: z
      .object({
        metaTitleSuffix: z.string().trim().max(100).optional(),
        defaultDescription: z.string().trim().max(300).optional(),
      })
      .optional(),
  })
  .strict(); // Strict mode rejects any unexpected keys!

export type SettingsAllowlistInput = z.infer<typeof settingsAllowlistSchema>;

