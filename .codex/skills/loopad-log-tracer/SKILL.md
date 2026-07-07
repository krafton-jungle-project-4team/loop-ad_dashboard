---
name: loopad-log-tracer
description: Investigate LoopAd dev ECS service behavior through AWS CloudWatch logs in ap-northeast-2. Use when the user asks to debug LoopAd dashboard-api, decision-api, or event-collector issues from a request ID, API path, bug symptom, suspect data identifier, status code, error text, or time window; also use when the user asks to search LoopAd AWS logs after authenticating with aws login.
---

# LoopAd Log Tracer

## Overview

Investigate service bugs by querying the relevant CloudWatch log groups, narrowing by request identity, API/symptom/data/time, and reporting evidence from logs. Keep the procedure read-only and avoid exposing secrets or full sensitive payloads.

## Log Groups

Use region `ap-northeast-2`.

- `/loop-ad/dev/ecs/dashboard-api`
- `/loop-ad/dev/ecs/decision-api`
- `/loop-ad/dev/ecs/event-collector`

## Required Narrowing

Before querying, try to get at least one concrete narrowing signal:

- Request ID, trace ID, correlation ID, or log line fragment.
- Specific API path, HTTP method, status code, or frontend action.
- Concrete bug symptom, error text, exception name, or unexpected behavior.
- Suspect data identifier such as campaign, creative, placement, user, device, event, or record ID.
- Time window with timezone. If the user gives relative time, translate it to exact dates and timezone before querying.
- Suspected service or log group.

If this information is missing, ask a concise follow-up question for the smallest useful narrowing signal. If the user says they do not have more information and still wants investigation, search all provided log groups and clearly report the exact time windows and groups scanned.

## Workflow

1. Verify local AWS access:
   - Run `aws --version`.
   - Run `aws sts get-caller-identity`.
   - If credentials are missing or expired, ask before running `aws login`. After login, rerun `aws sts get-caller-identity`.
   - Preserve an existing profile choice. If using a profile, pass `--profile <name>` consistently.

2. Define scope:
   - Choose log groups from the service hint. If no service is known, use all three log groups.
   - Convert the user's time window to `--start-time` and `--end-time` epoch seconds. Use KST if the user does not specify timezone and the project context is Korean/LoopAd dev operations.
   - Keep queries selective first. Expand only when the first pass finds nothing or the user explicitly asked for a broad search.

3. Query with CloudWatch Logs Insights:
   - Prefer `aws logs start-query` and `aws logs get-query-results`.
   - Always include `--region ap-northeast-2`.
   - Poll until status is `Complete`, `Failed`, `Cancelled`, or `Timeout`.
   - Do not run write operations against AWS resources.

4. Correlate results:
   - Follow the same request ID or data identifier across log groups.
   - Compare timestamps across services in chronological order.
   - Separate evidence from inference. Mark any root cause as likely unless the logs directly prove it.
   - If logs are inconclusive, state what was searched and what extra signal would reduce uncertainty.

## Query Patterns

Use these as starting points and adapt fields to the actual log format.

Request ID or exact identifier:

```sql
fields @timestamp, @log, @logStream, @message
| filter @message like "REQUEST_ID_OR_IDENTIFIER"
| sort @timestamp asc
| limit 200
```

API path plus errors:

```sql
fields @timestamp, @log, @logStream, @message
| filter @message like "API_PATH"
| filter @message like /(?i)(error|exception|timeout|failed|failure|invalid|warn|500|502|503|504)/
| sort @timestamp desc
| limit 200
```

Symptom or error text:

```sql
fields @timestamp, @log, @logStream, @message
| filter @message like /(?i)SYMPTOM_OR_ERROR_REGEX/
| sort @timestamp desc
| limit 200
```

Broad sweep when the user insists without a narrowing signal:

```sql
fields @timestamp, @log, @logStream, @message
| filter @message like /(?i)(error|exception|timeout|failed|failure|panic|fatal|unauthorized|forbidden|validation|invalid|500|502|503|504)/
| stats count(*) as count by @log, bin(5m)
| sort count desc
| limit 100
```

After a broad aggregate query, run a sample query for the highest-count log group and time bucket:

```sql
fields @timestamp, @log, @logStream, @message
| filter @message like /(?i)(error|exception|timeout|failed|failure|panic|fatal|unauthorized|forbidden|validation|invalid|500|502|503|504)/
| sort @timestamp desc
| limit 100
```

## AWS CLI Shape

Use this command shape, replacing epoch values and the query string:

```bash
aws logs start-query \
  --region ap-northeast-2 \
  --log-group-names /loop-ad/dev/ecs/dashboard-api /loop-ad/dev/ecs/decision-api /loop-ad/dev/ecs/event-collector \
  --start-time START_EPOCH_SECONDS \
  --end-time END_EPOCH_SECONDS \
  --query-string 'fields @timestamp, @log, @logStream, @message | filter @message like "REQUEST_ID" | sort @timestamp asc | limit 200'
```

Then poll:

```bash
aws logs get-query-results --region ap-northeast-2 --query-id QUERY_ID
```

## Reporting

Report in this order:

1. Scope searched: log groups, exact time window, timezone, query terms.
2. Finding: concise conclusion or "not found".
3. Evidence: timestamp, log group, request/data IDs, key log excerpts. Redact tokens, cookies, credentials, and personal data.
4. Likely cause and affected path, if supported.
5. Remaining uncertainty and the next smallest query/input needed.
