import { Button } from "@loopad/ui/shadcn/button";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import { Textarea } from "@loopad/ui/shadcn/textarea";
import { cn } from "@loopad/ui/shadcn/utils";
import { Loader2, Send } from "lucide-react";
import type { FormEvent } from "react";

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
    <aside className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-white">
      <div className="border-b border-black/10 bg-white px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-[#111827]">AI Assistant</h2>
      </div>

      <ScrollArea className="h-full min-h-0 bg-[#fafafc]">
        <div className="grid content-start gap-3 p-3">
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
      </ScrollArea>

      <form className="border-t border-black/10 bg-white p-3" onSubmit={handleSubmit}>
        <div className="relative">
          <Textarea
            className="h-24 resize-none pr-14 text-sm leading-relaxed"
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
    </aside>
  );
}
