import ResetCompleteClient from "./ui/ResetCompleteClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ResetCompletePage() {
  return (
    <main style={{ display:'grid', placeItems:'center', minHeight:'100dvh', padding:16 }}>
      <ResetCompleteClient />
    </main>
  );
}

