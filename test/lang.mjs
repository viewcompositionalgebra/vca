let fs = require("fs")
let tape = require("tape")
let R = require("ramda")
let vca = require("../dist/vca.js")


tape("parser", async (test) => {

  qs = [
    "f(wind) >= 4",
    "SELECT a, b, avg(c_d) FROM data WHERE wind >= 4",
    "SELECT a, b, avg(c_d), mean(z) as y1 FROM data WHERE wind >= 4",
    "SELECT a, b FROM data WHERE 1",
    "SELECT a, b, avg(c) as y FROM data WHERE a = b",
    "SELECT a, b, avg(c) as y FROM data WHERE a = b and (c > 1)",
    "SELECT cyl, hp, avg(mpg) FROM cars "
  ]

  answers = [
    "f(wind) >= 4",
    "SELECT a AS a, b AS b, avg(c_d) AS y FROM data AS data WHERE (wind >= 4) GROUP BY a, b",
    "SELECT a AS a, b AS b, avg(c_d) AS y, mean(z) AS y1 FROM data AS data WHERE (wind >= 4) GROUP BY a, b",
    "SELECT a AS a, b AS b FROM data AS data WHERE (1) GROUP BY a, b",
    "SELECT a AS a, b AS b, avg(c) AS y FROM data AS data WHERE (a = b) GROUP BY a, b",
    "SELECT a AS a, b AS b, avg(c) AS y FROM data AS data WHERE (a = b and (c > 1)) GROUP BY a, b",
    "SELECT cyl AS cyl, hp AS hp, avg(mpg) AS y FROM cars AS cars GROUP BY cyl, hp"
  ]

  R.forEach(([q, ans]) => {
    test.deepEqual(vca.parse(q).toSql().toString(), ans)
  }, R.zip(qs, answers))

  test.end();
})
