(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('ramda'), require('pg'), require('pg-promise'), require('squel')) :
typeof define === 'function' && define.amd ? define(['exports', 'ramda', 'pg', 'pg-promise', 'squel'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.vca = global.vca || {}, global.R, global.pg, global.pgpsetup, global.squel));
}(this, (function (exports, R, pg, pgpsetup, squelbase) { 'use strict';

function _interopNamespace(e) {
if (e && e.__esModule) return e;
var n = Object.create(null);
if (e) {
Object.keys(e).forEach(function (k) {
if (k !== 'default') {
var d = Object.getOwnPropertyDescriptor(e, k);
Object.defineProperty(n, k, d.get ? d : {
enumerable: true,
get: function () {
return e[k];
}
});
}
});
}
n['default'] = e;
return Object.freeze(n);
}

var R__namespace = /*#__PURE__*/_interopNamespace(R);
var pgpsetup__namespace = /*#__PURE__*/_interopNamespace(pgpsetup);
var squelbase__namespace = /*#__PURE__*/_interopNamespace(squelbase);

let makeXhrRequest = async (url) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
      resolve(this.response);
    };
    xhr.onerror = () => reject({ 
      status: xhr.status, 
      statusText: xhr.statusText
    });
    xhr.send();
  });
};

let pgp = null;
let LocalDB = (async (opts) => {
  opts = opts || {};
  opts.host = opts.host || 'localhost';
  opts.port = opts.port || 5432;
  opts.user = opts.user || 'eugenewu';
  opts.database = opts.database || 'test';
  let me = () => {};

  if (pgp == null) {
    pgp = pgpsetup__namespace.default();
    pgp.pg.types.setTypeParser(20, parseInt);
    pgp.pg.types.setTypeParser(21, parseInt);
    pgp.pg.types.setTypeParser(1700, parseFloat);
    pgp.pg.types.setTypeParser(700, parseFloat);
    pgp.pg.types.setTypeParser(701, parseFloat);
  }

  me.pool = pgp(opts);

  me.exec = async (q) => {
    try {
      let rows = await me.pool.query(q);
      return rows;
    } catch (e) {
      console.log(q);
      console.error(e);
      console.trace();
      return []
    }
  };
  me.getSchemasQuery = `
  select tablename as tbl_name from pg_tables 
  where position('tmp' in tablename) = 0 and 
        position('model' in tablename) = 0 and 
        schemaname = 'public';`;
  return me;
});

let RemoteDB = (({url}) => {
  let me = () => {};

  me.exec = async (q) => {
    let [data] = await $.ajax({
      url: url || "http://localhost:8000/query",
      type: "GET",
      data: { q },
      dataType: "json"
    });

    data = data.values.map((vals) => {
      return Object.fromEntries( vals.map((v,i) => [data.columns[i], v]));
    });

    return data;
  };
  me.getSchemasQuery = `
  select tablename as tbl_name from pg_tables 
  where position('tmp' in tablename) = 0 and
        position('model' in tablename) = 0 and 
        schemaname = 'public';`;

  return me;
});

let loadSqliteDB = async (SQL, url) => {
  const response = await makeXhrRequest(url);
  var uInt8Array = new Uint8Array(response);
  let db = new SQL.Database(uInt8Array);


  let me = () => {};
  me.exec = async (q) => {
    let [data] = await db.exec(q);
    data = data.values.map((vals) => {
      return Object.fromEntries( vals.map((v,i) => [data.columns[i], v]));
    });
    return data;
  };
  me.getSchemasQuery = "select tbl_name from sqlite_master where type='table'";
  return me;
};

