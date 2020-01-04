import * as interpreter from "../src/main.ts";

fetch("https://baidu.com").then(res => {
  res.text().then(it => {
    console.log(it);
  });
});

let code = `

fetch("https://baidu.com").then(res => {
  res.text().then(it => {
    console.log(it);
  });
});

`;
interpreter.run(code, { fetch, Deno });
