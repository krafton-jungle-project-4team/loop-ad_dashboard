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
    <Card
      className="min-h-36 w-full min-w-0 justify-between rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10"
      size="sm"
    >
      <CardHeader className="gap-3 px-5">
        <CardDescription className="text-[15px] leading-snug text-muted-foreground">
          {label}
        </CardDescription>
        <CardTitle className="text-4xl font-semibold tracking-tight text-[#1d1d1f] tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="w-full min-w-0 px-5">
          <CardDescription className="text-[15px] leading-relaxed">{description}</CardDescription>
        </CardContent>
      ) : null}
    </Card>
  );
}
