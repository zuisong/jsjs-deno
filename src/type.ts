import type { ESTree } from "../deps.ts";
import type { Scope } from "./scope.ts";

// deno-lint-ignore no-explicit-any
export type Any = any;

export type EvaluateFunc = (node: ESTree.Node, scope: Scope, arg?: Any) => Any;
