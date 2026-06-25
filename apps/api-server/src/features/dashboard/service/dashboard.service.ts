import { Injectable } from "@nestjs/common";
import {
  conversion,
  creatives,
  insights,
  overview,
  recommendations
} from "../analytics/reports.js";
import { env } from "../../../infra/env/env.js";
import { projectId } from "../../../infra/http/api-response.js";

@Injectable()
export class DashboardService {
  overview(project?: string) {
    return overview(projectId(project, env.projectId));
  }

  conversion(project?: string) {
    return conversion(projectId(project, env.projectId));
  }

  insights(project?: string) {
    return insights(projectId(project, env.projectId));
  }

  recommendations(project?: string) {
    return recommendations(projectId(project, env.projectId));
  }

  creatives(project?: string) {
    return creatives(projectId(project, env.projectId));
  }
}
