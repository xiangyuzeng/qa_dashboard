/** Per-jurisdiction risk rating + static alert flagging (spec §10.1 / template Sheet6). */

const CLOSURE_RESULTS = ["Closed", "Permit Suspended", "Stop Sale"];

export type InspAssessInput = {
  jurisdiction: string | null;
  result: string | null;
  score: number | null;
  grade: string | null;
  hasCritical: boolean;
  categories: number[];
};

export type Assessment = {
  riskLevel: string;
  alertTriggered: boolean;
  alertReason: string | null;
  alertRuleIds: string[];
};

export function assessInspection(i: InspAssessInput): Assessment {
  const rules: string[] = [];
  const reasons: string[] = [];
  const r = i.result;

  if (r && CLOSURE_RESULTS.includes(r)) {
    rules.push("general.closed");
    reasons.push(`${r} (priority brand / café)`);
  }
  switch (i.jurisdiction) {
    case "New York City":
      // Grade C/Pending is the meaningful signal (Score≥28 ⟺ Grade C). A high score on an
      // ungraded interim inspection is not alerted (it gets re-inspected before grading).
      if (i.grade === "C" || i.grade === "Pending" || (i.score != null && i.score >= 28 && i.grade != null)) {
        rules.push("nyc.score");
        reasons.push(`NYC ${i.grade ? `Grade ${i.grade}` : ""}${i.score != null ? ` Score ${i.score}` : ""}`.trim());
      }
      break;
    case "Los Angeles County":
      if (i.grade === "C" || (i.score != null && i.score < 80)) {
        rules.push("la.grade");
        reasons.push(`LA County ${i.grade === "C" ? "Grade C" : `Score ${i.score} < 80`}`);
      }
      break;
    case "San Francisco":
      if (r && ["Closed", "Fail", "Conditional Pass"].includes(r)) {
        rules.push("sf.result");
        reasons.push(`SF ${r}`);
      }
      break;
    case "Boston":
    case "Cambridge":
      if (r && ["Fail", "Closed", "Permit Suspended"].includes(r)) {
        rules.push("bos.cam");
        reasons.push(`${i.jurisdiction} ${r}`);
      }
      break;
    case "Washington DC":
      if (r === "Fail") {
        rules.push("dc.fail");
        reasons.push("DC Fail / Priority Violations");
      }
      break;
    case "Florida (FDACS)":
      if (r && ["Stop Sale", "Closed", "Permit Suspended"].includes(r)) {
        rules.push("fl.fdacs");
        reasons.push(`FDACS ${r}`);
      }
      break;
    case "Newark, NJ":
      if (r === "Fail") {
        rules.push("newark");
        reasons.push("Newark Unsatisfactory/Fail");
      }
      break;
    case "Bergen County, NJ":
      if (r === "Fail") {
        rules.push("bergen");
        reasons.push("Bergen Unsatisfactory/Fail");
      }
      break;
  }

  // pest/sewage etc. are captured as café-risk tags + categories (Trends/Action), not
  // auto-alerts — keyword mentions ("fruit flies") are routine even on grade-A passes.
  void i.categories;

  const uniq = Array.from(new Set(rules));
  const alertTriggered = uniq.length > 0; // High-tier conditions = §8 inspection alert

  // Medium tier (中风险) — docx §7 per-jurisdiction Medium bands: concerning but below alert.
  const medium =
    i.grade === "B" ||
    (i.result != null && ["Conditional Pass", "Re-inspection Required"].includes(i.result)) ||
    i.hasCritical ||
    (i.jurisdiction === "New York City" && i.score != null && i.score >= 14 && i.score < 28) ||
    (i.jurisdiction === "Los Angeles County" && i.score != null && i.score >= 80 && i.score < 90);

  const riskLevel = alertTriggered ? "高风险" : medium ? "中风险" : "低风险";
  return {
    riskLevel,
    alertTriggered,
    alertReason: alertTriggered ? Array.from(new Set(reasons)).join("; ") : null,
    alertRuleIds: uniq,
  };
}

