import { ESTree, acorn } from "../deps.ts";
import evaluate from "./eval.ts";
import { Scope } from "./scope.ts";
import { Any } from "./type.ts";
declare const require: (module: string) => Any;
const options = {
  sourceType: "script",
  ecmaVersion: 2022,
  locations: true,
  ranges: true,
} as acorn.Options;

// 导出默认对象
const default_api: { [key: string]: Any } = {
  ...window,
  fetch,
  console,

  setTimeout,
  setInterval,

  clearTimeout,
  clearInterval,

  encodeURI,
  encodeURIComponent,
  decodeURI,
  decodeURIComponent,
  escape: window.escape,
  unescape: window.unescape,
  Map,
  Infinity,
  NaN,
  isFinite,
  isNaN,
  parseFloat,
  parseInt,
  Object,
  Boolean,
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
  Number,
  Math,
  Date,
  Array,
  JSON,
  String,
  RegExp,
  Promise,
};

import babel from "https://esm.sh/@babel/standalone@7.21.8";

export function run(
  this: Any,
  code: string,
  append_api: { [key: string]: Any } = {},
) {
  const transformedCode =
    babel.transform(code, {
      filename: "a.ts",
      presets: ["env", "typescript"],
    }).code ?? "";

  const scope = new Scope("block");
  scope.$declar("const", "this", this);

  for (const name of Object.getOwnPropertyNames(default_api)) {
    scope.$declar("const", name, default_api[name]);
  }

  for (const name of Object.getOwnPropertyNames(append_api)) {
    scope.$declar("const", name, append_api[name]);
  }

  // 定义 module
  const $exports = {};
  const $module = { exports: $exports };
  scope.$declar("const", "module", $module);
  scope.$declar("var", "exports", $exports);

  const program: ESTree.Node = acorn.parse(
    transformedCode,
    options,
  ) as ESTree.Node;
  evaluate(program, scope);

  // exports
  const exports_var = scope.$find("exports");
  console.log(exports_var);
  return exports_var?.value;
}
