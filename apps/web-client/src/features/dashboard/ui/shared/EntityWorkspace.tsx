import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent } from "@loopad/ui/shadcn/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from "@loopad/ui/shadcn/empty";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export type EntityWorkspaceGuideCard = {
  icon: ReactNode;
  title: string;
  value: string;
};

export function EntityWorkspaceShell({
  children,
  chrome
}: {
  children: ReactNode;
  chrome?: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden bg-card py-0">
      {chrome}
      <CardContent className="grid gap-6 px-6 py-6">{children}</CardContent>
    </Card>
  );
}

export function EntityWorkspaceEmptyState({
  actionLabel,
  description,
  guideCards,
  onAction,
  title
}: {
  actionLabel: string;
  description: string;
  guideCards: EntityWorkspaceGuideCard[];
  onAction: () => void;
  title: string;
}) {
  return (
    <section className="grid min-h-[620px] content-between gap-8">
      <Empty className="pt-14">
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button className="gap-2 px-8" onClick={onAction} type="button">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {actionLabel}
          </Button>
        </EmptyContent>
      </Empty>
      <div className="grid gap-4 md:grid-cols-3">
        {guideCards.map((card) => (
          <Card className="bg-muted/45" key={card.title}>
            <CardContent className="grid gap-4">
              <div className="text-primary">{card.icon}</div>
              <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
