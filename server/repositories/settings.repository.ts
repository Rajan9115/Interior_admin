import "server-only";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export const DEFAULT_SITE_SETTINGS: Record<string, unknown> = {
  business_name: "MAMA INTERIOR",
  tagline: "Turnkey interior contractor & multi-trade craftsmanship.",
  hero_title: "Precision Multi-Trade Contracting For Modern Living Spaces.",
  hero_description:
    "Direct craftsman-led execution across Electrical, Carpentry, Painting, and False Ceiling. No intermediaries. Full personal accountability.",
  phone: "+91 80818 70179",
  whatsapp: "+91 80818 70179",
  email: "contact@mamainterior.in",
  address: "Metro Area, India",
  service_areas: "Greater Metro & Surrounding Districts",
  hours: "Mon – Sat: 9:00 AM – 7:30 PM",
  gstin: "",
  seo_defaults: {
    metaTitleSuffix: "| MAMA INTERIOR Contractors",
    defaultDescription:
      "MAMA INTERIOR is an authentic turnkey interior execution contractor specializing in electrical, carpentry, false ceiling, and painting.",
  },
};

export class SettingsRepository {
  /**
   * Fetches all settings, merged with authoritative defaults.
   */
  static async getAllSettings(): Promise<Record<string, unknown>> {
    const records = await prisma.siteSetting.findMany();
    const result = { ...DEFAULT_SITE_SETTINGS };

    for (const record of records) {
      result[record.key] = record.value;
    }

    return result;
  }

  /**
   * Fetches specific setting by key.
   */
  static async getSettingByKey(key: string): Promise<unknown> {
    const record = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (record) {
      return record.value;
    }

    return DEFAULT_SITE_SETTINGS[key] ?? null;
  }

  /**
   * Upserts multiple settings atomically.
   */
  static async upsertSettings(entries: Record<string, unknown>): Promise<void> {
    await prisma.$transaction(
      Object.entries(entries).map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: { key },
          create: {
            key,
            value: (value === undefined ? null : value) as Prisma.InputJsonValue,
          },
          update: {
            value: (value === undefined ? null : value) as Prisma.InputJsonValue,
          },
        })
      )
    );
  }
}

