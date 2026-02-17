import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Senha deve ter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve ter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve ter pelo menos um número");

export const preRegistrationSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  whatsapp: z.string().trim().min(10, "WhatsApp inválido").max(15, "WhatsApp inválido"),
  password: passwordSchema,
});

export type PreRegistrationFormData = z.infer<typeof preRegistrationSchema>;
