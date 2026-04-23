import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

// Remetente padrão - trocar por email do seu domínio verificado no Resend
export const EMAIL_FROM = process.env.EMAIL_FROM || "Barbearia <onboarding@resend.dev>";
