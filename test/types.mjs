let fs = require("fs")
let initSqlJs = require("../node_modules/sql.js/dist/sql-wasm.js")
let tape = require("tape")
let R = require("ramda")
let vca = require("../dist/vca.js")

let Type = vca.Type;


tape("types, basics", async (test) => {
  let b1 = Type.base("num"),
    b2 = Type.base("str"),
    a1 = Type.attr("a1", "num"),
    a2 = Type.attr("a2", "num"),
    a3 = Type.attr("a3"),
    s1 = Type.set(a1, a2),
    s2 = Type.set(a1, a2, a3),
    f1 = Type.f("f1", a1),
    s3 = Type.set(a1, f1),
    s4 = Type.set(a1, Type.f("f1", a2))


  test.ok(b1.matches(b1))
  test.ok(b2.matches(b2))
  test.notOk(b1.matches(b2))
  test.ok(b1.matches(a1))
  test.ok(b1.matches(a2), "num = a2:num")
  test.notOk(b2.matches(a2), "str != a2:num")
  test.ok(b2.matches(a3), "str = a3:str")
  test.notOk(b1.matches(a3), "num != a3:str")

  test.ok(a2.matches(a2), "a2 = a2")
  test.notOk(a1.matches(a2), "a1 != a2")
  test.notOk(a2.matches(a1), "a1 != a2")

  test.ok(a1.matches(s1), "a1 = [a1, a2]")
  test.ok(s1.matches(a1), "[a1, a2] = a1")
  test.notOk(a3.matches(s1), "a3 != [a1, a2]")
  test.notOk(s1.matches(a3), "[a1, a2] != a3")
  test.ok(a3.matches(s2), "a3 = [a1, a2, a3]")
  test.ok(s2.matches(a3), "a3 = [a1, a2, a3]")

  test.ok(f1.matches(b1), "f1(a1) = num")
  test.ok(b1.matches(f1), "num = f1(a1)")
  test.notOk(f1.matches(a1), "f1(a1) != a1")
  test.ok(f1.matches(s3), "f1(a1) = [a1, f1(a1)]")
  test.ok(s3.matches(f1), "[a1, f1(a1)] = f1(a1) ")
  test.notOk(f1.matches(s4), "f1(a1) = [a1, f1(a2)]")
  test.notOk(s4.matches(f1), "[a1, f1(a2)] = f1(a1) ")


  test.ok(b1.matches(b1.merge(b1)), "num = num+num")
  test.notOk(b1.matches(b1.merge(b2)), "num != str+num")
  test.ok(b2.matches(b1.merge(b2)), "str = str+num")
  test.ok(a1.matches(a1.merge(b1)), "a1 = a1+num")
  test.ok(a1.matches(a1.merge(a1)), "a1 = a1+num")
  test.ok(s1.matches(a1.merge(a2)), "[a1,a2] = a1+a2")
  test.ok(a1.matches(a1.merge(a2)), "a1 = a1+a2")
  test.ok(a2.matches(a1.merge(a2)), "a1 = a1+a2")
  test.notOk(a2.merge(a1).matches(a3), "a2+a1 != a3")
  test.notOk(a3.matches(a2.merge(a1)), "a3 != a2+a1")
  test.ok(s1.matches(a2.merge(a1)), "[a1,a2] = a2+a1")
  test.ok(a2.merge(a1).matches(s1), "a2+a1 = [a1,a2]")

  test.ok(s1.matches(s1.merge(s1)), "[a1,a2] = [a1,a2]+[a1,a2]")


  test.end();
})


tape("types, query inference", async (test) => {

  let q1 = vca.parse("SELECT a as a, b as b, c as c, avg(a) as d, count(b) as e FROM data")

  test.ok(Type.attr("a").matches(q1.inferType("a")))
  test.ok(Type.attr("a").matches(q1.inferType("d")))
  test.notOk(Type.attr("b").matches(q1.inferType("e")))


  test.end()
})

