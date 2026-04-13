"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Store, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted text-sm mt-1">Dados da loja e preferências</p>
      </div>

      <Card title="Dados da Loja" className="max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Configurações salvas!");
          }}
          className="space-y-4"
        >
          <Input label="Nome da Loja" defaultValue="Bella Perfumaria" placeholder="Nome da sua loja" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Telefone" defaultValue="(11) 99999-8888" placeholder="Telefone da loja" />
            <Input label="Email" type="email" defaultValue="contato@bella.com" placeholder="Email da loja" />
          </div>
          <Input label="Endereço" defaultValue="Rua das Flores, 123 - São Paulo/SP" placeholder="Endereço da loja" />

          <div className="pt-4 border-t border-border">
            <Button type="submit">
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Configurações de Cupom" className="max-w-2xl">
        <div className="space-y-4">
          <Input label="Mensagem no rodapé do cupom" defaultValue="Obrigada pela preferência! Volte sempre!" placeholder="Mensagem personalizada" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CNPJ (opcional)" placeholder="00.000.000/0000-00" />
            <Input label="Inscrição Estadual (opcional)" placeholder="000.000.000.000" />
          </div>
        </div>
      </Card>

      <Card title="Notificações" className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div>
              <p className="font-medium text-sm">Alerta de estoque baixo</p>
              <p className="text-xs text-muted">Receber notificação quando um produto atingir o estoque mínimo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div>
              <p className="font-medium text-sm">Enviar cupom por email automaticamente</p>
              <p className="text-xs text-muted">Envia o comprovante por email após cada venda</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
            </label>
          </div>
        </div>
      </Card>
    </div>
  );
}
