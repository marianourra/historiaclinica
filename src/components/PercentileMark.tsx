import { formatPercentile, isExtremePercentile, type VitalAssessment } from "../lib/percentiles";

export function PercentileMark({ value }: { value: VitalAssessment | null | undefined }) {
  const label = formatPercentile(value);
  if (!label || !value) return null;
  return (
    <span
      className={`whitespace-nowrap text-xs font-semibold ${
        isExtremePercentile(value.percentile) ? "text-danger" : "text-teal"
      }`}
    >
      {label}
    </span>
  );
}
