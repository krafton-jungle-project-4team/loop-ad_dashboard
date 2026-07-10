import { Inject, Injectable } from "@nestjs/common";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import {
  createAssistantMessage,
  createUserMessage,
  getProjectId,
  isStreamingRequest,
  pageItems,
  parseChatKitRequest,
  readChatKitThreadId,
  toQueryRunEffect,
  toThreadResponse,
  userMessageText,
  type ChatKitRequest,
  type ChatKitResult,
  type ChatKitStreamEvent,
  type ChatKitStreamingRequest,
  type ChatKitThread,
  type ChatKitUserMessageItem
} from "./data-explorer-chatkit-protocol.js";
import { DataExplorerChatKitThreadStore } from "./data-explorer-chatkit-thread-store.js";
import { DataExplorerService } from "./data-explorer.service.js";

/** OpenAI ChatKit 프로토콜을 Data Explorer AI 기능으로 연결한다. */
@Injectable()
export class DataExplorerChatKitService {
  private readonly threadStore = new DataExplorerChatKitThreadStore();

  constructor(
    @Inject(DataExplorerService)
    private readonly dataExplorer: DataExplorerService
  ) {}

  @LogContextScope()
  async process(body: unknown): Promise<ChatKitResult> {
    const startedAt = Date.now();
    log.info("started", { body });
    const request = parseChatKitRequest(body);
    if (!request.success) {
      log.warn("chatkit_request_invalid", { error: request.error, body });
      return {
        body: { message: "Invalid ChatKit request." },
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
      return { events: this.stream(request.data), kind: "stream" };
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
        return pageItems(this.threadStore.list().map(toThreadResponse), request.params);
      case "items.list":
        return pageItems(this.findThread(request.params.thread_id).items, request.params);
      case "threads.update": {
        const thread = this.findThread(request.params.thread_id);
        thread.title = request.params.title;
        return toThreadResponse(thread);
      }
      case "threads.delete":
        this.threadStore.delete(request.params.thread_id);
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
      } else if (request.type === "threads.add_user_message") {
        yield* this.addUserMessageAndRespond(request);
      } else {
        yield* this.retryAfterItemAndRespond(request);
      }
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
    const thread = this.threadStore.create(projectId);
    log.assignContext({ projectId, threadId: thread.id });
    log.info("chatkit_thread_created", { thread });
    yield { thread: toThreadResponse(thread), type: "thread.created" };

    const userMessage = createUserMessage(thread.id, request.params.input);
    yield* this.addItemAndRespond(thread, userMessage, request);
  }

  private async *addUserMessageAndRespond(
    request: Extract<ChatKitStreamingRequest, { type: "threads.add_user_message" }>
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const thread = this.findThread(request.params.thread_id);
    log.assignContext({ projectId: thread.metadata.project_id, threadId: thread.id });
    yield* this.addItemAndRespond(
      thread,
      createUserMessage(thread.id, request.params.input),
      request
    );
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
    yield { item: userMessage, type: "thread.item.done" };
    yield* this.respond(thread, userMessage, request);
  }

  private async *respond(
    thread: ChatKitThread,
    userMessage: ChatKitUserMessageItem,
    request: ChatKitStreamingRequest
  ): AsyncGenerator<ChatKitStreamEvent, void, unknown> {
    const startedAt = Date.now();
    log.info("chatkit_response_started", { request, thread, userMessage });
    yield { stream_options: { allow_cancel: false }, type: "stream_options" };

    const response = await this.dataExplorer.runAiChat({
      current_result: request.metadata.current_result,
      message: userMessageText(userMessage),
      project_id: request.metadata.project_id ?? thread.metadata.project_id
    });
    const assistantMessage = createAssistantMessage(thread.id, response.assistant_message);
    thread.items.push(assistantMessage);
    log.info("chatkit_assistant_message_created", { assistantMessage, response });
    yield { item: assistantMessage, type: "thread.item.done" };

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
    const thread = this.threadStore.find(threadId);
    if (!thread) {
      log.warn("chatkit_thread_not_found", { threadId });
      throw new Error("ChatKit thread를 찾을 수 없습니다.");
    }
    return thread;
  }
}
