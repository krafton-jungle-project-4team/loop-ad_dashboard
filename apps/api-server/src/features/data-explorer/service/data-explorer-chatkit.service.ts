import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  DataExplorerAiChatCurrentResultSchema,
  type DataExplorerAiChatResponse
} from "@loopad/shared";
import { z } from "zod";
import { DataExplorerService } from "./data-explorer.service.js";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";

type ChatKitResult =
  | {
      body: unknown;
      kind: "json";
      statusCode?: number;
    }
  | {
      events: AsyncIterable<ChatKitStreamEvent>;
      kind: "stream";
    };

type ChatKitThread = {
  id: string;
  title: string | null;
  created_at: string;
  status: ChatKitThreadStatus;
  metadata: {
    project_id: string;
  };
  items: ChatKitThreadItem[];
};

type ChatKitThreadItem = ChatKitUserMessageItem | ChatKitAssistantMessageItem;

type ChatKitUserMessageItem = {
  id: string;
  thread_id: string;
  created_at: string;
  type: "user_message";
  content: ChatKitUserContent[];
  attachments: [];
  quoted_text: string | null;
  inference_options: Record<string, unknown>;
};

type ChatKitAssistantMessageItem = {
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

type ChatKitThreadStatus = {
  type: "active";
};

type ChatKitStreamEvent =
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

const ChatKitUserTextContentSchema = z.object({
  type: z.literal("input_text"),
  text: z.string()
});

const ChatKitUserTagContentSchema = z.object({
  type: z.literal("input_tag"),
  id: z.string(),
  text: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
  group: z.string().nullable().optional(),
  interactive: z.boolean().optional()
});

const ChatKitUserContentSchema = z.discriminatedUnion("type", [
  ChatKitUserTextContentSchema,
  ChatKitUserTagContentSchema
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
    params: z.object({
      input: ChatKitUserMessageInputSchema
    }),
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
    params: z.object({
      thread_id: z.string().min(1)
    }),
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("threads.list"),
    params: ChatKitPageParamsSchema,
    metadata: ChatKitMetadataSchema
  }),
  z.object({
    type: z.literal("items.list"),
    params: ChatKitPageParamsSchema.extend({
      thread_id: z.string().min(1)
    }),
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
    params: z.object({
      thread_id: z.string().min(1)
    }),
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

type ChatKitRequest = z.infer<typeof ChatKitRequestSchema>;
type ChatKitStreamingRequest = Extract<
  ChatKitRequest,
  {
    type: "threads.add_user_message" | "threads.create" | "threads.retry_after_item";
  }
>;

/**
 * OpenAI ChatKit 프로토콜을 Data Explorer AI 기능으로 연결한다.
 *
 * 파일 업로드, 위젯 액션, 영구 저장소는 아직 필요하지 않아서 구현하지 않는다.
 */
@Injectable()
export class DataExplorerChatKitService {
  private readonly threads = new Map<string, ChatKitThread>();

  constructor(
    @Inject(DataExplorerService)
    private readonly dataExplorer: DataExplorerService
  ) {}

  @LogContextScope()
  async process(body: unknown): Promise<ChatKitResult> {
    const startedAt = Date.now();
    log.info("started", { body });
    const request = ChatKitRequestSchema.safeParse(body);
    if (!request.success) {
      log.warn("chatkit_request_invalid", { error: request.error, body });
      return {
        body: {
          message: "Invalid ChatKit request."
        },
        kind: "json",
        statusCode: 400
      };
    }

    const threadId = readChatKitThreadId(request.data);
    log.assignContext({
      projectId: request.data.metadata.project_id,
      requestType: request.data.type,
      threadId
    });
    log.info("chatkit_request_parsed", { request: request.data });

    if (isStreamingRequest(request.data)) {
      log.info("completed", { kind: "stream", durationMs: durationMs(startedAt) });
      return {
        events: this.stream(request.data),
        kind: "stream"
      };
    }

    try {
      const response = {
        body: this.handleJsonRequest(request.data),
        kind: "json"
      } as const;

      log.info("completed", { response, durationMs: durationMs(startedAt) });
      return response;
    } catch (error) {
      log.warn("chatkit_json_request_failed", { err: error, request: request.data });
      return {
        body: {
          message: error instanceof Error ? error.message : "ChatKit 요청 처리에 실패했습니다."
        },
        kind: "json",
        statusCode: 400
      };
    }
  }

  private handleJsonRequest(request: Exclude<ChatKitRequest, ChatKitStreamingRequest>) {
    switch (request.type) {
      case "threads.get_by_id":
        return toThreadResponse(this.findThread(request.params.thread_id));
      case "threads.list":
        return pageItems([...this.threads.values()].map(toThreadResponse), request.params);
      case "items.list":
        return pageItems(this.findThread(request.params.thread_id).items, request.params);
      case "threads.update": {
        const thread = this.findThread(request.params.thread_id);
        thread.title = request.params.title;
        return toThreadResponse(thread);
      }
      case "threads.delete":
        this.threads.delete(request.params.thread_id);
        return {};
      case "items.feedback":
        return {};
      default:
        return {};
    }
  }

  private async *stream(
    request: ChatKitStreamingRequest
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const startedAt = Date.now();
    log.assignContext({
      projectId: request.metadata.project_id,
      requestType: request.type,
      threadId: readChatKitThreadId(request)
    });
    log.info("chatkit_stream_started", { request });

    try {
      if (request.type === "threads.create") {
        yield* this.createThreadAndRespond(request);
        log.info("chatkit_stream_completed", { durationMs: durationMs(startedAt) });
        return;
      }

      if (request.type === "threads.add_user_message") {
        yield* this.addUserMessageAndRespond(request);
        log.info("chatkit_stream_completed", { durationMs: durationMs(startedAt) });
        return;
      }

      yield* this.retryAfterItemAndRespond(request);
      log.info("chatkit_stream_completed", { durationMs: durationMs(startedAt) });
    } catch (error) {
      log.warn("chatkit_stream_failed", { err: error, request });
      yield {
        allow_retry: true,
        code: "custom",
        message: error instanceof Error ? error.message : "ChatKit 요청 처리에 실패했습니다.",
        type: "error"
      };
    }
  }

  private async *createThreadAndRespond(
    request: Extract<ChatKitStreamingRequest, { type: "threads.create" }>
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const projectId = getProjectId(request);
    const thread = createThread(projectId);
    this.threads.set(thread.id, thread);
    log.assignContext({ projectId, threadId: thread.id });
    log.info("chatkit_thread_created", { thread });

    yield {
      thread: toThreadResponse(thread),
      type: "thread.created"
    };

    const userMessage = createUserMessage(thread.id, request.params.input);
    yield* this.addItemAndRespond(thread, userMessage, request);
  }

  private async *addUserMessageAndRespond(
    request: Extract<ChatKitStreamingRequest, { type: "threads.add_user_message" }>
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const thread = this.findThread(request.params.thread_id);
    log.assignContext({ projectId: thread.metadata.project_id, threadId: thread.id });
    const userMessage = createUserMessage(thread.id, request.params.input);
    yield* this.addItemAndRespond(thread, userMessage, request);
  }

  private async *retryAfterItemAndRespond(
    request: Extract<ChatKitStreamingRequest, { type: "threads.retry_after_item" }>
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const thread = this.findThread(request.params.thread_id);
    log.assignContext({ projectId: thread.metadata.project_id, threadId: thread.id });
    const itemIndex = thread.items.findIndex((item) => item.id === request.params.item_id);
    const item = thread.items[itemIndex];

    if (!item || item.type !== "user_message") {
      log.warn("chatkit_retry_item_not_found", { request, thread });
      throw new Error("다시 실행할 사용자 메시지를 찾을 수 없습니다.");
    }

    thread.items.splice(itemIndex + 1);
    yield* this.respond(thread, item, request);
  }

  private async *addItemAndRespond(
    thread: ChatKitThread,
    userMessage: ChatKitUserMessageItem,
    request: ChatKitStreamingRequest
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    thread.items.push(userMessage);
    log.assignContext({ messageId: userMessage.id });
    log.info("chatkit_user_message_added", { thread, userMessage });

    yield {
      item: userMessage,
      type: "thread.item.done"
    };

    yield* this.respond(thread, userMessage, request);
  }

  private async *respond(
    thread: ChatKitThread,
    userMessage: ChatKitUserMessageItem,
    request: ChatKitStreamingRequest
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const startedAt = Date.now();
    log.info("chatkit_response_started", { request, thread, userMessage });

    yield {
      stream_options: {
        allow_cancel: false
      },
      type: "stream_options"
    };

    const response = await this.dataExplorer.runAiChat({
      current_result: request.metadata.current_result,
      message: userMessageText(userMessage),
      project_id: request.metadata.project_id ?? thread.metadata.project_id
    });
    const assistantMessage = createAssistantMessage(thread.id, response.assistant_message);
    thread.items.push(assistantMessage);
    log.info("chatkit_assistant_message_created", { assistantMessage, response });

    yield {
      item: assistantMessage,
      type: "thread.item.done"
    };

    if (response.query_plan) {
      log.info("chatkit_client_effect_prepared", { response });
      yield {
        data: toQueryRunEffect(response),
        name: response.query_result ? "data_explorer_query_run" : "data_explorer_query_plan",
        type: "client_effect"
      };
    }

    log.info("chatkit_response_completed", { durationMs: durationMs(startedAt) });
  }

  private findThread(threadId: string) {
    const thread = this.threads.get(threadId);
    if (!thread) {
      log.warn("chatkit_thread_not_found", { threadId });
      throw new Error("ChatKit thread를 찾을 수 없습니다.");
    }

    return thread;
  }
}

function isStreamingRequest(request: ChatKitRequest): request is ChatKitStreamingRequest {
  return (
    request.type === "threads.create" ||
    request.type === "threads.add_user_message" ||
    request.type === "threads.retry_after_item"
  );
}

function readChatKitThreadId(request: ChatKitRequest): string | undefined {
  if ("thread_id" in request.params) {
    return request.params.thread_id;
  }

  return undefined;
}

function getProjectId(request: Extract<ChatKitRequest, { type: "threads.create" }>) {
  if (!request.metadata.project_id) {
    throw new Error("project_id가 필요합니다.");
  }

  return request.metadata.project_id;
}

function createThread(projectId: string): ChatKitThread {
  return {
    created_at: new Date().toISOString(),
    id: createId("thr"),
    items: [],
    metadata: {
      project_id: projectId
    },
    status: {
      type: "active"
    },
    title: null
  };
}

function createUserMessage(
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

function createAssistantMessage(threadId: string, text: string): ChatKitAssistantMessageItem {
  return {
    content: [
      {
        annotations: [],
        text,
        type: "output_text"
      }
    ],
    created_at: new Date().toISOString(),
    id: createId("msg"),
    thread_id: threadId,
    type: "assistant_message"
  };
}

function userMessageText(item: ChatKitUserMessageItem) {
  return item.content
    .map((content) => content.text)
    .join(" ")
    .trim();
}

function toThreadResponse(thread: ChatKitThread) {
  return {
    allowed_image_domains: null,
    created_at: thread.created_at,
    id: thread.id,
    items: pageItems(thread.items, { order: "asc" }),
    status: thread.status,
    title: thread.title
  };
}

function pageItems<T extends { id: string }>(
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

function toQueryRunEffect(response: DataExplorerAiChatResponse): Record<string, unknown> {
  return {
    action: response.action,
    query_plan: response.query_plan,
    query_result: response.query_result
  };
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
