// const { ACTIONS, SOURCES, DEBUG } = await import('./Common.js');
import { ACTIONS, SOURCES, DEBUG } from './Common.js';

const createMessage = (action, payload, callbackId, success=true) => {
    const message = {
        source: SOURCES.portal,
        action,
        payload,
        callbackId,
        success
    };

    return message;
};

const createSuccessMessage = (action, result, callbackId) => createMessage(action, {result}, callbackId);
const createErrorMessage = (action, error, callbackId) => createMessage(action, {error}, callbackId, false);


const runScriptInPortalContext = async (script) => {

    // return new Promise((resolve, reject) => {
    //     try {
    //         const functionBody = `
    //             (function() {
    //                 "use strict";
    //                 ${script}
    //             })();
    //         `;
    //         const result = eval(functionBody);
    //         resolve(result);
    //     } catch (error) {
    //         reject(error);
    //     }
    // });

    return new Promise((resolve, reject) => {
        try {
            const functionBody = `
                "use strict";
                ${script}
            `;

            // Handle arrays whose contents contain promises
            let result = new Function(functionBody)();
            if (Array.isArray(result)) {
                result = Promise.all(result.map(value => Promise.resolve(value)));
            }
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
};


const addFunctionToPortalContext = async (name, fnString) => {
    return runScriptInPortalContext(`window.${name} = ${fnString};`);
};

const runFunctionInPortalContext = async (name, params) => {
    return new Promise((resolve, reject) => {
        // Need to quote the string params
        const paramArray = params.map(value => 'string' === typeof value ? `'${value}'` : value);
        const code = `return ${name}(${paramArray.join(',')})`;
        resolve(runScriptInPortalContext(code, params));
    });
}

export class Portal {

    constructor(sendFn, registerFn) {
        this.sendFunction = sendFn;
        this.functions = [];
        this.listening = false;

        const remoteMessageHandler = message => {
            if (!this.listening) {
                if(DEBUG)console.log('portal', 'onMessage', 'ignoring: not listening');
                return;
            }

            const {action, payload, source, callbackId} = message;

            // Sanity check
            if (source !== SOURCES.remote || !action) {
                if(DEBUG)console.log('portal', 'onMessage', 'ignoring: unknown source or unspecified action');
                return;
            }

            if(DEBUG)console.log('portal', 'onMessage', message);

            switch (action) {
                case ACTIONS.addFunction:
                    (() => {
                        const {name, fnString} = payload;
                        this.addFunction(name, fnString, callbackId).catch(error => console.warn(`ERROR adding function: ${error}`))
                    })();
                    break;
                case ACTIONS.runFunction:
                    (() => {
                        const {name, params} = payload;
                        this.runFunction(name, callbackId, params).catch(error => console.warn(`ERROR running function: ${error}`))
                    })();
                    break;
                case ACTIONS.runScript:
                    (() => {
                        const {script} = payload;
                        this.runScript(script, callbackId).catch(error => console.warn(`ERROR running script: ${error}`));
                    })();
                    break;
                default:
                    this.sendFunction(createMessage(ACTIONS.error, {message: 'unknown action: ' + action}, callbackId, false));
            };
        };

        registerFn(remoteMessageHandler);
    }

    start() {
        this.listening = true;
    }

    stop() {
        this.listening = false;
    }

    runScript(script, callbackId) {
        return runScriptInPortalContext(script)
            .then(result => {
                this.sendFunction(createSuccessMessage(ACTIONS.runScriptComplete, result, callbackId));
                return result;
            })
            .catch(error => {
                this.sendFunction(createErrorMessage(ACTIONS.runScriptComplete, error, callbackId));
                throw error;
            });
    };

    addFunction (name, fnString, callbackId) {
        return new Promise((resolve, reject) => {
            if ('string' !== typeof name) {
                const error = 'Function name must be a string';
                this.sendFunction(createErrorMessage(ACTIONS.addFunctionComplete, error, callbackId));
                reject(error);
            } else {
                return addFunctionToPortalContext(name, fnString)
                .then(() => {
                    this.functions.push(name);
                    this.sendFunction(createSuccessMessage(ACTIONS.addFunctionComplete, name, callbackId));
                    resolve();
                })
                .catch(error => {
                    this.sendFunction(createErrorMessage(ACTIONS.addFunctionComplete, error, callbackId));
                    throw error;
                });
            }
        });
    };

    runFunction(name, callbackId, ...params) {
        return new Promise((resolve, reject) => {
            if (!this.functions.includes(name)) {
                const error = `Unknown function '${name}'`;
                this.sendFunction(createErrorMessage(ACTIONS.runFunctionComplete, error, callbackId));
                reject(error);
            } else {
                runFunctionInPortalContext(name, params)
                .then(result => {
                    this.sendFunction(createSuccessMessage(ACTIONS.runFunctionComplete, result, callbackId));
                    resolve(result);
                })
                .catch(error => {
                    this.sendFunction(createErrorMessage(ACTIONS.runFunctionComplete, error.message || error, callbackId));
                    reject(error);
                });
            }
        });
    };

}
