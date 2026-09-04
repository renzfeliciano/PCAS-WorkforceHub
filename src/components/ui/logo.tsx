import Image from "next/image";

const LOGO_ASPECT_RATIO = 479 / 521;

export function Logo({ size = 28 }: Readonly<{ size?: number }>) {
  return (
    <Image
      src="/assets/images/pcas-logo-transparent.png"
      alt="PCAS"
      width={size}
      height={Math.round(size * LOGO_ASPECT_RATIO)}
      priority
    />
  );
}
