import { randomUUID } from "node:crypto";
import {
  DataExplorerAiChatCurrentResultSchema,
  type DataExplorerAiChatResponse
} from "@loopad/shared";
import { z } from "zod";

export type ChatKitResult =
  | {
      body: unknown;
      kind: "json";
      statusCode?: number;
    }
  | {
      events: AsyncIterable<ChatKitStreamEvent>;
      kind: "stream";
    };

export type ChatKitThread = {
  id: string;
  title: string | null;
  created_at: string;
  status: {
    type: "active";
  };
  metadata: {
    project_id: string;
  };
  items: ChatKitThreadItem[];
};

export type ChatKitThreadItem = ChatKitUserMessageItem | ChatKitAssistantMessageItem;

export type ChatKitUserMessageItem = {
  id: string;
  thread_id: string;
  created_at: string;
  type: "user_message";
  content: ChatKitUserContent[];
  attachments: [];
  quoted_text: string | null;
  inference_options: Record<string, unknown>;
};

export type ChatKitAssistantMessageItem = {
  id: string;
  thread_id: string;
  created_at: string;
  type: "assistant_message";
  content: [
    {
      annotations: [];
      text: string;
      type: "output_text";
    }
  ];
};

export type ChatKitStreamEvent =
  | {
      stream_options: {
        allow_cancel: boolean;
      };
      type: "stream_options";
    }
  | {
      thread: ReturnType<typeof toThreadResponse>;
      type: "thread.created";
    }
  | {
      item: ChatKitThreadItem;
      type: "thread.item.done";
    }
  | {
      code: "custom";
      allow_retry: boolean;
      message: string;
      type: "error";
    }
  | {
      data: Record<string, unknown>;
      name: "data_explorer_query_plan" | "data_explorer_query_run";
      type: "client_effect";
    };

const ChatKitMetadataSchema = z
  .object({
    project_id: z.string().trim().min(1).optional(),
    current_result: DataExplorerAiChatCurrentResultSchema.optional()
  })
  .passthrough()
  .default({});

const ChatKitUserContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input_text"),
    text: z.string()
  }),
  z.object({
    type: z.literal("input_tag"),
    id: z.string(),
    text: z.string(),
    data: z.record(z.string(), z.unknown()).default({}),
    group: z.string().nullable().optional(),
    interactive: z.boolean().optional()
  })
]);

type ChatKitUserContent = z.infer<typeof ChatKitUserContentSchema>;

const ChatKitUserMessageInputSchema = z.object({
  content: z.array(ChatKitUserContentSchema),
  attachments: z.array(z.string()).default([]),
  quoted_text: z.string().nullable().optional(),
  inference_options: z.record(z.string(), z.unknown()).default({})
});

const ChatKitPageParamsSchema = z.object({
  limit: z.number().int().positive().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  after: z.string().nullable().optional()
});

const ChatKitRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("threads.create"),
    params: z.object({ input: ChatKitUserMessageInputSchema }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.add_user_message"),
    params: z.object({
      thread_id: z.string().min(1),
      input: ChatKitUserMessageInputSchema
    }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.retry_after_item"),
    params: z.object({
      thread_id: z.string().min(1),
      item_id: z.string().min(1)
    }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.get_by_id"),
    params: z.object({ thread_id: z.string().min(1) }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.list"),
    params: ChatKitPageParamsSchema,
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("items.list"),
    params: ChatKitPageParamsSchema.extend({ thread_id: z.string().min(1) }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.update"),
    params: z.object({
      thread_id: z.string().min(1),
      title: z.string()
    }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.delete"),
    params: z.object({ thread_id: z.string().min(1) }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("items.feedback"),
    params: z.object({
      thread_id: z.string().min(1),
      item_ids: z.array(z.string()),
      kind: z.string()
    }),
    metadata: ChatKitMetadataSchema
  })
]);

export type ChatKitRequest = z.infer<typeof ChatKitRequestSchema>;
export type ChatKitStreamingRequest = Extract<
  ChatKitRequest,
  {
    type: "threads.add_user_message" | "threads.create" | "threads.retry_after_item";
  }
>;

export function parseChatKitRequest(body: unknown) {
  return ChatKitRequestSchema.safeParse(body);
}

export function isStreamingRequest(request: ChatKitRequest): request is ChatKitStreamingRequest {
  return (
    request.type === "threads.create" ||
    request.type === "threads.add_user_message" ||
    request.type === "threads.retry_after_item"
  );
}

export function readChatKitThreadId(request: ChatKitRequest): string | undefined {
  return "thread_id" in request.params ? request.params.thread_id : undefined;
}

export function getProjectId(request: Extract<ChatKitRequest, { type: "threads.create" }>) {
  if (!request.metadata.project_id) {
    throw new Error("project_id가 필요합니다.");
  }

  return request.metadata.project_id;
}

export function createThread(projectId: string): ChatKitThread {
  return {
    created_at: new Date().toISOString(),
    id: createId("thr"),
    items: [],
    metadata: { project_id: projectId },
    status: { type: "active" },
    title: null
  };
}

export function createUserMessage(
  threadId: string,
  input: z.infer<typeof ChatKitUserMessageInputSchema>
): ChatKitUserMessageItem {
  return {
    attachments: [],
    content: input.content,
    created_at: new Date().toISOString(),
    id: createId("msg"),
    inference_options: input.inference_options,
    quoted_text: input.quoted_text ?? null,
    thread_id: threadId,
    type: "user_message"
  };
}

export function createAssistantMessage(
  threadId: string,
  text: string
): ChatKitAssistantMessageItem {
  return {
    content: [{ annotations: [], text, type: "output_text" }],
    created_at: new Date().toISOString(),
    id: createId("msg"),
    thread_id: threadId,
    type: "assistant_message"
  };
}

export function userMessageText(item: ChatKitUserMessageItem) {
  return item.content
    .map((content) => content.text)
    .join(" ")
    .trim();
}

export function toThreadResponse(thread: ChatKitThread) {
  return {
    allowed_image_domains: null,
    created_at: thread.created_at,
    id: thread.id,
    items: pageItems(thread.items, { order: "asc" }),
    status: thread.status,
    title: thread.title
  };
}

export function pageItems<T extends { id: string }>(
  items: T[],
  input: {
    after?: null | string;
    limit?: number;
    order?: "asc" | "desc";
  }
) {
  const orderedItems = input.order === "desc" ? [...items].reverse() : [...items];
  const start = input.after ? orderedItems.findIndex((item) => item.id === input.after) + 1 : 0;
  const limit = input.limit ?? 20;
  const data = orderedItems.slice(Math.max(start, 0), Math.max(start, 0) + limit);

  return {
    after: data.at(-1)?.id ?? null,
    data,
    has_more: Math.max(start, 0) + limit < orderedItems.length
  };
}

export function toQueryRunEffect(response: DataExplorerAiChatResponse): Record<string, unknown> {
  return {
    action: response.action,
    query_plan: response.query_plan,
    query_result: response.query_result
  };
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
