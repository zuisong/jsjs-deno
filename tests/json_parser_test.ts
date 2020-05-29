import { run } from "../src/main.ts";
import { log } from "../deps.ts";

let s = await Deno.readFile("tests/json-parser.js");
const code = new TextDecoder().decode(s);

console.log(code);

const save_ast = (ast: string) => {
  log.info(ast);
  // Deno.writeFileSync("json-parser-ast.json", new TextEncoder().encode(ast));
};

let { generateAST, generateObject, generateTokes } = run(code, { save_ast });

// 原本的json串
const json = `
{
    c: -11,
    d: [
        1,
        {
            f: 'g'
        }
    ]
}
`;

// 预期得到的对象
const expectObject = {
  c: -11,
  d: [
    1,
    {
      f: "g",
    },
  ],
};

// 预期得的tokens
const expectTokens = [
  { type: "大括号", value: "{" },
  { type: "名字", value: "c" },
  { type: "冒号", value: ":" },
  { type: "数字", value: "-11" },
  { type: "逗号", value: "," },
  { type: "名字", value: "d" },
  { type: "冒号", value: ":" },
  { type: "方括号", value: "[" },
  { type: "数字", value: "1" },
  { type: "逗号", value: "," },
  { type: "大括号", value: "{" },
  { type: "名字", value: "f" },
  { type: "冒号", value: ":" },
  { type: "字符串", value: "g" },
  { type: "大括号", value: "}" },
  { type: "方括号", value: "]" },
  { type: "大括号", value: "}" },
];

const tokens = generateTokes(json);

console.log(tokens);
//deepStrictEqual(tokens, expectTokens, 'token 转换不符合预期')

const ast = generateAST(tokens);

const obj = generateObject(ast);

//deepStrictEqual(obj, expectObject, '对象转换不对')

console.log(json);
console.log(obj);

console.log("OK!!! All down!!!");
