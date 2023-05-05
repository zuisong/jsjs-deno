import { run } from "../src/main.ts";
let r1 = /\s/;

console.log(r1.test("\r"));
console.log(r1.test("\n"));
console.log(r1.test("\t"));
console.log(r1.test(" "));
console.log()
run(`
let r1 = /\\s/

console.log(r1.test('\\r'))
console.log(r1.test('\\n'))
console.log(r1.test('\\t'))
console.log(r1.test(' '))

`);
