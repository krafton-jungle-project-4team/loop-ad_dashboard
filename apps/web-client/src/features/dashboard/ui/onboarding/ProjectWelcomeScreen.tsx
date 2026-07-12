import { Button } from "@loopad/ui/shadcn/button";
import { ArrowRight, Code2, Megaphone, Sparkles } from "lucide-react";

const welcomeMilestones = [
  {
    description: "프로젝트에 데이터를 연결할 준비를 합니다.",
    icon: Code2,
    label: "SDK 연동"
  },
  {
    description: "캠페인을 만들고 첫 실험 실행까지 이어갑니다.",
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
      <div className="w-full max-w-4xl rounded-[2rem] border border-black/10 bg-card px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] sm:px-10 sm:py-12 lg:px-14">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="size-6" />
          </div>
          <p className="mt-5 text-sm font-semibold text-primary">프로젝트 생성 완료</p>
          <h1
            className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            id="project-welcome-title"
          >
            새 프로젝트가 준비됐어요
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
            LoopAd가 처음이시라면 어디서부터 시작할지 고민하지 마세요. SDK 연동부터 첫 실험까지
            필요한 순서대로 안내해드릴게요.
          </p>
        </div>

        <ol className="mt-8 grid gap-3 md:grid-cols-2">
          {welcomeMilestones.map((milestone, index) => {
            const Icon = milestone.icon;

            return (
              <li
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-black/10 bg-background/70 p-4 text-left"
                key={milestone.label}
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-black/5">
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tabular-nums text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-foreground">{milestone.label}</h2>
                  <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <Button className="h-11 px-5" onClick={onStart} type="button">
            시작 가이드 보기
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
          <Button className="h-11 px-5" onClick={onSkip} type="button" variant="outline">
            건너뛰고 바로 시작
          </Button>
        </div>
      </div>
    </section>
  );
}
