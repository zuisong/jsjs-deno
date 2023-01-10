import { log } from "../deps.ts";

import * as interpreter from "../src/main.ts";

console.log(Deno.execPath());

// language=JavaScript
const code = `
console.log(Deno.execPath())
`;
interpreter.run(code, { fetch, Deno, log });
