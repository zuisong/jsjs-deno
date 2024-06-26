import type { ESTree } from "../deps.ts";
import { PropVar, Scope, type Var } from "./scope.ts";
import type { EvaluateFunc } from "./type.ts";

const BREAK_SINGAL = {};
const CONTINUE_SINGAL = {};
const RETURN_SINGAL: { result: undefined } = { result: undefined };

const evaluate_map = {
  ImportExpression: (node: ESTree.ImportExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  Program: (program: ESTree.Program, scope: Scope) => {
    let result = undefined;
    for (const node of program.body) {
      result = evaluate(node, scope);
    }
    return result;
  },

  Identifier: (node: ESTree.Identifier, scope: Scope) => {
    if (node.name === "undefined") {
      return undefined;
    } // 奇怪的问题
    const $var = scope.$find(node.name);
    if ($var) {
      return $var.value;
    }

    // return undefined
    throw `[Error] ${JSON.stringify(node.loc)}, '${node.name}' 未定义`;
  },

  Literal: (node: ESTree.Literal, scope: Scope) => {
    return node.value;
  },

  BlockStatement: (block: ESTree.BlockStatement, scope: Scope) => {
    const new_scope = scope.invasive ? scope : new Scope("block", scope);
    for (const node of block.body) {
      const result = evaluate(node, new_scope);
      if (
        result === BREAK_SINGAL ||
        result === CONTINUE_SINGAL ||
        result === RETURN_SINGAL
      ) {
        return result;
      }
    }
  },

  EmptyStatement: (node: ESTree.EmptyStatement, scope: Scope) => {
    /* 空当然啥都不干嘛 */
  },

  DebuggerStatement: (node: ESTree.DebuggerStatement, scope: Scope) => {},

  ExpressionStatement: (node: ESTree.ExpressionStatement, scope: Scope) => {
    evaluate(node.expression, scope);
  },

  ReturnStatement: (node: ESTree.ReturnStatement, scope: Scope) => {
    RETURN_SINGAL.result = node.argument
      ? evaluate(node.argument, scope)
      : undefined;
    return RETURN_SINGAL;
  },

  LabeledStatement: (node: ESTree.LabeledStatement, scope: Scope) => {
    throw `${node.type} 未实现`;
  },

  BreakStatement: (node: ESTree.BreakStatement, scope: Scope) => {
    return BREAK_SINGAL;
  },

  ContinueStatement: (node: ESTree.ContinueStatement, scope: Scope) => {
    return CONTINUE_SINGAL;
  },

  IfStatement: (node: ESTree.IfStatement, scope: Scope) => {
    if (evaluate(node.test, scope)) return evaluate(node.consequent, scope);
    if (node.alternate) return evaluate(node.alternate, scope);
  },

  SwitchStatement: (node: ESTree.SwitchStatement, scope: Scope) => {
    const discriminant = evaluate(node.discriminant, scope);
    const new_scope = new Scope("switch", scope);

    let matched = false;
    for (const $case of node.cases) {
      // 进行匹配相应的 case
      if (
        !matched &&
        (!$case.test || discriminant === evaluate($case.test, new_scope))
      ) {
        matched = true;
      }

      if (matched) {
        const result = evaluate($case, new_scope);

        if (result === BREAK_SINGAL) {
          break;
        }
        if (result === CONTINUE_SINGAL || result === RETURN_SINGAL) {
          return result;
        }
      }
    }
  },

  SwitchCase: (node: ESTree.SwitchCase, scope: Scope) => {
    for (const stmt of node.consequent) {
      const result = evaluate(stmt, scope);
      if (
        result === BREAK_SINGAL ||
        result === CONTINUE_SINGAL ||
        result === RETURN_SINGAL
      ) {
        return result;
      }
    }
  },

  WithStatement: (node: ESTree.WithStatement, scope: Scope) => {
    throw "因为 with 很多问题，已经被基本弃用了，不实现";
  },

  ThrowStatement: (node: ESTree.ThrowStatement, scope: Scope) => {
    throw evaluate(node.argument, scope);
  },

  TryStatement: (node: ESTree.TryStatement, scope: Scope) => {
    try {
      return evaluate(node.block, scope);
    } catch (err) {
      if (node.handler) {
        const param = <ESTree.Identifier>node.handler.param;
        const new_scope = new Scope("block", scope, true);
        new_scope.$declar("const", param.name, err);
        return evaluate(node.handler, new_scope);
      }
      throw err;
    } finally {
      if (node.finalizer) {
        evaluate(node.finalizer, scope);
      }
    }
  },

  CatchClause: (node: ESTree.CatchClause, scope: Scope) => {
    return evaluate(node.body, scope);
  },

  WhileStatement: (node: ESTree.WhileStatement, scope: Scope) => {
    while (evaluate(node.test, scope)) {
      const new_scope = new Scope("loop", scope, true);
      const result = evaluate(node.body, new_scope);

      if (result === BREAK_SINGAL) {
        break;
      }
      if (result === CONTINUE_SINGAL) {
        continue;
      }
      if (result === RETURN_SINGAL) {
        return result;
      }
    }
  },

  DoWhileStatement: (node: ESTree.DoWhileStatement, scope: Scope) => {
    do {
      const new_scope = new Scope("loop", scope, true);
      const result = evaluate(node.body, new_scope);
      if (result === BREAK_SINGAL) {
        break;
      }
      if (result === CONTINUE_SINGAL) {
        continue;
      }
      if (result === RETURN_SINGAL) {
        return result;
      }
    } while (evaluate(node.test, scope));
  },

  ForStatement: (node: ESTree.ForStatement, scope: Scope) => {
    for (
      const new_scope = new Scope("loop", scope),
        init_val = node.init ? evaluate(node.init, new_scope) : null;
      node.test ? evaluate(node.test, new_scope) : true;
      node.update ? evaluate(node.update, new_scope) : void 0
    ) {
      const result = evaluate(node.body, new_scope);
      if (result === BREAK_SINGAL) {
        break;
      }
      if (result === CONTINUE_SINGAL) {
        continue;
      }
      if (result === RETURN_SINGAL) {
        return result;
      }
    }
  },

  ForInStatement: (node: ESTree.ForInStatement, scope: Scope) => {
    const kind = (<ESTree.VariableDeclaration>node.left).kind;
    const decl = (<ESTree.VariableDeclaration>node.left).declarations[0];
    const name = (<ESTree.Identifier>decl.id).name;

    for (const value in evaluate(node.right, scope)) {
      const new_scope = new Scope("loop", scope, true);
      scope.$declar(kind, name, value);
      const result = evaluate(node.body, new_scope);
      if (result === BREAK_SINGAL) {
        break;
      }
      if (result === CONTINUE_SINGAL) {
        continue;
      }
      if (result === RETURN_SINGAL) {
        return result;
      }
    }
  },

  FunctionDeclaration: (node: ESTree.FunctionDeclaration, scope: Scope) => {
    const func = evaluate_map.FunctionExpression(<any>node, scope);
    const { name: func_name } = node.id!;
    if (!scope.$declar("const", func_name, func)) {
      throw `[Error] ${func_name} 重复定义`;
    }
  },

  VariableDeclaration: (node: ESTree.VariableDeclaration, scope: Scope) => {
    const kind = node.kind;
    for (const declartor of node.declarations) {
      const { name } = <ESTree.Identifier>declartor.id;
      const value = declartor.init
        ? evaluate(declartor.init, scope)
        : undefined;
      if (!scope.$declar(kind, name, value)) {
        throw `[Error] ${name} 重复定义`;
      }
    }
  },

  VariableDeclarator: (node: ESTree.VariableDeclarator, scope: Scope) => {
    throw "执行这里就错了";
  },

  ThisExpression: (node: ESTree.ThisExpression, scope: Scope) => {
    const this_val = scope.$find("this");
    return this_val?.value;
  },

  ArrayExpression: (node: ESTree.ArrayExpression, scope: Scope) => {
    return node.elements.map((item) => evaluate(item, scope));
  },

  ObjectExpression: (node: ESTree.ObjectExpression, scope: Scope) => {
    const object: any = {};
    for (const property1 of node.properties) {
      {
        const property = property1 as ESTree.Property;
        const kind = property.kind;

        let key: string;
        if (property.key.type === "Literal") {
          key = evaluate(property.key, scope);
        } else if (property.key.type === "Identifier") {
          key = property.key.name;
        } else {
          throw "这里绝对就错了1";
        }

        const value = evaluate(property.value, scope);
        if (kind === "init") {
          object[key] = value;
        } else if (kind === "set") {
          Object.defineProperty(object, key, { set: value });
        } else if (kind === "get") {
          Object.defineProperty(object, key, { get: value });
        } else {
          throw "这里绝对就错了2";
        }
      }
    }
    return object;
  },

  FunctionExpression: (node: ESTree.FunctionExpression, scope: Scope) => {
    if (node.async) {
      return async function (...args: any[]) {
        const new_scope = new Scope("function", scope, true);
        for (let i = 0; i < node.params.length; i++) {
          const { name } = <ESTree.Identifier>node.params[i];
          new_scope.$declar("const", name, args[i]);
        }
        //@ts-ignore
        new_scope.$declar("const", "this", this);
        new_scope.$declar("const", "arguments", arguments);
        const result = evaluate(node.body, new_scope);
        if (result === RETURN_SINGAL) {
          return result.result;
        }
      };
    }
    return function (...args: any[]) {
      const new_scope = new Scope("function", scope, true);
      for (let i = 0; i < node.params.length; i++) {
        const { name } = <ESTree.Identifier>node.params[i];
        new_scope.$declar("const", name, args[i]);
      }
      //@ts-ignore
      new_scope.$declar("const", "this", this);
      new_scope.$declar("const", "arguments", arguments);
      const result = evaluate(node.body, new_scope);
      if (result === RETURN_SINGAL) {
        return result.result;
      }
    };
  },

  UnaryExpression: (node: ESTree.UnaryExpression, scope: Scope) => {
    return {
      "-": () => -evaluate(node.argument, scope),
      "+": () => +evaluate(node.argument, scope),
      "!": () => !evaluate(node.argument, scope),
      "~": () => ~evaluate(node.argument, scope),
      void: () => void evaluate(node.argument, scope),
      typeof: () => {
        if (node.argument.type === "Identifier") {
          const $var = scope.$find(node.argument.name);
          return typeof $var?.value;
        }
        return typeof evaluate(node.argument, scope);
      },
      delete: () => {
        // delete 是真麻烦
        if (node.argument.type === "MemberExpression") {
          const { object, property, computed } = node.argument;
          if (computed) {
            return delete evaluate(object, scope)[evaluate(property, scope)];
          }
          return delete evaluate(object, scope)[
            (<ESTree.Identifier>property).name
          ];
        }
        if (node.argument.type === "Identifier") {
          const $this = scope.$find("this");
          if ($this) return $this.value[node.argument.name];
        }
      },
    }[node.operator]();
  },

  UpdateExpression: (node: ESTree.UpdateExpression, scope: Scope) => {
    const { prefix } = node;
    let $var: Var;
    if (node.argument.type === "Identifier") {
      const { name } = node.argument;
      $var = scope.$find(name)!;
      if (!$var) throw `${name} 未定义`;
    } else if (node.argument.type === "MemberExpression") {
      const argument = node.argument;
      const object = evaluate(argument.object, scope);
      const property = argument.computed
        ? evaluate(argument.property, scope)
        : (<ESTree.Identifier>argument.property).name;
      $var = new PropVar(object, property);
    }

    return {
      "--": (v: number) => {
        $var.value = v - 1;
        prefix ? --v : v--;
      },
      "++": (v: number) => {
        $var.value = v + 1;
        prefix ? ++v : v++;
      },
    }[node.operator](evaluate(node.argument, scope));
  },

  BinaryExpression: (
    { left, operator, right }: ESTree.BinaryExpression,
    scope: Scope,
  ) => {
    const operators: {
      [key in ESTree.BinaryOperator]: (x1: any, x2: any) => any;
    } = {
      "==": (a, b) => a == b,
      "!=": (a, b) => a != b,
      "===": (a, b) => a === b,
      "!==": (a, b) => a !== b,
      "<": (a, b) => a < b,
      "<=": (a, b) => a <= b,
      ">": (a, b) => a > b,
      ">=": (a, b) => a >= b,
      "<<": (a, b) => a << b,
      ">>": (a, b) => a >> b,
      ">>>": (a, b) => a >>> b,
      "+": (a, b) => a + b,
      "-": (a, b) => a - b,
      "*": (a, b) => a * b,
      "/": (a, b) => a / b,
      "%": (a, b) => a % b,
      "|": (a, b) => a | b,
      "^": (a, b) => a ^ b,
      "&": (a, b) => a & b,
      "**": (a, b) => a ** b,
      in: (a, b) => a in b,
      instanceof: (a, b) => a instanceof b,
    };
    return operators[operator]?.(evaluate(left, scope), evaluate(right, scope));
  },

  AssignmentExpression: (node: ESTree.AssignmentExpression, scope: Scope) => {
    let $var: Var;

    if (node.left.type === "Identifier") {
      const { name } = node.left;
      const $var_or_not = scope.$find(name);
      if (!$var_or_not) throw `${name} 未定义`;
      $var = $var_or_not;
    } else if (node.left.type === "MemberExpression") {
      const left = node.left;
      const object = evaluate(left.object, scope);
      const property = left.computed
        ? evaluate(left.property, scope)
        : (<ESTree.Identifier>left.property).name;
      $var = new PropVar(object, property);
    } else {
      throw "如果出现在这里，那就说明有问题了";
    }

    const map: { [key in ESTree.AssignmentOperator]: (a: any) => any } = {
      "=": (a) => ($var.value = a),
      "+=": (a) => ($var.value += a),
      "-=": (a) => ($var.value -= a),
      "*=": (a) => ($var.value *= a),
      "/=": (a) => ($var.value /= a),
      "%=": (a) => ($var.value %= a),
      "**=": (a) => ($var.value **= a),
      "<<=": (a) => ($var.value <<= a),
      ">>=": (a) => ($var.value >>= a),
      ">>>=": (a) => ($var.value >>>= a),
      "|=": (a) => ($var.value |= a),
      "^=": (a) => ($var.value ^= a),
      "&=": (a) => ($var.value &= a),
      "||=": (a) => ($var.value ||= a),
      "&&=": (a) => ($var.value &&= a),
      "??=": (a) => ($var.value ??= a),
    };
    return map[node.operator](evaluate(node.right, scope));
  },

  LogicalExpression: (node: ESTree.LogicalExpression, scope: Scope) => {
    const left = evaluate(node.left, scope);
    const right = evaluate(node.right, scope);
    const map: { [key in ESTree.LogicalOperator]: any } = {
      "||": () => left || right,
      "&&": () => left && right,
      "??": () => left ?? right,
    };
    return map[node.operator]();
  },

  MemberExpression: (node: ESTree.MemberExpression, scope: Scope) => {
    const { object, property, computed } = node;
    if (computed) {
      return evaluate(object, scope)[evaluate(property, scope)];
    }
    return evaluate(object, scope)?.[(<ESTree.Identifier>property).name];
  },

  ConditionalExpression: (node: ESTree.ConditionalExpression, scope: Scope) => {
    return evaluate(node.test, scope)
      ? evaluate(node.consequent, scope)
      : evaluate(node.alternate, scope);
  },

  CallExpression: (node: ESTree.CallExpression, scope: Scope) => {
    const func = evaluate(node.callee, scope);
    const args = node.arguments.map((arg) => evaluate(arg, scope));

    // 心疼自己
    if (node.callee.type === "MemberExpression") {
      const object = evaluate(node.callee.object, scope);
      return func.apply(object, args);
    }
    const this_val = scope.$find("this");
    return func.apply(this_val?.value, args);
  },

  NewExpression: (node: ESTree.NewExpression, scope: Scope) => {
    const func = evaluate(node.callee, scope);

    const args = node.arguments.map((arg) => evaluate(arg, scope));
    return new (func.bind.apply(func, [null].concat(args)))();
  },

  SequenceExpression: (node: ESTree.SequenceExpression, scope: Scope) => {
    let last: any;
    for (const expr of node.expressions) {
      last = evaluate(expr, scope);
    }
    return last;
  },

  Property: (node: ESTree.Property, scope: Scope, computed: boolean) => {
    throw "这里如果被执行了那也是错的...";
  },

  // 下面是 es6 / es7 特性, 先不做处理
  ClassExpression: (node: ESTree.ClassExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  RestElement: (node: ESTree.RestElement, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  MetaProperty: (node: ESTree.MetaProperty, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  AwaitExpression: (node: ESTree.AwaitExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  Super: (node: ESTree.Super, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  SpreadElement: (node: ESTree.SpreadElement, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  TemplateElement: (node: ESTree.TemplateElement, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ClassDeclaration: (node: ESTree.ClassDeclaration, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  TaggedTemplateExpression: (
    node: ESTree.TaggedTemplateExpression,
    scope: Scope,
  ) => {
    throw `${node.type} 未实现`;
  },
  MethodDefinition: (node: ESTree.MethodDefinition, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  AssignmentPattern: (node: ESTree.AssignmentPattern, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ObjectPattern: (node: ESTree.ObjectPattern, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ArrayPattern: (node: ESTree.ArrayPattern, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ForOfStatement: (node: ESTree.ForOfStatement, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  TemplateLiteral: (node: ESTree.TemplateLiteral, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ClassBody: (node: ESTree.ClassBody, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ImportDeclaration: (node: ESTree.ImportDeclaration, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ExportNamedDeclaration: (
    node: ESTree.ExportNamedDeclaration,
    scope: Scope,
  ) => {
    throw `${node.type} 未实现`;
  },
  ExportDefaultDeclaration: (
    node: ESTree.ExportDefaultDeclaration,
    scope: Scope,
  ) => {
    throw `${node.type} 未实现`;
  },
  ExportAllDeclaration: (node: ESTree.ExportAllDeclaration, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ImportSpecifier: (node: ESTree.ImportSpecifier, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ImportDefaultSpecifier: (
    node: ESTree.ImportDefaultSpecifier,
    scope: Scope,
  ) => {
    throw `${node.type} 未实现`;
  },
  ImportNamespaceSpecifier: (
    node: ESTree.ImportNamespaceSpecifier,
    scope: Scope,
  ) => {
    throw `${node.type} 未实现`;
  },
  ExportSpecifier: (node: ESTree.ExportSpecifier, scope: Scope) => {
    // throw `${node.type} 未实现`
    const value = scope.$find("exports")?.value;
    value["node.exported.name"] = scope.$find(node.exported.name)?.value;
  },
  YieldExpression: (node: ESTree.YieldExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ChainExpression: (node: ESTree.YieldExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  PrivateIdentifier: (node: ESTree.YieldExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  PropertyDefinition: (node: ESTree.YieldExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  StaticBlock: (node: ESTree.YieldExpression, scope: Scope) => {
    throw `${node.type} 未实现`;
  },
  ArrowFunctionExpression: (
    node: ESTree.ArrowFunctionExpression,
    scope: Scope,
  ) => {
    if (node.async) {
      return async (...args: any[]) => {
        // noinspection DuplicatedCode
        const new_scope = new Scope("function", scope, true);
        for (let i = 0; i < node.params.length; i++) {
          const { name } = <ESTree.Identifier>node.params[i];
          new_scope.$declar("const", name, args[i]);
        }
        const result = evaluate(node.body, new_scope);
        if (node.expression) {
          //(a,b)=> a+b
          return result;
        }
        // (a,b)=>{return a+b}
        if (result === RETURN_SINGAL) {
          return result.result;
        }
      };
    }
    return (...args: any[]) => {
      // noinspection DuplicatedCode
      const new_scope = new Scope("function", scope, true);
      for (let i = 0; i < node.params.length; i++) {
        const { name } = <ESTree.Identifier>node.params[i];
        new_scope.$declar("const", name, args[i]);
      }
      const result = evaluate(node.body, new_scope);
      if (node.expression) {
        //(a,b)=> a+b
        return result;
      }
      // (a,b)=>{return a+b}
      if (result === RETURN_SINGAL) {
        return result.result;
      }
    };
  },
};

const evaluate = (node: ESTree.Node | null, scope: Scope, arg?: any) => {
  if (node == null) return null;
  const _evalute = <EvaluateFunc>evaluate_map[node.type];
  return _evalute(node, scope, arg);
};

export default evaluate;
