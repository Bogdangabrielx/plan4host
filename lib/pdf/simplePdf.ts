export type SimplePdfOptions = {
  title: string;
  subtitle?: string;
  bodyLines: string[];
};

function estimateHelveticaWidth(text: string, fontSize: number): number {
  // Approximation: Helvetica average width ~0.52em per character.
  return Math.max(0, text.length) * fontSize * 0.52;
}

function centerX(text: string, fontSize: number, pageWidth: number): number {
  const est = estimateHelveticaWidth(text, fontSize);
  const x = (pageWidth - est) / 2;
  return Math.max(48, Math.min(pageWidth - 48, x));
}

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + " " + word).length <= maxChars) {
      current += " " + word;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export function buildSimplePdfBytes(opts: SimplePdfOptions): Uint8Array {
  const title = (opts.title || "").trim().toUpperCase() || "HOUSE RULES";
  const subtitle = (opts.subtitle || "").trim().toUpperCase();

  const body: string[] = [];
  for (const line of opts.bodyLines || []) {
    const parts = line.split("\n");
    for (const p of parts) {
      body.push(...wrapText(p, 92));
    }
  }

  const contentLines: string[] = [];
  contentLines.push("BT");
  const PAGE_W = 612;
  const TITLE_FS = 18;
  const SUB_FS = 11;
  const BODY_FS = 11;
  const yTitle = 742;
  const xTitle = centerX(title, TITLE_FS, PAGE_W);
  contentLines.push(`/F1 ${TITLE_FS} Tf`);
  contentLines.push(`1 0 0 1 ${xTitle.toFixed(2)} ${yTitle.toFixed(2)} Tm`);
  contentLines.push(`(${escapePdfText(title)}) Tj`);
  if (subtitle) {
    const xSub = centerX(subtitle, SUB_FS, PAGE_W);
    contentLines.push(`/F1 ${SUB_FS} Tf`);
    contentLines.push(`1 0 0 1 ${xSub.toFixed(2)} ${(yTitle - 22).toFixed(2)} Tm`);
    // letter spacing approximation via extra spaces (keeps generator simple)
    contentLines.push(`(${escapePdfText(subtitle)}) Tj`);
  }
  contentLines.push(`/F1 ${BODY_FS} Tf`);
  contentLines.push(`1 0 0 1 72 690 Tm`);
  for (const line of body) {
    contentLines.push(`(${escapePdfText(line)}) Tj`);
    contentLines.push("0 -14 Td");
  }
  contentLines.push("ET");

  const contentStream = contentLines.join("\n") + "\n";
  const contentBytes = toBytes(contentStream);

  const objects: Uint8Array[] = [];
  objects.push(toBytes("%PDF-1.4\n%âãÏÓ\n"));

  const xrefOffsets: number[] = [];
  let cursor = objects[0].length;

  function pushObject(objNum: number, bodyStr: string) {
    const header = `${objNum} 0 obj\n`;
    const footer = "endobj\n";
    const bytes = concatBytes([toBytes(header), toBytes(bodyStr), toBytes("\n"), toBytes(footer)]);
    xrefOffsets[objNum] = cursor;
    cursor += bytes.length;
    objects.push(bytes);
  }

  // 1: Catalog
  pushObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  // 2: Pages
  pushObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  // 3: Page
  pushObject(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
  );
  // 4: Contents
  const contentsObjHeader = "4 0 obj\n";
  const contentsDict = `<< /Length ${contentBytes.length} >>\nstream\n`;
  const contentsFooter = "endstream\nendobj\n";
  const contentsBytes = concatBytes([
    toBytes(contentsObjHeader),
    toBytes(contentsDict),
    contentBytes,
    toBytes(contentsFooter),
  ]);
  xrefOffsets[4] = cursor;
  cursor += contentsBytes.length;
  objects.push(contentsBytes);
  // 5: Font
  pushObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xrefStart = cursor;
  const objCount = 6; // 0..5
  const xrefLines: string[] = [];
  xrefLines.push("xref");
  xrefLines.push(`0 ${objCount}`);
  xrefLines.push("0000000000 65535 f ");
  for (let i = 1; i < objCount; i++) {
    const off = xrefOffsets[i] ?? 0;
    xrefLines.push(`${off.toString().padStart(10, "0")} 00000 n `);
  }
  const trailer =
    `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  objects.push(toBytes(xrefLines.join("\n") + "\n" + trailer));
  return concatBytes(objects);
}
