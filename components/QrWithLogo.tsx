"use client";

type Props = {
  data: string;                  // URL/data to encode
  size?: number;                 // size in px (square)
  radius?: number;               // container border radius (px)
  logoSrc?: string;              // path to center logo
  logoAlt?: string;
  logoSizePct?: number;          // 0..1 fraction of QR size
  logoRingPx?: number;           // white ring thickness around logo (px)
};

export default function QrWithLogo({
  data,
  size = 240,
  radius = 16,
  logoSrc = "/p4h_logo_round.png",
  logoAlt = "Plan4Host",
  logoSizePct = 0.28,
  logoRingPx = 4,
}: Props) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?ecc=H&size=${size}x${size}&data=${encodeURIComponent(
    data,
  )}`;
  const logoSize = Math.max(16, Math.floor(size * Math.max(0.12, Math.min(0.42, logoSizePct))));

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
      }}
    >
      <img src={url} alt="QR code" width={size} height={size} style={{ display: "block" }} />
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={logoAlt}
          width={logoSize}
          height={logoSize}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: logoSize,
            height: logoSize,
            borderRadius: 999,
            background: "#ffffff",
            border: `${Math.max(0, logoRingPx)}px solid #ffffff`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
          }}
        />
      ) : null}
    </div>
  );
}

