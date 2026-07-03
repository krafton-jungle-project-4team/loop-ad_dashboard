import { Injectable } from "@nestjs/common";
import {
  type DataExplorerAiChatCurrentResult,
  type DataExplorerAiQueryPlanRequest,
  type DataExplorerChartSpec,
  type DataExplorerObjectDetail,
  type DataExplorerSemanticType,
  type DataExplorerSourceId
} from "@loopad/shared";
import { z } from "zod";
import { env } from "../../../infra/env/env.js";
import { dataExplorerErrors } from "../errors.js";

type OpenAiDataExplorerQueryPlan = {
  generatedSql: string;
  params: Record<string, unknown>;
  suggestedVisualizations: DataExplorerChartSpec[];
};

type OpenAiDataExplorerResultAnalysis = {
  summary: string;
  insights: string[];
  caveats: string[];
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_REQUEST_TIMEOUT_MS = 20_000;
const OPENAI_QUERY_PLAN_MODEL = "gpt-5.5";

const OpenAiPlanSchema = z.object({
  sql_text: z.string().trim().min(1),
  params: z.object({
    project_id: z.string().nullable(),
    from: z.string().nullable(),
    to: z.string().nullable()
  }),
  visualization: z.object({
    chart_type: z.enum(["line", "bar", "scatter", "none"]),
    x_column: z.string().min(1).nullable(),
    x_type: z.enum(["time", "dimension", "measure", "boolean", "json", "unknown"]).nullable(),
    y_column: z.string().min(1).nullable(),
    y_aggregation: z.enum(["none", "count", "sum", "avg"]).nullable(),
    series_column: z.string().min(1).nullable(),
    stack: z.boolean(),
    show_legend: z.boolean()
  })
});

const OpenAiResultAnalysisSchema = z.object({
  summary: z.string().trim().min(1),
  insights: z.array(z.string().trim().min(1)),
  caveats: z.array(z.string().trim().min(1))
});

@Injectable()
export class OpenAiDataExplorerQueryPlanner {
  async createQueryPlan(input: {
    detail: DataExplorerObjectDetail;
    request: DataExplorerAiQueryPlanRequest;
    sourceId: DataExplorerSourceId;
  }): Promise<OpenAiDataExplorerQueryPlan> {
    const content = await requestOpenAiJson({
      schema: OPENAI_QUERY_PLAN_JSON_SCHEMA,
      schemaName: "data_explorer_query_plan",
      systemPrompt: buildQueryPlanSystemPrompt(input.sourceId),
      userPayload: buildQueryPlanPayload(input)
    }).catch((error: unknown) => {
      throw dataExplorerErrors.queryPlanFailed({ cause: toError(error) });
    });
    const parsed = parseOpenAiPlan(content);

    return {
      generatedSql: parsed.sql_text,
      params: compactParams(parsed.params),
      suggestedVisualizations: toChartSpecs(parsed.visualization)
    };
  }

  async analyzeResult(input: {
    currentResult: DataExplorerAiChatCurrentResult;
    message: string;
  }): Promise<OpenAiDataExplorerResultAnalysis> {
    const content = await requestOpenAiJson({
      schema: OPENAI_RESULT_ANALYSIS_JSON_SCHEMA,
      schemaName: "data_explorer_result_analysis",
      systemPrompt: buildResultAnalysisSystemPrompt(),
      userPayload: buildResultAnalysisPayload(input)
    }).catch((error: unknown) => {
      throw dataExplorerErrors.aiChatFailed({ cause: toError(error) });
    });

    try {
      return OpenAiResultAnalysisSchema.parse(JSON.parse(content));
    } catch (error) {
      throw dataExplorerErrors.aiChatFailed({ cause: toError(error) });
    }
  }
}

async function requestOpenAiJson(input: {
  schema: Record<string, unknown>;
  schemaName: string;
  systemPrompt: string;
  userPayload: unknown;
}) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openai.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_QUERY_PLAN_MODEL,
      input: [
        {
          role: "system",
          content: input.systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify(input.userPayload)
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: input.schemaName,
          strict: true,
          schema: input.schema
        }
      }
    }),
    signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses request failed with ${response.status}.`);
  }

  const payload = await response.json().catch((error: unknown) => {
    throw toError(error);
  });

  return readOpenAiTextContent(payload);
}

function buildQueryPlanSystemPrompt(sourceId: DataExplorerSourceId) {
  const dialect =
    sourceId === "clickhouse_events"
      ? "ClickHouse SQL. Use {project_id:String}, {from:String}, and {to:String} style parameters."
      : "PostgreSQL SQL. Use :project_id style named parameters.";

  return [
    "You generate one read-only SQL query for LoopAd Data Explorer.",
    `SQL dialect: ${dialect}`,
    "Use only the provided source object and columns.",
    "Always filter by project_id when the object has a project_id column.",
    "Use SELECT or WITH only. Never use INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE, CREATE, or external table functions.",
    "Return at most 500 rows.",
    "Return JSON that exactly matches the provided schema."
  ].join("\n");
}

function buildQueryPlanPayload(input: {
  detail: DataExplorerObjectDetail;
  request: DataExplorerAiQueryPlanRequest;
  sourceId: DataExplorerSourceId;
}) {
  return {
    project_id: input.request.project_id,
    source_id: input.sourceId,
    natural_language_query: input.request.natural_language_query,
    time_range: input.request.time_range ?? null,
    object: {
      database_name: input.detail.object.database_name,
      schema_name: input.detail.object.schema_name,
      object_name: input.detail.object.object_name,
      object_type: input.detail.object.object_type,
      columns: input.detail.columns.map((column) => ({
        column_name: column.column_name,
        data_type: column.data_type,
        nullable: column.nullable
      })),
      primary_key: input.detail.primary_key,
      partition_key: input.detail.partition_key,
      order_by: input.detail.order_by
    }
  };
}

function buildResultAnalysisSystemPrompt() {
  return [
    "You analyze LoopAd Data Explorer query results for a dashboard user.",
    "Use only the provided columns and rows.",
    "Answer in Korean.",
    "Be concise and practical.",
    "If the sample rows are insufficient, state the caveat instead of inventing facts.",
    "Return JSON that exactly matches the provided schema."
  ].join("\n");
}

function buildResultAnalysisPayload(input: {
  currentResult: DataExplorerAiChatCurrentResult;
  message: string;
}) {
  return {
    user_message: input.message,
    query_run_id: input.currentResult.query_run_id,
    row_count: input.currentResult.row_count,
    truncated: input.currentResult.truncated,
    columns: input.currentResult.columns,
    rows: input.currentResult.rows.slice(0, 50)
  };
}

function readOpenAiTextContent(payload: unknown) {
  const parsed = OpenAiResponsesResponseSchema.safeParse(payload);
  const outputText =
    parsed.success && parsed.data.output_text
      ? parsed.data.output_text
      : parsed.success
        ? parsed.data.output
            .flatMap((item) => item.content)
            .map((content) => (content.type === "output_text" ? content.text : null))
            .find((text): text is string => !!text)
        : null;

  if (!outputText) {
    throw new Error("OpenAI response did not include a text payload.");
  }

  return outputText;
}

function parseOpenAiPlan(content: string) {
  try {
    return OpenAiPlanSchema.parse(JSON.parse(content));
  } catch (error) {
    throw dataExplorerErrors.queryPlanFailed({ cause: toError(error) });
  }
}

function toChartSpecs(
  visualization: z.infer<typeof OpenAiPlanSchema>["visualization"]
): DataExplorerChartSpec[] {
  if (
    visualization.chart_type === "none" ||
    !visualization.x_column ||
    !visualization.x_type ||
    !visualization.y_column ||
    !visualization.y_aggregation
  ) {
    return [];
  }

  return [
    {
      chart_type: visualization.chart_type,
      x: {
        column: visualization.x_column,
        type: visualization.x_type as DataExplorerSemanticType
      },
      y: [
        {
          column: visualization.y_column,
          aggregation: visualization.y_aggregation
        }
      ],
      series: visualization.series_column ? { column: visualization.series_column } : null,
      options: {
        stack: visualization.stack,
        show_legend: visualization.show_legend
      }
    }
  ];
}

function compactParams(params: z.infer<typeof OpenAiPlanSchema>["params"]) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== null));
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

const OpenAiResponsesResponseSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(
    z.object({
      content: z.array(
        z.union([
          z.object({
            type: z.literal("output_text"),
            text: z.string()
          }),
          z.object({
            type: z.literal("refusal"),
            refusal: z.string()
          })
        ])
      )
    })
  )
});

const OPENAI_QUERY_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sql_text: {
      type: "string",
      description: "Single read-only SQL statement. Include LIMIT 500 or lower."
    },
    params: {
      type: "object",
      additionalProperties: false,
      properties: {
        project_id: {
          type: ["string", "null"],
          description: "The LoopAd project id parameter value when used by the SQL."
        },
        from: {
          type: ["string", "null"],
          description: "Inclusive lower time bound when used by the SQL."
        },
        to: {
          type: ["string", "null"],
          description: "Exclusive upper time bound when used by the SQL."
        }
      },
      required: ["project_id", "from", "to"]
    },
    visualization: {
      type: "object",
      additionalProperties: false,
      properties: {
        chart_type: {
          type: "string",
          enum: ["line", "bar", "scatter", "none"]
        },
        x_column: {
          type: ["string", "null"]
        },
        x_type: {
          type: ["string", "null"],
          enum: ["time", "dimension", "measure", "boolean", "json", "unknown", null]
        },
        y_column: {
          type: ["string", "null"]
        },
        y_aggregation: {
          type: ["string", "null"],
          enum: ["none", "count", "sum", "avg", null]
        },
        series_column: {
          type: ["string", "null"]
        },
        stack: {
          type: "boolean"
        },
        show_legend: {
          type: "boolean"
        }
      },
      required: [
        "chart_type",
        "x_column",
        "x_type",
        "y_column",
        "y_aggregation",
        "series_column",
        "stack",
        "show_legend"
      ]
    }
  },
  required: ["sql_text", "params", "visualization"]
} as const;

const OPENAI_RESULT_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string"
    },
    insights: {
      type: "array",
      items: { type: "string" }
    },
    caveats: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["summary", "insights", "caveats"]
} as const;
