import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@loopad/ui/shadcn/card";

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
    <Card className="w-full min-w-0" size="sm">
      <CardHeader className="gap-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="w-full min-w-0">
          <CardDescription>{description}</CardDescription>
        </CardContent>
      ) : null}
    </Card>
  );
}
