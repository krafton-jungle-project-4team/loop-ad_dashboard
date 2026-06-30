import type { DashboardAiGeneration } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { EmptyState } from "./EmptyState.js";
import { Section } from "./Section.js";

export function AiGenerationPanel({ data }: { data: DashboardAiGeneration }) {
  return (
    <div className="grid gap-6">
      <Section
        action={data.selected_customer ? <Badge variant="secondary">{data.selected_customer.channel}</Badge> : null}
        title="선택 고객군"
      >
        {data.selected_customer ? (
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold">{data.selected_customer.customer_group_name}</h2>
            <p className="text-sm text-muted-foreground">
              {data.selected_customer.age_group} ·{" "}
              {data.selected_customer.gender} · {data.selected_customer.category} ·{" "}
              {data.selected_customer.region} · {data.selected_customer.device}
            </p>
          </div>
        ) : (
          <EmptyState message="선택된 고객군이 없습니다." />
        )}
      </Section>

      <Section
        action={<Badge variant="outline">{data.generated_items.length}개</Badge>}
        title="생성 콘텐츠"
      >
        {data.generated_items.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {data.generated_items.map((item) => (
              <article className="grid min-w-0 gap-4 rounded-lg border p-4" key={item.action.action_id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{item.action.title}</h3>
                  <Badge variant="secondary">{item.content?.status ?? "콘텐츠 미생성"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.action.description}</p>
                {item.content ? (
                  <div className="grid gap-4">
                    <Badge className="w-fit" variant="outline">
                      {item.content.content_type}
                    </Badge>
                    {item.content.message ? <p className="text-sm">{item.content.message}</p> : null}
                    {item.content.content_url ? (
                      item.content.content_type === "image" ? (
                        <img
                          alt={item.content.title}
                          className="aspect-video w-full rounded-md border object-cover"
                          src={item.content.content_url}
                        />
                      ) : (
                        <a
                          className="truncate text-sm text-primary underline-offset-4 hover:underline"
                          href={item.content.content_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {item.content.content_url}
                        </a>
                      )
                    ) : (
                      <Badge className="w-fit" variant="secondary">
                        content_url 없음
                      </Badge>
                    )}
                  </div>
                ) : (
                  <EmptyState message="콘텐츠 미생성" />
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState message="저장된 생성 콘텐츠가 없습니다." />
        )}
      </Section>
    </div>
  );
}
