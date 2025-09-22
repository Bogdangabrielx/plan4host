import ResetRequestClient from "./ui/ResetRequestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResetRequestPage() {
  return (
    <main style={{ display:'grid', placeItems:'center', minHeight:'100dvh', padding:16 }}>
      <ResetRequestClient />
    </main>
  );
}

