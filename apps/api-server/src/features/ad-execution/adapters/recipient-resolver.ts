import { Injectable } from "@nestjs/common";
import type { DispatchChannel } from "../domain/index.js";

export interface RecipientResolution {
  recipient: string;
}

export interface ResolveRecipientInput {
  projectId: string;
  userId: string;
  channel: DispatchChannel;
}

/** user_id를 실제 수신 주소/전화번호로 해석하는 인터페이스입니다. */
export abstract class RecipientResolver {
  /** 채널별 수신자를 조회합니다. */
  abstract resolve(input: ResolveRecipientInput): Promise<RecipientResolution | null>;
}

/** 연결된 수신자 provider가 없을 때 실패를 드러내는 기본 resolver입니다. */
@Injectable()
export class UnconfiguredRecipientResolver extends RecipientResolver {
  /** 수신자를 만들지 않고 미설정 상태를 null로 반환합니다. */
  async resolve(): Promise<RecipientResolution | null> {
    return null;
  }
}
