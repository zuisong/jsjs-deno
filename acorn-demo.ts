import * as walk from "npm:acorn-walk";
import * as acorn from "npm:acorn";
const options: acorn.Options = {
  sourceType: "module",
  ecmaVersion: 2022,
  locations: true,
  ranges: true,
  allowAwaitOutsideFunction: true,
};
walk.full(
  acorn.parse(
    `
let req = async () => {
  let resp = await fetch("https://baidu.com")
  console.log(resp.headers)
};

req()

`,
    options,
  ),
  (node) => {
    console.log(`There's a ${node.type} node at ${JSON.stringify(node.loc)}`);
  },
);