let runQuery = async (db, q) => {
  try {
    return await db.exec(q);
  } catch (e) {
    console.error(q);
    console.log(e);
    throw e;

  }
};

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { start: peg$parsestart },
      peg$startRuleFunction  = peg$parsestart,

      peg$c0 = function(q) { return q; },
      peg$c1 = function(g, f, w) { 
          let ops = R__namespace.reject(R__namespace.isNil, [g, w, f]);
          R__namespace.reduce((acc, op) => {
            acc.c = op;
            return op;
          }, ops[0], R__namespace.tail(ops));

          return g;
        },
      peg$c2 = function(terms) { return GroupBy(GroupBy.termsToAgbFs(terms)); },
      peg$c3 = function(n) { return Source({source: n, alias: n}); },
      peg$c4 = ",",
      peg$c5 = peg$literalExpectation(",", false),
      peg$c6 = function(head, tail) { return Where({ exprs: flatten(head, tail, 3) }) },
      peg$c7 = function(head, tail) { return flatten(head, tail, 3); },
      peg$c8 = function(e, a) { 
          if (!a) {
            if (e.classType == "Attr") 
              a = e.attr;
            else if (e.classType == "Func")
              a = "y";
            else
              throw Error(`PClause missing alias: ${e.classType}, ${e.type}, ${e.toSql()}`)
          } else {
            a = a[2];
          }
          return PClause({e, alias:a}) 
        },
      peg$c9 = function(head, tail) {
          let l = head;
          if (!tail) return l;
          return Expr({ op: tail[1], l, r:tail[3] });
        },
      peg$c10 = function(t, c) { return Attr({ table: t, attr: c }); },
      peg$c11 = function(c) { return Attr({ attr: c})},
      peg$c12 = function(x) { return Value(x) },
      peg$c13 = function(l) { return List({exprs: l}) },
      peg$c14 = function(first, tail) { return flatten(first, tail, 3) },
      peg$c15 = function(e) { return Paren({expr:e}); },
      peg$c16 = function(n, fargs) { 
          fargs = fargs || [];
          return Func({fname:n, args:fargs})
        },
      peg$c17 = function(head, tail) { return flatten(head, tail, 3) },
      peg$c18 = function(s) { 
        return s;
        },
      peg$c19 = function(digits) { 
          var x = flatstr(digits);
          if (x.indexOf('.') >= 0) {
            return { type: "Number", value: parseFloat(x)};
          }
          return { type: "Number", value :parseInt(x) };
        },
      peg$c20 = "-",
      peg$c21 = peg$literalExpectation("-", false),
      peg$c22 = "+",
      peg$c23 = peg$literalExpectation("+", false),
      peg$c29 = "||",
      peg$c30 = peg$literalExpectation("||", false),
      peg$c31 = "*",
      peg$c32 = peg$literalExpectation("*", false),
      peg$c33 = "/",
      peg$c34 = peg$literalExpectation("/", false),
      peg$c35 = "%",
      peg$c36 = peg$literalExpectation("%", false),
      peg$c37 = "<<",
      peg$c38 = peg$literalExpectation("<<", false),
      peg$c39 = ">>",
      peg$c40 = peg$literalExpectation(">>", false),
      peg$c41 = "&",
      peg$c42 = peg$literalExpectation("&", false),
      peg$c43 = "<=",
      peg$c44 = peg$literalExpectation("<=", false),
      peg$c45 = ">=",
      peg$c46 = peg$literalExpectation(">=", false),
      peg$c47 = "<",
      peg$c48 = peg$literalExpectation("<", false),
      peg$c49 = ">",
      peg$c50 = peg$literalExpectation(">", false),
      peg$c51 = "=",
      peg$c52 = peg$literalExpectation("=", false),
      peg$c53 = "==",
      peg$c54 = peg$literalExpectation("==", false),
      peg$c55 = "!=",
      peg$c56 = peg$literalExpectation("!=", false),
      peg$c57 = "<>",
      peg$c58 = peg$literalExpectation("<>", false),
      peg$c59 = "IN",
      peg$c60 = peg$literalExpectation("IN", false),
      peg$c61 = "in",
      peg$c62 = peg$literalExpectation("in", false),
      peg$c63 = "OR",
      peg$c64 = peg$literalExpectation("OR", false),
      peg$c65 = "or",
      peg$c66 = peg$literalExpectation("or", false),
      peg$c67 = "AND",
      peg$c68 = peg$literalExpectation("AND", false),
      peg$c69 = "and",
      peg$c70 = peg$literalExpectation("and", false),
      peg$c75 = /^[A-Za-z0-9_]/,
      peg$c76 = peg$classExpectation([["A", "Z"], ["a", "z"], ["0", "9"], "_"], false, false),
      peg$c77 = function(str) { return str.join('') },
      peg$c78 = "as",
      peg$c79 = peg$literalExpectation("as", true),
      peg$c80 = "select",
      peg$c81 = peg$literalExpectation("select", true),
      peg$c82 = "from",
      peg$c83 = peg$literalExpectation("FROM", true),
      peg$c84 = "where",
      peg$c85 = peg$literalExpectation("WHERE", true),
      peg$c86 = /^[ \t\n\r]/,
      peg$c87 = peg$classExpectation([" ", "\t", "\n", "\r"], false, false),
      peg$c88 = /^[0-9]/,
      peg$c89 = peg$classExpectation([["0", "9"]], false, false),
      peg$c90 = ".",
      peg$c91 = peg$literalExpectation(".", false),
      peg$c96 = "(",
      peg$c97 = peg$literalExpectation("(", false),
      peg$c98 = ")",
      peg$c99 = peg$literalExpectation(")", false),
      peg$c100 = "\n",
      peg$c101 = peg$literalExpectation("\n", false),
      peg$c102 = peg$otherExpectation("string"),
      peg$c103 = "\"",
      peg$c104 = peg$literalExpectation("\"", false),
      peg$c105 = function(chars) {
            return { type: "Literal", value: chars.join("") };
          },
      peg$c106 = "'",
      peg$c107 = peg$literalExpectation("'", false),
      peg$c108 = "\\",
      peg$c109 = peg$literalExpectation("\\", false),
      peg$c110 = function() { return text(); },
      peg$c111 = function(sequence) { return sequence; },
      peg$c112 = function() { return ""; },
      peg$c113 = "0",
      peg$c114 = peg$literalExpectation("0", false),
      peg$c115 = function() { return "\0"; },
      peg$c116 = /^[\n\r\u2028\u2029]/,
      peg$c117 = peg$classExpectation(["\n", "\r", "\u2028", "\u2029"], false, false),
      peg$c118 = peg$anyExpectation(),
      peg$c119 = "b",
      peg$c120 = peg$literalExpectation("b", false),
      peg$c121 = function() { return "\b";   },
      peg$c122 = "f",
      peg$c123 = peg$literalExpectation("f", false),
      peg$c124 = function() { return "\f";   },
      peg$c125 = "n",
      peg$c126 = peg$literalExpectation("n", false),
      peg$c127 = function() { return "\n";   },
      peg$c128 = "r",
      peg$c129 = peg$literalExpectation("r", false),
      peg$c130 = function() { return "\r";   },
      peg$c131 = "t",
      peg$c132 = peg$literalExpectation("t", false),
      peg$c133 = function() { return "\t";   },
      peg$c134 = "v",
      peg$c135 = peg$literalExpectation("v", false),
      peg$c136 = function() { return "\x0B"; },
      peg$c137 = peg$otherExpectation("end of line"),
      peg$c138 = "\r\n",
      peg$c139 = peg$literalExpectation("\r\n", false),
      peg$c140 = "\r",
      peg$c141 = peg$literalExpectation("\r", false),
      peg$c142 = "\u2028",
      peg$c143 = peg$literalExpectation("\u2028", false),
      peg$c144 = "\u2029",
      peg$c145 = peg$literalExpectation("\u2029", false),
      peg$c146 = "x",
      peg$c147 = peg$literalExpectation("x", false),
      peg$c148 = "u",
      peg$c149 = peg$literalExpectation("u", false),
      peg$c150 = function(digits) {
            return String.fromCharCode(parseInt(digits, 16));
          },
      peg$c151 = /^[0-9a-f]/i,
      peg$c152 = peg$classExpectation([["0", "9"], ["a", "f"]], false, true),

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0;

    s0 = peg$parsequery();
    if (s0 === peg$FAILED) {
      s0 = peg$parseexpr();
    }

    return s0;
  }

  function peg$parsequery() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsews();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseQ();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c0(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseQ() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsegroupby();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsefrom();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsewhere();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c1(s1, s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsegroupby() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseSELECT();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsegbterms();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c2(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefrom() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseFROM();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsewsp();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsename();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c3(s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsewhere() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    s0 = peg$currPos;
    s1 = peg$parseWHERE();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsewsp();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseexpr();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$parsews();
          if (s6 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s7 = peg$c4;
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parsews();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseexpr();
                if (s9 !== peg$FAILED) {
                  s6 = [s6, s7, s8, s9];
                  s5 = s6;
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$parsews();
            if (s6 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 44) {
                s7 = peg$c4;
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parsews();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseexpr();
                  if (s9 !== peg$FAILED) {
                    s6 = [s6, s7, s8, s9];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c6(s3, s4);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsegbterms() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$parsewsp();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsepclause();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$parsews();
        if (s5 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s6 = peg$c4;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsews();
            if (s7 !== peg$FAILED) {
              s8 = peg$parsepclause();
              if (s8 !== peg$FAILED) {
                s5 = [s5, s6, s7, s8];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$parsews();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c4;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsews();
              if (s7 !== peg$FAILED) {
                s8 = peg$parsepclause();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c7(s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsepclause() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseexpr();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parseAS();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsewsp();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsename();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c8(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseexpr() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$parsevalue();
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$parsews();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsebinary_operator();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsews();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseexpr();
            if (s6 !== peg$FAILED) {
              s3 = [s3, s4, s5, s6];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c9(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsevalue() {
    var s0, s1, s2, s3;

    s0 = peg$parsefcall();
    if (s0 === peg$FAILED) {
      s0 = peg$parseliteral_value();
      if (s0 === peg$FAILED) {
        s0 = peg$parselist();
        if (s0 === peg$FAILED) {
          s0 = peg$parseparen_value();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsename();
            if (s1 !== peg$FAILED) {
              s2 = peg$parsedot();
              if (s2 !== peg$FAILED) {
                s3 = peg$parsename();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c10(s1, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsename();
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c11(s1);
              }
              s0 = s1;
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseliteral_value() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsenumeric_literal();
    if (s1 === peg$FAILED) {
      s1 = peg$parsestring_literal();
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c12(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parselist() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parselparen();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsews();
      if (s2 !== peg$FAILED) {
        s3 = peg$parselist_args();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            s5 = peg$parserparen();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c13(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parselist_args() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseexpr();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parsews();
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c4;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parsews();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseexpr();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c4;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsews();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseexpr();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c14(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseparen_value() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parselparen();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsews();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseexpr();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            s5 = peg$parserparen();
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c15(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefcall() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = peg$parsename();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsews();
      if (s2 !== peg$FAILED) {
        s3 = peg$parselparen();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsefargs();
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parsews();
            if (s5 !== peg$FAILED) {
              s6 = peg$parserparen();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c16(s1, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsefargs() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    s1 = peg$parseexpr();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$parsews();
      if (s4 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s5 = peg$c4;
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s5 !== peg$FAILED) {
          s6 = peg$parsews();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseexpr();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$parsews();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c4;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parsews();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseexpr();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c17(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsestring_literal() {
    var s0, s1;

    s0 = peg$currPos;
    s1 = peg$parsejs_string_literal();
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c18(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsenumeric_literal() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8;

    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parseplus();
    if (s2 === peg$FAILED) {
      s2 = peg$parseminus();
    }
    if (s2 === peg$FAILED) {
      s2 = null;
    }
    if (s2 !== peg$FAILED) {
      s3 = peg$currPos;
      s4 = [];
      s5 = peg$parsedigit();
      if (s5 !== peg$FAILED) {
        while (s5 !== peg$FAILED) {
          s4.push(s5);
          s5 = peg$parsedigit();
        }
      } else {
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$currPos;
        s6 = peg$parsedot();
        if (s6 !== peg$FAILED) {
          s7 = [];
          s8 = peg$parsedigit();
          if (s8 !== peg$FAILED) {
            while (s8 !== peg$FAILED) {
              s7.push(s8);
              s8 = peg$parsedigit();
            }
          } else {
            s7 = peg$FAILED;
          }
          if (s7 !== peg$FAILED) {
            s6 = [s6, s7];
            s5 = s6;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        if (s5 === peg$FAILED) {
          s5 = null;
        }
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 === peg$FAILED) {
        s3 = peg$currPos;
        s4 = peg$parsedot();
        if (s4 !== peg$FAILED) {
          s5 = [];
          s6 = peg$parsedigit();
          if (s6 !== peg$FAILED) {
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parsedigit();
            }
          } else {
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c19(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsebinary_operator() {
    var s0;

    if (input.substr(peg$currPos, 2) === peg$c29) {
      s0 = peg$c29;
      peg$currPos += 2;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c30); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 42) {
        s0 = peg$c31;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c33;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c34); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 37) {
            s0 = peg$c35;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c36); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 43) {
              s0 = peg$c22;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c23); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 45) {
                s0 = peg$c20;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c37) {
                  s0 = peg$c37;
                  peg$currPos += 2;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c39) {
                    s0 = peg$c39;
                    peg$currPos += 2;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c40); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 38) {
                      s0 = peg$c41;
                      peg$currPos++;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c42); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c43) {
                        s0 = peg$c43;
                        peg$currPos += 2;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c44); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 2) === peg$c45) {
                          s0 = peg$c45;
                          peg$currPos += 2;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c46); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 60) {
                            s0 = peg$c47;
                            peg$currPos++;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c48); }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 62) {
                              s0 = peg$c49;
                              peg$currPos++;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c50); }
                            }
                            if (s0 === peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 61) {
                                s0 = peg$c51;
                                peg$currPos++;
                              } else {
                                s0 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c52); }
                              }
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 2) === peg$c53) {
                                  s0 = peg$c53;
                                  peg$currPos += 2;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c54); }
                                }
                                if (s0 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 2) === peg$c55) {
                                    s0 = peg$c55;
                                    peg$currPos += 2;
                                  } else {
                                    s0 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c56); }
                                  }
                                  if (s0 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 2) === peg$c57) {
                                      s0 = peg$c57;
                                      peg$currPos += 2;
                                    } else {
                                      s0 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c58); }
                                    }
                                    if (s0 === peg$FAILED) {
                                      if (input.substr(peg$currPos, 2) === peg$c59) {
                                        s0 = peg$c59;
                                        peg$currPos += 2;
                                      } else {
                                        s0 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c60); }
                                      }
                                      if (s0 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 2) === peg$c61) {
                                          s0 = peg$c61;
                                          peg$currPos += 2;
                                        } else {
                                          s0 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c62); }
                                        }
                                        if (s0 === peg$FAILED) {
                                          if (input.substr(peg$currPos, 2) === peg$c63) {
                                            s0 = peg$c63;
                                            peg$currPos += 2;
                                          } else {
                                            s0 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c64); }
                                          }
                                          if (s0 === peg$FAILED) {
                                            if (input.substr(peg$currPos, 2) === peg$c65) {
                                              s0 = peg$c65;
                                              peg$currPos += 2;
                                            } else {
                                              s0 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c66); }
                                            }
                                            if (s0 === peg$FAILED) {
                                              if (input.substr(peg$currPos, 3) === peg$c67) {
                                                s0 = peg$c67;
                                                peg$currPos += 3;
                                              } else {
                                                s0 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c68); }
                                              }
                                              if (s0 === peg$FAILED) {
                                                if (input.substr(peg$currPos, 3) === peg$c69) {
                                                  s0 = peg$c69;
                                                  peg$currPos += 3;
                                                } else {
                                                  s0 = peg$FAILED;
                                                  if (peg$silentFails === 0) { peg$fail(peg$c70); }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsename() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c75.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c76); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c75.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c76); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c77(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseAS() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsewsp();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c78) {
        s2 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c79); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseSELECT() {
    var s0;

    if (input.substr(peg$currPos, 6).toLowerCase() === peg$c80) {
      s0 = input.substr(peg$currPos, 6);
      peg$currPos += 6;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c81); }
    }

    return s0;
  }

  function peg$parseFROM() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsewsp();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c82) {
        s2 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c83); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseWHERE() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parsewsp();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c84) {
        s2 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsews() {
    var s0, s1;

    s0 = [];
    if (peg$c86.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c87); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      if (peg$c86.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }
    }

    return s0;
  }

  function peg$parsewsp() {
    var s0, s1;

    s0 = [];
    if (peg$c86.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c87); }
    }
    if (s1 !== peg$FAILED) {
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c86.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c87); }
        }
      }
    } else {
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsedigit() {
    var s0;

    if (peg$c88.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c89); }
    }

    return s0;
  }

  function peg$parsedot() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 46) {
      s0 = peg$c90;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c91); }
    }

    return s0;
  }

  function peg$parseminus() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 45) {
      s0 = peg$c20;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c21); }
    }

    return s0;
  }

  function peg$parseplus() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 43) {
      s0 = peg$c22;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c23); }
    }

    return s0;
  }

  function peg$parselparen() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 40) {
      s0 = peg$c96;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c97); }
    }

    return s0;
  }

  function peg$parserparen() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 41) {
      s0 = peg$c98;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c99); }
    }

    return s0;
  }

  function peg$parsejs_string_literal() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 34) {
      s1 = peg$c103;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c104); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsejs_double_string_character();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parsejs_double_string_character();
      }
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s3 = peg$c103;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c104); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c105(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c106;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c107); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsejs_single_string_character();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsejs_single_string_character();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c106;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c107); }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c105(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c102); }
    }

    return s0;
  }

  function peg$parsejs_double_string_character() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 34) {
      s2 = peg$c103;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c104); }
    }
    if (s2 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s2 = peg$c108;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parsejs_line_terminator();
      }
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsejs_source_character();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c110();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c108;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_escape_sequence();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c111(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsejs_line_continuation();
      }
    }

    return s0;
  }

  function peg$parsejs_single_string_character() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 39) {
      s2 = peg$c106;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c107); }
    }
    if (s2 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 92) {
        s2 = peg$c108;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parsejs_line_terminator();
      }
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsejs_source_character();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c110();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c108;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parsejs_escape_sequence();
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c111(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsejs_line_continuation();
      }
    }

    return s0;
  }

  function peg$parsejs_line_continuation() {
    var s0, s1, s2;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 92) {
      s1 = peg$c108;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c109); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsejs_line_terminator_sequence();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c112();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsejs_escape_sequence() {
    var s0, s1, s2, s3;

    s0 = peg$parsejs_character_escape_sequence();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 48) {
        s1 = peg$c113;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c114); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parsejs_decimal_digit();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c115();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsejs_hex_escape_sequence();
        if (s0 === peg$FAILED) {
          s0 = peg$parsejs_unicode_escape_sequence();
        }
      }
    }

    return s0;
  }

  function peg$parsejs_line_terminator() {
    var s0;

    if (peg$c116.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c117); }
    }

    return s0;
  }

  function peg$parsejs_source_character() {
    var s0;

    if (input.length > peg$currPos) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c118); }
    }

    return s0;
  }

  function peg$parsejs_character_escape_sequence() {
    var s0;

    s0 = peg$parsejs_single_escape_character();
    if (s0 === peg$FAILED) {
      s0 = peg$parsejs_non_escape_character();
    }

    return s0;
  }

  function peg$parsejs_single_escape_character() {
    var s0, s1;

    if (input.charCodeAt(peg$currPos) === 39) {
      s0 = peg$c106;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c107); }
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 34) {
        s0 = peg$c103;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c104); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s0 = peg$c108;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c109); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 98) {
            s1 = peg$c119;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c120); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c121();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 102) {
              s1 = peg$c122;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c123); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c124();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 110) {
                s1 = peg$c125;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c126); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c127();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 114) {
                  s1 = peg$c128;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c129); }
                }
                if (s1 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c130();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 116) {
                    s1 = peg$c131;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c132); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c133();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 118) {
                      s1 = peg$c134;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c135); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c136();
                    }
                    s0 = s1;
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsejs_line_terminator_sequence() {
    var s0;

    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 10) {
      s0 = peg$c100;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c101); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 2) === peg$c138) {
        s0 = peg$c138;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c139); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 13) {
          s0 = peg$c140;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c141); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 8232) {
            s0 = peg$c142;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c143); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 8233) {
              s0 = peg$c144;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c145); }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      if (peg$silentFails === 0) { peg$fail(peg$c137); }
    }

    return s0;
  }

  function peg$parsejs_non_escape_character() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    s2 = peg$parsejs_escape_character();
    if (s2 === peg$FAILED) {
      s2 = peg$parsejs_line_terminator();
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsejs_source_character();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c110();
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsejs_escape_character() {
    var s0;

    s0 = peg$parsejs_single_escape_character();
    if (s0 === peg$FAILED) {
      s0 = peg$parsejs_decimal_digit();
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 120) {
          s0 = peg$c146;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c147); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 117) {
            s0 = peg$c148;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c149); }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsejs_decimal_digit() {
    var s0;

    if (peg$c88.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c89); }
    }

    return s0;
  }

  function peg$parsejs_hex_escape_sequence() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 120) {
      s1 = peg$c146;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c147); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$currPos;
      s4 = peg$parsejs_hex_digit();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsejs_hex_digit();
        if (s5 !== peg$FAILED) {
          s4 = [s4, s5];
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        s2 = input.substring(s2, peg$currPos);
      } else {
        s2 = s3;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c150(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsejs_hex_digit() {
    var s0;

    if (peg$c151.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c152); }
    }

    return s0;
  }

  function peg$parsejs_unicode_escape_sequence() {
    var s0, s1, s2, s3, s4, s5, s6, s7;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 117) {
      s1 = peg$c148;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c149); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$currPos;
      s3 = peg$currPos;
      s4 = peg$parsejs_hex_digit();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsejs_hex_digit();
        if (s5 !== peg$FAILED) {
          s6 = peg$parsejs_hex_digit();
          if (s6 !== peg$FAILED) {
            s7 = peg$parsejs_hex_digit();
            if (s7 !== peg$FAILED) {
              s4 = [s4, s5, s6, s7];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        s2 = input.substring(s2, peg$currPos);
      } else {
        s2 = s3;
      }
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c150(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }


    let flatten = (head, tail, idx) => {
      let res = [head];
      tail.forEach((el) => { 
        if (el && el[idx])
          res.push(el[idx]);
      });
      return res;

    };

    let flatstr = (x, rejectSpace, joinChar) => {
      if (joinChar == null) {
        joinChar = '';
      }
      return R__namespace.reject(R__namespace.isEmpty, R__namespace.flatten(x)).join(joinChar);
    };



  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

let parse = peg$parse;

// node types
// 
// * base (num, str): constants
//
//   parType: null
//   type: base
//   val: num | str
//
// * attr
//
//   parType: base
//   type: attr
//   val: attribute name
//
// * set means they are all "equivalent"
//
//   parType: [ types ]
//   type: set
//
// * f 
//
//   parType: Type
//   type: f
//   val: function name
//   args: [ attribute name, ... ]
//
// base + base -> base
// base + X -> X
// attr + attr -> { attrs }
// attrs + attr-> { attrs }
// f(attr) -> f<attr>
// f<attr> + attr -> { f<>, attr }
// f<attr> + attrs -> { ... }
// f<attrs> -> f<attrs>



let Type = (({ parType, type, val, args }) => {
  let me = () => {};
  me.classType = "Type";
  me.parType = parType;
  me.type = type;
  me.val = val;
  me.args = args;

  me.clone = () => {
    let parType = null;
    if (R__namespace.is(Array, me.parType))
      parType = me.parType.map(R__namespace.invoker(0, "clone"));
    else if (me.parType)
      parType = me.parType.clone();
    return Type({ parType, type: me.type, val: me.val, args: me.args })
  };

  let basebase = (t1, t2) => {
    if (t1.val == t2.val) return t1.clone()
    return Type({ type: BASE, val: "str"})
  };
  let basex = (t1, t2) => t2.clone();
  let attrattr = (t1, t2) => {
    if (t1.val == t2.val) return t1.clone()
    return Type({ parType: [t1, t2], type: SET })
  };
  let attrf = (t1, t2) => {
    return Type({ parType: [t1.clone(), t2.clone()], type: SET })
  };
  let setx = (t1, t2) => {
    let copy = t1.clone();
    for (let p of t1.parType) {
      if (p.eq(t2)) return copy;
    }

    let toAdd = (t2.type == SET)? t2.parType : [t2];
    for (let p2 of toAdd) {
      if (!R__namespace.any((p1) => p1.eq(p2), copy.parType))
        copy.parType.push(p2.clone());
    }
    return copy
  };
  let ff = (t1, t2) => {
    if (t1.eq(t2)) return t1.clone()
    return Type({ parType: [t1, t2], type: SET })
  };

  me.merge = (t) => {
    if (!t) return me.clone()
    const funcs = [
      [BASE, BASE, basebase],
      [BASE, null, basex],
      [ATTR, ATTR, attrattr],
      [ATTR, F, attrf],
      [SET, null, setx],
      [F, F, ff]
    ];

    for (let [type1, type2, f] of funcs) {
      if (me.type == type1 && (t.type == type2 || type2 == null))
        return f(me, t)
      if ((me.type == type2 || type2 == null) && t.type == type1)
        return f(t, me)
    }
    throw new Error("Couldn't find merger for", me.toString(), t.toString())
  };

  me.toString = () => {
    if (me.type == BASE) return me.val;
    if (me.type == ATTR) return `${me.val}:${me.parType.val}`
    if (me.type == SET) 
      return `<${me.parType.map(R__namespace.invoker(0, "toString")).join(",")}>`

    let args = me.args.map((a) => a.toString());
    return `${me.val}(${args.join(", ")}):${me.parType.val}`
  };

  me.matchesAny = (...ts) => 
    R__namespace.any(me.matches, ts);

  me.matches = (t, recurse) => {
    //console.log(me.toString(), t.toString())
    if (me.eq(t)) return true;


    if (me.type == SET) {
      for (let p of me.parType) {
        if (p.matches(t, recurse)) return true;
      }
      return false;
    }

    // if we haven't moved up t's type hierarchy yet and it's a 
    // base type, then we can move up our own type hierarchy to check
    if (!recurse) {
      if (t.type == BASE && me.parType)
        return me.parType.matches(t, recurse)
    }

    if (t.type == ATTR || t.type == F) {
      if (me.type == BASE) return me.matches(t.parType, true)
      return false;
    }
    if (t.type == SET) {
      return R__namespace.any((p) => me.matches(p, true), t.parType)
    }
    return false;
  };

  me.eq = (t) => {
    if (!t) return false;
    if (!(me.type == t.type && me.val == t.val && R__namespace.equals(me.args, t.args))) 
      return false;

    if (me.type == F) 
      return me.parType.eq(t.parType)

    if (me.type == SET) {
      let pairs = R__namespace.xprod(me.parType, t.parType);
      return R__namespace.any(([p1, p2]) => p1.eq(p2), pairs)
    }

    return true;
  };

  return me;
});

// constructors
Type.base = (numorstr) => 
  Type({ type: Type.BASE, val: numorstr || "str" });

Type.attr = (attr, numorstr) => Type({ 
  parType: Type.base(numorstr),
  type: Type.ATTR, 
  val: attr 
});

// list of string or attribute Types
Type.set = (...args) => {
  let parType = R__namespace.flatten(args).map((a) => {
    if (R__namespace.is(String, a)) return Type.attr(a)
    else return a
  });
  return Type({ parType, type: Type.SET })
};

Type.f = (fname, ...args) => Type({ 
  parType: Type.num,
  type: Type.F,
  val: fname, 
  args: R__namespace.flatten(args) 
});


Type.BASE = 0;
Type.ATTR = 1;
Type.SET = 2;
Type.F = 3;

Type.num = Type.base("num");
Type.str = Type.base("str");

Type.mergeAll = (...types) => {
  types = R__namespace.flatten(types);
  if (!types.length) return null;
  return R__namespace.reduce((acc, v) => acc.merge(v), 
    types[0], R__namespace.tail(types))
};

const BASE = Type.BASE;
const ATTR = Type.ATTR;
const SET = Type.SET;
const F = Type.F;

// given an alias and type, find all candidate
// schema matches from v2
//
// returns: [ {ralias, rtype}, ...]
let findAttrMatches = (lalias, ltype, v1, v2) => {
  let raliases = VCA.getVisuallyMappedAliases(v2);
  let rtypes = raliases.map(v2.q.inferType);
  let isMeasure = (v,alias) => v.mapping.measure == alias;
  //console.debug("match.right", raliases, rtypes.map(R.invoker(0,"toString")))


  let candidates = [];
  for (let [ralias, rtype] of R__namespace.zip(raliases, rtypes)) {
    if (isMeasure(v1,lalias) && isMeasure(v2, ralias)) {
      if (ltype.matchesAny(rtype, Type.num) || rtype.matches(Type.num)) {
        candidates.push({ ralias, rtype });
        continue
      }
    } else if (isMeasure(v1,lalias) || isMeasure(v2, ralias)) 
      continue

    if (ltype.matches(rtype) )
      candidates.push({ ralias, rtype });
  }
  return candidates;
};


// Naive nest loops schema matcher that matches each attribute in
// v1's query schema to <= 1 attributes in v2's schema
//
// View arguments are expected to support following API:
//  view.q
//  view.mapping
//
// returns:  leftalias -> [ rightalias, ... ]
//           or null if match is ambiguous
// Wrapper functions can check for incomplenteness
let getMatch = (v1, v2) => {
  let laliases = VCA.getVisuallyMappedAliases(v1);
  let ltypes = laliases.map(v1.q.inferType);
  let match = {};  // left alias -> right alias
  let rmatch = {}; // the reverse: right -> left
  //console.debug("match.left", laliases, ltypes.map(R.invoker(0,"toString")))


  let checkMatch = (lalias, ralias) => {
    if (match[lalias] || rmatch[ralias])  {
      console.error(`${lalias}->${ralias} but already has match:`, match);
      return false
    }
    return true;
  };

  let findBestMatch = (lalias, ltype) => {
    let candidates = findAttrMatches(lalias, ltype, v1, v2);
    let costF = ({ralias, rtype}) => 
      -((ralias==lalias)*100 + (ltype.eq(rtype))*50 + 1);

    candidates = R__namespace.pipe(
      R__namespace.sortBy(costF),
      R__namespace.reject(({ralias, rtype}) => rmatch[ralias])
    )(candidates);
    return (candidates.length)? candidates[0].ralias : null;
  };

  for (let [lalias, ltype] of R__namespace.zip(laliases, ltypes)) {
    let ralias = findBestMatch(lalias, ltype);
    if (!ralias) continue;
    if (checkMatch(lalias, ralias)) {
      match[lalias] = ralias;
      rmatch[ralias] = lalias;
    } else 
      return null;
  }
  return match;
};

//
// returns: v1alias -> v2alias
//          mapping from v1.q's schema to v2.q's schema
let getBinaryDotMatch = (v1, v2) => {
  let match = null;
  if (v2.q.classType == "Model" && v1.q.classType != "Model") {
    match = getBinaryDotMatch(v2, v1);
    return R__namespace.invertObj(match)
  }

  match = getMatch(v1, v2);
  let rmatch = R__namespace.invertObj(match);

  let laliases = VCA.getVisuallyMappedAliases(v1);
  let raliases = VCA.getVisuallyMappedAliases(v2);
  let lmeasures = laliases.filter((la) => v1.mapping.measure == la);
  let rmeasures = raliases.filter((ra) => v2.mapping.measure == ra);

  // All v2.Agbs should have matches to support non-exact schema composition
  let rGbAttrs = R__namespace.intersection(
    R__namespace.pluck("alias", VCA.getAgb(v2.q)),
    R__namespace.values(v2.mapping)
  );
  //console.log("rAgb & v2.mapping", R.pluck("alias", VCA.getAgb(v2.q)),  v2.mapping, rGbAttrs)
  if(!R__namespace.all((alias)=>rmatch[alias], rGbAttrs)) {
    console.error("Not all v2.Agbs have matches", 
      R__namespace.pluck("alias", VCA.getAgb(v1.q)),
      rGbAttrs, 
      "match:", rmatch);
    return null;
  }

  // Measures should be matched
  if (!R__namespace.all((alias) => match[alias], lmeasures)) { 
    console.error("v1 measure not matched: ", 
      lmeasures, "match:", match);
    return null;
  }
  if (!R__namespace.all((alias) => rmatch[alias], rmeasures)) {
    console.error("v2 measure not matched: ", rmeasures, rmatch); 
    return null;
  }
  return match;
};

let getNaryDotMatch = (vs) => {
  const isCanonical = (q) => {
    let ops = VCA.find(q, ["Join", "ModelQueryJoin", "ModelModelJoin", "GroupBy"]);
    let b =  !ops.length || ops[0].classType == "GroupBy";
    if (!b)
      console.error("NaryDot: view not in canonical form", q);
    return b;
  };
  if (!R__namespace.all(isCanonical, R__namespace.pluck("q", vs))) return null;
  if (vs.length <= 1) return {}

  let v1 = vs[0];
  let matches = R__namespace.tail(vs).map((v2) => getBinaryDotMatch(v1, v2));
  // check matches are all the same
  if (R__namespace.all(R__namespace.equals(matches[0]), R__namespace.tail(matches)))
    return matches[0]
  return null;
};

const getMax = R__namespace.reduce(R__namespace.max, -Infinity);
const isSubset = R__namespace.curry((subset, set) => 
  R__namespace.equals(R__namespace.intersection(subset, set), subset));
const toSchema = (v) => R__namespace.pluck("attr", v.q.schema());

// Check that all schemas are either identical, 
// or all subsets of the "largest" schema
let getUnionMatch = (vs) => {
  let schemas = vs.map(toSchema);
  console.log(schemas);

  // find largest schema(s)
  let sizes = R__namespace.pluck("length", schemas);
  let maxSize = getMax(sizes);
  console.log(maxSize);
  let isMax = (schema) => schema.length == maxSize;
  let bMaxes = schemas.map(isMax);
  let largestSchemas = schemas.filter(isMax);
  
  // make sure largest schemas are exact matches
  if (!R__namespace.all(R__namespace.equals(largestSchemas[0]), R__namespace.tail(largestSchemas)))
    return null;

  // make sure the remaining schemas are subsets
  let rest = R__namespace.reject(isMax, schemas);
  if (rest && !R__namespace.all(isSubset(rest[0]), R__namespace.tail(rest)))
    return null;
  
  console.log(sizes);
  console.log(bMaxes);
  return {
    largest: vs.filter((v,i) => bMaxes[i], vs),
    rest: vs.filter((v,i) => !bMaxes[i], vs)
  }
  
};

squelbase__namespace.useFlavour('postgres');


//
// app: Application object.  Mainly used to retrieve handle to db
// View: constructor to create new views.
//
let VCA = (({app, View}) => {
  let me = () => {};
  me.app = app;
  me.db = (app)? app.db : null;

  var id = 0;
  let newAlias = (prefix="t") => `${prefix}${id++}`;


  me.dot = async (op, arg1, arg2) => {
    if (!arg1) {
      [arg1, arg2] = [arg2, null];
    }
    if (!arg1) return null;


    if (R__namespace.is(Array, arg1)) {
      if (!arg2) return me.naryDot(op, arg1)
      if (R__namespace.is(Array, arg2)) {
        return Promise.all(R__namespace.chain(
          (v1) => arg2.map((v2) => me.binaryDot(op, v1, v2)), 
          arg1
        ))
      }
      return Promise.all(arg1.map((v1) => me.binaryDot(op, v1, arg2)))
    }

    // arg1 is a View
    const v1 = arg1;
    if (!arg2) 
      return null;
    if (R__namespace.is(Array, arg2))
      return Promise.all(arg2.map((v2) => me.binaryDot(op, v1, v2)))
    return await me.binaryDot(op, v1, arg2)

  };

  // return Agb attributes that have one distinct value
  // return: Array<str>
  me.getUnaryAgbs = async (v) => {
    // XXX: assumes that the Groupby's Agb are preserved
    // in the query result schema!!
    //
    let gbs = VCA.find(v.q, "GroupBy");
    if (gbs.length == 0) return [];
    let attrs = [];
    let AgbExprs = R__namespace.pluck("e", gbs[0].Agb);
    let cards = await getExprCardinalities(me.db, AgbExprs, v.q);
    R__namespace.zip(gbs[0].Agb, cards).forEach(([a, count]) => {
      if (count == 0) attrs.push(a);
    });
    return attrs;
  };

  //
  //
  //
  me.binaryDot = async (op, v1, v2) => {
    let match = getBinaryDotMatch(v1, v2);
    if (!match) {
      throw new Error("Views are not compatible")
    }

    match = R__namespace.omit([v1.mapping.measure], match);

    let lalias = newAlias(), 
        ralias = newAlias(),
        q1 = v1.q,
        q2 = v2.q;

    const isModel = (v) => v.q.classType == "Model";
    const toJoinCond = (match) => {
      let conds = R__namespace.toPairs(match).map(([lattr, rattr]) => {
        if (v1.mapping.measure == lattr) return null;
        return Expr({ op: "=", 
          l: Attr({table: lalias, attr: lattr}),
          r: Attr({table: ralias, attr: rattr})
        })
      });
      return R__namespace.reject(R__namespace.isNil, conds)
    };

    // XXX: fails when dragging cyl-mpg onto model view of cyl,hp->mpg
    // should be rejected since cyl does not fully schema match to cyl,hp.
    //
    // In general, if query-model join, then schema should fully match.
    // If query-query, then rigt side needs a full match, but not left side.

    // Type of join depends on whether v1/v2 are Models or not
    let on = toJoinCond(match);
    let join = null;
    if (isModel(v1) && isModel(v2)) {
      let bounds = mergeBounds(q1.bounds, q2.bounds);
      q1.setBounds(bounds);
      q2.setBounds(bounds);

      join = Join({
        l: q1, r: q2,
        lalias, ralias, on, bounds
      });
    } else if (isModel(v1) && !isModel(v2)) {
      join = ModelQueryJoin({
        l: q2, r: q1,
        lalias:newAlias(), ralias:newAlias()
      });
      join = Join({
        l: join, r: q2,
        lalias, ralias, on
      });
    } else if (!isModel(v1) && isModel(v2)) {
      join = ModelQueryJoin({
        l: q1, r: q2, 
        lalias: newAlias(), ralias: newAlias()
      });
      join = Join({
        l: q1, r: join,
        lalias, ralias, on
      });
    } else {
      let unaryAttrs = await me.getUnaryAgbs(v2);
      match = R__namespace.invertObj(R__namespace.omit(unaryAttrs,R__namespace.invertObj(match)));
      on = toJoinCond(match);
      //console.log("dropped unary attrs:", unaryAttrs, "match:", match)
      join = Join({
        type: "outer",
        l: q1, r: q2, lalias, ralias, on
      });
    }

    let exprs = R__namespace.reject(
      (attr) => attr == v1.mapping.measure,
      R__namespace.pluck("attr", q1.schema())
    ).map((attr) => 
      PClause({ e: Attr({table: lalias, attr}), alias: attr}));
    exprs.push(PClause({
      e: VCA.parse(op.f(
        `${lalias}.${v1.mapping.measure}`, 
        `${ralias}.${v2.mapping.measure}`
      )),
      alias: v1.mapping.measure
    }));
    let q = Project({ exprs, child: join });

    // keep the visual mappings that q still can support
    let mapping = assignVisualMapping(q.schema(), v1.mapping);
    if (op.mark)
      mapping.mark = op.mark;
    console.log("new View mapping", mapping);

    return View({
      q,
      r: mapping,
      name: `${v1.viewName} ${op.label} ${v2.viewName}`,
      opts: {
        width: v1.width,
        height: v1.height,
        viewType: "composed"
      }
    })
  };

  me.naryDot = async (op, vs) => {
    // Drop gb attribute if unary in every view
    let allUnaryAttrs = await vs.map(me.getUnaryAgbs);
    let unaryAttrs = R__namespace.reduce(
      R__namespace.intersection, allUnaryAttrs[0], R__namespace.tail(allUnaryAttrs));

    // TODO: relax this verification
    if (!getNaryDotMatch(vs)) {
      console.error(vs);
      throw new Error("naryDot: could not find match or query not canonical form")
    }

    let children = vs.map((v) => v.q.c.clone());
    let union = Union({children});
    let copy = vs[0].q.clone();
    const Agb = R__namespace.reject((pc) => 
      R__namespace.contains(pc.alias, unaryAttrs), copy.Agb);

    const Fs = copy.Fs.map((pc) => {
      // take the arguments of the original agg function
      // and use op.f instead
      // e.g., f(a) --> op.f(a)
      const alias = pc.alias;
      const arg = pc.e.args[0];
      // TODO: change Attr table references in arg
      const e = Func({fname: op.f, args:[arg]});
      return PClause({e, alias})
    });
    
    let q = GroupBy({ Agb, Fs, child: union });
    return View({
      q, 
      r: vs[0].mapping, 
      name: `vset${id++}`,
      opts: {
        width: vs[0].width,
        height: vs[0].height,
        viewType: "composed"
      }

    })
  };


  me.union = async (op, args1, args2) => {
    if (R__namespace.is(Array, args1))
      return me.naryUnion(op, args1)
    if (args1.type == "View" && args2 && args2.type == "View")
      return me.naryUnion(op, [args1, args2])
    return null;
  };

  // TODO: find a way to union a constant with a view to overlay a horizontal line..
  me.naryUnion = async (op, vs) => {
    let matches = getUnionMatch(vs);
    if (!matches) {
      console.error(vs);
      throw new Error("naryUnion: could not find match")
    }
    // views with largest schemas and the rest
    let {largest, rest} = matches;
    console.log(matches);


    // all queries that will be unioned together
    let children = []; 

    largest.forEach((v) =>  {
      let q = v.q.clone();
      let ops = VCA.find(q, ["GroupBy", "Project"]);
      let pc = PClause({
        e: Value({type: "Literal", value: v.viewName}),
        alias: 'qid'
      }); 
      if (ops.length == 0) {
        let exprs = [ ];
        children.push(Project({ exprs, child: v.q }));
        return;
      }

      // TODO: reorder projections so they all match 1st query's schema
      // 1. get matches
      // 2. create custom projection for each query
      // 3. union

      if (ops[0].classType == "Project") 
        ops[0].pcs.push(pc);
      else {
        // wrap GroupBy in a Project so attr orderings are the same
        let exprs = ops[0].schema().map((A) => 
          PClause({ e: Attr(A.attr), alias: A.attr }));
        exprs.push(pc);
        children.push(Project({ 
          exprs, 
          child: Source({ source: q, alias: newAlias()}) 
        }));
        return
      }
      children.push(q);
    });

    // Handle the rest of the schemas
    // v1 ∈ rest, v2 ∈ largest
    // v1's schema is a subset of v2's, so perform a cross product 
    // between v1.schema and v2.schema-v1.schema
    let largeV = largest[0];
    let largeSchema = R__namespace.pluck("attr", largeV.q.schema());
    const aliasToPC = (alias) => PClause({ e: Attr(alias), alias });
    rest.forEach((v) => {
      let schema = R__namespace.pluck("attr", v.q.schema());
      let diff = R__namespace.difference(largeSchema, schema);
      let pc = PClause({
        e: Value({type: "Literal", value: v.viewName}),
        alias: 'qid'
      }); 


      let l = v.q;
      let r = Project({
        exprs: diff.map(aliasToPC),
        child: Source( { source: largeV.q, alias: newAlias() })
      });
      let j = Join({
        l, r,
        lalias: newAlias("l"), 
        ralias: newAlias("r")
      });

      let exprs = largeSchema.map(aliasToPC);
      exprs.push(pc);
      let q = Project({
        exprs,
        child: Source({ source: j, alias: newAlias() })
      });
      children.push(q);
    });



    // Probably want to make qid a column-facet and swap nonmeasure
    // positional variable with column
    let union = Union({children});
    let mapping = assignVisualMapping(union.schema(), largest[0].mapping);
    let opts = {
      width: largest[0].width,
      height: largest[0].height,
      viewType: "composed"
    };

    if (mapping.column) {
      let cards = await getExprCardinalities(me.db, [Attr(mapping.column)], union);
      opts.width = ((75 + 25) * cards[0]) + 125;
    }

    return View({
      q: union,
      r: mapping,
      name: newAlias("vset"),
      opts
    })
  };



  /*
   * op: { 
   *   Af,   -- Array<Attr>
   *   Ac,   -- Array<Attr>
   *   y,    -- Attr
   *   model -- str
   * } 
   */
  me.lift = async (op, v) => {
    let mapping = { mark: "line", measure: v.mapping.measure };
    if (!op.Af) {
      if (v.rmapping['y'] == v.mapping.measure)  // 1D
        op.Af = [Attr(v.mapping['x'])];
      else  // 2D
        op.Af = [Attr(v.mapping['x']), Attr(v.mapping['y'])];
    } else
      op.Af = R__namespace.flatten([op.Af]);

    op.Ac = R__namespace.reject(R__namespace.isNil, R__namespace.flatten([op.Ac]));

    if (op.Af.length == 0)
      mapping.mark = "bar";
    else if (op.Af.length == 2) 
      mapping.mark = "point";
    else if (op.Af.length > 2) 
      mapping.mark = "table";
    op.y = op.y || Attr(v.mapping.measure);

    let q = Model({
      child: v.q,
      Af: op.Af,
      Ac: op.Ac,
      y: op.y,
      model: op.model
    });
    
    let bounds = await getBounds(me.db, v.q, op.Af);
    q.setBounds(bounds);

    // train the model 
    await q.setup(me.db);


    // naive algorithm to assign visual vars
    const toAttrs = (A) => R__namespace.reject(R__namespace.isNil, R__namespace.pluck('attr',R__namespace.flatten([A])));
    let vattrs1 = ["x", "y"];
    let vattrs2 = ["color", "shape", "column"];
    // features go to x, y
    op.Af.forEach((a,i) => {
      mapping[vattrs1[i]] = a.attr;
    });
    if (op.Af.length <= 1) {
      mapping.y = op.y.attr;
    } else {
      mapping.color = op.y.attr;
      vattrs2 = R__namespace.tail(vattrs2); // remove color from candidates
    }
    op.Ac.forEach((a,i) => {
      mapping[vattrs2[i]] = a.attr;
    });

    console.group("lift");
    console.log(`${toAttrs(op.Af)}->${op.y.attr} | ${toAttrs(op.Ac)}`);
    console.log(mapping);
    console.groupEnd();

    return View({
      q,
      r: mapping,
      name: `vset${id++}`,
      opts: {
        width: v.width,
        height: v.height,
        viewType: "composed"
      }
    })
  };




  return me;
});


VCA.parse = parse;

// get all operators in query plan q where f(op) returns true
VCA.collect = (q, f) => {
  var ops = [];
  q.traverse((op) => {
    if (f(op) == true) ops.push(op);
  });
  return ops;
};

// get all operators in query plan with given class type
VCA.find = (q, classTypeOrTypes) => {
  if (R__namespace.is(String, classTypeOrTypes)) classTypeOrTypes = [classTypeOrTypes];
  return VCA.collect(q, (op) => R__namespace.contains(op.classType, classTypeOrTypes));
};

VCA.getAliases = (q) =>
  R__namespace.pluck('attr', q.schema());

VCA.getVisuallyMappedAliases = (v) => 
  R__namespace.intersection(VCA.getAliases(v.q), R__namespace.values(v.mapping));

VCA.getAgb = (q) => {
  let gbs = VCA.find(q, "GroupBy");
  if (gbs.length == 0) return [];
  return gbs[0].Agb;
};

const squel$1 = squelbase__namespace.useFlavour('postgres');


const toSql = R__namespace.invoker(0, "toSql");
const clone = R__namespace.invoker(0, "clone");
const getAttrs = R__namespace.pluck('attr');

let aliasid = 0;
let newAlias = (prefix="tmp") => `${prefix}_${aliasid++}`;


/*
 * attr: attribute string
 * bound: [min, max]
 * n: number of samples
 */
let Samples = (({attr, bound, n}) => {
  let me = () => {};
  me.classType = "Samples";
  me.bound = bound;
  me.attr = attr;
  me.min = bound[0];
  me.max = bound[1];
  me.n = n;

  me.toSql = () => {
    let q = squel$1.select()
      .from(`generate_series(1, ${me.n})`)
      .field(`generate_series * ${(me.max-me.min)/me.n} + ${me.min}`, me.attr);
    return q;
  };

  me.inferType = (alias) => {
    if (alias == me.attr) return Type.attr(alias)
    return null;
  };
  me.traverse = (f) => f(me);
  me.clone = () => Sample({ attr:me.attr, bound: [me.min, me.max], n:me.n });
  me.schema = () => [Attr(me.attr)];
  return me;
});


/*
 * Af: list of Attr
 * Ac: list of Attr.  default: []
 * y:  Attr  default: Attr("y")
 * model: linear, logistic, poly, or glm
 */
let Model = (({child, Af, Ac, y, model}) => {
  let me = () => {};
  me.classType = "Model";
  me.Af = Af;
  me.Ac = Ac || [];
  me.y = y || Attr("y");
  me.c = child;
  me.model = model || "linear";
  me.modelTableName = newAlias('modelout');
  me.input = newAlias("modelin"); // used to refer to child subq
  me.bounds = [];
  me.n = 50;

  me.setBounds = (bounds, n) => { 
    if (bounds.length < me.Af.length) {
      console.error("bounds: ", bounds);
      console.error("Af: ", R__namespace.pluck("attr", me.Af));
      throw new Error("Missing bounds for features")
    }
    me.bounds = bounds; 
    me.n = (n == null)? me.n : n;
    let perdim = Math.pow(500, 1/R__namespace.keys(bounds).length);
    me.n = Math.max(2, Math.round(Math.min(perdim, me.n)));
  };

  me.setup = async (db) => {
    // http://madlib.apache.org/docs/latest/group__grp__linreg.html
    let subq = me.c.toSql();
    let createQs = [
      `DROP TABLE IF EXISTS ${me.input};`,
      `DROP TABLE IF EXISTS ${me.modelTableName};`,
      `DROP TABLE IF EXISTS ${me.modelTableName}_summary;`,
      `CREATE TABLE ${me.input} as ${subq.toString()};`
    ];

    console.group("Model.setup");
    for (const q of createQs) {
      console.info(q);
      await runQuery(db, q);
    }

    let list = R__namespace.concat([1], getAttrs(me.Af));
    let features = `ARRAY[${list.join(',')}]`;
    let grouping = (me.Ac.length)? `'${getAttrs(me.Ac).join(',')}'`: 'null';
    let select = "";

    if (me.model == "linear") {
       select = `madlib.linregr_train(
        '${me.input}', 
        '${me.modelTableName}', 
        '${me.y.attr}',
        '${features}',
        ${grouping}
      )`;
    } else if (me.model == "logistic") {
      select = `madlib.logregr_train(
        '${me.input}',
        '${me.modelTableName}',
        '${me.y.attr}',
        '${features}',
        ${grouping}
      )`;
    } else if (me.model == "glm") {
      select = `madlib.glm(
        '${me.input}',
        '${me.modelTableName}',
        '${me.y.attr}',
        '${features}',
        'family=gaussian,link=log',
        ${grouping}
      ) `;
    }
    let q = squel$1.select().field(select);
    console.info(q.toString());
    console.groupEnd();
    await runQuery(db, q.toString());

    return me;
  };

  // returns a query that, given bounds, will run the predictions
  me.toSql = () => {
    let q = squel$1.select();

    let featureRefs = [1];
    me.bounds.forEach(([A, bound]) => {
      let attr = A.attr;
      let samples = Samples({attr, bound, n:me.n});
      let samAlias = newAlias("samples");
      q.from(samples.toSql(), samAlias);
      q.field(`${samAlias}.${attr}`, attr);
      featureRefs.push(`${samAlias}.${attr}`);
    });
    let features = `ARRAY[${featureRefs.join(',')}]`;

    let predict = `madlib.linregr_predict(
      ${me.modelTableName}.coef, 
      ${features})`;
    if (me.model == "logistic") 
      predict = `madlib.logregr_predict(
        ${me.modelTableName}.coef, 
        ${features})`;
    else if (me.model == "glm")
      predict = `madlib.glm_predict(
        ${me.modelTableName}.coef, 
        ${features}, 'log')`;

    q.from(me.modelTableName);
    q.field(predict, me.y.attr);
    me.Ac.forEach((a) => {
      q.field(`${me.modelTableName}.${a.attr}`, a.attr);
    });
    return q
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.c.traverse(f);
  };
  me.clone = () => {
    let copy = Model({
      child: me.c.clone(),
      Af: me.Af.map(clone),
      Ac: me.Ac.map(clone),
      y: me.y.clone(),
      model: me.model
    });
    copy.setBounds(R__namespace.clone(me.bounds), me.n);
    copy.modelTableName = me.modelTableName;
    copy.input = me.input;
    return copy;
  };
  me.schema = () => R__namespace.flatten([me.Af, me.Ac, me.y]);
  me.inferType = (alias) => me.c.inferType(alias);

  return me;
});


let Union = (({children}) => {
  let me = () => {};
  me.classType = "Union";
  me.cs = children;
  me.alias = newAlias("union");

  me.toSql = () => {
    let subq = R__namespace.reduce((acc, c) => acc.union(c.toSql()), 
      me.cs[0].toSql(),
      R__namespace.tail(me.cs));
    return squel$1.select().from(subq, me.alias)
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.cs.forEach((c) => c.traverse(f));
  };

  me.clone = () => {
    return Union({children: me.cs.map(clone)})
  };
  me.schema = () =>  me.cs[0].schema(); 
  me.inferType = (alias) => me.cs[0].inferType(alias);

  return me;
});

let Where = (({exprs, negated, child}) => {
  let me = () => {};
  me.classType = "Where";
  me.exprs = R__namespace.is(Array, exprs)? exprs : [exprs];
  me.c = child;
  me.negated = (negated === undefined)? false : negated;

  me.toSql = () => {
    let e = squel$1.expr();
    me.exprs.forEach((expr) => e.and(expr.toSql()));

    var q = me.c.toSql();
    if (me.negated)
      q.where(`not (${e.toString()})`);
    else
      q.where(e);
    return q;
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.exprs.forEach((e) => e.traverse(f));
    me.c.traverse(f);
  };


  me.addWherePredicate = (e) => {
    me.exprs.push(e);
    return me;
  };

  me.clone = () => {
    return Where({
      exprs: me.exprs.map(clone),
      negated: me.negated,
      child: clone(me.c)
    });
  };
  me.schema = () =>  me.c.schema();
  me.inferType = (alias) => me.c.inferType(alias);

  return me;
});

/*
 * type: left, right, full.  else: inner
 * l,r: Query Plans
 * on: [Expr, ...]
 */
let Join = (({type, l, r, on, lalias, ralias}) => {
  let me = () => {};
  me.classType = "Join";
  me.type = type || "inner";
  me.l = l;
  me.r = r;
  me.on = on; // list of Expr

  me.lalias = lalias;
  me.ralias = ralias;
  if (!me.lalias || !me.ralias) {
    throw new Error("Join inputs must have aliases: ", me.lalias, me.ralias);
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.on.forEach((e) => e.traverse(f));
    me.l.traverse(f);
    me.r.traverse(f);
  };

  me.toSql = () => {
    let l = me.l.toSql();
    let r = me.r.toSql(); 
    var q = squel$1.select().from(l, me.lalias);
    let f = (accum, e) => accum.and(e.toSql());
    let joinCondition = squel$1.expr().and("1=1");

    if (me.on && me.on.length)
      joinCondition = R__namespace.reduce(f, squel$1.expr(), me.on);

    if (me.type == "left")
      q.left_join(r, ralias, joinCondition);
    else if (me.type == "right")
      q.right_join(r, ralias, joinCondition);
    else if (me.type == "full")
      q.outer_join(r, ralias, joinCondition);
    else
      q.join(r, ralias, joinCondition);
    
    return q;
  };

  me.clone = () => {
    return Join({
      type: me.type,
      l: clone(me.l) ,
      r: clone(me.r),
      lalias: me.lalias,
      ralias: me.ralias,
      on: me.on.map(clone)
    });
  };
  me.schema = () => {
    let schema = [];
    R__namespace.concat(me.l.schema(), me.r.schema()).map((attr) => {
      attr = attr.clone();
      attr.table = null;
      schema.push(attr);
    });
    return schema;
  };
  me.inferType = (alias) => {
    let laliases = getAttrs(me.l.schema());
    let raliases = getAttrs(me.r.schema());
    let ltype = null, rtype = null;
    if (R__namespace.contains(alias, laliases))
      ltype = me.l.inferType(alias);
    if (R__namespace.contains(alias, raliases))
      rtype = me.r.inferType(alias);
    let types = R__namespace.reject(R__namespace.isNil, [ltype, rtype]);
    if (types.length)
      return R__namespace.reduce((acc,v) => acc.merge(v), types[0], R__namespace.tail(types))
    return null;
  };

  return me;
});


/*
 * Convention: query is left, model is right
 * 
 */
let ModelQueryJoin = ({l, r, lalias, ralias}) => {
  let me = () => {};
  me.classType = "ModelJoin";
  me.l = l;
  me.r = r;
  me.lalias = lalias;
  me.ralias = ralias;

  if (r.classType != "Model") 
    throw new Error("ModelQueryJoin expects Model as right side")


  me.toSql = () => {
    let q = squel$1.select();
    let lattrs = R__namespace.pluck("attr", me.l.schema());
    let list = [1];

    // feature attributes not in l should be filled in via sampling
    me.r.bounds.forEach(([A, bound]) => {
      if (R__namespace.contains(A.attr, lattrs)) {
        q.field(`${me.lalias}.${A.attr}`, A.attr);
        list.push(`${me.lalias}.${A.attr}`);
        return;
      }
      let attr = A.attr;
      let samples = Samples({attr, bound, n: me.r.n});
      let samAlias = newAlias("samples");
      q.from(samples.toSql(), samAlias);
      q.field(`${samAlias}.${attr}`, attr);
      list.push(`${samAlias}.${attr}`);
    });

    let features = `ARRAY[${list.join(',')}]`;
    let predict = `madlib.linregr_predict(
      ${me.ralias}.coef, 
      ${features})`;
    if (me.r.model == "logistic") 
      predict = `madlib.logregr_predict(
        ${me.ralias}.coef, 
        ${features})`;
    else if (me.r.model == "glm")
      predict = `madlib.glm_predict(
        ${me.ralias}.coef, 
        ${features}, 'log')`;
    q.field(predict, r.y.attr);

    let joinCond = squel$1.expr().and("1=1");
    if (me.r.Ac && me.r.Ac.length) {
      me.r.Ac.forEach((a) => {
        q.field(`${me.ralias}.${a.attr}`);
        if (!R__namespace.contains(a.attr, R__namespace.pluck("attr", me.l.schema()))) return
        joinCond.and(`${me.lalias}.${a.attr} = ${me.ralias}.${a.attr}`);
      });
    } 

    q.from(me.r.modelTableName, me.ralias)
      .join(me.l.toSql(), me.lalias, joinCond);

    me.r.Ac.forEach((a) => q.field(`${me.ralias}.${a.attr}`));
    //me.r.Af.forEach((a) => q.field(`${me.lalias}.${a.attr}`))
      
    return q;
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.l.traverse(f);
    me.r.traverse(f);
  };

  me.clone = () => ModelQueryJoin({
    l: me.l.clone(),
    r: me.r.clone(),
    lalias: me.lalias,
    ralias: me.ralias
  });

  me.schema = () => me.l.schema();
  me.inferType = (alias) => me.l.inferType(alias);

  return me;
};


let Source = (({source, schema, alias}) => {
  let me = () => {};
  me.classType = "Source";
  me.source = source;  // either  str table name or root operator of subquery
  me._schema = schema;  
  me.alias = alias;
  me.isBaseTable = R__namespace.is(String, me.source);

  me.toSql = () => {
    if (me.isBaseTable) return squel$1.select().from(me.source, me.alias)
    return squel$1.select().from(me.source.toSql(), me.alias)
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    if (!me.isBaseTable) me.source.traverse(f);
  };


  me.clone = () => {
    return Source({
      source: me.isBaseTable? me.source : clone(me.source),
      schema: me._schema? me._schema.map(clone) : null,
      alias: me.alias
    })
  };
  me.schema = (newSchema) => {
    if (newSchema && me.isBaseTable)
      me._schema = newSchema;
    if (me.isBaseTable) 
      return me._schema;
    return me.source.schema()
  };
  me.inferType = (alias) => {
    // TODO: we assume all attributes are numeric and ignore the actual schema
    if (me.isBaseTable) return Type.attr(alias)
    return me.source.inferType(alias)
  };

  return me;
});

let Project = (({exprs, child}) => {
  let me = () => {};
  me.classType = "Project";
  me.pcs = exprs; // PClause objects
  me.c = child;

  me.toSql = () => {
    var q = me.c? me.c.toSql() : squel$1.select();
    me.pcs.forEach((pc) => q.field(pc.toSql(), pc.alias));
    return q
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.pcs.forEach((pc) => pc.traverse(f));
    if (me.c)
      me.c.traverse(f);
  };


  me.clone = () => {
    return Project({
      exprs: me.pcs.map(clone),
      child: me.c? me.c.clone(): null
    })
  };

  me.schema = () => {
    let schema = [];
    me.pcs.forEach((pc) => {
      if (pc.e.classType == "Star") {
        schema = R__namespace.concat(schema, me.c.schema());
      } else {
        schema.push(Attr({ attr: pc.alias, type: pc.getType() }));
      }
    });
    return schema
  };

  me.inferType = (alias) => {
    let type = null;
    let hasStar = false;
    me.pcs.forEach((pc) => {
      if (pc.alias == alias) {
        if (!me.c)  {
          type = pc.inferType();
        } else {
          let attrs = VCA.find(pc, "Attr");
          let types = R__namespace.pipe(
            R__namespace.uniq,
            R__namespace.pluck("attr"),
            R__namespace.map(me.c.inferType),
            R__namespace.reject(R__namespace.isNil)
          )(attrs);

          if (types.length) 
            type = Type.mergeAll(types);
          else
            type = pc.inferType();
        }
      }
      if (pc.e.classType == "Star")
        hasStar = true;
    });

    if (!type && me.c && hasStar)
      type = me.c.inferType(alias);

    return type;
  };

  return me;
});
// helper method to project out a subset of attrs
// from subquery
Project.filter = (subq, ...aliases) => {
  let subqAlias = newAlias("subq");
  let pcs = R__namespace.flatten(aliases).map((alias) =>
    PClause({
      e:Attr({ table: subqAlias, attr: alias}),
      alias}));
  return Project({
    exprs: pcs,
    child: Source({
      source: subq,
      alias: subqAlias
    })
  })
};

let GroupBy = (({Agb, Fs, child}) => {
  let me = () => {};
  me.classType = "GroupBy";
  me.Agb = Agb || [];  // grouping expressions: list of PClauses
  me.Fs = Fs || [];    // agg functions: list of PClauses
  me.c = child;

  // XXX: we assume that the expressions are all attribute references!!!
  const isInvalidGb = (pc) => 
    R__namespace.any((f) => R__namespace.contains(f.op, aggfnames), VCA.find(pc.e, "Func"));
  if (R__namespace.any(isInvalidGb, me.Agb)) {
    console.log(me.Agb.map((pc)  => pc.toSql().toString()));
    console.error(me.Agb.map((pc) => pc.e.classType));
    throw new Error("Grouping expressions cannot be aggregate funcs:", me.Agb)
  }


  me.toSql = () => {
    let q = (me.c)? me.c.toSql() : squel$1.select();

    R__namespace.concat(me.Agb, me.Fs).forEach((pc) => 
      q.field(pc.e.toSql(), pc.alias)
    );

    me.Agb.forEach((g) => {
      if (g.e.classType != "Value")
        q.group(g.e.toSql());
    });
    return q
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    R__namespace.concat(me.Agb, me.Fs).forEach((e) => e.traverse(f));
    me.c.traverse(f);
  };


  me.terms = () => R__namespace.reject(R__namespace.isNil, R__namespace.concat(me.Agb, me.Fs));

  me.clone = () => {
    return GroupBy({ 
      Agb: me.Agb.map(clone),
      Fs: me.Fs.map(clone),
      child: me.c.clone()
    })
  };

  me.schema = () => {
    return R__namespace.concat(me.Agb, me.Fs).map((pc) => {
      return Attr({ attr: pc.alias, type: pc.getType() })
    })
  };

  me.inferType = (alias) => {
    let type = null;
    R__namespace.concat(me.Agb, me.Fs).forEach((pc) => {
      if (pc.alias == alias)
        type = pc.inferType();
    });
    return type;
  };

  return me;
});


const aggfnames = [
  "avg",
  "mean",
  "min",
  "max",
  "std",
  "stddev",
  "count"
];

// Helper function for parser to use
GroupBy.termsToAgbFs = (terms) => {
  let aliases = {};
  let ret = {
    Agb: [], Fs: []
  };
  let containsAggFunc = (pc) => {
    let contains = false;
    pc.traverse((op) => {
      if (op.classType == "Func" && R__namespace.contains(op.fname, aggfnames)) {
        contains = true;
        return false;
      }
    });
    return contains;
  };
  terms.forEach((pc) => {
    if (aliases[pc.alias]) 
      throw Error(`Duplicate aliases: ${terms}`)
    aliases[pc.alias] = true;

    if (containsAggFunc(pc))
      ret.Fs.push(pc);
    else
      ret.Agb.push(pc);
  });
  return ret;
};

let PClause = (({e, alias}) => {
  let me = () => {};
  me.classType = "PClause";
  me.e = e;
  me.alias = alias || null;

  if (alias && !R__namespace.is(String, alias)) 
    throw new Error("PClause alias should be string: ", alias)

  if (me.e.classType != "Attr" && !alias)
    throw new Error("Non-attr PClauses need alias: ", me.toString())

  me.getType = () => me.e.getType();

  me.toSql = () => e.toSql();

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.e.traverse(f);
  };

  me.clone = () => {
    return PClause({ e:e.clone(), alias })
  };

  me.inferType = () => me.e.inferType();

  return me;
});
PClause.fromAttr = (attr) => 
  PClause({ e: Attr(attr), alias: attr });














/*
 * op: operation string 
 * l, r: Expr objects
 *
 * TODO: wrap with CASE to handle nulls for l or r
 */
let Expr = (({op, l, r}) => {
  let me = () => {};
  me.classType = "Expr";
  me.op = op;
  me.l = l;
  me.r = r;

  me.getType = () => { return "Number"; };
  me.inferType = () => {
    let ltype = me.l.inferType();
    if (!me.r) return ltype;
    let rtype = me.r.inferType();
    return ltype.merge(rtype)
  };

  me.toSql = () => {
    if (R__namespace.isNil(r)) 
      return `${op}${l.toSql()}`
    return `${l.toSql()} ${op} ${r.toSql()}`
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    l.traverse(f);
    if (r) r.traverse(f);
  };


  me.clone = () => {
    return Expr({
      op, 
      l:l.clone(), 
      r:(r?r.clone():null)
    })
  };
  return me;
});

let List = (({exprs}) => {
  let me = () => {};
  me.classType = "List";
  me.es = exprs;

  me.getType = () => me.es[0].getType();
  me.inferType = () => me.es[0].inferType();
  me.toSql = () => `(${me.es.map(toSql()).join(", ")})`;
  me.traverse = (f) => {
    if (f(me) != false) me.es.forEach((e) => e.traverse(f));
  };
  me.clone = () => List({exprs: me.es.map((e) => e.clone())});
  return me;
});

let Paren = (({expr}) => {
  let me = () => {};
  me.classType = "Paren";
  me.e = expr;

  me.getType = () => me.e.getType();
  me.inferType = () => me.e.inferType();
  me.toSql = () => `(${me.e.toSql()})`;
  me.traverse = (f) => {
    if (f(me) != false) me.e.traverse(f);
  };
  me.clone = () => Paren({expr: me.e.clone()});
  return me;
});

/*
 * type: "Literal", "Number"
 */
let Value = (({type, value, raw}) => {
  let me = () => {};
  me.classType = "Value";
  me.value = value;
  me.type = type || (R__namespace.is(Number, value)? "Number" : "Literal");
  me.raw = (raw===undefined)? false : raw;

  me.getType = () => { return me.type; };
  me.inferType = () => {
    if (me.type == "Number") return Type.base("num")
    return Type.base("str")
  };

  me.toSql = () => {
    if (me.type == "Literal" && !me.raw) return `'${value}'`
    return String(value)
  };

  me.traverse = (f) => {
    f(me);
  };

  me.clone = () => {
    return Value({type: me.type, value: me.value, raw: me.raw})
  };
  return me;
});

let Star = (() => {
  let me = () => {};
  me.classType = "Star";

  me.getType = () => null;
  me.inferType = () => {
    throw new Error("Star.inferType not defined")
  };
  me.clone = () => Star();
  me.toSql = () => '*';
  me.traverse = (f) => f(me);

  return me;
});

/*
 * opts: { 
 *  table // string
 *  attr  // str
 *  type: // Literal or Number
 * }
 */
let Attr = ((opts) => {
  let me = () => {};
  me.classType = "Attr";

  if (R__namespace.is(String, opts)) {
    opts = { attr: opts };
  }

  me.table = opts.table;
  me.attr = opts.attr;
  me.type = opts.type || "Literal";

  me.getType = () => { return me.type; };
  me.inferType = () => Type.attr(me.attr, (me.type=="Number")?"num":"str");

  me.toSql = () => {
    if (R__namespace.isNil(me.table)) return me.attr;
    return `${me.table}.${me.attr}`;
  };

  me.traverse = (f) => f(me);


  me.clone = () => {
    return Attr({table:me.table, attr:me.attr})
  };
  return me;
});

/*
 * fname: string of SQL function name
 * args: Array of Expr objects
 * distinct: boolean.  fname( distinct args)
 */
let Func = (({fname, args, distinct}) => {
  let me = () => {};
  me.classType = "Func";
  me.fname = fname;
  me.args = R__namespace.is(Array, args)? args : [args];
 me.args = R__namespace.reject(R__namespace.isNil, me.args);
  me.distinct = distinct || false;

  me.getType = () => { return "Number" };
  me.inferType = () => {
    let argTypes = R__namespace.uniq(me.args.map((e) => e.inferType()));
    const passthroughs = ["avg", "min", "max", "std", "stddev", "coalesce"];
    if (R__namespace.contains(R__namespace.toLower(me.fname), passthroughs)) 
      return argTypes[0]
    return Type.f(me.fname, argTypes)
  };

  me.toSql = () => {
    const argsStr = me.args.map(toSql()).join(", ");
    return `${me.fname}(${me.distinct? 'distinct ' : ''}${argsStr})`
  };

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.args.forEach((e) => e.traverse(f));
  };


  me.clone = () => {
    return Func({fname:fname, args:me.args.map(clone), distinct:distinct})
  };
  return me;
});

