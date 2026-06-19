/** Bilingual labels for the café-specific risk tags (spec §11.2). */
import type { Locale } from "./i18n/messages";

export const CAFE_RISK_LABELS: Record<string, { zh: string; en: string }> = {
  cold_milk_temp: { zh: "冷藏牛奶温度", en: "Cold milk temperature" },
  opened_shelf_life: { zh: "开封后保存时间", en: "Opened shelf-life" },
  dairy_spoilage: { zh: "奶基原料变质", en: "Dairy spoilage" },
  ice_machine: { zh: "冰机清洁", en: "Ice machine cleaning" },
  beverage_equipment_lines: { zh: "饮品设备/奶管/糖浆管路", en: "Beverage equipment & lines" },
  blender_frother_coldbrew: { zh: "搅拌机/奶泡机/冷萃桶", en: "Blender / frother / cold-brew" },
  cross_contamination: { zh: "交叉污染", en: "Cross-contamination" },
  handwashing: { zh: "员工洗手", en: "Handwashing" },
  three_comp_sink_dishwasher: { zh: "三槽水池/洗碗机", en: "3-comp sink / dishwasher" },
  pest: { zh: "虫害控制", en: "Pest control" },
  light_food_heating_cold_shelf_life: { zh: "轻食加热/冷藏/保质期", en: "Light-food heating / cold / shelf-life" },
  allergen_cross_contact: { zh: "过敏原交叉接触", en: "Allergen cross-contact" },
  date_marking: { zh: "标签和日期标识", en: "Date marking" },
};

export const cafeRiskLabel = (tag: string, locale: Locale) =>
  locale === "zh"
    ? (CAFE_RISK_LABELS[tag]?.zh ?? tag)
    : (CAFE_RISK_LABELS[tag]?.en ?? tag);
