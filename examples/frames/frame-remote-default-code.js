export const defaultCode = `
// ========================================================================== //
// ===== Press "control+enter" to run this code                        ====== //
// ========================================================================== //

// ========================================================================== //
// NOTE: The variable "remote" is declared as a global
// NOTE: The classes "Remote" is a global


// Create a remote instance - do not create a new instance if an instance exists
// NOTE: Be sure to use window.portal so that subsequent runs do not create new
//       remote instances instances
window.remote = window.remote || new Remote(
    responseMessage => window.parent.frames[0].postMessage(responseMessage),
    // message.data contains the request from remote instances
    (handler) => window.addEventListener('message', message => handler(message.data))
);

// Create an API to use
var api = await remote.createAPI({
    add: (a, b) => a + b,
    subtract: (a, b) => a - b,
    // TODO: Implement "multiply" and "divide"
});

// Execute some API calls
console.log('api.add(2, 3)', await api.add(2, 3));
console.log('api.subtract(5, 3)', await api.subtract(5, 3));

// Run a sample script
await remote.runScript("var message = 'running in the portal'; console.log(message)");
`.trim();
