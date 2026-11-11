import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters for security"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  ALLOWED_PUBLIC_ORIGINS: z.string().default("https://mamainterior.in,http://localhost:3000"),
  REVALIDATION_WEBHOOK_URL: z.string().url().optional(),
  REVALIDATION_SECRET: z.string().min(16).optional(),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof envSchema>;

function validateEnv(): ServerEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorDetails = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
    );
    // Never print secret values to logs
    throw new Error(
      `[Startup Error] Missing or invalid environment configuration:\n${errorDetails.join("\n")}`
    );
  }
  return result.data;
}

export const env = validateEnv();
