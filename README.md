# MediaWiki bare minimum promise-based API wrapper

This library, initially written by the original developer of MediaWiki API,
is a minimalistic set of functions to help access Wikipedia and other MW sites.

Thi library does not try to wrap any of the MediaWiki's APIs with functions.
Instead, it handles errors, warnings, continuations, basic datatypes, without
hiding any MW API with extra functions. Other libraries may choose to use
this library as the base, and build richer interface.

Eventually the goal is to make this library equaly usable from NodeJS and browser.

# NodeJS

```
var MWApi = require('mwapi'),
    mwapi = new MWApi(
        'Name of my program (email@ and wikiUser)',
        'https://en.wikipedia.org/w/api.php'),

    mwapi.iterate({
        // Execute 'query' call to MW API
        action: 'query',
        prop: 'revisions',
        titles: ['API', 'Main%20Page'],
        rvprop: 'content'
    }, function(response) {
         // process response object
         // return either boolean or a promise of a boolean
         // if true, continue iterating, false to stop
    }).then(function()) {
        // done
    };
```
