import * as interpreter from "../src/main.ts";

// language=JavaScript
let code = `
  function test() {

    console.log(("hello world"));

    for (let i = 1; i < 10; i++) {
      let s = "";
      for (let j = 1; j <= i; j++) {
        s += j + "x" + i + "=" + i * j + "\t";
      }
      console.log(s);
    }

  }

  exports = {
    test
  }

`;
const { test } = interpreter.run(code);
// console.log(code);

console.log("=========================");
test();
