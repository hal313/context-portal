import { ACTIONS, SOURCES, DEBUG } from './Common.js';
import * as Resolver from './Resolver.js';

/**
 * Builds a message suitable for sending to the remote.
 *
 * @param {string} action the action to create a message for
 * @param {Object} payload the message payload
 * @param {Object} remoteRequestMessage the remote request message
 * @param {boolean} success true, if the operation succeeded; false otherwise
 * @returns {Object} the message to send to the remote
 */
const createMessage = (action, payload, remoteRequestMessage, success=true) => ({
    // The source is always "portal"
    source: SOURCES.portal,
    action,
    payload,
    callbackId: remoteRequestMessage.callbackId,
    success
});

/**
 * Builds a success message for the remote.
 *
 * @param {string} action the action to create the message for
 * @param {Object} result the action result
 * @param {Object} remoteRequestMessage the remote request message
 * @returns {Object} the message to send to the remote
 */
const createSuccessMessage = (action, result, remoteRequestMessage) => createMessage(action, {result}, remoteRequestMessage);

/**
 * Builds an error message for the remote.
 *
 * @param {string} action the action to create the message for
 * @param {Object} result the action result
 * @param {Object} remoteRequestMessage the remote request message
 * @returns {Object} the message to send to the remote
 */
 const createErrorMessage = (action, error, remoteRequestMessage) => createMessage(
     action,
     {
        // If the error is an Error, break apart the components into "message" and "name"
        error: (error instanceof Error ? {message: error.message, name: error.name} : error)
    },
    remoteRequestMessage,
    false
);



/**
 * Runs JavaScript in the portal context.
 *
 * @param {string} script the JavaScript to run in the portal context
 * @returns {Promise} resolves to the return value of the script
 */
const runScriptInPortalContext = async (script) => new Promise((resolve, reject) => {
    try {
        // Build the function body
        const functionBody = `
            "use strict";
            ${script}
        `;

        // 1.) Create and execute a function by using 'apply' with the window
        // 2.) Resolve all promises within the result
        const context = ('object' === typeof window) ? window : {};
        resolve(Resolver.deepResolve(new Function(functionBody).apply(context)));
    } catch (error) {
        reject(error);
    }
});

/**
 * Adds a function to the portal context.
 *
 * @param {string} name the name of the function to add
 * @param {string} fnString a string representing the function code
 * @returns {Promise} resolves once the function has been added
 */
const addFunctionToPortalContext = async (name, fnString) => runScriptInPortalContext(`window.${name} = ${fnString};`);

/**
 * Executes a previously added function within the portal context.
 *
 * @param {string} name the name of the function to run
 * @param {any[]} params the parameters to pass to the function
 * @returns {Promise} resolves to the result of function execution in the context portal; rejects on error
 */
const runFunctionInPortalContext = async (name, params) => {
    // Resolve the parameters before running the script
    const resolvedParams = await Resolver.deepResolve(params);

    return new Promise((resolve/*, reject*/) => {
        // Need to quote the string params
        const paramArray = resolvedParams.map(value => 'string' === typeof value ? `'${value}'` : value);
        // Construct the script to execute `return functionName(param1, parame)`
        const code = `return ${name}(${paramArray.join(',')})`;
        // Resolve the value of running the script
        resolve(runScriptInPortalContext(code));
    });
};


/**
 * Implements the portal portion of the context portal. This code runs within the target context and brokers with the Remote instance.
 */
export class Portal {

    /**
     * Creates an instance of the portal.
     *
     * @param {Function} sendFn the function which sends a message to the portal, will be passed the message to send as well as the original request
     * @param {Function} registerFn the function which registers to listen to messages from the portal
     */
    constructor(sendFn, registerFn) {
        // Save the function for later
        this.sendFunction = sendFn;

        // A collection of the functions added to the portal
        this.functions = [];
        // Flag which determines when the portal is listening
        this.listening = false;

        /**
         * Handles messages from the remote. Responsible for parsing the request,
         * performing the requested action and sending results to the caller.
         *
         * @param {Object} remoteRequestMessage handles messages received  from the remote
         * @returns {undefined}
         */
        const remoteMessageHandler = remoteRequestMessage => {
            // Only handle messages when in a listening state
            if (!this.listening) {
                if(DEBUG)console.log('portal', 'onMessage', 'ignoring: not listening');
                return;
            }

            // Deconstruct the message
            const {action, payload, source} = remoteRequestMessage;


            // Sanity check
            // Check the source (should be "remote" and verify that an action was present)
            if (source !== SOURCES.remote || !action) {
                if(DEBUG)console.log('portal', 'onMessage', 'ignoring: unknown source or unspecified action');
                return;
            }


            // Debugging
            if(DEBUG)console.log('portal', 'onMessage', remoteRequestMessage);

            // Dispatch the action
            switch (action) {
                // Note the use if IIFE in order to allow for useful variable naming
                case ACTIONS.addFunction:
                    // Add a function to the portal context
                    (() => {
                        const {name, fnString} = payload;
                        this.addFunction(name, fnString, remoteRequestMessage).catch(/*error => console.warn(`ERROR adding function: ${error}`)*/)
                    })();
                    break;
                case ACTIONS.runFunction:
                    // Execute a function in the portal context
                    (() => {
                        const {name, params} = payload;
                        this.runFunction(name, remoteRequestMessage, params).catch(/*error => console.warn(`ERROR running function: ${error}`)*/)
                    })();
                    break;
                case ACTIONS.runScript:
                    // Run a script in the portal context
                    (() => {
                        const {script} = payload;
                        this.runScript(script, remoteRequestMessage).catch(/*error => console.warn(`ERROR running script: ${error}`)*/);
                    })();
                    break;
                default:
                    // Unknown action
                    this.sendFunction(createMessage(ACTIONS.error, {message: 'unknown action: ' + action}, remoteRequestMessage, false));
            }
        };

        // Register the listen function
        registerFn(remoteMessageHandler);
    }

