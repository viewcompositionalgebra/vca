import * as R from "ramda" 
import * as parser from "./lang.js"
import { runQuery } from "./db.js"
import * as squelbase from "squel";
import { VCA } from "./vca.js"
import { Type } from "./types.js"
const squel = squelbase.useFlavour('postgres')


const toSql = R.invoker(0, "toSql");
const clone = R.invoker(0, "clone");
const getAttrs = R.pluck('attr')

let aliasid = 0;
let newAlias = (prefix="tmp") => `${prefix}_${aliasid++}`;


/*
 * attr: attribute string
 * bound: [min, max]
 * n: number of samples
 */
export let Samples = (({attr, bound, n}) => {
  let me = () => {}
  me.classType = "Samples"
  me.bound = bound
  me.attr = attr
  me.min = bound[0]
  me.max = bound[1]
  me.n = n

  me.toSql = () => {
    let q = squel.select()
      .from(`generate_series(1, ${me.n})`)
      .field(`generate_series * ${(me.max-me.min)/me.n} + ${me.min}`, me.attr)
    return q;
  }

  me.inferType = (alias) => {
    if (alias == me.attr) return Type.attr(alias)
    return null;
  }
  me.traverse = (f) => f(me)
  me.clone = () => Sample({ attr:me.attr, bound: [me.min, me.max], n:me.n })
  me.schema = () => [Attr(me.attr)]
  return me;
})


/*
 * Af: list of Attr
 * Ac: list of Attr.  default: []
 * y:  Attr  default: Attr("y")
 * model: linear, logistic, poly, or glm
 */
export let Model = (({child, Af, Ac, y, model}) => {
  let me = () => {};
  me.classType = "Model"
  me.Af = Af
  me.Ac = Ac || []
  me.y = y || Attr("y")
  me.c = child;
  me.model = model || "linear"
  me.modelTableName = newAlias('modelout')
  me.input = newAlias("modelin") // used to refer to child subq
  me.bounds = []
  me.n = 50

  me.setBounds = (bounds, n) => { 
    if (bounds.length < me.Af.length) {
      console.error("bounds: ", bounds)
      console.error("Af: ", R.pluck("attr", me.Af))
      throw new Error("Missing bounds for features")
    }
    me.bounds = bounds 
    me.n = (n == null)? me.n : n
    let perdim = Math.pow(500, 1/R.keys(bounds).length)
    me.n = Math.max(2, Math.round(Math.min(perdim, me.n)))
  }

  me.setup = async (db) => {
    // http://madlib.apache.org/docs/latest/group__grp__linreg.html
    let subq = me.c.toSql();
    let createQs = [
      `DROP TABLE IF EXISTS ${me.input};`,
      `DROP TABLE IF EXISTS ${me.modelTableName};`,
      `DROP TABLE IF EXISTS ${me.modelTableName}_summary;`,
      `CREATE TABLE ${me.input} as ${subq.toString()};`
    ]

    console.group("Model.setup")
    for (const q of createQs) {
      console.info(q)
      await runQuery(db, q)
    }

    let list = R.concat([1], getAttrs(me.Af))
    let features = `ARRAY[${list.join(',')}]`
    let grouping = (me.Ac.length)? `'${getAttrs(me.Ac).join(',')}'`: 'null'
    let select = "";

    if (me.model == "linear") {
       select = `madlib.linregr_train(
        '${me.input}', 
        '${me.modelTableName}', 
        '${me.y.attr}',
        '${features}',
        ${grouping}
      )`
    } else if (me.model == "logistic") {
      select = `madlib.logregr_train(
        '${me.input}',
        '${me.modelTableName}',
        '${me.y.attr}',
        '${features}',
        ${grouping}
      )`
    } else if (me.model == "glm") {
      select = `madlib.glm(
        '${me.input}',
        '${me.modelTableName}',
        '${me.y.attr}',
        '${features}',
        'family=gaussian,link=log',
        ${grouping}
      ) `
    }
    let q = squel.select().field(select);
    console.info(q.toString())
    console.groupEnd()
    let res = await runQuery(db, q.toString())

    return me;
  }

  // returns a query that, given bounds, will run the predictions
  me.toSql = () => {
    let q = squel.select()

    let featureRefs = [1]
    me.bounds.forEach(([A, bound]) => {
      let attr = A.attr;
      let samples = Samples({attr, bound, n:me.n})
      let samAlias = newAlias("samples")
      q.from(samples.toSql(), samAlias)
      q.field(`${samAlias}.${attr}`, attr)
      featureRefs.push(`${samAlias}.${attr}`)
    })
    let features = `ARRAY[${featureRefs.join(',')}]`

    let predict = `madlib.linregr_predict(
      ${me.modelTableName}.coef, 
      ${features})`
    if (me.model == "logistic") 
      predict = `madlib.logregr_predict(
        ${me.modelTableName}.coef, 
        ${features})`
    else if (me.model == "glm")
      predict = `madlib.glm_predict(
        ${me.modelTableName}.coef, 
        ${features}, 'log')`

    q.from(me.modelTableName)
    q.field(predict, me.y.attr)
    me.Ac.forEach((a) => {
      q.field(`${me.modelTableName}.${a.attr}`, a.attr)
    })
    return q
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.c.traverse(f)
  }
  me.clone = () => {
    let copy = Model({
      child: me.c.clone(),
      Af: me.Af.map(clone),
      Ac: me.Ac.map(clone),
      y: me.y.clone(),
      model: me.model
    })
    copy.setBounds(R.clone(me.bounds), me.n)
    copy.modelTableName = me.modelTableName
    copy.input = me.input
    return copy;
  }
  me.schema = () => R.flatten([me.Af, me.Ac, me.y])
  me.inferType = (alias) => me.c.inferType(alias)

  return me;
})


