import { Button } from "@loopad/ui/shadcn/button";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { cn } from "@loopad/ui/shadcn/utils";
import { Loader2, Send } from "lucide-react";
import type { FormEvent } from "react";
import { Section } from "../../dashboard/ui/Section.js";

export type ChatKitMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export function ChatKitQueryPanel({
  message,
  messages,
  onMessageChange,
  onSubmit,
  pending
}: {
  message: string;
  messages: ChatKitMessage[];
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const canSubmit = message.trim().length > 0 && !pending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <Section contentClassName="grid gap-4" title="AI 대화">
      <div className="grid max-h-[calc(100vh-260px)] min-h-[420px] content-start gap-3 overflow-auto rounded-lg border border-black/10 bg-[#f7f7f8] p-3">
        {messages.map((chatMessage) => (
          <div
            className={cn(
              "max-w-[92%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
              chatMessage.role === "user"
                ? "ml-auto bg-[#0066cc] text-white"
                : "mr-auto border border-black/10 bg-white text-[#1d1d1f]"
            )}
            key={chatMessage.id}
          >
            {chatMessage.content}
          </div>
        ))}
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="relative">
          <Textarea
            className="min-h-28 resize-none pr-14 text-sm leading-relaxed"
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="예: 최근 7일 이벤트 추이 쿼리 만들어줘"
            value={message}
          />
          <Button
            aria-label="AI에게 보내기"
            className="absolute bottom-3 right-3"
            disabled={!canSubmit}
            size="icon"
            type="submit"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </form>
    </Section>
  );
}
