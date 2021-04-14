import { ACTIONS, SOURCES, DEBUG } from './Common.js';
import { Deferred } from './Deferred.js';

// This map stores callback functions keyed by callbackId's.
//
// When the portal announces that a command has finished, the associated callback function can
// be invoked.
//
// The map holds deferred instances, keyed by callbackId
const callbackMap = {};

/**
 * Generates a unique callback ID.
 *
 * @returns {string} a unique callback ID
 */
const generateCallbackId = () => new Date().getTime() + '' + Math.random()


/**
 * Sends a message to the portal.
 *
 * @param {string} action the action to perform
 * @param {Object} payload the action data
 * @param {Function} sendFn the function which sends data to the portal
 * @returns {Promise} a promise which resolves or rejects based on the response from the portal
 */
const sendMessageToPortal = async (action, payload, sendFn) => {
    // Create a deferred instance
    const deferred = new Deferred();

    // Generate a callback Id
    const callbackId = generateCallbackId();

    // Add the deferred to the callbackMap
    callbackMap[callbackId] = deferred;

    // Assemble the message
    const message = {
        // The source is always "remote"
        source: SOURCES.remote,
        action,
        payload,
        callbackId
    };

    // Debugging
    if(DEBUG)console.log('remote', 'postMessage', message);

    // Actually send the message
    sendFn(message);

    // Return a promise
    return deferred.promise;
};


/**
 * Implements the remote (or client) side of the context portal. Clients use instances of the Remote
 * in order to communciate with the portal instance.
 */
export class Remote {

    /**
     * Creates an instance of the remote.
     *
     * @param {Function} sendFn the function which sends a message to the portal
     * @param {Function} registerFn the function which registers to listen to messages from the portal
     */
    constructor(sendFn, registerFn) {
        // Save a reference to the send function
        this.sendFunction = sendFn;

        /**
         * Handles messages from the portal. Responsible for parsing the results and
         * resolving or rejecting the promise from the associated deferred instance (as
         * referenced in the callbackMap).
         *
         * @param {Object} message handles messages received  from the portal
         * @returns {undefined}
         */
        const portalMessageHandler = message => {
            // Deconstruct the message
            let {action, payload, source, callbackId, success} = message;


            // Sanity check
            // Check the source (should be "portal" and verify that an action was present)
            if (source !== SOURCES.portal || !action) {
                return;
            }


            // Debugging
            if(DEBUG)console.log('remote', 'onMessage', message);

            // Get the deferred
            const deferred = callbackMap[callbackId];
            // Sanity check
            if (!deferred) {
                // This is an error (not necessary to log)
                console.error(`No deferred for ${callbackId}`);
                return;
            }

            // Dispatch to resolve/reject
            if (success) {
                deferred.resolve(payload.result);
            } else {
                // Error instances are sent with a "message" and "name" member; reconstitute this as an Error instance
                if (payload?.error?.message && payload?.error?.name) {
                    const error = new Error(payload.error.message);
                    error.name = payload.error.name;
                    deferred.reject(error);
                } else {
                    deferred.reject({message: payload.error});
                }
            }

            // Remove the callback from the map; this helps
            // reduce memory leaks and also prevents the deferred from
            // being used again accidentally
            delete callbackMap[callbackId];
        };

        // Register the listen function
        registerFn(portalMessageHandler);
    }


    /**
     * Creates a usable API to use via the portal. Either an object with functions OR a function which returns
     * an object with functions may be provided. The returned object will have a function associated with each
     * function in the API object; however, all return values will be promises because all communication with
     * the portal is asynchronous.
     *
     * @param {Object} api the API to create in the portal
     * @returns {Promise} a promise which resolves an object that mirrors the <i>api</i> but each return value is a promise
     */
    async createAPI(api) {
        // If the api is a function, executed the function and use the returned value
        if ('function' === typeof api) {
            return this.createAPI(api());
        }

        // The API object to return to the client
        const remoteAPI = {};
        // All promises which need to resolve before the API can be returned
        const promises = [];

        // For each function...
        //
        // Add the function to the api
        Object.keys(api).forEach(name => {
            // Add wrapped function to host api
            //
            // Send a message to the portal to add a function; the function will be serialized and sent to the portal
            const addFunctionPromise = sendMessageToPortal(ACTIONS.addFunction, {name, fnString: api[name].toString()}, this.sendFunction).then(() => {
                // The returned function will be a wrapper function that requests the portal to execute the newly added function
                const sendFunction = this.sendFunction;
                // Add the wrapper to the remote API
                remoteAPI[name] = function() {
                    // The wrapper will serialize the arguments and send the invocation request to the portal
                    return sendMessageToPortal(ACTIONS.runFunction, {name, params: Array.from(arguments)}, sendFunction);
                };
            });
            // Add the "add function" promise to the collection of promises
            promises.push(addFunctionPromise);
        });

        // Once all "add function" promises resolve, return the api to the client
        return Promise.all(promises).then(() => remoteAPI);
    }

    /**
     * Provides JavaScript code to be run in the portal.
     *
     * @param {string} script the script to run
     * @returns {Promise} resolves with the script result or rejects with the script error
     */
    async runScript(script) {
        return sendMessageToPortal(ACTIONS.runScript, {script}, this.sendFunction);
    }

}
