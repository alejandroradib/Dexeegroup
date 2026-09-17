import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "primary" | "white";
  className?: string;
  href?: string;
  height?: number;
};

export function Logo({ variant = "primary", className, href = "/", height = 28 }: LogoProps) {
  const src =
    variant === "white" ? "/brand/dexee-logo-white-green.svg" : "/brand/dexee-logo-primary.svg";
  const width = Math.round(height * (1088 / 305));
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="Dexee">
      <Image src={src} alt="Dexee" width={width} height={height} priority />
    </Link>
  );
}

export function Isotype({
  className,
  variant = "green",
}: {
  className?: string;
  variant?: "green" | "navy" | "white";
}) {
  return (
    <Image
      src={`/brand/dexee-isotype-${variant}.svg`}
      alt=""
      width={20}
      height={29}
      className={className}
      aria-hidden
    />
  );
}
