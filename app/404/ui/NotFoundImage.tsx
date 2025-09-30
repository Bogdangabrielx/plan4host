"use client";

import { useState } from "react";

export default function NotFoundImage() {
  const [src, setSrc] = useState<string>("/404v2.gif");
  return (
    <img
      src={src}
      alt="404 — Not found"
      onError={() => setSrc("/status.png")}
      style={{ maxWidth: "100%", height: "auto", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.15)" }}
    />
  );
}

