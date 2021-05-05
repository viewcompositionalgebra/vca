import * as R from 'ramda'
import { Pool, Client, types } from "pg"
import * as pgpsetup from "pg-promise"

export let makeXhrRequest = async (url) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
      resolve(this.response);
    };
    xhr.onerror = () => reject({ 
      status: xhr.status, 
      statusText: xhr.statusText
    })
    xhr.send();
  });
}

let pgp = null;
export let LocalDB = (async (opts) => {
  opts = opts || {}
  opts.host = opts.host || 'localhost'
  opts.port = opts.port || 5432
  opts.user = opts.user || 'eugenewu'
  opts.database = opts.database || 'test'
  let me = () => {};

  if (pgp == null) {
    pgp = pgpsetup.default()
    pgp.pg.types.setTypeParser(20, parseInt)
    pgp.pg.types.setTypeParser(21, parseInt)
    pgp.pg.types.setTypeParser(1700, parseFloat)
    pgp.pg.types.setTypeParser(700, parseFloat)
    pgp.pg.types.setTypeParser(701, parseFloat)
  }

  me.pool = pgp(opts)

  me.exec = async (q) => {
    try {
      let rows = await me.pool.query(q);
      return rows;
    } catch (e) {
      console.log(q)
      console.error(e)
      console.trace()
      return []
    }
  }
  me.getSchemasQuery = `
  select tablename as tbl_name from pg_tables 
  where position('tmp' in tablename) = 0 and 
        position('model' in tablename) = 0 and 
        schemaname = 'public';`;
  return me;
})

export let RemoteDB = (({url}) => {
  let me = () => {}

  me.exec = async (q) => {
    let [data] = await $.ajax({
      url: url || "http://localhost:8000/query",
      type: "GET",
      data: { q },
      dataType: "json"
    });

    data = data.values.map((vals) => {
      return Object.fromEntries( vals.map((v,i) => [data.columns[i], v]));
    })

    return data;
  }
  me.getSchemasQuery = `
  select tablename as tbl_name from pg_tables 
  where position('tmp' in tablename) = 0 and
        position('model' in tablename) = 0 and 
        schemaname = 'public';`;

  return me;
})

export let loadSqliteDB = async (SQL, url) => {
  const response = await makeXhrRequest(url);
  var uInt8Array = new Uint8Array(response);
  let db = new SQL.Database(uInt8Array);


  let me = () => {}
  me.exec = async (q) => {
    let [data] = await db.exec(q);
    data = data.values.map((vals) => {
      return Object.fromEntries( vals.map((v,i) => [data.columns[i], v]));
    })
    return data;
  }
  me.getSchemasQuery = "select tbl_name from sqlite_master where type='table'";
  return me;
}

export let runQuery = async (db, q) => {
  try {
    return await db.exec(q);
  } catch (e) {
    console.error(q)
    console.log(e)
    throw e;

  }
}

