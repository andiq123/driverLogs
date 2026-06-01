import Image from "next/image";

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      priority
      className="shrink-0 rounded-2xl"
    />
  );
}
