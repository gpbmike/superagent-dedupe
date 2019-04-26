# superagent-dedupe
Dedupe in-flight requests.

```
$ npm install superagent-dedupe
```

```javascript
import superagent from 'superagent';
import dedupe from 'superagent-dedupe';

const dedupedRequest = superagent.agent().use(dedupe);

// first request fires
dedupedRequest.get('some-url').then((res) => ...);

// while the first request is in-flight
// subsequenet requests to the same url + query will use the first request
dedupedRequest.get('some-url').then((res) => ...);
```
