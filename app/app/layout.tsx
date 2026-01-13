import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={inter.className}>{children}</div>;
}

