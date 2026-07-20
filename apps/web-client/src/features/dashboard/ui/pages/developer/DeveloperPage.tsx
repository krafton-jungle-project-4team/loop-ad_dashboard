import { Button } from "@loopad/ui/shadcn/button";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Code2 } from "lucide-react";
import { AdvertisementSdkGuide } from "../sdk/SdkPage.js";
import { DeveloperWorkspace } from "../sdk/TrackingPlanWorkspace.js";

export function DeveloperPage({ projectId }: { projectId: string }) {
  return (
    <main className="min-h-svh bg-muted/20 text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Code2 aria-hidden="true" className="size-5" />
            </span>
            <div className="grid leading-tight">
              <strong className="text-sm">LoopAd Developer</strong>
              <span className="text-xs text-muted-foreground">SDK integration workspace</span>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link params={{ projectId, tabPath: "sdk" }} to="/dashboard/$projectId/$tabPath">
              <ArrowLeft aria-hidden="true" />
              이벤트 관리로 돌아가기
            </Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8">
        <DeveloperWorkspace advertisementGuide={<AdvertisementSdkGuide />} projectId={projectId} />
      </div>
    </main>
  );
}
