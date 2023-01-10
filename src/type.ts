import { Scope } from "./scope.ts";
import { ESTree } from "../deps.ts";

export type EvaluateFunc = (node: ESTree.Node, scope: Scope, arg?: any) => any;
