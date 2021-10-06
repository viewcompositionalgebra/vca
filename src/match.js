import * as R from "ramda"
import { VCA } from "./vca.js"
import { Type } from "./types.js"


// given an alias and type, find all candidate
// schema matches from v2
//
// returns: [ {ralias, rtype}, ...]
let findAttrMatches = (lalias, ltype, v1, v2) => {
  let raliases = VCA.getVisuallyMappedAliases(v2);
  let rtypes = raliases.map(v2.q.inferType)
  let isMeasure = (v,alias) => v.mapping.measure == alias
  //console.debug("match.right", raliases, rtypes.map(R.invoker(0,"toString")))


  let candidates = [];
  for (let [ralias, rtype] of R.zip(raliases, rtypes)) {
    if (isMeasure(v1,lalias) && isMeasure(v2, ralias)) {
      if (ltype.matchesAny(rtype, Type.num) || rtype.matches(Type.num)) {
        candidates.push({ ralias, rtype })
        continue
      }
    } else if (isMeasure(v1,lalias) || isMeasure(v2, ralias)) 
      continue

    if (ltype.matches(rtype) )
      candidates.push({ ralias, rtype })
  }
  return candidates;
}


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
export let getMatch = (v1, v2) => {
  let laliases = VCA.getVisuallyMappedAliases(v1);
  let ltypes = laliases.map(v1.q.inferType)
  let match = {}  // left alias -> right alias
  let rmatch = {} // the reverse: right -> left
  //console.debug("match.left", laliases, ltypes.map(R.invoker(0,"toString")))


  let checkMatch = (lalias, ralias) => {
    if (match[lalias] || rmatch[ralias])  {
      console.error(`${lalias}->${ralias} but already has match:`, match)
      return false
    }
    return true;
  }

  let findBestMatch = (lalias, ltype) => {
    let candidates = findAttrMatches(lalias, ltype, v1, v2)
    let costF = ({ralias, rtype}) => 
      -((ralias==lalias)*100 + (ltype.eq(rtype))*50 + 1)

    candidates = R.pipe(
      R.sortBy(costF),
      R.reject(({ralias, rtype}) => rmatch[ralias])
    )(candidates)
    return (candidates.length)? candidates[0].ralias : null;
  }

  for (let [lalias, ltype] of R.zip(laliases, ltypes)) {
    let ralias = findBestMatch(lalias, ltype)
    if (!ralias) continue;
    if (checkMatch(lalias, ralias)) {
      match[lalias] = ralias;
      rmatch[ralias] = lalias;
    } else 
      return null;
  }
  return match;
}

//
// returns: v1alias -> v2alias
//          mapping from v1.q's schema to v2.q's schema
export let getBinaryDotMatch = (v1, v2) => {
  let match = null;
  if (v2.q.classType == "Model" && v1.q.classType != "Model") {
    match = getBinaryDotMatch(v2, v1)
    return R.invertObj(match)
  }

  match = getMatch(v1, v2);
  let rmatch = R.invertObj(match);

  let laliases = VCA.getVisuallyMappedAliases(v1);
  let raliases = VCA.getVisuallyMappedAliases(v2);
  let lmeasures = laliases.filter((la) => v1.mapping.measure == la)
  let rmeasures = raliases.filter((ra) => v2.mapping.measure == ra)

  // All v2.Agbs should have matches to support non-exact schema composition
  let rGbAttrs = R.intersection(
    R.pluck("alias", VCA.getAgb(v2.q)),
    R.values(v2.mapping)
  )
  //console.log("rAgb & v2.mapping", R.pluck("alias", VCA.getAgb(v2.q)),  v2.mapping, rGbAttrs)
  if(!R.all((alias)=>rmatch[alias], rGbAttrs)) {
    console.error("Not all v2.Agbs have matches", 
      R.pluck("alias", VCA.getAgb(v1.q)),
      rGbAttrs, 
      "match:", rmatch)
    return null;
  }

  // Measures should be matched
  if (!R.all((alias) => match[alias], lmeasures)) { 
    console.error("v1 measure not matched: ", 
      lmeasures, "match:", match)
    return null;
  }
  if (!R.all((alias) => rmatch[alias], rmeasures)) {
    console.error("v2 measure not matched: ", rmeasures, rmatch) 
    return null;
  }
  return match;
}

export let getNaryDotMatch = (vs) => {
  const isCanonical = (q) => {
    let ops = VCA.find(q, ["Join", "ModelQueryJoin", "ModelModelJoin", "GroupBy"])
    let b =  !ops.length || ops[0].classType == "GroupBy"
    if (!b)
      console.error("NaryDot: view not in canonical form", q)
    return b;
  }
  if (!R.all(isCanonical, R.pluck("q", vs))) return null;
  if (vs.length <= 1) return {}

  let v1 = vs[0];
  let matches = R.tail(vs).map((v2) => getBinaryDotMatch(v1, v2))
  // check matches are all the same
  if (R.all(R.equals(matches[0]), R.tail(matches)))
    return matches[0]
  return null;
}

const getMax = R.reduce(R.max, -Infinity)
const isSubset = R.curry((subset, set) => 
  R.equals(R.intersection(subset, set), subset));
const toSchema = (v) => R.pluck("attr", v.q.schema())

// Check that all schemas are either identical, 
// or all subsets of the "largest" schema
export let getUnionMatch = (vs) => {
  let schemas = vs.map(toSchema)
  console.log(schemas)

  // find largest schema(s)
  let sizes = R.pluck("length", schemas)
  let maxSize = getMax(sizes)
  console.log(maxSize)
  let isMax = (schema) => schema.length == maxSize
  let bMaxes = schemas.map(isMax)
  let largestSchemas = schemas.filter(isMax)
  
  // make sure largest schemas are exact matches
  if (!R.all(R.equals(largestSchemas[0]), R.tail(largestSchemas)))
    return null;

  // make sure the remaining schemas are subsets
  let rest = R.reject(isMax, schemas)
  if (rest && !R.all(isSubset(rest[0]), R.tail(rest)))
    return null;
  
  console.log(sizes)
  console.log(bMaxes)
  return {
    largest: vs.filter((v,i) => bMaxes[i], vs),
    rest: vs.filter((v,i) => !bMaxes[i], vs)
  }
  
}



