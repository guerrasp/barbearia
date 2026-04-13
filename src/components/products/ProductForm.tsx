"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import BarcodeScanner from "./BarcodeScanner";
import { calculateProfitMargin } from "@/lib/utils";
import { ScanBarcode } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().min(0.01, "Preço de custo é obrigatório"),
  salePrice: z.number().min(0.01, "Preço de venda é obrigatório"),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  minStock: z.number().int().min(0),
  categoryId: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  categories: { value: string; label: string }[];
  onSubmit: (data: ProductFormData & { profitMargin: number }) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({
  initialData,
  categories,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      barcode: initialData?.barcode || "",
      costPrice: initialData?.costPrice || 0,
      salePrice: initialData?.salePrice || 0,
      stock: initialData?.stock || 0,
      minStock: initialData?.minStock || 5,
      categoryId: initialData?.categoryId || "",
    },
  });

  const costPrice = watch("costPrice");
  const salePrice = watch("salePrice");
  const profitMargin = calculateProfitMargin(costPrice || 0, salePrice || 0);

  const handleFormSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      await onSubmit({ ...data, profitMargin });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    setValue("barcode", barcode);
    setShowScanner(false);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <Input
        label="Nome do Produto *"
        placeholder="Ex: Perfume 212 VIP"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        label="Descrição"
        placeholder="Descrição do produto"
        {...register("description")}
      />

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Input
            label="Código de Barras"
            placeholder="Ex: 7891234567890"
            {...register("barcode")}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowScanner(true)}
          className="mb-0"
        >
          <ScanBarcode className="w-4 h-4" />
        </Button>
      </div>

      <Select
        label="Categoria"
        options={categories}
        placeholder="Selecione uma categoria"
        {...register("categoryId")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Preço de Custo (R$) *"
          type="number"
          step="0.01"
          placeholder="0,00"
          error={errors.costPrice?.message}
          {...register("costPrice", { valueAsNumber: true })}
        />
        <Input
          label="Preço de Venda (R$) *"
          type="number"
          step="0.01"
          placeholder="0,00"
          error={errors.salePrice?.message}
          {...register("salePrice", { valueAsNumber: true })}
        />
      </div>

      {/* Margem de lucro calculada */}
      <div className="bg-background rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Margem de Lucro</span>
          <span
            className={`text-lg font-bold ${
              profitMargin > 0
                ? "text-emerald-600"
                : profitMargin < 0
                ? "text-danger"
                : "text-muted"
            }`}
          >
            {profitMargin}%
          </span>
        </div>
        {costPrice > 0 && salePrice > 0 && (
          <p className="text-xs text-muted mt-1">
            Lucro por unidade: R$ {(salePrice - costPrice).toFixed(2)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Estoque Atual"
          type="number"
          error={errors.stock?.message}
          {...register("stock", { valueAsNumber: true })}
        />
        <Input
          label="Estoque Mínimo"
          type="number"
          error={errors.minStock?.message}
          {...register("minStock", { valueAsNumber: true })}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="submit" isLoading={isLoading} className="flex-1">
          {initialData ? "Salvar Alterações" : "Cadastrar Produto"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
