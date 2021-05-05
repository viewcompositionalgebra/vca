let fs = require("fs")
let tape = require("tape")
let R = require("ramda")
let vca = require("../dist/vca.js")




tape("nary op", async (test) => {
  let db = await vca.LocalDB()
  let VCA = vca.VCA({ app: {db: db}, View: vca.View })

test.setEqual = (res1, res2, msg) => 
  test.deepEqual(
    R.intersection(res1, res2).length,
    res1.length, msg
  )



  let views = [
    vca.View({
      q: vca.parse("SELECT a, avg(b) as y FROM data WHERE a = 1"), 
      r: {x:"a", y:"y", measure: "y"},
      name: "v1"
    }),
    vca.View({
      q: vca.parse("SELECT a, avg(b) as y FROM data WHERE a = 2"), 
      r: {x:"a", y:"y", measure: "y"},
      name: "v2"
    }),
    vca.View({
      q: vca.parse("SELECT a, avg(b) as y FROM data WHERE a = 3"), 
      r: {x:"a", y:"y", measure: "y"},
      name: "v3"
    })
  ]

  let u = await VCA.union({}, views)
  test.setEqual(
    await db.exec(u.q.toSql().toString()),
    [
      { a: 1, y: 2, qid: 'v1' },
      { a: 2, y: 6, qid: 'v2' },
      { a: 3, y: 9, qid: 'v3' }
    ],
    "Union of v1-3"
  )

  let op = { label: "avg", f: "avg" }
  let v3 = await VCA.dot(op, views)
  let res1 = await db.exec(v3.q.toSql().toString())
  let res2 = await db.exec("SELECT a, avg(b) as y FROM data GROUP BY a")
  test.setEqual(res1, res2, "avg(v1, v2, v3)")


  let u2 = vca.View({
    q: vca.Project.filter(u.q, ["a", "y"]),
    r: {a:'a', y:'y', measure:'y'}
  })
  let v4 = await VCA.dot({
    label: "-",
    f: (a1, a2) => `${a1}-${a2}`
  }, u2, views[0])
  test.deepEqual(
    await db.exec(v4.q.toSql().toString()),
    [ { a: 1, y: 0 } ]
  )

  test.end();
})

