import { z } from "zod";

export const emailSchema = z
  .email("invalidEmail")
  .max(200)
  .transform((v) => v.trim().toLowerCase());
export const passwordSchema = z.string().min(8, "passwordMin").max(128, "tooLong");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required"),
  next: z.string().max(500).optional(),
});

export const signUpCompanySchema = z.object({
  full_name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  company_name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  email: emailSchema,
  password: passwordSchema,
  next: z.string().max(500).optional(),
});

export const signUpCandidateSchema = z.object({
  first_name: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  last_name: z.string().trim().min(2, "tooShort").max(80, "tooLong"),
  email: emailSchema,
  password: passwordSchema,
  country: z.string().length(2, "required"),
  // Granular consents (MVP document section 6): terms and data policy are required, the rest are optional
  consent_terms: z.literal(true, { error: "consentRequired" }),
  consent_data: z.literal(true, { error: "consentRequired" }),
  consent_job_contact: z.boolean(),
  consent_analytics: z.boolean(),
  next: z.string().max(500).optional(),
});

export const consentFlagsSchema = z.object({ job_contact: z.boolean(), analytics: z.boolean() });
export type ConsentFlagsInput = z.infer<typeof consentFlagsSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: "passwordMatch" });

export const acceptInviteSchema = z.object({
  token: z.string().min(10).max(200),
  full_name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpCompanyInput = z.infer<typeof signUpCompanySchema>;
export type SignUpCandidateInput = z.infer<typeof signUpCandidateSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

/** Only allow relative in-app paths as post-auth destinations. */
export function safeNext(next: string | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return fallback;
  return next;
}
