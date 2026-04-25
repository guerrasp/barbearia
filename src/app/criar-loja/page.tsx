"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import KortaLogo from "@/components/brand/KortaLogo";
import Button from "@/components/ui/Button";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Store as StoreIcon,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  CheckCircle2,
  Sparkles,
  Globe,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface SlugCheck {
  available: boolean;
  slug?: string;
  reason?: "empty" | "too_short" | "too_long" | "reserved" | "taken";
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CriarLojaPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ slug: string; storeName: string } | null>(null);

  // Step 1: Loja
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugCheck, setSlugCheck] = useState<SlugCheck | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [storePhone, setStorePhone] = useState("");

  // Step 2: Dono
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Host dinâmico para preview do link público (resolve no client após mount)
  const [hostPrefix, setHostPrefix] = useState("seu-site/agendar/");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostPrefix(`${window.location.host}/agendar/`);
    }
  }, []);

  // Auto-sugerir slug a partir do nome se o usuário ainda não editou
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(storeName));
  }, [storeName, slugTouched]);

  // Debounce check slug
  useEffect(() => {
    if (!slug) {
      setSlugCheck(null);
      return;
    }
    setCheckingSlug(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<SlugCheck>(`/onboarding/check-slug?slug=${encodeURIComponent(slug)}`);
        setSlugCheck(res);
      } catch {
        setSlugCheck({ available: false, reason: "empty" });
      } finally {
        setCheckingSlug(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug]);

  const canStep1 =
    storeName.trim().length >= 2 && slug.length >= 3 && slugCheck?.available === true;
  const canStep2 =
    ownerName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ store: { slug: string; name: string } }>(
        "/onboarding",
        {
          storeName: storeName.trim(),
          slug,
          ownerName: ownerName.trim(),
          email: email.trim(),
          password,
          phone: storePhone || undefined,
        },
      );
      setDone({ slug: res.store.slug, storeName: res.store.name });
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar loja");
    } finally {
      setSubmitting(false);
    }
  };

  const slugMessage = (() => {
    if (!slug) return null;
    if (checkingSlug) return { tone: "muted" as const, text: "Verificando..." };
    if (!slugCheck) return null;
    if (slugCheck.available) return { tone: "ok" as const, text: "Disponível!" };
    switch (slugCheck.reason) {
      case "too_short":
        return { tone: "err" as const, text: "Muito curto (mín. 3 caracteres)" };
      case "too_long":
        return { tone: "err" as const, text: "Longo demais" };
      case "reserved":
        return { tone: "err" as const, text: "Esse endereço é reservado" };
      case "taken":
        return { tone: "err" as const, text: "Já está em uso" };
      default:
        return { tone: "err" as const, text: "Indisponível" };
    }
  })();

  return (
    <div className="korta-surface min-h-screen bg-korta-bg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a]" />
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-korta-gold/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-korta-surface/60 rounded-full blur-[100px]" />
      <Toaster position="top-right" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <KortaLogo size="md" href="/" />
        <Link href="/" className="text-sm text-korta-muted hover:text-korta-text">
          ← Voltar
        </Link>
      </header>

      <main className="relative z-10 max-w-xl mx-auto px-6 sm:px-10 pb-20">
        {step !== 3 && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-korta-gold/10 border border-korta-gold/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-korta-gold" />
              <span className="text-xs font-medium text-korta-gold">
                Crie sua loja em 2 minutos
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-korta-text">
              Bem-vindo à <span className="text-korta-gold">Korta</span>
            </h1>
            <p className="text-korta-muted mt-2">
              Em 2 passos sua barbearia está online recebendo agendamentos.
            </p>
          </div>
        )}

        {step !== 3 && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <Step n={1} active={step >= 1} done={step > 1} label="Sua loja" />
            <div className={`h-0.5 w-12 ${step > 1 ? "bg-korta-gold" : "bg-white/10"}`} />
            <Step n={2} active={step >= 2} done={false} label="Seu acesso" />
          </div>
        )}

        <div className="bg-korta-surface rounded-2xl border border-white/5 shadow-2xl shadow-black/40 p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <Field
                label="Nome da barbearia"
                icon={<StoreIcon className="w-4 h-4" />}
                value={storeName}
                onChange={setStoreName}
                placeholder="Ex: Korta Barbearia"
              />

              <div>
                <label className="block text-xs font-medium text-korta-muted mb-1">
                  Endereço público
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-korta-muted">
                    <Globe className="w-4 h-4" />
                  </span>
                  <div className="flex items-center pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm">
                    <span className="text-korta-muted truncate max-w-[60%]">{hostPrefix}</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(slugify(e.target.value));
                      }}
                      placeholder="sua-loja"
                      className="flex-1 bg-transparent text-korta-text outline-none placeholder:text-korta-muted/50"
                    />
                  </div>
                </div>
                {slugMessage && (
                  <p
                    className={`mt-1 text-xs flex items-center gap-1 ${
                      slugMessage.tone === "ok"
                        ? "text-green-400"
                        : slugMessage.tone === "err"
                          ? "text-red-400"
                          : "text-korta-muted"
                    }`}
                  >
                    {slugMessage.tone === "ok" && <Check className="w-3 h-3" />}
                    {slugMessage.tone === "muted" && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {slugMessage.text}
                  </p>
                )}
              </div>

              <Field
                label="Telefone (opcional)"
                icon={<Phone className="w-4 h-4" />}
                value={storePhone}
                onChange={setStorePhone}
                placeholder="(00) 00000-0000"
              />

              <div className="flex items-center justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canStep1}
                  className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field
                label="Seu nome"
                icon={<UserIcon className="w-4 h-4" />}
                value={ownerName}
                onChange={setOwnerName}
                placeholder="Como seu cliente vai te chamar"
              />
              <Field
                label="Email"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={setEmail}
                placeholder="seu@email.com"
                type="email"
              />
              <Field
                label="Senha"
                icon={<Lock className="w-4 h-4" />}
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 8 caracteres"
                type="password"
              />

              <p className="text-xs text-korta-muted bg-white/5 rounded-lg p-3 border border-white/5">
                Vamos criar para você: 1 barbeiro inicial (com seu nome), 3 serviços de
                exemplo (Corte, Barba, Combo) e horário padrão de seg a sáb. Você ajusta
                tudo depois.
              </p>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-sm text-korta-muted hover:text-korta-text"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
                <Button
                  onClick={submit}
                  isLoading={submitting}
                  disabled={!canStep2}
                  className="!bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                >
                  Criar minha loja <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && done && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-korta-gold/15 border border-korta-gold/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-korta-gold" />
              </div>
              <h2 className="text-2xl font-bold text-korta-text">Tudo pronto!</h2>
              <p className="text-korta-muted mt-2">
                <strong className="text-korta-text">{done.storeName}</strong> está no ar.
              </p>

              <div className="mt-5 p-4 rounded-xl bg-korta-bg border border-white/5 text-left">
                <p className="text-xs text-korta-muted uppercase tracking-wider">
                  Seu link público
                </p>
                <p className="font-mono text-korta-gold mt-1 break-all">
                  {typeof window !== "undefined" ? window.location.origin : ""}/agendar/
                  {done.slug}
                </p>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-3">
                <Link href="/admin">
                  <Button className="w-full !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold">
                    Ir para o painel <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href={`/agendar/${done.slug}`}>
                  <Button variant="ghost" className="w-full">
                    Ver portal público
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-korta-muted mt-4">
                Faça login com o email e senha que você acabou de cadastrar.
              </p>
            </div>
          )}
        </div>

        {step !== 3 && (
          <p className="text-center text-xs text-korta-muted/70 mt-6">
            Já tem conta?{" "}
            <Link href="/" className="text-korta-gold hover:underline">
              Fazer login
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

function Step({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
          done
            ? "bg-korta-gold text-korta-bg"
            : active
              ? "bg-korta-gold/20 text-korta-gold border border-korta-gold/40"
              : "bg-white/5 text-korta-muted"
        }`}
      >
        {done ? <Check className="w-4 h-4" /> : n}
      </div>
      <span
        className={`text-xs ${active ? "text-korta-text" : "text-korta-muted"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-korta-muted mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-korta-muted">
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-white/10 bg-white/5 text-korta-text text-sm placeholder:text-korta-muted/50 outline-none focus:border-korta-gold/40"
        />
      </div>
    </div>
  );
}
