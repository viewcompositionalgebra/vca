// 
// Minimum structure of a View needed by VCA to function
//
// q: query plan
// r: { vis attr : data attr name, measure: data attr name }
//    r MUST contain "measure" so we know which vis attribute
//    is encoding the measure variable
// 
// TODO: support axis labels and other configurations in r
// 
export let ViewBase = ({q, r, id, name, opts}) => {
  function me(){};
  me.type = "ViewBase"
  me.q = q;
  me.mapping = r;
  me.id = id;
  me.viewName = name;

  return me
}



