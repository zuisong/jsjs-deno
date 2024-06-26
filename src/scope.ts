import type { Any } from "./type.ts";

export type ScopeType = "function" | "loop" | "switch" | "block";

export type Kind = "const" | "var" | "let";

export interface Var {
  value: Any;

  // $call($this: Any, args: Array<Any>): Any
}

export class ScopeVar implements Var {
  kind: Kind;

  private inited = false;

  constructor(kind: Kind, value: Any) {
    this.kind = kind;
    this._value = value;
    this.inited = true;
  }

  _value: Any;

  get value(): Any {
    return this._value;
  }

  set value(value: Any) {
    if (this.kind === "const" && this.inited) {
      console.error(this, value);
      // throw "const variable cannot reassign";
      this._value = value;
    } else {
      this.inited = true;
      this._value = value;
    }
  }
}

export class PropVar implements Var {
  object: Any;
  property: string;

  constructor(object: Any, property: string) {
    this.object = object;
    this.property = property;
  }

  get value() {
    return this.object[this.property];
  }

  set value(value: Any) {
    this.object[this.property] = value;
  }

  $delete() {
    delete this.object[this.property];
  }
}

export class Scope {
  readonly type: ScopeType;
  readonly invasive: boolean;
  private readonly content: Map<string, Var>;
  private readonly parent: Scope | null;
  private readonly prefix: string = "@";

  constructor(
    type: ScopeType,
    parent?: Scope,
    invasive = false,
    label?: string,
  ) {
    this.type = type;
    this.parent = parent || null;
    this.content = new Map();
    this.invasive = invasive;
  }

  $find(raw_name: string): Var | null {
    const name: string = this.prefix + raw_name;
    if (this.content.has(name)) {
      return this.content.get(name)!;
    }
    if (this.parent) {
      return this.parent.$find(raw_name);
    }
    return null;
  }

  private $declar_(
    raw_name: string,
    value: Any,
    type: "let" | "const",
  ): boolean {
    const name: string = this.prefix + raw_name;
    const $var = this.content.has(name);
    if (!$var) {
      this.content.set(name, new ScopeVar(type, value));
      return true;
    }
    return false;
  }

  $var(raw_name: string, value: Any): boolean {
    const name = this.prefix + raw_name;
    let scope: Scope = this;

    while (scope.parent !== null && scope.type !== "function") {
      scope = scope.parent;
    }
    const $var = scope.content.get(name);
    if (!$var) {
      this.content.set(name, new ScopeVar("var", value));
      return true;
    }
    return false;
  }

  $declar(kind: Kind, raw_name: string, value: any): boolean {
    const declares: { [k in Kind]: () => boolean } = {
      var: () => this.$var(raw_name, value),
      let: () => this.$declar_(raw_name, value, "let"),
      const: () => this.$declar_(raw_name, value, "const"),
    };
    return declares[kind]();
  }
}
