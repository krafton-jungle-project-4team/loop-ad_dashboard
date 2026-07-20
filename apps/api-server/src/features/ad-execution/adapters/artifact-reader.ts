import type { CreativeArtifact } from "@loopad/shared";
import { durationMs, log } from "../../../infra/logger/index.js";

export abstract class HtmlArtifactReader {
  abstract readHtml(artifact: CreativeArtifact): Promise<string>;
}

export class FetchHtmlArtifactReader extends HtmlArtifactReader {
  async readHtml(artifact: CreativeArtifact): Promise<string> {
    if (artifact.artifact_status !== "published" || !artifact.public_url) {
      throw new Error("HTML artifact is not published.");
    }

    const startedAt = Date.now();
    const providerContext = {
      endpoint: "public_url",
      provider: "creative_artifact_storage",
      storageKey: artifact.storage_key
    };
    log.info("provider_request_prepared", providerContext);
    try {
      const response = await fetch(artifact.public_url, {
        method: "GET",
        headers: {
          Accept: "text/html"
        }
      });

      if (!response.ok) {
        throw new Error(`HTML artifact read failed with ${response.status}.`);
      }

      const html = await response.text();
      log.info("provider_request_completed", {
        ...providerContext,
        durationMs: durationMs(startedAt),
        responseBytes: Buffer.byteLength(html),
        statusCode: response.status
      });
      return html;
    } catch (error) {
      log.warn("provider_request_failed", {
        ...providerContext,
        durationMs: durationMs(startedAt),
        err: error
      });
      throw error;
    }
  }
}
