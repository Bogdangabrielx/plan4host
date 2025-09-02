"use client";

import { useEffect } from "react";
import { useHeader } from "@/app/app/_components/HeaderContext";

export default function TitleSetter() {
  const { setTitle } = useHeader();

  useEffect(() => {
    setTitle("Channels & iCal");
  }, [setTitle]);

  return null;
}
