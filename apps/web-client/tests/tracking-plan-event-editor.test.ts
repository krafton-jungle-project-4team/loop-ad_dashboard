import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspaceSource = readFileSync(
  new URL("../src/features/dashboard/ui/pages/sdk/TrackingPlanWorkspace.tsx", import.meta.url),
  "utf8"
);

test("switching events with an unsaved draft asks before discarding it", () => {
  assert.match(workspaceSource, /const hasUnsavedChanges =/);
  assert.match(
    workspaceSource,
    /if \(hasUnsavedChanges\) \{\s+setPendingEventName\(event\.eventName\);\s+return;/
  );
  assert.match(workspaceSource, /<AlertDialogTitle>변경사항을 버릴까요\?<\/AlertDialogTitle>/);
  assert.match(workspaceSource, /<AlertDialogCancel>계속 작성<\/AlertDialogCancel>/);
  assert.match(workspaceSource, /<AlertDialogAction onClick=\{discardDraftAndShowPendingEvent\}>/);
});

test("event saves are locked while a create or update request is pending", () => {
  assert.match(workspaceSource, /if \(savingRef\.current\) return;/);
  assert.match(workspaceSource, /savingRef\.current = true;\s+setSaving\(true\);/);
  assert.match(
    workspaceSource,
    /disabled=\{saving \|\| !eventName\.trim\(\) \|\| propertyIssues\.length > 0\}/
  );
  assert.match(workspaceSource, /\{saving \? "저장 중…" : "저장"\}/);
  assert.match(
    workspaceSource,
    /<Button disabled=\{saving\} variant="outline" onClick=\{cancelEditing\}>/
  );
  assert.match(workspaceSource, /disabled=\{saving\}\s+key=\{event\.eventName\}/);
});

test("leaving the event form clears stale mutation errors and draft state", () => {
  assert.match(
    workspaceSource,
    /function switchToEvent\(event: TrackingPlanEvent\) \{\s+clearError\(\);\s+resetDraft\(\);/
  );
  assert.match(
    workspaceSource,
    /function cancelEditing\(\) \{\s+clearError\(\);\s+resetDraft\(\);\s+setMode\("view"\);/
  );
  assert.match(
    workspaceSource,
    /<Button disabled=\{saving\} variant="outline" onClick=\{cancelEditing\}>/
  );
});
