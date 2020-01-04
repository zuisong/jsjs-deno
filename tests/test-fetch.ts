import * as log from "https://deno.land/x/std/log/mod.ts";

import * as interpreter from "../src/main.ts";

fetch("https://api.github.com/emojis").then(res => {
  res.json().then(it => {
    log.info(JSON.stringify(it, null, 2));
  });
});

// language=JavaScript
let code = `

  fetch("https://api.github.com/emojis").then(res => {
    res.json().then(it => {
      log.info(JSON.stringify(it, null, 2));
    });
  });

`;
interpreter.run(code, {fetch, Deno, log});
