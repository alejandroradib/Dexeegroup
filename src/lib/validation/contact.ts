import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "tooShort").max(120, "tooLong"),
  email: z.email("invalidEmail").max(200),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  request_type: z.enum(["hire", "talent", "other"]),
  message: z.string().trim().min(10, "tooShort").max(2000, "tooLong"),
  // Honeypot: real users never fill this field
  website: z.string().max(0).optional().or(z.literal("")),
});

export type ContactInput = z.infer<typeof contactSchema>;