    /**
     * Informs the portal to start listening and acting upon requests.
     *
     * @returns {Object} this instance, for chaining
     */
    start() {
        this.listening = true;
        return this;
    }

    /**
     * Informs the portal to stop listening and cease acting upon requests.
     *
     * @returns {Object} this instance, for chaining
     */
    stop() {
        this.listening = false;
        return this;
    }

    /**
     * Executes script within the portal context.
     *
     * @param {string} script the script to run
     * @param {Object} remoteRequestMessage the remote request message
     * @returns {Promise} resolves to the result of the script; rejects on error
     */
    runScript(script, remoteRequestMessage) {
        // Execute the script
        return runScriptInPortalContext(script)
            .then(result => {
                // Send a success message
                this.sendFunction(createSuccessMessage(ACTIONS.runScriptComplete, result, remoteRequestMessage), remoteRequestMessage);
                return result;
            })
            .catch(error => {
                // Send an error message
                this.sendFunction(createErrorMessage(ACTIONS.runScriptComplete, error, remoteRequestMessage), remoteRequestMessage);
                throw error;
            });
    }

    /**
     * Adds a function to the portal context to be invoked later.
     *
     * @param {string} name the name of the function to add
     * @param {string} fnString the string representation of the function
     * @param {Object} remoteRequestMessage the remote request message
     * @returns {Promise} resolves after the function has been added to the portal context; rejects on error
     */
    addFunction(name, fnString, remoteRequestMessage) {
        return new Promise((resolve, reject) => {
            if ('string' !== typeof name) {
                const error = 'Function name must be a string';
                this.sendFunction(createErrorMessage(ACTIONS.addFunctionComplete, error, remoteRequestMessage), remoteRequestMessage);
                reject(error);
            } else {
                return addFunctionToPortalContext(name, fnString)
                .then(() => {
                    this.functions.push(name);
                    this.sendFunction(createSuccessMessage(ACTIONS.addFunctionComplete, name, remoteRequestMessage), remoteRequestMessage);
                    resolve();
                })
                .catch(error => {
                    this.sendFunction(createErrorMessage(ACTIONS.addFunctionComplete, error, remoteRequestMessage), remoteRequestMessage);
                    throw error;
                });
            }
        });
    }

    /**
     * Executes a previously added function within the portal context.
     *
     * @param {string} name the name of the function to execute
     * @param {Object} remoteRequestMessage the remote request message
     * @param  {...any} [params] parameters for the function execution
     * @returns {Promise} resolves with the result of the function execution; rejects on error
     */
    runFunction(name, remoteRequestMessage, ...params) {
        return new Promise((resolve, reject) => {
            // Check to see if the function has been added
            if (!this.functions.includes(name)) {
                const error = `Unknown function '${name}'`;
                // Reject
                this.sendFunction(createErrorMessage(ACTIONS.runFunctionComplete, error, remoteRequestMessage), remoteRequestMessage);
                reject(error);
            } else {
                // Excecute the function
                runFunctionInPortalContext(name, params)
                .then(result => {
                    // Resolve the result
                    this.sendFunction(createSuccessMessage(ACTIONS.runFunctionComplete, result, remoteRequestMessage), remoteRequestMessage);
                    resolve(result);
                })
                .catch(error => {
                    // Reject
                    this.sendFunction(createErrorMessage(ACTIONS.runFunctionComplete, error.message || error, remoteRequestMessage), remoteRequestMessage);
                    reject(error);
                });
            }
        });
    }

}
