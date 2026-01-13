export type SimplePdfOptions = {
  title: string;
  subtitle?: string;
  bodyLines: string[];
  footerNote?: string;
  imageJpegBytes?: Uint8Array | null;
};

function normalizeForPdf(text: string): string {
  const s = (text || "").toString();
  // Remove diacritics (NFKD) so we stay within WinAnsi-ish range without external fonts.
  let out = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // Replace common Unicode punctuation with ASCII equivalents.
  out = out
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212\u2010\u2011]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u2022/g, "-");
  // Replace any remaining non-printable / non-ASCII with spaces.
  out = out.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
  // Normalize whitespace.
  out = out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

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
  return normalizeForPdf(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/\n/g, " ");
}

function wrapText(text: string, maxChars: number): string[] {
  const clean = normalizeForPdf(text).replace(/\s+/g, " ").trim();
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
  // Latin-1-ish bytes; we keep content ASCII after normalization.
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out[i] = c <= 255 ? c : 63;
  }
  return out;
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

function parseJpegSize(bytes: Uint8Array): { width: number; height: number; colorSpace: "DeviceRGB" | "DeviceGray" } | null {
  if (bytes.length < 4) return null;
  // SOI
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 1 < bytes.length) {
    // Find next marker (0xFF ...)
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    // Skip fill bytes 0xFF
    while (i < bytes.length && bytes[i] === 0xff) i++;
    if (i >= bytes.length) break;
    const marker = bytes[i];
    i++;

    // Markers without length
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    if (i + 1 >= bytes.length) break;
    const len = (bytes[i] << 8) | bytes[i + 1];
    if (len < 2 || i + len > bytes.length) break;
    const segStart = i + 2;

    // SOF markers (baseline/progressive/etc.)
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;
    if (isSof) {
      if (segStart + 6 > bytes.length) return null;
      // segStart+0 = precision
      const height = (bytes[segStart + 1] << 8) | bytes[segStart + 2];
      const width = (bytes[segStart + 3] << 8) | bytes[segStart + 4];
      const components = bytes[segStart + 5];
      const colorSpace = components === 1 ? "DeviceGray" : "DeviceRGB";
      if (!width || !height) return null;
      return { width, height, colorSpace };
    }

    i += len;
  }
  return null;
}

