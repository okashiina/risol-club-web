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
    ? "/brand/logo-red-transparent.png"
    : "/brand/logo-red-transparent-no-risol.png";

  return (
    <Link href={href} className="group inline-flex items-center gap-3">
      <span
        className={`relative flex h-13 w-13 items-center justify-center overflow-hidden rounded-[1.35rem] border p-1.5 shadow-[0_16px_36px_rgba(185,30,30,0.12)] transition duration-200 group-hover:-translate-y-0.5 ${
          isCustomer
            ? "border-[#f0b6ae] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,242,236,0.95))]"
            : "border-[#f2c6c2] bg-white/90"
        }`}
      >
        {isCustomer ? (
          <>
            <span className="absolute -left-2 top-1 h-5 w-5 rounded-full bg-[#ffd6af]/70 blur-[1px]" />
            <span className="absolute -right-1 bottom-0 h-4 w-4 rounded-full bg-[#f7b5ad]/70 blur-[1px]" />
            <span className="absolute inset-x-2 top-1 h-2 rounded-full bg-white/70" />
          </>
        ) : null}
        <Image
          src={logoSrc}
          alt="Risol Club logo"
          fill
          sizes="52px"
          className={`object-contain p-1 ${isCustomer ? "scale-[1.08]" : ""}`}
          priority
        />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-lg leading-none text-[color:var(--brand-900)]">
          Risol Club
        </span>
        {!compact ? (
          <span className="text-xs text-[color:var(--brand-700)]">
            {isCustomer ? "handmade comfort snacks" : "seller dashboard"}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
