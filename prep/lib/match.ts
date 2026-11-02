/** Brand-alias matching + café/beverage keyword filter (spec §4.1, §7.1, §7.2). */
import brandsJson from "../../data/v2/brands.json";

const BRANDS = brandsJson.brands.filter((b) => b.standard !== "其他 Other");
const CAFE_KW = brandsJson.cafeKeywords.map((k) => k.toUpperCase());

// Aliases match as whole words: a bare substring test made "PRET" hit pretzel shops and "LUCKIN" hit
// "THE KLUCKIN CHICKEN" (which would then be typed as our own store). "STARBUCKS COFFEE#68256",
// "DUNKIN DONUTS/BASKIN ROBBINS" and "HALE FAMILY MCDONALD'S" still match.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALIAS_RES = BRANDS.map((b) => ({
  standard: b.standard,
  res: b.aliases.map((a) => new RegExp(`(?:^|[^A-Z0-9])${escapeRe(a.toUpperCase())}(?=$|[^A-Z0-9])`)),
}));

/** Returns a standardized priority brand if the name matches an alias, else null. */
export function matchBrand(name: string | null | undefined): string | null {
  const u = (name ?? "").toUpperCase();
  if (!u) return null;
  for (const b of ALIAS_RES) {
    if (b.res.some((re) => re.test(u))) return b.standard;
  }
  return null;
}

export const brandOrOther = (name: string | null | undefined): string =>
  matchBrand(name) ?? "其他 Other";

/** True if the establishment name reads like a café / coffee / beverage shop. */
export function isCafe(name: string | null | undefined): boolean {
  const u = (name ?? "").toUpperCase();
  return CAFE_KW.some((k) => u.includes(k));
}

/** Inclusion filter for local inspection scope: priority brand OR café/beverage keyword. */
export function inScope(name: string | null | undefined): boolean {
  return matchBrand(name) !== null || isCafe(name);
}

/** Map an establishment to a template Establishment Type enum (best-effort). */
export function establishmentType(name: string | null | undefined): string {
  const b = matchBrand(name);
  if (b === "Luckin Coffee") return "甲方门店 Owned Store";
  if (b === "McDonald's") return "快餐竞品 QSR Competitor";
  if (b === "Starbucks" || b === "Dunkin") return "咖啡连锁 Coffee Chain";
  if (b === "Blue Bottle Coffee") return "咖啡馆 Coffee Shop";
  if (b === "Pret A Manger") return "轻食咖啡 Café w/ Food";
  const u = (name ?? "").toUpperCase();
  if (/(BOBA|BUBBLE TEA|TEA SHOP)/.test(u)) return "奶茶/果汁/Smoothie";
  if (/(JUICE|SMOOTHIE)/.test(u)) return "奶茶/果汁/Smoothie";
  if (/(BAKERY)/.test(u)) return "烘焙咖啡 Bakery Café";
  if (/(ROASTERY|ESPRESSO|COFFEE|CAFE|CAFÉ)/.test(u)) return "咖啡馆 Coffee Shop";
  return "饮品店 Beverage Shop";
}
