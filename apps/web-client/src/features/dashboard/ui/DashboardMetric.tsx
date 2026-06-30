import { Card } from "@/components/dashboard-ui/primitives";

export function DashboardMetric({
  label,
  value,
  description
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      {description ? (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      ) : null}
    </Card>
  );
}
