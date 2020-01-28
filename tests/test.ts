import * as interpreter from '../src/main.ts';

const test = (a) => a + 1;
console.log(test('hello world'));

for (let i = 1; i < 10; i++) {
  let s = '';
  for (let j = 1; j <= i; j++) {
    s += j + 'x' + i + '=' + i * j + '\t';
  }
  console.log(s);
}

let code = `

const test = a => a + 1;
console.log(test("hello world"));

for (let i = 1; i < 10; i++) {
  let s = "";
  for (let j = 1; j <= i; j++) {
    s += j + "x" + i + "=" + i * j + "\t";
  }
  console.log(s);
}

`;
interpreter.run(code);
