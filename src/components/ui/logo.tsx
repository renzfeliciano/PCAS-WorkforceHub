import Image from "next/image";

interface LogoProps {
  readonly size?: number;
}

const TRANSPARENT_LOGO_INTRINSIC_WIDTH = 521;
const TRANSPARENT_LOGO_INTRINSIC_HEIGHT = 479;

export function Logo({ size = 34 }: LogoProps) {
  return (
    <Image
      src="/assets/images/pcas-logo-transparent.png"
      alt="PCAS WorkforceHub"
      width={TRANSPARENT_LOGO_INTRINSIC_WIDTH}
      height={TRANSPARENT_LOGO_INTRINSIC_HEIGHT}
      style={{ width: size, height: "auto" }}
      priority
    />
  );
}
