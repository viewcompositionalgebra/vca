let fs = require("fs")
let initSqlJs = require("../node_modules/sql.js/dist/sql-wasm.js")
let tape = require("tape")
let R = require("ramda")
let vca = require("../dist/vca.js")



tape("getMatch", async (test) => {
  let db = await vca.LocalDB()
  let VCA = vca.VCA({ app: {db: db}, View: vca.View })

  let v1 = vca.View({
    q: vca.parse("SELECT a, b, avg(b) as y FROM data"), 
    r: {x:"a", color: "b", y:"y", measure: "y"}
  })

  let v2 = vca.View({
    q: vca.parse("SELECT a, c+d as e, avg(b) as y FROM data"), 
    r: {x:"a", y:"y", measure: "y"}
  })

  let v3 = vca.View({
    q: vca.parse("SELECT a, c+b as e, avg(b) as y FROM data"), 
    r: {x:"a", color: "e", y:"y", measure: "y"}
  })

  let v4 = vca.View({
    q: vca.parse("SELECT a, c+d as e, avg(b) as y FROM data"), 
    r: {x:"a", color: "e", y:"y", measure: "y"}
  })


  let vl = await VCA.lift({
    Af: [vca.Attr("a")],
    Ac: [vca.Attr("b")],
    model: "linear"
  }, v1)

  test.deepEqual(vca.getMatch(v1, v2), { a: 'a', y: 'y' }, "a,b,avg(b) as y <-> a,c+d as e, avg(b) as y")
  test.deepEqual(vca.getMatch(v1, v1), { a: 'a', b: 'b', y: 'y' }, "a,b,avg(b) as y <-> self")
  test.deepEqual(vca.getMatch(v1, v3), { a: 'a', b: 'e', y: 'y' }, "a,b,avg(b) as y <-> a,c+b as e, avg(b) as y")

  test.deepEqual(vca.getBinaryDotMatch(v1, v1), { a: 'a', b: 'b', y: 'y'})
  test.deepEqual(vca.getBinaryDotMatch(v3, v1), {a: 'a', e: 'b', y: 'y'})
  test.deepEqual(vca.getBinaryDotMatch(v1, v3), {a: 'a', b: 'e', y: 'y'})
  test.deepEqual(vca.getBinaryDotMatch(v1, v2), {a: 'a', y: 'y'})
  test.deepEqual(vca.getBinaryDotMatch(v1, v4), null)


  test.deepEqual(vca.getNaryDotMatch([v1, v1]), { a: 'a', b: 'b', y: 'y' })
  test.deepEqual(vca.getNaryDotMatch([v1, v2]), { a: 'a', y: 'y'} )
  test.deepEqual(vca.getNaryDotMatch([v1, v3]), { a: 'a', b: 'e', y: 'y' })
  test.deepEqual(vca.getNaryDotMatch([v1, v1, v3]), null)
  test.deepEqual(vca.getNaryDotMatch([v1, v4]), null)

  test.end();
})