var query = /*#__PURE__*/Object.freeze({
__proto__: null,
Samples: Samples,
Model: Model,
Union: Union,
Where: Where,
Join: Join,
ModelQueryJoin: ModelQueryJoin,
Source: Source,
Project: Project,
GroupBy: GroupBy,
PClause: PClause,
Expr: Expr,
List: List,
Paren: Paren,
Value: Value,
Star: Star,
Attr: Attr,
Func: Func
});

const squel = squelbase__namespace.useFlavour('postgres');




const schemaCache = {};

async function getSchemas(db) {
  // load schema and ytpes from sqlite
  let rows = await runQuery(db, db.getSchemasQuery);

  let schemas = await Promise.all(rows.map(async ({tbl_name}) => {
    const schema = await  getSchema(db, tbl_name);
    if (!schema) return null;
    return [tbl_name, schema];
  }));
  schemas = R__namespace.reject(R__namespace.isNil, schemas);
  return schemas;
}

async function getSchema(db, tbl_name) {
  if (schemaCache[tbl_name]) return schemaCache[tbl_name]
  let rows = await runQuery(db, `select * from ${tbl_name} limit 1`);
  if (!rows) return null;
  console.log("schema", rows[0]);
  const schema = R__namespace.map((v) => (!R__namespace.isNil(v) && typeof(v)) || "string", rows[0]);
  schemaCache[tbl_name] = schema;
  return schema;
}

