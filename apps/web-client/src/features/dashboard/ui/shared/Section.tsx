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
    <Card className="w-full min-w-0 bg-card py-5 shadow-none">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
        ) : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={`w-full min-w-0 px-5 ${contentClassName ?? ""}`}>
        {children}
      </CardContent>
    </Card>
  );
}
