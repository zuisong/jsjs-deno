// "use strict";
exports.__esModule = true;
// 工具类 返回一对值
var Pair = /** @class */ (function () {
  function Pair(first, second) {
    this.first = first;
    this.second = second;
  }
  Pair.of = function (v1, v2) {
    return { first: v1, second: v2 };
  };
  return Pair;
})();
// 工具方法 校验用
function required(t, fn, message) {
  if (message === void 0) {
    message = "";
  }
  if (!fn(t)) {
    throw new Error(message);
  }
  return t;
}
var Token = /** @class */ (function () {
  function Token(type, value) {
    this.type = type;
    this.value = value;
  }
  return Token;
})();
exports.Token = Token;
var JsonNode = /** @class */ (function () {
  function JsonNode() {}
  return JsonNode;
})();
// 把json 字符串 转换为一个token[]
// 这里无关语法规则，不校验任何语法
function generateTokes(input) {
  function getToken(idx) {
    var c = input[idx];
    if (c === "{" || c === "}") {
      var t = {
        type: "大括号",
        value: c,
      };
      return Pair.of(idx + 1, t);
    }
    if (c === "[" || c === "]") {
      var t = {
        type: "方括号",
        value: c,
      };
      return Pair.of(idx + 1, t);
    }
    if (c === ":") {
      var t = {
        type: "冒号",
        value: c,
      };
      return Pair.of(idx + 1, t);
    }
    if (c === ",") {
      var t = {
        type: "逗号",
        value: c,
      };
      return Pair.of(idx + 1, t);
    }
    var WHITESPACE = new RegExp("\\s");
    if (WHITESPACE.test(c)) {
      return Pair.of(idx + 1, null);
    }
    // 数字
    var NUMBERS = new RegExp("\\d");
    if (NUMBERS.test(c) || c === "-") {
      var value = c;
      c = input[idx + value.length];
      while (NUMBERS.test(c)) {
        value += c;
        c = input[idx + value.length];
      }
      var t = {
        type: "数字",
        value: value,
      };
      return Pair.of(idx + value.length, t);
    }
    /*
     *  json里的引号里面的是字符串
     */
    if (c === '"' || c === "'") {
      // 保存结束的字符   这里的json可以使用单引号或者双引号作为字符串
      var closeSign = c;
      var value = "";
      idx++; // 跳过开始符
      c = input[idx];
      while (c !== closeSign) {
        value += c;
        idx++;
        c = input[idx];
      }
      var t = {
        type: "字符串",
        value: value,
      };
      idx++; // 跳过结束符
      return Pair.of(idx, t);
    }
    var LETTERS = new RegExp("[a-z]", "i");
    if (LETTERS.test(c)) {
      var value = "";
      while (LETTERS.test(c)) {
        value += c;
        c = input[idx + value.length];
      }
      var t = {
        type: "名字",
        value: value,
      };
      return Pair.of(idx + value.length, t);
    }
    // Finally if we have not matched a character by now, we're going to throw
    // an error and completely exit.
    throw new TypeError("I dont know what this character is: " + c);
  }
  var current = 0;
  var tokens = [];
  do {
    var p = getToken(current);
    current = p.first;
    if (p.second) {
      tokens.push(p.second);
    }
  } while (current < input.length);
  return tokens;
}
exports.generateTokes = generateTokes;
function generateAST(tokens) {
  function getNode(idx) {
    if (tokens[idx].type === "逗号") {
      idx++;
    }
    var t = tokens[idx];
    if (t.type === "大括号" && t.value === "{") {
      idx++; // 跳过大括号节点
      var node = new JsonNode();
      node.type = "JsonNode";
      node.value = new Map();
      // 大括号处理
      // 保存存有名字token
      while (tokens[idx].type !== "大括号" && tokens[idx].value !== "}") {
        var nameToken = tokens[idx];
        required(
          nameToken,
          function (it) {
            return it.type === "名字" || it.type === "字符串";
          },
          "大括号后面只能跟名字或字符串",
        );
        required(
          tokens[idx + 1],
          function (it) {
            return it.type === "冒号";
          },
          "只能是冒号",
        );
        // 通过递归获取子节点
        var p = getNode(idx + 2);
        node.value.set(nameToken.value, p.second);
        idx = p.first;
        if (tokens[idx].type === "逗号") {
          idx++;
        }
        required(idx, function (it) {
          return it < tokens.length;
        });
      }
      idx++; // 跳过结尾的反大括号
      return Pair.of(idx, node);
    }
    if (t.type === "方括号" && t.value == "[") {
      idx++;
      var node = new JsonNode();
      node.type = "NODE_ARRAY";
      node.value = new Array();
      while (tokens[idx].type !== "方括号" && tokens[idx].value !== "]") {
        var p = getNode(idx);
        node.value.push(p.second);
        idx = p.first;
        if (tokens[idx].type === "逗号") {
          idx++;
        }
      }
      idx++;
      return Pair.of(idx, node);
    }
    if (t.type === "数字") {
      var node = new JsonNode();
      node.type = "NumberValue";
      node.value = Number(t.value);
      return Pair.of(idx + 1, node);
    }
    if (t.type === "字符串") {
      var node = new JsonNode();
      node.type = "StringValue";
      node.value = t.value;
      return Pair.of(idx + 1, node);
    }
    throw new Error(JSON.stringify(t));
  }
  var res = getNode(0);
  required(
    res.first,
    function (it) {
      return it === tokens.length;
    },
    "必须直接到结尾",
  );
  res.second.type = "ROOT_NODE";
  return res.second;
}
exports.generateAST = generateAST;
function generateObject(ast) {
  function translate(node) {
    if (node.type === "NumberValue" || node.type === "StringValue") {
      return node.value;
    }
    if (node.type === "JsonNode" || node.type === "ROOT_NODE") {
      var m = node.value;
      var resultMap_1 = new Map();
      // console.log(m.keys())
      var resultObj_1 = {};
      m.forEach(function (value, key) {
        resultMap_1.set(key, translate(value));
        resultObj_1[key] = translate(value);
      });
      return resultObj_1;
    }
    if (node.type === "NODE_ARRAY") {
      var arr_1 = new Array();
      var a = node.value;
      a.forEach(function (value) {
        arr_1.push(translate(value));
      });
      return arr_1;
    }
    throw Error(JSON.stringify(node));
  }
  return translate(ast);
}
exports.generateObject = generateObject;
