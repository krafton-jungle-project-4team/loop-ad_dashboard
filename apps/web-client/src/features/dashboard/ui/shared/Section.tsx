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
    <Card className="w-full min-w-0 rounded-[18px] bg-white py-5 shadow-none ring-1 ring-black/10">
      <CardHeader className="gap-1.5 px-5">
        <CardTitle className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
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
