import Image from "next/image";

interface LogoProps {
  readonly size?: number;
}

const TRANSPARENT_LOGO_INTRINSIC_WIDTH = 521;
const TRANSPARENT_LOGO_INTRINSIC_HEIGHT = 479;

export function Logo({ size = 34 }: LogoProps) {
  return (
    <span
      className="logo-badge"
      style={{ display: "inline-block", width: size, minWidth: size }}
    >
      <Image
        src="/assets/images/pcas-logo-transparent.png"
        alt="PCAS"
        width={TRANSPARENT_LOGO_INTRINSIC_WIDTH}
        height={TRANSPARENT_LOGO_INTRINSIC_HEIGHT}
        style={{ width: "100%", height: "auto" }}
        priority
      />
    </span>
  );
}