export let Union = (({children}) => {
  let me = () => {};
  me.classType = "Union"
  me.cs = children;
  me.alias = newAlias("union")

  me.toSql = () => {
    let subq = R.reduce((acc, c) => acc.union(c.toSql()), 
      me.cs[0].toSql(),
      R.tail(me.cs))
    return squel.select().from(subq, me.alias)
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.cs.forEach((c) => c.traverse(f))
  }

  me.clone = () => {
    return Union({children: me.cs.map(clone)})
  }
  me.schema = () =>  me.cs[0].schema(); 
  me.inferType = (alias) => me.cs[0].inferType(alias)

  return me;
})

export let Where = (({exprs, child}) => {
  let me = () => {}
  me.classType = "Where"
  me.exprs = R.is(Array, exprs)? exprs : [exprs];
  me.c = child;

  me.toSql = () => {
    var q = me.c.toSql();
    me.exprs.forEach((e) => q.where(e.toSql()))
    return q;
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.exprs.forEach((e) => e.traverse(f))
    me.c.traverse(f);
  }


  me.addWherePredicate = (e) => {
    me.exprs.push(e);
    return me;
  }

  me.clone = () => {
    return Where({
      exprs: me.exprs.map(clone),
      child: clone(me.c)
    });
  }
  me.schema = () =>  me.c.schema();
  me.inferType = (alias) => me.c.inferType(alias)

  return me;
})

/*
 * type: left, right, full.  else: inner
 * l,r: Query Plans
 * on: [Expr, ...]
 */
export let Join = (({type, l, r, on, lalias, ralias}) => {
  let me = () => {};
  me.classType = "Join"
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
    me.on.forEach((e) => e.traverse(f))
    me.l.traverse(f);
    me.r.traverse(f)
  }

  me.toSql = () => {
    let l = me.l.toSql();
    let r = me.r.toSql(); 
    var q = squel.select().from(l, me.lalias);
    let f = (accum, e) => accum.and(e.toSql())
    let joinCondition = squel.expr().and("1=1")

    if (me.on && me.on.length)
      joinCondition = R.reduce(f, squel.expr(), me.on)

    if (me.type == "left")
      q.left_join(r, ralias, joinCondition)
    else if (me.type == "right")
      q.right_join(r, ralias, joinCondition)
    else if (me.type == "full")
      q.outer_join(r, ralias, joinCondition)
    else
      q.join(r, ralias, joinCondition)
    
    return q;
  }

  me.clone = () => {
    return Join({
      type: me.type,
      l: clone(me.l) ,
      r: clone(me.r),
      lalias: me.lalias,
      ralias: me.ralias,
      on: me.on.map(clone)
    });
  }
  me.schema = () => {
    let schema = [];
    R.concat(me.l.schema(), me.r.schema()).map((attr) => {
      attr = attr.clone()
      attr.table = null;
      schema.push(attr)
    })
    return schema;
  }
  me.inferType = (alias) => {
    let laliases = getAttrs(me.l.schema())
    let raliases = getAttrs(me.r.schema())
    let ltype = null, rtype = null;
    if (R.contains(alias, laliases))
      ltype = me.l.inferType(alias)
    if (R.contains(alias, raliases))
      rtype = me.r.inferType(alias)
    let types = R.reject(R.isNil, [ltype, rtype])
    if (types.length)
      return R.reduce((acc,v) => acc.merge(v), types[0], R.tail(types))
    return null;
  }

  return me;
});


