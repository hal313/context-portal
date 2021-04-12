# [context-portal](https://github.com/hal313/context-portal)

[![Build Status](http://img.shields.io/travis/hal313/context-portal/master.svg?style=flat-square)](https://travis-ci.org/hal313/context-portal)
[![Dependency Status](https://david-dm.org/hal313/context-portal.svg?style=flat-square)](https://david-dm.org/hal313/context-portal)
[![DevDependency Status](https://david-dm.org/hal313/context-portal/dev-status.svg?style=flat-square)](https://david-dm.org/hal313/context-portal)
[![npm Version](https://badge.fury.io/js/%40hal313%2Fcontext-portal.svg)](https://badge.fury.io/js/%40hal313%2Fcontext-portal)
[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/hal313/context-portal)


> Allows JavaScript to be run in remote or otherwise isolated contexts.

A great use for this is to execute code across boundaries of Chrome extension runtime contexts (the content page and the popup context, for example). As well, this could be used to exceute code across frame boundaries.

Note that the Chrome Extension API does provide a way to execute code across contexts, however there some significant advantages to using this library:
1. The Chrome Extension API does not handle remote code which executes promises
2. This library allows functions to be defined in a code context (opposed to a string context), so the code can be evaluated by any toolchain

```javascript
// Create and start a portal instance where the code should be run
const windowPortal = new Portal(
    // This function sends messages from the portal to the client
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

## Practical Application - Chrome Extension
This example demonstrates how a Chrome Extension might use this library in order to execute functions on the content page context from within the popup context.

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

Likewise, the popup context would run this code:
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
In general, primative values, arrays and JSON-like objects can be used as parameters and values as API function parameters. Likewise, return values for API functions may be primative values, arrays, JSON-like objects and also Promises. The promise will be resolved in the portal context before the resolved value is sent to the remote client.

If a function returns an array that contains a promise value which rejects, the entire function call will reject and the client will receive the rejection.

## Limitations
Currently observables are not implemented.

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
