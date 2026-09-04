import Image from "next/image";

const LOGO_INTRINSIC_WIDTH = 521;
const LOGO_INTRINSIC_HEIGHT = 479;

export function Logo({ size = 28 }: Readonly<{ size?: number }>) {
  return (
    <span className="logo-badge">
      <Image
        src="/assets/images/pcas-logo-transparent.png"
        alt="PCAS"
        width={LOGO_INTRINSIC_WIDTH}
        height={LOGO_INTRINSIC_HEIGHT}
        style={{ width: size, height: "auto" }}
        priority
      />
    </span>
  );
}