/*
 * Convention: query is left, model is right
 * 
 */
export let ModelQueryJoin = ({l, r, lalias, ralias}) => {
  let me = () => {}
  me.classType = "ModelJoin"
  me.l = l
  me.r = r
  me.lalias = lalias
  me.ralias = ralias

  if (r.classType != "Model") 
    throw new Error("ModelQueryJoin expects Model as right side")


  me.toSql = () => {
    let q = squel.select()
    let lattrs = R.pluck("attr", me.l.schema())
    let list = [1]

    // feature attributes not in l should be filled in via sampling
    me.r.bounds.forEach(([A, bound]) => {
      if (R.contains(A.attr, lattrs)) {
        q.field(`${me.lalias}.${A.attr}`, A.attr)
        list.push(`${me.lalias}.${A.attr}`)
        return;
      }
      let attr = A.attr
      let samples = Samples({attr, bound, n: me.r.n})
      let samAlias = newAlias("samples")
      q.from(samples.toSql(), samAlias)
      q.field(`${samAlias}.${attr}`, attr)
      list.push(`${samAlias}.${attr}`)
    })

    let features = `ARRAY[${list.join(',')}]`
    let predict = `madlib.linregr_predict(
      ${me.ralias}.coef, 
      ${features})`
    if (me.r.model == "logistic") 
      predict = `madlib.logregr_predict(
        ${me.ralias}.coef, 
        ${features})`
    else if (me.r.model == "glm")
      predict = `madlib.glm_predict(
        ${me.ralias}.coef, 
        ${features}, 'log')`
    q.field(predict, r.y.attr)

    let joinCond = squel.expr().and("1=1")
    if (me.r.Ac && me.r.Ac.length) {
      me.r.Ac.forEach((a) => {
        q.field(`${me.ralias}.${a.attr}`)
        if (!R.contains(a.attr, R.pluck("attr", me.l.schema()))) return
        joinCond.and(`${me.lalias}.${a.attr} = ${me.ralias}.${a.attr}`)
      })
    } 

    q.from(me.r.modelTableName, me.ralias)
      .join(me.l.toSql(), me.lalias, joinCond)

    me.r.Ac.forEach((a) => q.field(`${me.ralias}.${a.attr}`))
    //me.r.Af.forEach((a) => q.field(`${me.lalias}.${a.attr}`))
      
    return q;
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.l.traverse(f)
    me.r.traverse(f)
  }

  me.clone = () => ModelQueryJoin({
    l: me.l.clone(),
    r: me.r.clone(),
    lalias: me.lalias,
    ralias: me.ralias
  })

  me.schema = () => me.l.schema()
  me.inferType = (alias) => me.l.inferType(alias)

  return me;
}


export let Source = (({source, schema, alias}) => {
  let me = () => {};
  me.classType = "Source"
  me.source = source;  // either  str table name or root operator of subquery
  me._schema = schema;  
  me.alias = alias;
  me.isBaseTable = R.is(String, me.source)

  if (me.isBaseTable  && !me._schema) {
    //throw new Error("Table name source must include schema")
  }

  me.toSql = () => {
    if (me.isBaseTable) return squel.select().from(me.source, me.alias)
    return squel.select().from(me.source.toSql(), me.alias)
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    if (!me.isBaseTable) me.source.traverse(f);
  }


  me.clone = () => {
    return Source({
      source: me.isBaseTable? me.source : clone(me.source),
      schema: me._schema? me._schema.map(clone) : null,
      alias: me.alias
    })
  }
  me.schema = (newSchema) => {
    if (newSchema && me.isBaseTable)
      me._schema = newSchema;
    if (me.isBaseTable) 
      return me._schema;
    return me.source.schema()
  }
  me.inferType = (alias) => {
    // TODO: we assume all attributes are numeric and ignore the actual schema
    if (me.isBaseTable) return Type.attr(alias)
    return me.source.inferType(alias)
  }

  return me;
})

