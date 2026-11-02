/**
 * Bulk-file readers for collectors whose source is a download, not an API (LA County CSV, Southern
 * Nevada nightly ZIP). Dependency-free on purpose: a minimal ZIP reader over node:zlib and a CSV parser.
 */
import { inflateRawSync } from "node:zlib";

/**
 * Extract entries from a ZIP archive held in memory (stored or deflated; no ZIP64 / encryption —
 * enough for the public data ZIPs we read). `wanted` filters by entry name before inflating.
 */
export function unzip(buf: Buffer, wanted?: (name: string) => boolean): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: end-of-central-directory record not found");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip: bad central-directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compressed = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (wanted && !wanted(name)) continue;
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`zip: bad local header for ${name}`);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + compressed);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`zip: unsupported compression method ${method} for ${name}`);
  }
  return out;
}

/**
 * Parse delimited text (RFC 4180 quoting) into rows. Lenient like Python's csv module: a field that
 * opens with a quote is read to the closing quote and any text after it is kept ("\"A\" Grade" →
 * "A Grade", as SNHD writes it). Handles \n and \r\n, and newlines inside quoted fields.
 */
export function parseDelimited(text: string, delim = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    let field = "";
    if (text[i] === '"') {
      i++;
      for (;;) {
        const q = text.indexOf('"', i);
        if (q < 0) {
          field += text.slice(i);
          i = n;
          break;
        }
        field += text.slice(i, q);
        if (text[q + 1] === '"') {
          field += '"';
          i = q + 2;
        } else {
          i = q + 1;
          break;
        }
      }
    }
    // unquoted run (or the tail after a closing quote) up to the next delimiter / line end
    let j = i;
    while (j < n && text[j] !== delim && text[j] !== "\n" && text[j] !== "\r") j++;
    field += text.slice(i, j);
    row.push(field);
    i = j;
    if (i >= n) break;
    if (text[i] === delim) {
      i++;
      if (i >= n) row.push("");
      continue;
    }
    // line end
    if (text[i] === "\r" && text[i + 1] === "\n") i++;
    i++;
    rows.push(row);
    row = [];
  }
  if (row.length) rows.push(row);
  return rows;
}

/** First row = header (trimmed); returns one object per data row, skipping blank lines. */
export function toObjects(rows: string[][]): Record<string, string>[] {
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body
    .filter((r) => r.length > 1 || (r[0] ?? "") !== "")
    .map((r) => Object.fromEntries(keys.map((k, idx) => [k, r[idx] ?? ""])));
}
