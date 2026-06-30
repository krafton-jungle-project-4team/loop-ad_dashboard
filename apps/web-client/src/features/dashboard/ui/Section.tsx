import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@loopad/ui/shadcn/card";
import type { ReactNode } from "react";

export function Section({
  title,
  children,
  action,
  contentClassName,
  description
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  contentClassName?: string;
  description?: string;
}) {
  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={`w-full min-w-0 ${contentClassName ?? ""}`}>{children}</CardContent>
    </Card>
  );
}
