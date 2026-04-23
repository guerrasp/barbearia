import Link from "next/link";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<Size, { box: string; mark: string; text: string }> = {
  sm: { box: "gap-2", mark: "w-7 h-7", text: "text-lg" },
  md: { box: "gap-2.5", mark: "w-9 h-9", text: "text-xl" },
  lg: { box: "gap-3", mark: "w-12 h-12", text: "text-3xl" },
  xl: { box: "gap-3.5", mark: "w-16 h-16", text: "text-4xl" },
};

interface KortaLogoProps {
  size?: Size;
  showWordmark?: boolean;
  href?: string;
  className?: string;
}

/**
 * Marca provisória Korta — "K" estilizado como lâmina, no dourado da marca.
 * Pode ser substituído pelo logo definitivo assim que o arquivo chegar.
 */
export default function KortaLogo({
  size = "md",
  showWordmark = true,
  href,
  className = "",
}: KortaLogoProps) {
  const s = SIZE_MAP[size];

  const inner = (
    <span className={`inline-flex items-center ${s.box} ${className}`}>
      <span
        className={`${s.mark} relative inline-flex items-center justify-center rounded-xl bg-korta-gold shadow-lg shadow-korta-gold/20`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          className="w-[65%] h-[65%]"
          aria-hidden="true"
        >
          <path
            d="M8 4v24M8 16l14-12M8 16l14 12"
            stroke="#0B132B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={`${s.text} font-bold tracking-tight text-korta-text`}
          style={{ letterSpacing: "-0.02em" }}
        >
          Korta
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Korta" className="inline-flex">
        {inner}
      </Link>
    );
  }
  return inner;
}
