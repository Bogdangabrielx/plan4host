import DemoClient from "./ui/DemoClient";
import { seoMontserrat } from "@/components/seo/seoFont";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function GuestAiAssistantDemoPage() {
  return <div className={seoMontserrat.className}><DemoClient /></div>;
}

