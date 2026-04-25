import Image from "next/image";
import Link from "next/link";

type Size = "sm" | "md" | "lg" | "xl";

const FULL_HEIGHT: Record<Size, number> = { sm: 32, md: 44, lg: 60, xl: 80 };
const MARK_SIZE: Record<Size, string> = {
  sm: "w-7 h-7",
  md: "w-9 h-9",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

interface KortaLogoProps {
  size?: Size;
  showWordmark?: boolean;
  href?: string;
  className?: string;
  priority?: boolean;
}

/**
 * `showWordmark=true` (default) → logo oficial PNG (logo + wordmark).
 * `showWordmark=false` → glifo K dourado em SVG (favicon/avatar).
 */
export default function KortaLogo({
  size = "md",
  showWordmark = true,
  href,
  className = "",
  priority = false,
}: KortaLogoProps) {
  const inner = showWordmark ? (
    <Image
      src="/logo.png"
      alt="Korta"
      width={Math.round(FULL_HEIGHT[size] * 3)}
      height={FULL_HEIGHT[size]}
      priority={priority}
      className={`object-contain ${className}`}
      style={{ height: FULL_HEIGHT[size], width: "auto" }}
    />
  ) : (
    <span
      className={`${MARK_SIZE[size]} relative inline-flex items-center justify-center rounded-xl bg-korta-gold shadow-lg shadow-korta-gold/20 ${className}`}
    >
      <svg viewBox="0 0 32 32" fill="none" className="w-[65%] h-[65%]" aria-hidden="true">
        <path
          d="M8 4v24M8 16l14-12M8 16l14 12"
          stroke="#0B132B"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Korta" className="inline-flex items-center">
        {inner}
      </Link>
    );
  }
  return inner;
}