async function createSQLView(db, q, viewname) {
  await runQuery(db, `CREATE VIEW ${viewname} AS (${q})`);
}


let getExprCardinalities = async (db, exprs, subq) => {
  "select count(distinct expr), ... from subq";
  
  let aliases = [];
  let counts = exprs.map((e, i) => {
    aliases.push(`a${i}`);
    return PClause({
      e: Func({ fname: "count", args:[e], distinct:true }),
      alias: `a${i}`
    })
  }
  );
  let q = Project({
    exprs: counts, 
    child: Source({
      source: subq,
      alias: "exprcardsubq"
    })
  });
  let rows = await runQuery(db, q.toSql().toString());
  let row = rows[0];
  return aliases.map((alias) => +row[alias]);
};





// given known facetting attribute, determine the "buckets" and define 
// filter query for each bucket
//
// @table: String table/view name
// @facet: String attribute name used for faceting
//         TODO: support Attr or Expr objects for @facet
let getFacetBuckets = async (db, q, facet) => {
  // TODO: better facet buckets.  currently uses every distinct value
  //       1. if numeric, compute counts and determine equidepth buckets
  //       2. if string, current approach is fine
  let fq = squel.select()
    .from(q.toSql(), 'facettable')
    .field(`distinct ${facet}`, "val")
    .order(facet);
  let rows = await runQuery(db, fq.toString());
  let specs = rows.map(({val}) => {
    let spec = {                       // facet = val
      where: Expr({
        op:"=", l: Attr(facet), 
        r: Value({type:"Literal", value: val})
      }),
      facet,
      val
    };
    return spec;
  });
  return specs;
};


