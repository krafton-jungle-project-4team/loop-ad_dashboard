import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent, CardFooter, CardHeader } from "@loopad/ui/shadcn/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle
} from "@loopad/ui/shadcn/item";
import { ArrowRight, Code2, Megaphone, Sparkles } from "lucide-react";

const welcomeMilestones = [
  {
    description: "프로젝트 데이터를 연결해요.",
    icon: Code2,
    label: "SDK 연동"
  },
  {
    description: "캠페인을 만들고 첫 실험을 시작해요.",
    icon: Megaphone,
    label: "첫 캠페인 시작"
  }
] as const;

export function ProjectWelcomeScreen({
  onSkip,
  onStart
}: {
  onSkip: () => void;
  onStart: () => void;
}) {
  return (
    <section
      aria-labelledby="project-welcome-title"
      className="grid min-h-[calc(100svh-9rem)] place-items-center py-6 md:py-10"
    >
      <Card className="w-full max-w-4xl gap-8 rounded-[2rem] py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] sm:py-12">
        <CardHeader className="mx-auto w-full max-w-2xl px-6 text-center sm:px-10 lg:px-14">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-6" />
          </div>
          <p className="mt-5 text-sm font-semibold text-primary">프로젝트를 만들었어요</p>
          <h1
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            id="project-welcome-title"
          >
            이제 시작해 볼까요?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
            처음이라면 시작 가이드를 따라 SDK를 연결하고 첫 실험을 시작해 보세요.
          </p>
        </CardHeader>

        <CardContent className="px-6 sm:px-10 lg:px-14">
          <ItemGroup className="grid gap-3 md:grid-cols-2">
            {welcomeMilestones.map((milestone, index) => {
              const Icon = milestone.icon;

              return (
                <Item
                  className="min-w-0 flex-nowrap items-start rounded-2xl bg-background/70 p-4 text-left"
                  key={milestone.label}
                  role="listitem"
                  variant="outline"
                >
                  <ItemMedia
                    className="size-9 rounded-xl bg-white text-primary shadow-sm ring-1 ring-black/5"
                    variant="icon"
                  >
                    <Icon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="min-w-0">
                    <p className="text-xs font-semibold tabular-nums text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <ItemTitle className="mt-1">{milestone.label}</ItemTitle>
                    <ItemDescription className="mt-1 text-pretty leading-6">
                      {milestone.description}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </CardContent>

        <CardFooter className="flex flex-col items-stretch justify-center gap-2 border-0 bg-transparent px-6 pt-0 pb-8 sm:flex-row sm:items-center sm:px-10 sm:pb-10 lg:px-14">
          <Button className="h-11 px-5" onClick={onStart} type="button">
            가이드 따라 시작하기
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
          <Button className="h-11 px-5" onClick={onSkip} type="button" variant="outline">
            직접 시작하기
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
