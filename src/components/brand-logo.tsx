import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
  variant?: "customer" | "seller";
};

export function BrandLogo({
  compact = false,
  variant = "customer",
}: BrandLogoProps) {
  const isCustomer = variant === "customer";
  const href = isCustomer ? "/" : "/seller";
  const logoSrc = isCustomer
    ? "/brand/logo-original.png"
    : "/brand/logo-red-transparent-no-risol.png";

  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <span
        className={`relative flex items-center justify-center overflow-hidden transition duration-200 group-hover:-translate-y-0.5 ${
          isCustomer
            ? "h-13 w-13 rounded-[1.35rem] bg-[#fffaf4]"
            : "h-13 w-13 rounded-[1.35rem] border border-[#f2c6c2] bg-white/90 p-1.5 shadow-[0_16px_36px_rgba(185,30,30,0.12)]"
        }`}
      >
        <Image
          src={logoSrc}
          alt="Risol Club logo"
          fill
          sizes="52px"
          className={isCustomer ? "object-contain p-0.5" : "object-contain p-0.5"}
          priority
        />
      </span>
      <span className="flex flex-col">
        <span className="font-heading text-lg leading-none text-[color:var(--brand-900)]">
          Risol Club
        </span>
        {!compact ? (
          <span className="font-note text-xs text-[color:var(--brand-800)]">
            {isCustomer ? "handmade comfort snacks" : "seller dashboard"}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
