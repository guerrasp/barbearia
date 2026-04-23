"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ParticleBackground from "@/components/effects/ParticleBackground";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import {
  Store,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Calendar,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
}

export default function CadastroPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("NOT_SPECIFIED");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Buscar a loja pelo slug da URL ou pegar a primeira disponível
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("loja");
    const url = slug ? `/stores?slug=${slug}` : "/stores";
    api.get<StoreInfo>(url)
      .then(setStoreInfo)
      .catch(() => toast.error("Loja não encontrada"))
      .finally(() => setLoadingStore(false));
  }, []);

  // Máscara de telefone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Máscara de CPF
  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Máscara de CEP
  const formatZipCode = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Buscar endereço por CEP
  const fetchAddress = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } catch {
      // silently fail
    }
  };

  const validateStep1 = () => {
    if (!name.trim() || name.trim().split(" ").length < 2) {
      toast.error("Informe seu nome completo (nome e sobrenome)");
      return false;
    }
    if (!email.trim()) { toast.error("Informe seu email"); return false; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      toast.error("Informe um telefone válido");
      return false;
    }
    if (password.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres"); return false; }
    if (password !== confirmPassword) { toast.error("As senhas não coincidem"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim()) { toast.error("Informe seu endereço"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!storeInfo) { toast.error("Barbearia não identificada. Acesse o link fornecido pela barbearia."); return; }

    setIsLoading(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.replace(/\D/g, ""),
        cpf: cpf.replace(/\D/g, "") || undefined,
        address: address.trim(),
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zipCode: zipCode.replace(/\D/g, "") || undefined,
        birthDate: birthDate || undefined,
        gender,
        role: "CUSTOMER",
        storeSlug: storeInfo.slug,
      });
      setSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="korta-surface min-h-screen bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a] flex items-center justify-center p-4 relative overflow-hidden">
        <ParticleBackground />
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Cadastro realizado!</h2>
            <p className="text-gray-500 mb-6">
              Sua conta foi criada com sucesso. Agora você pode acessar seus pedidos.
            </p>
            <Button
              onClick={() => window.location.href = "/"}
              className="w-full !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
              size="lg"
            >
              Ir para o Login <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="korta-surface min-h-screen bg-gradient-to-br from-korta-bg via-korta-bg to-[#060b1a] flex items-center justify-center p-4 relative overflow-hidden">
      <ParticleBackground />

      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-korta-gold/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-korta-surface/60 rounded-full blur-3xl" />

      <Toaster position="top-right" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Criar Conta</h1>
          {storeInfo && (
            <p className="text-korta-gold mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {storeInfo.name}
            </p>
          )}
          {loadingStore && <p className="text-korta-muted mt-1 text-sm">Carregando...</p>}
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= 1 ? "bg-korta-gold text-korta-bg" : "bg-white/10 text-white/40"}`}>
            1
          </div>
          <div className={`w-12 h-0.5 ${step >= 2 ? "bg-korta-gold" : "bg-white/10"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= 2 ? "bg-korta-gold text-korta-bg" : "bg-white/10 text-white/40"}`}>
            2
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/20 p-8 border border-white/20">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Dados pessoais</h2>
              <p className="text-sm text-gray-500 mb-5">Preencha seus dados para criar sua conta</p>

              <div className="space-y-4">
                <Input
                  label="Nome completo *"
                  placeholder="Seu nome e sobrenome"
                  icon={<User className="w-4 h-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email *"
                  type="email"
                  placeholder="seu@email.com"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Telefone *"
                  placeholder="(00) 00000-0000"
                  icon={<Phone className="w-4 h-4" />}
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Senha *"
                    type="password"
                    placeholder="Min. 6 caracteres"
                    icon={<Lock className="w-4 h-4" />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    label="Confirmar senha *"
                    type="password"
                    placeholder="Repita a senha"
                    icon={<Lock className="w-4 h-4" />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button
                  onClick={() => validateStep1() && setStep(2)}
                  className="w-full !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                  size="lg"
                  disabled={!storeInfo}
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Endereço e dados adicionais</h2>
              <p className="text-sm text-gray-500 mb-5">Complete seu cadastro</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="CEP"
                    placeholder="00000-000"
                    icon={<MapPin className="w-4 h-4" />}
                    value={zipCode}
                    onChange={(e) => {
                      const formatted = formatZipCode(e.target.value);
                      setZipCode(formatted);
                      if (formatted.replace(/\D/g, "").length === 8) fetchAddress(formatted);
                    }}
                  />
                  <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    icon={<CreditCard className="w-4 h-4" />}
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                  />
                </div>

                <Input
                  label="Endereço *"
                  placeholder="Rua, número, complemento"
                  icon={<MapPin className="w-4 h-4" />}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Cidade"
                    placeholder="Sua cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Input
                    label="Estado"
                    placeholder="UF"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    maxLength={2}
                  />
                </div>

                <Input
                  label="Data de nascimento"
                  type="date"
                  icon={<Calendar className="w-4 h-4" />}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Sexo</label>
                  <div className="flex gap-3">
                    {[
                      { value: "FEMALE", label: "Feminino" },
                      { value: "MALE", label: "Masculino" },
                      { value: "NOT_SPECIFIED", label: "Prefiro não responder" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGender(opt.value)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                          gender === opt.value
                            ? "border-korta-gold bg-korta-gold/10 text-korta-bg font-medium"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setStep(1)}
                    size="lg"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    className="flex-[2] !bg-korta-gold hover:!bg-korta-gold-hover !text-korta-bg !font-semibold"
                    size="lg"
                  >
                    Criar conta <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Link para login */}
        <div className="text-center mt-5">
          <Link href="/" className="text-korta-muted text-sm hover:text-korta-text transition-colors">
            Já tem conta? Faça login
          </Link>
        </div>

        <p className="text-center text-korta-muted/50 text-[10px] mt-4">
          Barbearia &copy; 2026
        </p>
      </div>
    </div>
  );
}
