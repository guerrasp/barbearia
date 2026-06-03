"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle } from "lucide-react";

type Msg = { side: "left" | "right"; text: string };

// 3 conversas reais que o atendente de IA resolve — vão alternando
const SCRIPTS: Msg[][] = [
  [
    { side: "right", text: "quero cortar o cabelo amanhã às 15h" },
    { side: "left", text: 'Boa! ✂️ Com quem você prefere — Rafael ou João? (ou "tanto faz")' },
    { side: "right", text: "tanto faz" },
    { side: "left", text: "Fechou com o Rafael! Amanhã às 15h está livre. Confirmo? 🗓️" },
    { side: "right", text: "confirma 👍" },
    { side: "left", text: "Prontinho, tá agendado! ✅\n📅 Amanhã às 15h · 💈 Rafael\nTe espero! 😄" },
  ],
  [
    { side: "right", text: "qual o endereço de vocês?" },
    { side: "left", text: "📍 Rua das Torres, 159 — Santos/SP.\nQuer que eu já marque um horário? 😊" },
    { side: "right", text: "pode ser sexta de tarde" },
    { side: "left", text: "Sexta o Rafael tem 14h, 15h30 ou 17h. Qual fica melhor?" },
    { side: "right", text: "15h30" },
    { side: "left", text: "Marcado! ✅ Sexta às 15h30 com o Rafael. Até lá! 💈" },
  ],
  [
    { side: "right", text: "quais tipos de corte vocês fazem?" },
    { side: "left", text: "Temos Corte (R$45), Barba (R$35) e Corte + Barba (R$70). Qual te interessa?" },
    { side: "right", text: "corte e barba" },
    { side: "left", text: "Ótima escolha! Pra quando você quer? (hoje, amanhã ou uma data)" },
    { side: "right", text: "hoje se tiver" },
    { side: "left", text: "Tem sim! Hoje às 18h com o João. Confirmo? ✅" },
  ],
];

export default function AnimatedChatDemo() {
  const [scriptIdx, setScriptIdx] = useState(0);
  const [shown, setShown] = useState(0); // mensagens já reveladas
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const script = SCRIPTS[scriptIdx];
    let t: ReturnType<typeof setTimeout>;

    if (shown < script.length) {
      const next = script[shown];
      if (next.side === "left") {
        // mensagem do bot: mostra "digitando..." antes
        setTyping(true);
        t = setTimeout(() => {
          setTyping(false);
          setShown((s) => s + 1);
        }, 1100);
      } else {
        // mensagem do cliente: aparece mais rápido
        t = setTimeout(() => setShown((s) => s + 1), 750);
      }
    } else {
      // fim do script: pausa e troca de conversa
      t = setTimeout(() => {
        setShown(0);
        setScriptIdx((i) => (i + 1) % SCRIPTS.length);
      }, 2800);
    }
    return () => clearTimeout(t);
  }, [scriptIdx, shown]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // auto-scroll pro fim quando aparece msg nova
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, typing]);

  const script = SCRIPTS[scriptIdx];
  const visible = script.slice(0, shown);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="bg-[#0b141a] rounded-[2rem] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header estilo WhatsApp */}
        <div className="bg-korta-surface px-4 py-3 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-full bg-korta-gold/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-korta-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-korta-text leading-tight">Barbearia (Korta)</p>
            <p className="text-[11px] text-emerald-400">online agora</p>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="p-3 space-y-2 bg-[#0b141a] h-[380px] overflow-hidden">
          {visible.map((m, i) => (
            <Bubble key={`${scriptIdx}-${i}`} side={m.side}>{m.text}</Bubble>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-korta-surface border border-white/5 rounded-2xl rounded-bl-sm px-3 py-2.5">
                <span className="flex gap-1">
                  <Dot /> <Dot delay={0.2} /> <Dot delay={0.4} />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-korta-muted mt-3 flex items-center justify-center gap-1.5">
        <MessageCircle className="w-3.5 h-3.5 text-korta-gold" /> Atendente de IA respondendo de verdade
      </p>
    </div>
  );
}

function Bubble({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  const right = side === "right";
  return (
    <div className={`flex ${right ? "justify-end" : "justify-start"} animate-[fadeUp_0.3s_ease]`}>
      <div
        className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-line ${
          right
            ? "bg-[#005c4b] text-white rounded-br-sm"
            : "bg-korta-surface text-korta-text rounded-bl-sm border border-white/5"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-korta-muted inline-block animate-bounce"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
