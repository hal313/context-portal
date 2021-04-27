export const defaultCode = `
// ========================================================================== //
// ===== Press "control+enter" to run this code                        ====== //
// ========================================================================== //

// ========================================================================== //
// NOTE: The variable "portal" is declared as a global
// NOTE: The class "Portal" is a global


// Create a portal instance - do not create a new instance if an instance exists
// NOTE: Be sure to use window.portal so that subsequent runs do not create new
//       portal instances instances
window.portal = window.portal || new Portal(
    responseMessage => window.parent.frames[1].postMessage(responseMessage),
    // message.data contains the request from remote instances
    handler => window.addEventListener('message', message => handler(message.data))
);
// Start the portal
window.portal.start();
console.log('portal started');
`.trim();
