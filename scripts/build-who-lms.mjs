import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "src/data/who-raw");

function parseWho(file, { ageUnit, step = 1 }) {
  const text = readFileSync(join(rawDir, file), "utf8");
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[0] === "sex") continue;
    const sex = Number(parts[0]);
    const age = Number(parts[1]);
    const l = Number(parts[2]);
    const m = Number(parts[3]);
    const s = Number(parts[4]);
    if (![1, 2].includes(sex) || ![age, l, m, s].every(Number.isFinite)) continue;
    const ageDays = ageUnit === "months" ? Math.round((age * 365.25) / 12) : age;
    if (ageUnit === "days" && age % step !== 0) continue;
    rows.push({ sex: sex === 1 ? "M" : "F", ageDays, l, m, s });
  }
  return rows;
}

function toSeries(rows) {
  const series = { M: { ages: [], l: [], m: [], s: [] }, F: { ages: [], l: [], m: [], s: [] } };
  for (const sex of ["M", "F"]) {
    const sorted = rows
      .filter((row) => row.sex === sex)
      .sort((a, b) => a.ageDays - b.ageDays);
    const seen = new Set();
    for (const row of sorted) {
      if (seen.has(row.ageDays)) continue;
      seen.add(row.ageDays);
      series[sex].ages.push(row.ageDays);
      series[sex].l.push(Number(row.l.toFixed(5)));
      series[sex].m.push(Number(row.m.toFixed(4)));
      series[sex].s.push(Number(row.s.toFixed(5)));
    }
  }
  return series;
}

function merge(early, late, lateFromDays) {
  return toSeries([
    ...early,
    ...late.filter((row) => row.ageDays >= lateFromDays),
  ]);
}

const under5Days = 1856;
const from5y = Math.round((61 * 365.25) / 12);

const whoLms = {
  weight: merge(parseWho("weianthro.txt", { ageUnit: "days", step: 15 }), parseWho("wfawho2007.txt", { ageUnit: "months" }), from5y),
  height: merge(parseWho("lenanthro.txt", { ageUnit: "days", step: 15 }), parseWho("hfawho2007.txt", { ageUnit: "months" }), from5y),
  bmi: merge(parseWho("bmianthro.txt", { ageUnit: "days", step: 15 }), parseWho("bfawho2007.txt", { ageUnit: "months" }), from5y),
  hc: toSeries(parseWho("hcanthro.txt", { ageUnit: "days", step: 15 }).filter((row) => row.ageDays <= under5Days)),
};

const outFile = join(root, "src/data/whoLms.ts");
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `export type LmsSeries = {\n  ages: number[];\n  l: number[];\n  m: number[];\n  s: number[];\n};\n\nexport type WhoLms = {\n  weight: { M: LmsSeries; F: LmsSeries };\n  height: { M: LmsSeries; F: LmsSeries };\n  bmi: { M: LmsSeries; F: LmsSeries };\n  hc: { M: LmsSeries; F: LmsSeries };\n};\n\nexport const whoLms: WhoLms = ${JSON.stringify(whoLms, null, 2)};\n`,
);

for (const [key, value] of Object.entries(whoLms)) {
  console.log(key, "M", value.M.ages.length, "F", value.F.ages.length, "maxDays", value.M.ages.at(-1));
}
