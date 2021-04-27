# [context-portal](https://github.com/hal313/context-portal)

[![Build Status](http://img.shields.io/travis/com/hal313/context-portal/master.svg?style=flat-square)](https://travis-ci.com/hal313/context-portal)
[![Dependency Status](https://david-dm.org/hal313/context-portal.svg?style=flat-square)](https://david-dm.org/hal313/context-portal)
[![DevDependency Status](https://david-dm.org/hal313/context-portal/dev-status.svg?style=flat-square)](https://david-dm.org/hal313/context-portal)
[![npm Version](https://badge.fury.io/js/%40hal313%2Fcontext-portal.svg)](https://badge.fury.io/js/%40hal313%2Fcontext-portal)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/hal313/context-portal)


> Allows JavaScript to be run in remote or otherwise isolated contexts.

A great use for this is to execute code across boundaries of Chrome extension runtime contexts (the content page and the popup context, for example). As well, this could be used to exceute code across frame boundaries.

Note that the Chrome Extension API does provide a way to execute code across contexts, however there some significant advantages to using this library:
1. The Chrome Extension API does not handle remote code which executes promises
2. This library allows functions to be defined in a code context (opposed to a string context), so the code can be evaluated by any toolchain
3. The Chrome Extension API has some restrictions and incongruent API calls (depending on the type of extension)

```javascript
// Create and start a portal instance where the code should be run
const windowPortal = new Portal(
    // This function sends messages from the portal to the client
    // NOTE: The sendFunction actually takes two parameters: the message to send AND the orginal request from the remote
    message => window.postMessage(message),
    // This function directs messages sent from the client to the portal message handler
    handler => addEventListener('message', message => handler(message.data))
).start();


// Create an instance of the remote where the actual functions are
const remote = new Remote(
    // This function sends messages from the client to the portal
    message => window.postMessage(message),
    // This function directs messages sent from the portal to the client message handler
    handler => addEventListener('message', message => handler(message.data))
);

// Create an API in the remote context; this creates the same API in the portal context
//
// The return value of this call is an object with all the same functions, however each
// function will return a promise. When invoked, the API will inform the portal context
// to execute the function and will return a promise which resolves to the value returned
// in the portal execution context
remote.createAPI({
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => a / b,
})
.then(api => {
    return api.add(5, 5)
    .then(result => api.subtract(result/*10*/, 1))
    .then(result => api.multiply(result/*9*/, 10))
    .then(result => api.divide(result/*90*/, 9))
})
.then(result => console.log(`result should be '10': ${10 === result} (${result})`))
.catch(error => console.error('error', error));
```

It is noteworthy that there are no runtime depedencies required for this library.

## Practical Applications

### Named Portal and Remote
This example demonstrates how to have multiple portal and remote instances live in the same space. By adding some filters on incoming messages and appending destination data to outgoing messages, any number of portal and remote instances may exist in the same space.

```javascript
// Create a portal that only listens to messages which have a member "target" with value "pizza"
// Since there are multiple remotes, the target is attached to outgoing messages as well so that
// remotes may ignore messages not intended for them
const pizzaPortal = new Portal(
    // In this scenario, "request" represents the message sent from the remote; the message contains
    // the target ('pizza'); it is OK to use either the string literal or `request.target`
    (message, request) => window.postMessage(Object.assign({}, message, {target: request.target/*pizza*/})),
    handler => addEventListener('message', message => 'pizza' === message.data.target ? handler(message.data) : null)
);
// Start the portal
pizzaPortal.start();
//
// Create a remote which appends the "target" member to outgoing messages with the value "pizza"
// Since there are multiple remote instances, filter out messages not intended for this instance
const pizzaRemote = new Remote(
    message => window.postMessage(Object.assign({}, message, {target: 'pizza'})),
    handler => addEventListener('message', message => 'pizza' === message.data.target ? handler(message.data) : null)
);



// Create a portal that only listens to messages which have a member "target" with value "darko"
// Since there are multiple remotes, the target is attached to outgoing messages as well so that
// remotes may ignore messages not intended for them
const darkoPortal = new Portal(
    // Contrast with pizzaPortal, the target is a string literal; either approach is OK
    message => window.postMessage(Object.assign({}, message, {target: 'darko'})),
    // Filter out messages not intended for this portal
    handler => addEventListener('message', message => 'darko' === message.data.target ? handler(message.data) : null)
);
// Start the portal
darkoPortal.start();
//
// Create a remote which appends the "target" member to outgoing messages with the value "pizza"
// Since there are multiple remote instances, filter out messages not intended for this instance
const darkoRemote = new Remote(
    message => window.postMessage(Object.assign({}, message, {target: 'darko'})),
    // Filter out messages not intended for this portal
    handler => addEventListener('message', message => 'darko' === message.data.target ? handler(message.data) : null)
);


// Run a script only on the pizzaRemote
await pizzaRemote.runScript(`console.log('pizza!')`);
// Run a script only on the darkoRemote
await darkoRemote.runScript(`console.log('donnie!')`);
```

### Chrome Extension
This example demonstrates how a Chrome Extension might use this library in order to execute functions on the content page context from within the popup context. See the full [source code](https://github.com/hal313/context-portal-chrome-extension-example).

This code would be executed in the content page context:
```javascript
// Content script does not run as a module; cannot use async - use promises instead
import('./portal.js').then(Portal => new Portal.Portal(
    // This function sends a message from the portal context (content script) to the remote (popup context)
    chrome.runtime.sendMessage,
    // Register the handler
    handler => chrome.runtime.onMessage.addListener(handler)
).start());
```

Likewise, the popup context runs this code:
```javascript
// Instantiate the portal
const remote = new Remote(
  // This function sends a message from the popup context to the portal context (content script - the c urrent tab)
  message => chrome.tabs.query({active: true, currentWindow: true}, tabs => chrome.tabs.sendMessage(tabs[0].id, message)),
  // Register the handler
  handler => chrome.runtime.onMessage.addListener(handler)
);

// Just like before, the API can be created and used; in this case, the actual code is executed in the portal context (content page)
remote.createAPI({
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    multiply: (a, b) => a * b,
    divide: (a, b) => a / b,
})
.then(api => {
    return api.add(5, 5)
    .then(result => api.subtract(result, 1))
    .then(result => api.multiply(result, 10))
    .then(result => api.divide(result, 9))
})
.then(result => console.log(`result should be '10': ${10 === result} (${result})`))
.catch(error => console.error('error', error));
```

## General Use Notes

### Parameter Inputs
In general, primative values, arrays and JSON-like objects may be used as parameters and values as API function parameters; as well, `Promise`'s which resolve those types may be used (any parameter which contains `Promise`'s will be resolved within the remote instance before being sent to the portal).

### Function Outputs
Return values for API functions may be primative values, arrays, JSON-like objects and also Promises. The promise will be resolved in the portal context before the resolved value is sent to the remote client.

If a function execution throws or contains a result which contains a `Promise` that rejects, the entire function call is rejected and the remote instance will receive the rejection.

### Errors
If execution fails within the portal context, then an error will be received by any remote instances as a `Promise` rejection. All errors in the remote contain a "message" attribute which indicates the error. If the execution in the portal was an Error instance, an additional "name" attribute will be attached to the error object in the remote. In this case, an actual Error instance will be re-created, however only the message will persist; that is to say, the stack trace from the portal will _not_ be present on the remote.

## Limitations
Currently observables and callbacks are not implemented. More precisely, with the exception of the `Promise` class, no functions which return asynchronous results should be expected to work.

Context and global variables are not implemented:
```javascript
// Instantiate the portal
const remote = new Remote(
    message => window.postMessage(message),
    handler => addEventListener('message', message => handler(message.data))
);

const helloString = 'Hello';

// Create the API
remote.createAPI({
    // Note that 'helloString' is defined outside the context of this function; this will
    // fail at runtime because the portal context does not know what 'helloString' is
    hello: (name) => helloString + ' ' + name
})
.then(api => api.hello('Pat'))
.then(string => console.log(string))
.catch(error => console.error('error', error));
```

It is possible to send global variables to the portal context like so:
```javascript
// Instantiate the portal
const remote = new Remote(
    message => window.postMessage(message),
    handler => addEventListener('message', message => handler(message.data))
);

// Set the constant "helloString"
const helloString = 'Hello';

// Set the variable
remote.runScript(`var helloString = '${helloString}'`)
// Create the API
.then(() => remote.createAPI({
    // Note that 'helloString' is defined outside the context of this function; this will
    // fail at runtime because the portal context does not know what 'helloString' is
    hello: (name) => helloString + ' ' + name
}))
.then(api => api.hello('Pat'))
.then(string => console.log(string))
.catch(error => console.error('error', error));
```

## Architecture
The Portal instance resides in the target context while the Remote instance exists in some other context. As long as a way exists to send and receive messages between the two contexts, then this context portal can be used. The actual means to send and receive messages must be provided by the respective contexts and the context portal handles the serialization of functions, parameters and results. All cross-context communication is asynchronous and therefore context portal handles message transfer by assigning callbackId's for each message. Typical client code need not be concerned with callbackIds, assigning requests to responses and the like.

The remote creates an API to be used. Each function in the API is a wrapper function which will invoke the function on the portal context, while returning a promise. The request includes a callbackId which is stored as a key in the `callbackMap` within the remote instance (the values are `Deferred` instances). Once the portal responds with a message, the `callbackMap` is consulted and the `Deferred` is either rejected or resolved using the `success` and `payload` value of the message.

### Message Format
The message formats between the portal and remote instances are documented below but should be of interest only to developers on the project.

`portal -> remote`
```javascript
    {

        source: string,     // The source is always "portal"
        action: string,     // Identifies the message action
        payload: Object,    // Response from the code execution
        callbackId: string, // The callback ID (assigned by the remote request)
        success: boolean    // True, if the action was a success
    }
```

`remote -> portal`
```javascript
    {
        source: string,     // The source is always "remote"
        action: string,     // Identifies the message action
        payload: Object,    // Parameters and such for the action
        callbackId: string  // A unique ID for the message (the portal's return message will have the same id)
    };
```
## Developing

### Examples

#### Playground
A basic HTML page which loads the `Portal` and `Remote` classes and can be served through some IDE's, or via the command:
```bash
npx http-server -o examples/playground/playground.html
```

The web IDE has some sample code which can be run in order to see how the Portal and Remote work together. Notice how the both the Portal
and Remote reside in the same context. In this case, messages may be passed using `window.postMessage`.

#### Frames
A basic HTML page which loads two frames, one for the Portal and one for the Remote. This example can be served through some IDE's, or via the command:
```bash
npx http-server -o examples/frames/frames.html
```

The web IDE has some sample code which can be run in order to see how the Portal and Remote work together. Because the Portal and Remote exist
in different contexts, the messages are passed using `window.parent.frames[0]` and `window.parent.frames[1]`.
### Tests

#### Browser
Tests can be run in a browser a few different ways. However, tests MUST be run from a server and not loaded from disk, as doing so will violate security.

It is best to use IDE live-server functionality, as this often includes refreshing the page when code changes.

This package has a built in server, which can be started like:
```bash
npm run serve-test
```

Open a browser to test the Remote: [http://127.0.0.1:3000/test/specs/remote](http://127.0.0.1:3000/test/specs/remote)

Open a browser to test the Portal: [http://127.0.0.1:3000/test/specs/portal](http://127.0.0.1:3000/test/specs/portal)

#### Headless
Unit tests are implemented in Mocha/Chai and can be run within a browser or headless (useful for CI). To run the tests headless:
```bash
npm test
```
