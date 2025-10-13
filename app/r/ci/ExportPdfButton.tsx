"use client";

export default function ExportPdfButton() {
  return (
    <button
      className="sb-btn sb-btn--primary"
      onClick={() => {
        try { window.print(); } catch {}
      }}
      title="Export this page as PDF"
    >
      Export as PDF
    </button>
  );
}

