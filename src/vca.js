import * as R from "ramda" 
import { parse } from "./lang.js"
import { getBinaryDotMatch, getNaryDotMatch, getUnionMatch } from "./match.js"
import * as squelbase from "squel";
import { 
  Model, ModelQueryJoin, 
  Project, Union, GroupBy, Join,
  Paren, Source, PClause, Expr, Value, Attr,
  Star, Func, Where 
} from "./query.js"
import { 
  mergeBounds, getBounds,
  getExprCardinalities, assignVisualMapping 
} from "./util.js"
const squel = squelbase.useFlavour('postgres')


//
// app: Application object.  Mainly used to retrieve handle to db
// View: constructor to create new views.
//
export let VCA = (({app, View}) => {
  let me = () => {};
  me.app = app;
  me.db = (app)? app.db : null;

  var id = 0;
  let newAlias = (prefix="t") => `${prefix}${id++}`;


  me.dot = async (op, arg1, arg2) => {
    if (!arg1) {
      [arg1, arg2] = [arg2, null]
    }
    if (!arg1) return null;


    if (R.is(Array, arg1)) {
      if (!arg2) return me.naryDot(op, arg1)
      if (R.is(Array, arg2)) {
        return Promise.all(R.chain(
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
    if (R.is(Array, arg2))
      return Promise.all(arg2.map((v2) => me.binaryDot(op, v1, v2)))
    return await me.binaryDot(op, v1, arg2)

  }

  // return Agb attributes that have one distinct value
  // return: Array<str>
  me.getUnaryAgbs = async (v) => {
    // XXX: assumes that the Groupby's Agb are preserved
    // in the query result schema!!
    //
    let gbs = VCA.find(v.q, "GroupBy")
    if (gbs.length == 0) return [];
    let attrs = [];
    let AgbExprs = R.pluck("e", gbs[0].Agb)
    let cards = await getExprCardinalities(me.db, AgbExprs, v.q)
    R.zip(gbs[0].Agb, cards).forEach(([a, count]) => {
      if (count == 0) attrs.push(a)
    })
    return attrs;
  }

  //
  //
  //
  me.binaryDot = async (op, v1, v2) => {
    let match = getBinaryDotMatch(v1, v2)
    if (!match) {
      throw new Error("Views are not compatible")
    }

    match = R.omit([v1.mapping.measure], match)

    let lalias = newAlias(), 
        ralias = newAlias(),
        q1 = v1.q,
        q2 = v2.q;

    const isModel = (v) => v.q.classType == "Model"
    const toJoinCond = (match) => {
      let conds = R.toPairs(match).map(([lattr, rattr]) => {
        if (v1.mapping.measure == lattr) return null;
        return Expr({ op: "=", 
          l: Attr({table: lalias, attr: lattr}),
          r: Attr({table: ralias, attr: rattr})
        })
      })
      return R.reject(R.isNil, conds)
    }

    // XXX: fails when dragging cyl-mpg onto model view of cyl,hp->mpg
    // should be rejected since cyl does not fully schema match to cyl,hp.
    //
    // In general, if query-model join, then schema should fully match.
    // If query-query, then rigt side needs a full match, but not left side.

    // Type of join depends on whether v1/v2 are Models or not
    let on = toJoinCond(match)
    let join = null;
    if (isModel(v1) && isModel(v2)) {
      let bounds = mergeBounds(q1.bounds, q2.bounds)
      q1.setBounds(bounds)
      q2.setBounds(bounds)

      join = Join({
        l: q1, r: q2,
        lalias, ralias, on, bounds
      })
    } else if (isModel(v1) && !isModel(v2)) {
      join = ModelQueryJoin({
        l: q2, r: q1,
        lalias:newAlias(), ralias:newAlias()
      })
      join = Join({
        l: join, r: q2,
        lalias, ralias, on
      })
    } else if (!isModel(v1) && isModel(v2)) {
      join = ModelQueryJoin({
        l: q1, r: q2, 
        lalias: newAlias(), ralias: newAlias()
      })
      join = Join({
        l: q1, r: join,
        lalias, ralias, on
      })
    } else {
      let unaryAttrs = await me.getUnaryAgbs(v2)
      match = R.invertObj(R.omit(unaryAttrs,R.invertObj(match)))
      on = toJoinCond(match)
      //console.log("dropped unary attrs:", unaryAttrs, "match:", match)
      join = Join({
        type: "outer",
        l: q1, r: q2, lalias, ralias, on
      })
    }

    let exprs = R.reject(
      (attr) => attr == v1.mapping.measure,
      R.pluck("attr", q1.schema())
    ).map((attr) => 
      PClause({ e: Attr({table: lalias, attr}), alias: attr}))
    exprs.push(PClause({
      e: VCA.parse(op.f(
        `${lalias}.${v1.mapping.measure}`, 
        `${ralias}.${v2.mapping.measure}`
      )),
      alias: v1.mapping.measure
    }))
    let q = Project({ exprs, child: join })

    // keep the visual mappings that q still can support
    let mapping = assignVisualMapping(q.schema(), v1.mapping)
    if (op.mark)
      mapping.mark = op.mark
    console.log("new View mapping", mapping)

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
    let allUnaryAttrs = await vs.map(me.getUnaryAgbs)
    let unaryAttrs = R.reduce(
      R.intersection, allUnaryAttrs[0], R.tail(allUnaryAttrs))

    // TODO: relax this verification
    if (!getNaryDotMatch(vs)) {
      console.error(vs)
      throw new Error("naryDot: could not find match or query not canonical form")
    }

    let children = vs.map((v) => v.q.c.clone())
    let union = Union({children})
    let copy = vs[0].q.clone()
    const Agb = R.reject((pc) => 
      R.contains(pc.alias, unaryAttrs), copy.Agb)

    const Fs = copy.Fs.map((pc) => {
      // take the arguments of the original agg function
      // and use op.f instead
      // e.g., f(a) --> op.f(a)
      const alias = pc.alias;
      const arg = pc.e.args[0];
      // TODO: change Attr table references in arg
      const e = Func({fname: op.f, args:[arg]})
      return PClause({e, alias})
    })
    
    let q = GroupBy({ Agb, Fs, child: union })
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
  }


  me.union = async (op, args1, args2) => {
    if (R.is(Array, args1))
      return me.naryUnion(op, args1)
    if (args1.type == "View" && args2 && args2.type == "View")
      return me.naryUnion(op, [args1, args2])
    return null;
  }

  me.naryUnion = async (op, vs) => {
    let matches = getUnionMatch(vs)
    if (!matches) {
      console.error(vs)
      throw new Error("naryUnion: could not find match")
    }

    let children = vs.map((v, i) =>  {
      let q = v.q.clone()
      let ops = VCA.find(q, ["GroupBy", "Project"])
      let pc = PClause({
        e: Value({type: "Literal", value: v.viewName}),
        alias: 'qid'
      }) 
      if (ops.length == 0) {
        let exprs = [ ]
        return Project({ exprs, child: v.q })
      }

      // TODO: reorder projections so they all match 1st query's schema

      if (ops[0].classType == "Project") 
        ops[0].pcs.push(pc)
      else {
        // wrap GroupBy in a Project so attr orderings are the same
        let exprs = ops[0].schema().map((A) => 
          PClause({ e: Attr(A.attr), alias: A.attr }))
        exprs.push(pc)
        return Project({ 
          exprs, 
          child: Source({ source: q, alias: newAlias()}) })
      }
      return q;
    })

    // Probably want to make qid a column-facet and swap nonmeasure
    // positional variable with column
    let union = Union({children})
    let mapping = assignVisualMapping(union.schema(), vs[0].mapping)
    let opts = {
      width: vs[0].width,
      height: vs[0].height,
      viewType: "composed"
    }

    if (mapping.column) {
      let cards = await getExprCardinalities(me.db, [Attr(mapping.column)], union)
      opts.width = ((75 + 25) * cards[0]) + 125
    }

    return View({
      q: union,
      r: mapping,
      name: newAlias("vset"),
      opts
    })
  }



  /*
   * op: { 
   *   Af,   -- Array<Attr>
   *   Ac,   -- Array<Attr>
   *   y,    -- Attr
   *   model -- str
   * } 
   */
  me.lift = async (op, v) => {
    let mapping = { mark: "line", measure: v.mapping.measure }
    if (!op.Af) {
      if (v.rmapping['y'] == v.mapping.measure)  // 1D
        op.Af = [Attr(v.mapping['x'])]
      else  // 2D
        op.Af = [Attr(v.mapping['x']), Attr(v.mapping['y'])]
    } else
      op.Af = R.flatten([op.Af])

    op.Ac = R.reject(R.isNil, R.flatten([op.Ac]))

    if (op.Af.length == 0)
      mapping.mark = "bar"
    else if (op.Af.length == 2) 
      mapping.mark = "point"
    else if (op.Af.length > 2) 
      mapping.mark = "table"
    op.y = op.y || Attr(v.mapping.measure)

    let q = Model({
      child: v.q,
      Af: op.Af,
      Ac: op.Ac,
      y: op.y,
      model: op.model
    })
    
    let bounds = await getBounds(me.db, v.q, op.Af)
    q.setBounds(bounds)

    // train the model 
    await q.setup(me.db)


    // naive algorithm to assign visual vars
    const toAttrs = (A) => R.reject(R.isNil, R.pluck('attr',R.flatten([A])))
    let vattrs1 = ["x", "y"]
    let vattrs2 = ["color", "shape", "column"]
    // features go to x, y
    op.Af.forEach((a,i) => {
      mapping[vattrs1[i]] = a.attr
    })
    if (op.Af.length <= 1) {
      mapping.y = op.y.attr
    } else {
      mapping.color = op.y.attr
      vattrs2 = R.tail(vattrs2) // remove color from candidates
    }
    op.Ac.forEach((a,i) => {
      mapping[vattrs2[i]] = a.attr
    })

    console.group("lift")
    console.log(`${toAttrs(op.Af)}->${op.y.attr} | ${toAttrs(op.Ac)}`)
    console.log(mapping)
    console.groupEnd()

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
  }




  return me;
})


VCA.parse = parse

// get all operators in query plan q where f(op) returns true
VCA.collect = (q, f) => {
  var ops = []
  q.traverse((op) => {
    if (f(op) == true) ops.push(op);
  })
  return ops;
}

// get all operators in query plan with given class type
VCA.find = (q, classTypeOrTypes) => {
  if (R.is(String, classTypeOrTypes)) classTypeOrTypes = [classTypeOrTypes];
  return VCA.collect(q, (op) => R.contains(op.classType, classTypeOrTypes));
}

VCA.getAliases = (q) =>
  R.pluck('attr', q.schema())

VCA.getVisuallyMappedAliases = (v) => 
  R.intersection(VCA.getAliases(v.q), R.values(v.mapping))

VCA.getAgb = (q) => {
  let gbs = VCA.find(q, "GroupBy");
  if (gbs.length == 0) return [];
  return gbs[0].Agb;
}









