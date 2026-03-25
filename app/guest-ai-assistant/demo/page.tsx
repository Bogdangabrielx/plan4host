import type { Metadata } from "next";
import DemoClient from "./ui/DemoClient";
import SeoStructuredData from "@/components/seo/SeoStructuredData";
import { seoMontserrat } from "@/components/seo/seoFont";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Guest AI assistant demo | Plan4Host",
  description: "Preview how guests receive messages, arrival details, and answers inside the Plan4Host guest portal.",
  alternates: {
    canonical: "/guest-ai-assistant/demo",
  },
  openGraph: {
    title: "Guest AI assistant demo | Plan4Host",
    description: "Preview how guests receive messages, arrival details, and answers inside the Plan4Host guest portal.",
    url: "/guest-ai-assistant/demo",
    locale: "en_US",
    type: "website",
  },
};

export default function GuestAiAssistantDemoPage() {
  return (
    <div className={seoMontserrat.className}>
      <DemoClient />
      <SeoStructuredData
        lang="en"
        path="/guest-ai-assistant/demo"
        title="Guest AI assistant demo | Plan4Host"
        description="Preview how guests receive messages, arrival details, and answers inside the Plan4Host guest portal."
        image="/Hero Guest AI.png"
        includeArticle={false}
      />
    </div>
  );
}
