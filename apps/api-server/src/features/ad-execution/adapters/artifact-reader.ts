import type { CreativeArtifact } from "@loopad/shared";
import { log } from "../../../infra/logger/index.js";

export abstract class HtmlArtifactReader {
  abstract readHtml(artifact: CreativeArtifact): Promise<string>;
}

export class FetchHtmlArtifactReader extends HtmlArtifactReader {
  async readHtml(artifact: CreativeArtifact): Promise<string> {
    if (artifact.artifact_status !== "published" || !artifact.public_url) {
      throw new Error("HTML artifact is not published.");
    }

    log.info("artifact_read_started", {
      publicUrl: artifact.public_url,
      storageKey: artifact.storage_key
    });
    const response = await fetch(artifact.public_url, {
      method: "GET",
      headers: {
        Accept: "text/html"
      }
    });

    if (!response.ok) {
      throw new Error(`HTML artifact read failed with ${response.status}.`);
    }

    return response.text();
  }
}