export function buildSimplePdfBytes(opts: SimplePdfOptions): Uint8Array {
  const title = (opts.title || "").trim().toUpperCase() || "HOUSE RULES";
  const subtitle = (opts.subtitle || "").trim().toUpperCase();
  const footerNote = (opts.footerNote || "").trim();
  const imageJpegBytes = opts.imageJpegBytes || null;
  const imageInfo = imageJpegBytes ? parseJpegSize(imageJpegBytes) : null;

  const body: string[] = [];
  for (const line of opts.bodyLines || []) {
    const parts = line.split("\n");
    for (const p of parts) {
      body.push(...wrapText(p, 80));
    }
  }

  const contentLines: string[] = [];
  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN_X = 72;
  const TITLE_FS = 30;
  const SUB_FS = 13;
  const BODY_FS = 12;
  const FOOT_FS = 9;
  const yTitle = 758;
  const xTitle = centerX(title, TITLE_FS, PAGE_W);
  contentLines.push("BT");
  contentLines.push(`/F1 ${TITLE_FS} Tf`);
  contentLines.push(`1 0 0 1 ${xTitle.toFixed(2)} ${yTitle.toFixed(2)} Tm`);
  contentLines.push(`(${escapePdfText(title)}) Tj`);
  contentLines.push("ET");

  // Underline (teal-ish) under the title
  {
    const lineW = Math.min(260, estimateHelveticaWidth(title, TITLE_FS) + 12);
    const x1 = (PAGE_W - lineW) / 2;
    const y = yTitle - 10;
    contentLines.push("0.09 0.72 0.60 RG");
    contentLines.push("2 w");
    contentLines.push(`${x1.toFixed(2)} ${y.toFixed(2)} m ${(x1 + lineW).toFixed(2)} ${y.toFixed(2)} l S`);
    contentLines.push("0 0 0 RG");
  }

  if (subtitle) {
    const xSub = centerX(subtitle, SUB_FS, PAGE_W);
    contentLines.push("BT");
    contentLines.push(`/F1 ${SUB_FS} Tf`);
    contentLines.push(`1 0 0 1 ${xSub.toFixed(2)} ${(yTitle - 24).toFixed(2)} Tm`);
    // letter spacing approximation via extra spaces (keeps generator simple)
    contentLines.push(`(${escapePdfText(subtitle)}) Tj`);
    contentLines.push("ET");
  }

  // Optional property photo (JPEG), centered under the subtitle.
  let yBodyStart = 700;
  if (imageJpegBytes && imageInfo) {
    const maxW = PAGE_W - MARGIN_X * 2;
    const maxH = 170;
    let drawW = Math.min(420, maxW);
    let drawH = (drawW * imageInfo.height) / imageInfo.width;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = (drawH * imageInfo.width) / imageInfo.height;
    }
    const x = (PAGE_W - drawW) / 2;
    const yTop = subtitle ? yTitle - 42 : yTitle - 24;
    const y = yTop - drawH - 10;

    // Draw image XObject.
    contentLines.push("q");
    contentLines.push(`${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`);
    contentLines.push("/Im1 Do");
    contentLines.push("Q");

    yBodyStart = Math.min(700, y - 24);
  }

  // Body text
  contentLines.push("BT");
  contentLines.push(`/F1 ${BODY_FS} Tf`);
  contentLines.push(`1 0 0 1 ${MARGIN_X} ${yBodyStart.toFixed(2)} Tm`);
  for (const line of body) {
    contentLines.push(`(${escapePdfText(line)}) Tj`);
    contentLines.push("0 -16 Td");
  }
  contentLines.push("ET");

  // Footer note (small, grey)
  if (footerNote) {
    const footLines = wrapText(footerNote, 80);
    const yFoot = 48 + (Math.max(0, footLines.length - 1) * 10);
    contentLines.push("BT");
    contentLines.push("0.35 g");
    contentLines.push(`/F1 ${FOOT_FS} Tf`);
    if (footLines.length === 0) {
      const xFoot = centerX(footerNote, FOOT_FS, PAGE_W);
      contentLines.push(`1 0 0 1 ${xFoot.toFixed(2)} ${yFoot.toFixed(2)} Tm`);
      contentLines.push(`(${escapePdfText(footerNote)}) Tj`);
    } else {
      for (let i = 0; i < footLines.length; i++) {
        const line = footLines[i];
        const xFoot = centerX(line, FOOT_FS, PAGE_W);
        const y = yFoot - i * 10;
        contentLines.push(`1 0 0 1 ${xFoot.toFixed(2)} ${y.toFixed(2)} Tm`);
        contentLines.push(`(${escapePdfText(line)}) Tj`);
      }
    }
    contentLines.push("0 g");
    contentLines.push("ET");
  }

  const contentStream = contentLines.join("\n") + "\n";
  const contentBytes = toBytes(contentStream);

  const objects: Uint8Array[] = [];
  objects.push(toBytes("%PDF-1.4\n"));
  objects.push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const xrefOffsets: number[] = [];
  let cursor = objects[0].length + objects[1].length;

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
  const pageResourcesParts: string[] = [];
  pageResourcesParts.push("/Font << /F1 5 0 R >>");
  if (imageJpegBytes && imageInfo) {
    pageResourcesParts.push("/XObject << /Im1 6 0 R >>");
  }
  pushObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << ${pageResourcesParts.join(" ")} >> /Contents 4 0 R >>`);
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

  // 6: Image XObject (optional)
  if (imageJpegBytes && imageInfo) {
    const header = "6 0 obj\n";
    const dict = `<< /Type /XObject /Subtype /Image /Width ${imageInfo.width} /Height ${imageInfo.height} /ColorSpace /${imageInfo.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageJpegBytes.length} >>\nstream\n`;
    const footer = "\nendstream\nendobj\n";
    const bytes = concatBytes([toBytes(header), toBytes(dict), imageJpegBytes, toBytes(footer)]);
    xrefOffsets[6] = cursor;
    cursor += bytes.length;
    objects.push(bytes);
  }

  const xrefStart = cursor;
  const objCount = imageJpegBytes && imageInfo ? 7 : 6; // 0..5 (+6 if image)
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
