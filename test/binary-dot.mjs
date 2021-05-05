let fs = require("fs")
let tape = require("tape")
let R = require("ramda")
let vca = require("../dist/vca.js")



tape("binary stats, same schema", async (test) => {
  let db = await vca.LocalDB()
  let VCA = vca.VCA({ app: {db: db}, View: vca.View })


  let v1 = vca.View({
    q: vca.parse("SELECT a, avg(b) as y FROM data"), 
    r: {x:"a", y:"y", measure: "y"}
  })

  let v2 = await VCA.dot({
      label: "+",  
      f: (a1, a2) => `${a1}+${a2}`
    }, v1, v1 )

  test.deepEqual(
    await db.exec(v2.q.toSql().toString()),
    [ { a: 3, y: 18 }, { a: 2, y: 12 }, { a: 1, y: 4 } ]
  )


  v2 = await VCA.dot( {
      label: "-",  
      f: (a1, a2) => `${a1}-${a2}`
    }, v1, v1 )

  test.deepEqual(
    await db.exec(v2.q.toSql().toString()), 
    [ { a: 3, y: 0 }, { a: 2, y: 0 }, { a: 1, y: 0 } ]
  )

  v2.q.schema().forEach((a) => {
    console.log(a.attr, "type", v2.q.inferType(a.attr).toString())
  })

  test.end();
})