// q: input query 
// attrs: list of attributes to compute bounds for, or null to use all Af
// 
// returns: [[Attr, [min, max]], ...]
let getBounds = async (db, q, attrs=null) => {
  let boundsq = squel.select()
    .from(q.toSql(), "getBounds");
  attrs = attrs || q.Af;
  attrs.forEach((a) => {
    boundsq.field(`min(${a.attr})`, `min_${a.attr}`);
    boundsq.field(`max(${a.attr})`, `max_${a.attr}`);
  });
  let res = await runQuery(db, boundsq.toString());
  let row = res[0];
  let bounds = attrs.map((a) => 
    [a, [row[`min_${a.attr}`], row[`max_${a.attr}`]]]
  );
  return bounds;
};




// Given a new data attribute and current visual mapping,
// update the mapping
//
// returns: visual attr -> data attr
//
// TODO: remove hard coded rule (use Draco or something)
//
let assignVisualMapping = (schema, mapping) => {
  let dattrs = R__namespace.pluck("attr", schema);
  let newDattrs = R__namespace.difference(dattrs, R__namespace.values(mapping));

  let vattrs = ['x', 'y', 'color', 'shape', 'column', 'size' ]; 
  let newMapping = { mark: "bar" };
  R__namespace.forEachObjIndexed((dattr, vattr) => {
    if (R__namespace.contains(vattr, ["measure", "mark"]) || R__namespace.contains(dattr, dattrs))
      newMapping[vattr] = dattr;
  }, mapping);
  
  if (newMapping.mark == "table") {
    newDattrs.forEach((dattr) => newMapping[dattr] = dattr);
    return newMapping;
  } 

  if (newMapping.mark == "bar" && newDattrs.length == 1) { 
    newMapping['x'] = newDattrs[0];
    newMapping['color'] = newDattrs[0];
    newMapping['column'] = mapping['x'];
    return newMapping;
  } 

  // if there are missing positional attributes but mapped nonpositional attributes
  // then swap
  let isMapped = (vattr) => R__namespace.contains(mapping[vattr], dattrs);
  let openPosMappings = R__namespace.reject(isMapped, ['x', 'y']);
  let nonPosMappings = R__namespace.filter(isMapped, ['color', 'shape', 'column', 'size']);
  if (openPosMappings.length && nonPosMappings.length) {
    R__namespace.zip(openPosMappings, nonPosMappings).forEach(([openPos, nonPos]) => {
      newMapping[openPos] = mapping[nonPos];
      delete newMapping[nonPos];
    });
  }

  // ok now, map remaining attributes in order
  newDattrs = R__namespace.difference(dattrs, R__namespace.values(mapping));
  vattrs = R__namespace.difference(vattrs, R__namespace.keys(mapping));
  if (vattrs.length < newDattrs.length)
    throw new Error(`Too many new data variables, no visual variables left: ${newDattrs}`)
  R__namespace.zip(newDattrs, vattrs).forEach(([dattr, vattr]) => {
    newMapping[vattr] = dattr;
  });
  return newMapping;
};