export let Project = (({exprs, child}) => {
  let me = () => {};
  me.classType = "Project"
  me.pcs = exprs; // PClause objects
  me.c = child;

  me.toSql = () => {
    var q = me.c? me.c.toSql() : squel.select();
    me.pcs.forEach((pc) => q.field(pc.toSql(), pc.alias))
    return q
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.pcs.forEach((pc) => pc.traverse(f))
    if (me.c)
      me.c.traverse(f)
  }


  me.clone = () => {
    return Project({
      exprs: me.pcs.map(clone),
      child: me.c? me.c.clone(): null
    })
  }

  me.schema = () => {
    let schema = [];
    me.pcs.forEach((pc) => {
      if (pc.e.classType == "Star") {
        schema = R.concat(schema, me.c.schema())
      } else {
        schema.push(Attr({ attr: pc.alias, type: pc.getType() }))
      }
    })
    return schema
  }

  me.inferType = (alias) => {
    let type = null;
    let hasStar = false;
    me.pcs.forEach((pc) => {
      if (pc.alias == alias) {
        if (!me.c)  {
          type = pc.inferType();
        } else {
          let attrs = VCA.find(pc, "Attr")
          let types = R.pipe(
            R.uniq,
            R.pluck("attr"),
            R.map(me.c.inferType),
            R.reject(R.isNil)
          )(attrs)

          if (types.length) 
            type = Type.mergeAll(types)
          else
            type = pc.inferType()
        }
      }
      if (pc.e.classType == "Star")
        hasStar = true
    })

    if (!type && me.c && hasStar)
      type = me.c.inferType(alias)

    return type;
  }

  return me;
})
// helper method to project out a subset of attrs
// from subquery
Project.filter = (subq, ...aliases) => {
  let subqAlias = newAlias("subq")
  let pcs = R.flatten(aliases).map((alias) =>
    PClause({
      e:Attr({ table: subqAlias, attr: alias}),
      alias}))
  return Project({
    exprs: pcs,
    child: Source({
      source: subq,
      alias: subqAlias
    })
  })
}

export let GroupBy = (({Agb, Fs, child}) => {
  let me = () => {};
  me.classType = "GroupBy"
  me.Agb = Agb || []  // grouping expressions: list of PClauses
  me.Fs = Fs || []    // agg functions: list of PClauses
  me.c = child;

  // XXX: we assume that the expressions are all attribute references!!!
  const isInvalidGb = (pc) => 
    R.any((f) => R.contains(f.op, aggfnames), VCA.find(pc.e, "Func"))
  if (R.any(isInvalidGb, me.Agb)) {
    console.log(me.Agb.map((pc)  => pc.toSql().toString()))
    console.error(me.Agb.map((pc) => pc.e.classType))
    throw new Error("Grouping expressions cannot be aggregate funcs:", me.Agb)
  }


  me.toSql = () => {
    let q = me.c.toSql()
    R.concat(me.Agb, me.Fs).forEach((pc) => 
      q.field(pc.e.toSql(), pc.alias)
    )
    me.Agb.forEach((g) => {
      if (g.e.classType != "Value")
        q.group(g.e.toSql())
    })
    return q
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    R.concat(me.Agb, me.Fs).forEach((e) => e.traverse(f))
    me.c.traverse(f)
  }


  me.terms = () => R.reject(R.isNil, R.concat(me.Agb, me.Fs))

  me.clone = () => {
    return GroupBy({ 
      Agb: me.Agb.map(clone),
      Fs: me.Fs.map(clone),
      child: me.c.clone()
    })
  }

  me.schema = () => {
    return R.concat(me.Agb, me.Fs).map((pc) => {
      return Attr({ attr: pc.alias, type: pc.getType() })
    })
  }

  me.inferType = (alias) => {
    let type = null;
    R.concat(me.Agb, me.Fs).forEach((pc) => {
      if (pc.alias == alias)
        type = pc.inferType()
    })
    return type;
  }

  return me;
})


const aggfnames = [
  "avg",
  "mean",
  "min",
  "max",
  "std",
  "count"
]

// Helper function for parser to use
GroupBy.termsToAgbFs = (terms) => {
  let aliases = {};
  let ret = {
    Agb: [], Fs: []
  }
  let containsAggFunc = (pc) => {
    let contains = false;
    pc.traverse((op) => {
      if (op.classType == "Func" && R.contains(op.fname, aggfnames)) {
        contains = true;
        return false;
      }
    })
    return contains;
  }
  terms.forEach((pc) => {
    if (aliases[pc.alias]) 
      throw Error(`Duplicate aliases: ${terms}`)
    aliases[pc.alias] = true;

    if (containsAggFunc(pc))
      ret.Fs.push(pc)
    else
      ret.Agb.push(pc)
  })
  return ret;
}

export let PClause = (({e, alias}) => {
  let me = () => {};
  me.classType = "PClause"
  me.e = e
  me.alias = alias || null;

  if (alias && !R.is(String, alias)) 
    throw new Error("PClause alias should be string: ", alias)

  if (me.e.classType != "Attr" && !alias)
    throw new Error("Non-attr PClauses need alias: ", me.toString())

  me.getType = () => me.e.getType();

  me.toSql = () => e.toSql();

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.e.traverse(f)
  }

  me.clone = () => {
    return PClause({ e:e.clone(), alias })
  }

  me.inferType = () => me.e.inferType();

  return me;
})
PClause.fromAttr = (attr) => 
  PClause({ e: Attr(attr), alias: attr })














