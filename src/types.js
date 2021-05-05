import * as R from "ramda"

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



export let Type = (({ parType, type, val, args }) => {
  let me = () => {}
  me.classType = "Type"
  me.parType = parType
  me.type = type
  me.val = val
  me.args = args

  me.clone = () => {
    let parType = null;
    if (R.is(Array, me.parType))
      parType = me.parType.map(R.invoker(0, "clone"))
    else if (me.parType)
      parType = me.parType.clone()
    return Type({ parType, type: me.type, val: me.val, args: me.args })
  }

  let basebase = (t1, t2) => {
    if (t1.val == t2.val) return t1.clone()
    return Type({ type: BASE, val: "str"})
  }
  let basex = (t1, t2) => t2.clone()
  let attrattr = (t1, t2) => {
    if (t1.val == t2.val) return t1.clone()
    return Type({ parType: [t1, t2], type: SET })
  }
  let attrf = (t1, t2) => {
    return Type({ parType: [t1.clone(), t2.clone()], type: SET })
  }
  let setx = (t1, t2) => {
    let copy = t1.clone()
    for (let p of t1.parType) {
      if (p.eq(t2)) return copy;
    }

    let toAdd = (t2.type == SET)? t2.parType : [t2]
    for (let p2 of toAdd) {
      if (!R.any((p1) => p1.eq(p2), copy.parType))
        copy.parType.push(p2.clone())
    }
    return copy
  }
  let ff = (t1, t2) => {
    if (t1.eq(t2)) return t1.clone()
    return Type({ parType: [t1, t2], type: SET })
  }

  me.merge = (t) => {
    if (!t) return me.clone()
    const funcs = [
      [BASE, BASE, basebase],
      [BASE, null, basex],
      [ATTR, ATTR, attrattr],
      [ATTR, F, attrf],
      [SET, null, setx],
      [F, F, ff]
    ]

    for (let [type1, type2, f] of funcs) {
      if (me.type == type1 && (t.type == type2 || type2 == null))
        return f(me, t)
      if ((me.type == type2 || type2 == null) && t.type == type1)
        return f(t, me)
    }
    throw new Error("Couldn't find merger for", me.toString(), t.toString())
  }

  me.toString = () => {
    if (me.type == BASE) return me.val;
    if (me.type == ATTR) return `${me.val}:${me.parType.val}`
    if (me.type == SET) 
      return `<${me.parType.map(R.invoker(0, "toString")).join(",")}>`

    let args = me.args.map((a) => a.toString())
    return `${me.val}(${args.join(", ")}):${me.parType.val}`
  }

  me.matchesAny = (...ts) => 
    R.any(me.matches, ts)

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
      return R.any((p) => me.matches(p, true), t.parType)
    }
    return false;
  }

  me.eq = (t) => {
    if (!t) return false;
    if (!(me.type == t.type && me.val == t.val && R.equals(me.args, t.args))) 
      return false;

    if (me.type == F) 
      return me.parType.eq(t.parType)

    if (me.type == SET) {
      let pairs = R.xprod(me.parType, t.parType)
      return R.any(([p1, p2]) => p1.eq(p2), pairs)
    }

    return true;
  }

  return me;
})

// constructors
Type.base = (numorstr) => 
  Type({ type: Type.BASE, val: numorstr || "str" })

Type.attr = (attr, numorstr) => Type({ 
  parType: Type.base(numorstr),
  type: Type.ATTR, 
  val: attr 
})

// list of string or attribute Types
Type.set = (...args) => {
  let parType = R.flatten(args).map((a) => {
    if (R.is(String, a)) return Type.attr(a)
    else return a
  })
  return Type({ parType, type: Type.SET })
}

Type.f = (fname, ...args) => Type({ 
  parType: Type.num,
  type: Type.F,
  val: fname, 
  args: R.flatten(args) 
})


Type.BASE = 0
Type.ATTR = 1
Type.SET = 2
Type.F = 3

Type.num = Type.base("num")
Type.str = Type.base("str")

Type.mergeAll = (...types) => {
  types = R.flatten(types)
  if (!types.length) return null;
  return R.reduce((acc, v) => acc.merge(v), 
    types[0], R.tail(types))
}

const BASE = Type.BASE;
const ATTR = Type.ATTR;
const SET = Type.SET;
const F = Type.F;


