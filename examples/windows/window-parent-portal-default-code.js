export const defaultCode = `
// ========================================================================== //
// ===== Press "control+enter" to run this code                        ====== //
// ========================================================================== //

// ========================================================================== //
// NOTE: The variable "portal" is declared as a global
// NOTE: The class "Portal" is a global


// Open the child window if it is not opened and add a listener to close
// the child window when this window unloads
if (!window.childWindow || window.childWindow.closed) {
    // Open in a "setTimeout" block to force opening a new window, not a new tab
    window.childWindow = window.open('window-child-remote.html');
    window.onunload = () => window.childWindow.close();
}


// Create a portal instance - do not create a new instance if an instance exists
// NOTE: Be sure to use window.portal so that subsequent runs do not create new
//       portal instances instances
window.portal = window.portal || new Portal(
    responseMessage => window.childWindow.postMessage(responseMessage),
    // message.data contains the request from remote instances
    handler => window.addEventListener('message', message => handler(message.data))
);
// Start the portal if it is not runnign
if (!window.portal.listening) {
    window.portal.start();
    console.log('portal started');
}
`.trim();
