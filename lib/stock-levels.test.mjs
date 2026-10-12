import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

const compiled = ts.transpileModule(
  readFileSync(new URL("./stock-levels.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
);
const loaded = { exports: {} };
new Function("exports", "require", "module", compiled.outputText)(
  loaded.exports, require, loaded,
);
const { resolveWarehouseStock: stock } = loaded.exports;

test("warehouse quantities determine total even when legacy stock is stale", () => {
  const levels = [{ warehouseId: 1, quantity: 12 }, { warehouseId: 2, quantity: 8 }];
  for (const legacy of [0, 5, 99]) {
    assert.equal(stock(levels, legacy), 20);
    assert.equal(stock(levels, legacy), stock(levels, legacy, 1, 1) + stock(levels, legacy, 2, 1));
  }
});

test("stock in another warehouse is not counted in the default warehouse", () => {
  assert.equal(stock([{ warehouseId: 2, quantity: 8 }], 8, 1, 1), 0);
});

test("explicit zero stock does not fall back to stale legacy stock", () => {
  const levels = [{ warehouseId: 1, quantity: 0 }];
  assert.equal(stock(levels, 99), 0);
  assert.equal(stock(levels, 99, 1, 1), 0);
});

test("variants without stock levels retain their legacy default warehouse stock", () => {
  assert.equal(stock([], 7), 7);
  assert.equal(stock([], 7, 1, 1), 7);
  assert.equal(stock([], 7, 2, 1), 0);
  assert.equal(stock(undefined, 7), 7);
});
