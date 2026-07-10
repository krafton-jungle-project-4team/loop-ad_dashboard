import { createThread, type ChatKitThread } from "./data-explorer-chatkit-protocol.js";

export class DataExplorerChatKitThreadStore {
  private readonly threads = new Map<string, ChatKitThread>();

  create(projectId: string) {
    const thread = createThread(projectId);
    this.threads.set(thread.id, thread);
    return thread;
  }

  delete(threadId: string) {
    this.threads.delete(threadId);
  }

  find(threadId: string) {
    return this.threads.get(threadId);
  }

  list() {
    return [...this.threads.values()];
  }
}