/** Module 2 — Import/Export & Border Control risk + alert (V2 §8 Import Compliance). */
export function assessImport(opts: { action: string | null; text: string }): Assessment {
  const t = opts.text.toLowerCase();
  const severe = /(import alert|refus|detention|detained|ineligible|prohibit|ban|suspend|listeria|salmonella|undeclared|forced labor|withhold release)/.test(t);
  const a = opts.action ?? "";
  const highAction = ["Import Alert", "Import Refusal", "Detention", "Eligibility Change"].includes(a);
  const alert = highAction || severe;
  const riskLevel = alert ? "高风险" : a === "Tariff/AD-CVD" || a === "Prior Notice/FSVP" ? "中风险" : a === "Monitoring Baseline" ? "信息参考" : "低风险";
  return {
    riskLevel,
    alertTriggered: alert,
    alertReason: alert ? `import-compliance: ${a || "restriction"}` : null,
    alertRuleIds: alert ? ["import.alert"] : [],
  };
}

/** Module 3 — State/Local Regulation risk + alert (V2 §8: passed + effective ≤90d applies to our entities). */
export function assessRegulation(opts: {
  status: string | null;
  effectiveDate: string | null;
  today: string;
}): Assessment {
  const daysTo =
    opts.effectiveDate != null
      ? Math.round((Date.parse(opts.effectiveDate) - Date.parse(opts.today)) / 86400000)
      : null;
  const isLaw = ["Passed", "In effect", "Pending effective"].includes(opts.status ?? "");
  // Imminent compliance: passed/effective and within 90 days (future) or recently in effect.
  const imminent = isLaw && daysTo != null && daysTo <= 90 && daysTo >= -120;
  if (imminent) {
    return {
      riskLevel: "高风险",
      alertTriggered: true,
      alertReason: `compliance deadline: effective in ${daysTo} day(s)`,
      alertRuleIds: ["reg.compliance"],
    };
  }
  if (isLaw) return { riskLevel: "中风险", alertTriggered: false, alertReason: null, alertRuleIds: [] };
  if (opts.status === "Proposed") return { riskLevel: "关注", alertTriggered: false, alertReason: null, alertRuleIds: [] };
  if (opts.status === "Repealed") return { riskLevel: "信息参考", alertTriggered: false, alertReason: null, alertRuleIds: [] };
  return { riskLevel: "低风险", alertTriggered: false, alertReason: null, alertRuleIds: [] };
}

/** Regulatory / recall risk (federal feed). */
export function assessRegulatory(opts: {
  category: string;
  text: string;
  classification?: string | null;
  illnesses?: number | null;
}): Assessment {
  const t = opts.text.toLowerCase();
  const severe = /(listeria|e\. ?coli|salmonella|botulism|class i\b|undeclared|allergen|death|hospitaliz)/.test(t);
  const rules: string[] = [];
  let risk = "信息参考";

  if (opts.category === "召回事件") {
    risk = severe ? "高风险" : "中风险";
    if (severe) rules.push("general.closed");
  } else if (opts.category === "食品安全事件") {
    risk = (opts.illnesses ?? 0) >= 10 || severe ? "高风险" : "中风险";
    rules.push("hazard.major");
  } else if (opts.category === "监管动态") {
    risk = severe ? "中风险" : "低风险";
  } else if (opts.category === "法规标准" || opts.category === "标签/广告宣称风险") {
    risk = "信息参考";
  } else {
    risk = severe ? "中风险" : "低风险";
  }

  return {
    riskLevel: risk,
    alertTriggered: rules.length > 0,
    alertReason: rules.length ? "high-severity recall/outbreak touching monitored categories" : null,
    alertRuleIds: Array.from(new Set(rules)),
  };
}
