"use client";

export default function ExportPdfButton({ filename }: { filename?: string }) {
  return (
    <button
      className="sb-btn sb-btn--primary no-print"
      onClick={() => {
        try {
          const prev = document.title;
          if (filename && typeof filename === 'string') {
            // Suggest file name via document.title (Chrome/Edge honor this in Save as PDF)
            document.title = filename;
          }
          window.print();
          // Restore the original title (next tick; print dialog is blocking on most browsers)
          setTimeout(() => { try { document.title = prev; } catch {} }, 500);
        } catch {}
      }}
      title="Export this page as PDF"
    >
      Export as PDF
    </button>
  );
}
