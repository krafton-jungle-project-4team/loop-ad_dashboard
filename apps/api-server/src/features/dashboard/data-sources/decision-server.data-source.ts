import { Injectable } from "@nestjs/common";
import { AiJobAcceptedSchema, type AiJobKind } from "@loopad/shared";
import { env } from "../../../infra/env/env.js";

@Injectable()
export class DecisionServerDataSource {
  async createJob(input: { kind: AiJobKind; projectId: string }) {
    if (!env.decisionServer.url) {
      throw new Error("Decision server URL is not configured.");
    }

    const response = await fetch(new URL("/analysis-jobs", env.decisionServer.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Decision server request failed: ${response.status}`);
    }

    return AiJobAcceptedSchema.parse(await response.json());
  }
}