/*
 * inner join input bounds on Attr, and unions their min/max
 *
 * bounds: [ [Attr, [min, max], ... ]
 */
function mergeBounds(bounds1, bounds2) {
  let output = [];
  bounds1.forEach(([attr1, [min1, max1]]) => {
    bounds2.forEach(([attr2, [min2, max2]]) => {
      if (attr1.attr != attr2.attr) return;
      output.push(
        [
          attr1.clone(), 
          [Math.min(min1,min2), Math.max(max1,max2)]
        ]
      );
    });
  });
  return output;
}

// 
// Minimum structure of a View needed by VCA to function
//
// q: query plan
// r: { vis attr : data attr name, measure: data attr name }
//    r MUST contain "measure" so we know which vis attribute
//    is encoding the measure variable
// 
// TODO: support axis labels and other configurations in r
// 
let ViewBase = ({q, r, id, name, opts}) => {
  function me(){}  me.type = "ViewBase";
  me.q = q;
  me.mapping = r;
  me.id = id;
  me.viewName = name;

  return me
};

exports.Attr = Attr;
exports.Expr = Expr;
exports.Func = Func;
exports.GroupBy = GroupBy;
exports.Join = Join;
exports.List = List;
exports.LocalDB = LocalDB;
exports.PClause = PClause;
exports.Paren = Paren;
exports.Project = Project;
exports.RemoteDB = RemoteDB;
exports.Source = Source;
exports.Type = Type;
exports.Union = Union;
exports.VCA = VCA;
exports.Value = Value;
exports.View = ViewBase;
exports.Where = Where;
exports.createSQLView = createSQLView;
exports.getBinaryDotMatch = getBinaryDotMatch;
exports.getFacetBuckets = getFacetBuckets;
exports.getMatch = getMatch;
exports.getNaryDotMatch = getNaryDotMatch;
exports.getSchema = getSchema;
exports.getSchemas = getSchemas;
exports.loadSqliteDB = loadSqliteDB;
exports.parse = parse;
exports.runQuery = runQuery;
exports.sql = query;

Object.defineProperty(exports, '__esModule', { value: true });

})));
