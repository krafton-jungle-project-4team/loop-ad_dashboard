import assert from "node:assert/strict";
import test from "node:test";
import {
  buildColumnSampleSql,
  buildObjectSampleSql
} from "../src/features/data-explorer/model/data-explorer-sql.js";

test("data explorer sample SQL makes the selected project visible for scoped objects", () => {
  const object = {
    object_name: "raw_events",
    project_scoped: true
  };

  assert.equal(
    buildObjectSampleSql(object, "project-'one"),
    ["SELECT", "  *", "FROM `raw_events`", "WHERE project_id = 'project-''one'", "LIMIT 100"].join(
      "\n"
    )
  );
  assert.equal(
    buildColumnSampleSql(object, "event`name", "project-one"),
    [
      "SELECT",
      "  `event``name`",
      "FROM `raw_events`",
      "WHERE project_id = 'project-one'",
      "LIMIT 100"
    ].join("\n")
  );
});

test("data explorer sample SQL keeps shared objects queryable", () => {
  const sql = buildObjectSampleSql(
    {
      object_name: "expedia_hotel_events",
      project_scoped: false
    },
    "project-one"
  );

  assert.doesNotMatch(sql, /project_id/);
  assert.match(sql, /FROM `expedia_hotel_events`/);
});
