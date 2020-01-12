import * as acorn from "../acorn/index.js";
import * as ESTree from "../estree/index.d.ts";
import evaluate from "./eval.ts";
import {Scope} from "./scope.ts";
import {Options} from "../acorn/index.d.ts";

declare const require: (module: string) => any;
const options: Options = {
  ecmaVersion: 8,
  sourceType: "script",
  locations: false
};

declare const Promise: any;

// 导出默认对象
const default_api: { [key: string]: any } = {
  console,

  setTimeout,
  setInterval,

  clearTimeout,
  clearInterval,

  encodeURI,
  encodeURIComponent,
  decodeURI,
  decodeURIComponent,
  escape,
  unescape,

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
  String,
  RegExp,
  Array,
  JSON,
  Promise
};

export function run(code: string, append_api: { [key: string]: any } = {}) {
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
  const $module = {exports: $exports};
  scope.$declar("const", "module", $module);
  scope.$declar("var", "exports", $exports);

  const program = <ESTree.Node>acorn.parse(code, options);
  console.log(JSON.stringify(program, null, 2));
  evaluate(program, scope);

  // exports
  const exports_var = scope.$find("exports");
  console.log(exports_var)
  return exports_var?.value;
}