/*
 * op: operation string 
 * l, r: Expr objects
 *
 * TODO: wrap with CASE to handle nulls for l or r
 */
export let Expr = (({op, l, r}) => {
  let me = () => {};
  me.classType = "Expr"
  me.op = op;
  me.l = l;
  me.r = r;

  me.getType = () => { return "Number"; }
  me.inferType = () => {
    let ltype = me.l.inferType()
    if (!me.r) return ltype;
    let rtype = me.r.inferType()
    return ltype.merge(rtype)
  }

  me.toSql = () => {
    if (R.isNil(r)) 
      return `${op}${l.toSql()}`
    return `${l.toSql()} ${op} ${r.toSql()}`
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    l.traverse(f)
    if (r) r.traverse(f)
  }


  me.clone = () => {
    return Expr({
      op, 
      l:l.clone(), 
      r:(r?r.clone():null)
    })
  }
  return me;
})

export let Paren = (({expr}) => {
  let me = () => {}
  me.classType = "Paren"
  me.e = expr;

  me.getType = () => me.e.getType();
  me.inferType = () => me.e.inferType()
  me.toSql = () => `(${me.e.toSql()})`
  me.traverse = (f) => {
    if (f(me) != false) me.e.traverse(f);
  }
  me.clone = () => Paren({expr: me.e.clone()})
  return me;
})

/*
 * type: "Literal", "Number"
 */
export let Value = (({type, value, raw}) => {
  let me = () => {};
  me.classType = "Value";
  me.value = value
  me.type = type || (R.is(Number, value)? "Number" : "Literal");
  me.raw = (raw===undefined)? false : raw;

  me.getType = () => { return me.type; }
  me.inferType = () => {
    if (me.type == "Number") return Type.base("num")
    return Type.base("str")
  }

  me.toSql = () => {
    if (me.type == "Literal" && !me.raw) return `'${value}'`
    return String(value)
  }

  me.traverse = (f) => {
    f(me)
  }

  me.clone = () => {
    return Value({type: me.type, value: me.value, raw: me.raw})
  }
  return me;
})

export let Star = (() => {
  let me = () => {};
  me.classType = "Star"

  me.getType = () => null
  me.inferType = () => {
    throw new Error("Star.inferType not defined")
  }
  me.clone = () => Star()
  me.toSql = () => '*'
  me.traverse = (f) => f(me)

  return me;
})

/*
 * opts: { 
 *  table // string
 *  attr  // str
 *  type: // Literal or Number
 * }
 */
export let Attr = ((opts) => {
  let me = () => {};
  me.classType = "Attr"

  if (R.is(String, opts)) {
    opts = { attr: opts }
  }

  me.table = opts.table;
  me.attr = opts.attr;
  me.type = opts.type || "Literal";

  me.getType = () => { return me.type; }
  me.inferType = () => Type.attr(me.attr, (me.type=="Number")?"num":"str")

  me.toSql = () => {
    if (R.isNil(me.table)) return me.attr;
    return `${me.table}.${me.attr}`;
  }

  me.traverse = (f) => f(me)


  me.clone = () => {
    return Attr({table:me.table, attr:me.attr})
  }
  return me;
})

/*
 * fname: string of SQL function name
 * args: Array of Expr objects
 * distinct: boolean.  fname( distinct args)
 */
export let Func = (({fname, args, distinct}) => {
  let me = () => {};
  me.classType = "Func"
  me.fname = fname
  me.args = R.is(Array, args)? args : [args]
 me.args = R.reject(R.isNil, me.args)
  me.distinct = distinct || false

  me.getType = () => { return "Number" }
  me.inferType = () => {
    let argTypes = R.uniq(me.args.map((e) => e.inferType()))
    const passthroughs = ["avg", "min", "max", "std", "coalesce"]
    if (R.contains(R.toLower(me.fname), passthroughs)) 
      return argTypes[0]
    return Type.f(me.fname, argTypes)
  }

  me.toSql = () => {
    const argsStr = me.args.map(toSql()).join(", ");
    return `${me.fname}(${me.distinct? 'distinct ' : ''}${argsStr})`
  }

  me.traverse = (f) => {
    if (f(me) == false) return;
    me.args.forEach((e) => e.traverse(f))
  }


  me.clone = () => {
    return Func({fname:fname, args:me.args.map(clone), distinct:distinct})
  }
  return me;
})








