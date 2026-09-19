import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const root = new URL("../../../", import.meta.url);
const directory = "apps/web-client/src/features/dashboard/ui/pages/campaign/promotion/";
const hookPath = directory + "usePromotionWorkspaceController.ts";
const helperPath = directory + "promotionRunLaunchTarget.ts";
const pins = JSON.parse(readFileSync(new URL("tools/run-consumer-gate/pins.json", root), "utf8"));
const parse = (text: string) =>
  ts.createSourceFile("source.ts", text, ts.ScriptTarget.Latest, true);

function nodes(source: ts.SourceFile, predicate: (node: ts.Node) => boolean) {
  const found: ts.Node[] = [];
  const walk = (node: ts.Node) => {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
  return found;
}

test("공유 변환 반환식은 고정 b77b901 hook의 원래 반환식과 동일하다", () => {
  const original = parse(
    execFileSync("git", ["show", `${pins.dashboard_fix_sha}:${hookPath}`], {
      cwd: root,
      encoding: "utf8"
    })
  );
  const helper = parse(readFileSync(new URL(helperPath, root), "utf8"));
  const returned = (source: ts.SourceFile) => {
    const matches = nodes(
      source,
      (node) =>
        ts.isReturnStatement(node) &&
        !!node.expression &&
        node.expression.getText(source).includes("run.ad_experiments.map")
    );
    assert.equal(matches.length, 1);
    const expression = (matches[0] as ts.ReturnStatement).expression!;
    return ts.createPrinter().printNode(ts.EmitHint.Expression, expression, source);
  };
  assert.equal(returned(helper), returned(original));
});

test("실제 hook의 launch createRun은 공유 변환을 import하고 호출한다", () => {
  const hook = parse(readFileSync(new URL(hookPath, root), "utf8"));
  const imports = nodes(
    hook,
    (node) =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "./promotionRunLaunchTarget.js"
  );
  assert.equal(imports.length, 1);
  const calls = nodes(
    hook,
    (node) =>
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "promotionRunLaunchTarget"
  );
  assert.equal(calls.length, 1);
  const call = calls[0] as ts.CallExpression;
  assert.equal(call.arguments.length, 1);
  assert.equal(call.arguments[0]!.getText(hook), "run");
  assert.ok(ts.isReturnStatement(call.parent));
  let parent: ts.Node | undefined = call.parent;
  let inCreateRun = false;
  let inLaunch = false;
  while (parent) {
    if (ts.isPropertyAssignment(parent) && parent.name.getText(hook) === "createRun")
      inCreateRun = true;
    if (
      ts.isCallExpression(parent) &&
      parent.expression.getText(hook) === "launchPromotionExperiment"
    )
      inLaunch = true;
    parent = parent.parent;
  }
  assert.ok(inCreateRun && inLaunch);
});
