/**
 * Keyword classification of raw inspection-violation text → the 19 standardized
 * categories (spec §8) + café-risk tags (spec §11.2). Heuristic stand-in for the spec's
 * "AI classification"; the original violation text is always retained alongside.
 */
import categories from "../../data/v2/violation_categories.json";

type Rule = { id: number; kw: string[] };

const RULES: Rule[] = [
  { id: 1, kw: ["cold hold", "cold-hold", "refriger", "41 f", "41°", "cold tcs", "improper cold", "potentially hazardous cold"] },
  { id: 2, kw: ["hot hold", "hot-hold", "135", "reheat", "improper hot"] },
  { id: 3, kw: ["approved source", "food source", "shellfish tag", "consumer advisory"] },
  { id: 4, kw: ["allergen", "allergy"] },
  { id: 5, kw: ["hand wash", "handwash", "hand-wash", "hand sink", "handsink", "bare hand", "glove", "employee health", "personal hygiene", "no soap", "paper towel"] },
  { id: 6, kw: ["cross contam", "cross-contam", "raw and ready", "raw food", "contaminat", "separation of"] },
  { id: 7, kw: ["sanitiz", "sanitis", "food contact surface", "wiping cloth", "clean and sanitize", "utensil clean"] },
  { id: 8, kw: ["stored on the floor", "off the floor", "improperly stored", "food storage", "uncovered", "fifo"] },
  { id: 9, kw: ["equipment", "in disrepair", "gasket", "non-food contact", "maintenance", "facility", "repair"] },
  { id: 10, kw: ["pest", "rodent", "mouse", "mice", "roach", "cockroach", "vermin", "insect", "flies", " fly", "fruit fl"] },
  { id: 11, kw: ["sewage", "plumbing", "back-flow", "backflow", "floor drain", "grease trap", "waste water", "drain "] },
  { id: 12, kw: ["chemical", "toxic", "pesticide", "cleaning agent"] },
  { id: 13, kw: ["garbage", "trash", "refuse", "dumpster", "waste receptacle"] },
  { id: 14, kw: ["food protect", "protected from contamination", "sneeze guard", "dust", "covered display"] },
  { id: 15, kw: ["permit", "license", "certified food", "food protection certificate", "food manager", "no cfpm", "records"] },
  { id: 16, kw: ["cooling", "cool down", "preparation", "cooked", "thaw", "time as a public health control", "tphc"] },
  { id: 17, kw: ["ice machine", "ice bin", "ice ", "beverage", "soda", "dispenser", "espresso", "coffee machine", "milk line", "syrup"] },
  { id: 18, kw: ["milk", "dairy", "cream", "creamer", "half and half", "refrigerated beverage"] },
];

const CAFE_RULES: { tag: string; kw: string[] }[] = [
  { tag: "ice_machine", kw: ["ice machine", "ice bin", "ice "] },
  { tag: "beverage_equipment_lines", kw: ["milk line", "syrup", "espresso", "coffee machine", "beverage", "dispenser", "soda"] },
  { tag: "blender_frother_coldbrew", kw: ["blender", "frother", "cold brew", "cold-brew"] },
  { tag: "cold_milk_temp", kw: ["milk", "cream", "creamer", "refrigerated beverage"] },
  { tag: "dairy_spoilage", kw: ["spoil", "sour milk", "expired milk", "expired dairy"] },
  { tag: "handwashing", kw: ["hand wash", "handwash", "hand sink", "handsink", "no soap", "paper towel"] },
  { tag: "pest", kw: ["pest", "rodent", "mouse", "mice", "roach", "vermin", "insect", "flies"] },
  { tag: "cross_contamination", kw: ["cross contam", "cross-contam", "raw food", "contaminat"] },
  { tag: "allergen_cross_contact", kw: ["allergen", "allergy"] },
  { tag: "date_marking", kw: ["date mark", "date-mark", "labeling", "use by", "expired"] },
  { tag: "three_comp_sink_dishwasher", kw: ["sanitiz", "dish machine", "warewash", "three comp", "3 comp", "3-comp"] },
  { tag: "light_food_heating_cold_shelf_life", kw: ["cooling", "shelf life", "cook", "reheat"] },
];

export function classify(text: string | null | undefined): {
  primary: number | null;
  all: number[];
  cafeTags: string[];
  label: string | null;
} {
  const t = (text ?? "").toLowerCase();
  if (!t.trim()) return { primary: null, all: [], cafeTags: [], label: null };
  const ids = RULES.filter((r) => r.kw.some((k) => t.includes(k))).map((r) => r.id);
  const all = ids.length ? Array.from(new Set(ids)) : [19];
  const primary = all[0];
  const cafeTags = Array.from(
    new Set(CAFE_RULES.filter((r) => r.kw.some((k) => t.includes(k))).map((r) => r.tag)),
  );
  const cat = categories.find((c) => c.id === primary);
  return { primary, all, cafeTags, label: cat ? `${cat.id} ${cat.zh}` : `${primary} 其他卫生管理问题` };
}
