import * as R from 'ramda'
import { Source, Func, Project, Attr, PClause, Expr, Where, Value } from "./query.js"
import { Client } from "pg"
import { runQuery } from "./db.js"
import * as squelbase from "squel";
const squel = squelbase.useFlavour('postgres')




const schemaCache = {}

export async function getSchemas(db) {
  // load schema and ytpes from sqlite
  let rows = await runQuery(db, db.getSchemasQuery)

  let schemas = await Promise.all(rows.map(async ({tbl_name}) => {
    const schema = await  getSchema(db, tbl_name)
    if (!schema) return null;
    return [tbl_name, schema];
  }))
  schemas = R.reject(R.isNil, schemas)
  return schemas;
}

export async function getSchema(db, tbl_name) {
  if (schemaCache[tbl_name]) return schemaCache[tbl_name]
  let rows = await runQuery(db, `select * from ${tbl_name} limit 1`);
  if (!rows) return null;
  console.log("schema", rows[0])
  const schema = R.map((v) => (!R.isNil(v) && typeof(v)) || "string", rows[0])
  schemaCache[tbl_name] = schema;
  return schema;
}

export async function createSQLView(db, q, viewname) {
  await runQuery(db, `CREATE VIEW ${viewname} AS (${q})`)
}


export let getExprCardinalities = async (db, exprs, subq) => {
  "select count(distinct expr), ... from subq"
  
  let aliases = []
  let counts = exprs.map((e, i) => {
    aliases.push(`a${i}`)
    return PClause({
      e: Func({ fname: "count", args:[e], distinct:true }),
      alias: `a${i}`
    })
  }
  )
  let q = Project({
    exprs: counts, 
    child: Source({
      source: subq,
      alias: "exprcardsubq"
    })
  })
  let rows = await runQuery(db, q.toSql().toString())
  let row = rows[0];
  return aliases.map((alias) => +row[alias]);
}





// given known facetting attribute, determine the "buckets" and define 
// filter query for each bucket
//
// @table: String table/view name
// @facet: String attribute name used for faceting
//         TODO: support Attr or Expr objects for @facet
export let getFacetBuckets = async (db, q, facet) => {
  // TODO: better facet buckets.  currently uses every distinct value
  //       1. if numeric, compute counts and determine equidepth buckets
  //       2. if string, current approach is fine
  let fq = squel.select()
    .from(q.toSql(), 'facettable')
    .field(`distinct ${facet}`, "val")
    .order(facet)
  let rows = await runQuery(db, fq.toString())
  let specs = rows.map(({val}) => {
    let spec = {                       // facet = val
      where: Expr({
        op:"=", l: Attr(facet), 
        r: Value({type:"Literal", value: val})
      }),
      facet,
      val
    }
    return spec;
  })
  return specs;
}


// q: input query 
// attrs: list of attributes to compute bounds for, or null to use all Af
// 
// returns: [[Attr, [min, max]], ...]
export let getBounds = async (db, q, attrs=null) => {
  let boundsq = squel.select()
    .from(q.toSql(), "getBounds");
  attrs = attrs || q.Af;
  attrs.forEach((a) => {
    boundsq.field(`min(${a.attr})`, `min_${a.attr}`)
    boundsq.field(`max(${a.attr})`, `max_${a.attr}`)
  })
  let res = await runQuery(db, boundsq.toString())
  let row = res[0];
  let bounds = attrs.map((a) => 
    [a, [row[`min_${a.attr}`], row[`max_${a.attr}`]]]
  )
  return bounds;
};




// Given a new data attribute and current visual mapping,
// update the mapping
//
// returns: visual attr -> data attr
//
// TODO: remove hard coded rule (use Draco or something)
//
export let assignVisualMapping = (schema, mapping) => {
  let dattrs = R.pluck("attr", schema)
  let newDattrs = R.difference(dattrs, R.values(mapping))

  let vattrs = ['x', 'y', 'color', 'shape', 'column', 'size' ] 
  let newMapping = { mark: "bar" }
  R.forEachObjIndexed((dattr, vattr) => {
    if (R.contains(vattr, ["measure", "mark"]) || R.contains(dattr, dattrs))
      newMapping[vattr] = dattr
  }, mapping)
  
  if (newMapping.mark == "table") {
    newDattrs.forEach((dattr) => newMapping[dattr] = dattr)
    return newMapping;
  } 

  if (newMapping.mark == "bar" && newDattrs.length == 1) { 
    newMapping['x'] = newDattrs[0]
    newMapping['color'] = newDattrs[0]
    newMapping['column'] = mapping['x']
    return newMapping;
  } 

  // if there are missing positional attributes but mapped nonpositional attributes
  // then swap
  let isMapped = (vattr) => R.contains(mapping[vattr], dattrs)
  let openPosMappings = R.reject(isMapped, ['x', 'y'])
  let nonPosMappings = R.filter(isMapped, ['color', 'shape', 'column', 'size'])
  if (openPosMappings.length && nonPosMappings.length) {
    R.zip(openPosMappings, nonPosMappings).forEach(([openPos, nonPos]) => {
      newMapping[openPos] = mapping[nonPos];
      delete newMapping[nonPos]
    })
  }

  // ok now, map remaining attributes in order
  newDattrs = R.difference(dattrs, R.values(mapping))
  vattrs = R.difference(vattrs, R.keys(mapping))
  if (vattrs.length < newDattrs.length)
    throw new Error(`Too many new data variables, no visual variables left: ${newDattrs}`)
  R.zip(newDattrs, vattrs).forEach(([dattr, vattr]) => {
    newMapping[vattr] = dattr;
  })
  return newMapping;
}






export  function descendantOfClass(n, klass) {
	while(n.parentNode) {
	  if ($(n).hasClass(klass)) return true;
	  n = n.parentNode;
	}
	return false;
  }


/*
 * inner join input bounds on Attr, and unions their min/max
 *
 * bounds: [ [Attr, [min, max], ... ]
 */
export function mergeBounds(bounds1, bounds2) {
  let output = []
  bounds1.forEach(([attr1, [min1, max1]]) => {
    bounds2.forEach(([attr2, [min2, max2]]) => {
      if (attr1.attr != attr2.attr) return;
      output.push(
        [
          attr1.clone(), 
          [Math.min(min1,min2), Math.max(max1,max2)]
        ]
      )
    })
  })
  return output;
}

export function bboxOverlap(b1, b2) {
  return !(
    b1.l + b1.w < b2.l ||
    b2.l + b2.w < b1.l ||
    b1.t + b1.h < b2.t ||
    b2.t + b2.h < b1.t
  )
}

export function b64(e){var t="";var n=new Uint8Array(e);var r=n.byteLength;for(var i=0;i<r;i++){t+=String.fromCharCode(n[i])}return window.btoa(t)}

