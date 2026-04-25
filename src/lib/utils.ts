import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

/**
 * Máscara progressiva de telefone BR.
 * Aceita até 11 dígitos (celular) e formata em tempo real conforme o usuário
 * digita. Para 10 dígitos formata como fixo.
 *
 *   ""           -> ""
 *   "1"          -> "(1"
 *   "11"         -> "(11"
 *   "1199"       -> "(11) 99"
 *   "1199999"    -> "(11) 9999-9"     (assume fixo até passar 10 dígitos)
 *   "11999998888"-> "(11) 99999-8888" (celular)
 *
 * Comprimento máximo de string formatada = 15 caracteres.
 */
export function maskPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function calculateProfitMargin(costPrice: number, salePrice: number): number {
  if (costPrice === 0) return 0;
  return Number((((salePrice - costPrice) / costPrice) * 100).toFixed(2));
}

export function generateSaleCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `VND-${year}${month}${random}`;
}
