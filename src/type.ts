import { ESTree } from "../deps.ts";
import { Scope } from "./scope.ts";

export type EvaluateFunc = (node: ESTree.Node, scope: Scope, arg?: any) => any;
