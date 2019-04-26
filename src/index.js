// store callback stacks here
const requests = {};

// adapted from https://github.com/jpodwys/superagent-cache
function isEmpty(val) {
  return (
    val === false ||
    val === null ||
    (typeof val == "object" && Object.keys(val).length == 0)
  );
}

// use url and query to build a unique request key
function getKey(req) {
  const { url } = req;

  let query = null;

  // adapted from https://github.com/jpodwys/superagent-cache
  if (req && req.qs && !isEmpty(req.qs)) {
    query = req.qs;
  } else if (req && req.qsRaw) {
    query = req.qsRaw;
  } else if (req && req.req) {
    query = req.req.path;
  } else if (req && req._query) {
    query = req._query;
  }

  return JSON.stringify({ url, query });
}

export default function dedupe(request) {
  // We only want to dedupe GET requests
  if (request.method !== "GET") {
    return request;
  }

  // remember the original method
  request._maskedEnd = request.end;

  request.end = callback => {
    const key = getKey(request);

    // If there is already a request with this key in progress
    // 1. push our callback to the stack
    // 2. bail
    if (requests[key]) {
      if (callback) {
        requests[key].push(callback);
      }
      return request;
    }

    // store callbacks here
    requests[key] = [];

    // If no request in progress
    // 1. proceed with original method
    // 2. call all callbacks with data
    // 3. delete callback stack
    request._maskedEnd((err, response) => {
      if (callback) {
        callback(err, response);
      }

      // all stacked callbacks get the data from original request
      for (let i = 0; i < requests[key].length; i += 1) {
        requests[key][i](err, response);
      }

      // the next time this request is called, start over
      delete requests[key];
    });

    return request;
  };

  return request;
}
