import "server-only";
import { SettingsRepository } from "../repositories/settings.repository";
import { settingsAllowlistSchema, SettingsAllowlistInput } from "@/lib/validation/settings";
import { logActivity } from "../audit/audit.service";
import { ActivityAction } from "@prisma/client";

export class SettingsService {
  /**
   * Retrieves all settings merged with defaults.
   */
  static async getAllSettings(): Promise<Record<string, unknown>> {
    return SettingsRepository.getAllSettings();
  }

  /**
   * Validates input against strict allowlist schema and updates settings.
   */
  static async updateSettings(
    input: unknown,
    adminUserId: string
  ): Promise<Record<string, unknown>> {
    const validated: SettingsAllowlistInput = settingsAllowlistSchema.parse(input);

    // Save only defined keys
    const entriesToSave: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validated)) {
      if (value !== undefined) {
        entriesToSave[key] = value;
      }
    }

    if (Object.keys(entriesToSave).length > 0) {
      await SettingsRepository.upsertSettings(entriesToSave);

      await logActivity({
        adminUserId,
        action: ActivityAction.SETTINGS_UPDATED,
        entityType: "SiteSetting",
        summary: `Updated site settings: ${Object.keys(entriesToSave).join(", ")}`,
        metadata: { updatedKeys: Object.keys(entriesToSave) },
      });
    }

    return SettingsRepository.getAllSettings();
  }
}

