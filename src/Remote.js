// const { ACTIONS, SOURCES, DEBUG } = await import('./Common.js');
import { ACTIONS, SOURCES, DEBUG } from './Common.js';
// const Deferred = (await import('./Deferred.js')).Deferred;
import { Deferred } from './Deferred.js';

const callbackMap = {};

const generateCallbackId = () => new Date().getTime() + '' + Math.random()

const sendMessageToPortal = async (action, payload, sendFn) => {
    const deferred = new Deferred();
    const callbackId = generateCallbackId();
    callbackMap[callbackId] = deferred;

    const message = {
        source: SOURCES.remote,
        action,
        payload,
        callbackId
    };

    if(DEBUG)console.log('remote', 'postMessage', message);

    // Actually send the message
    sendFn(message);

    return deferred.promise;
};

export class Remote {

    constructor(sendFn, registerFn) {
        this.sendFunction = sendFn;

        const portalMessageHandler = (message) => {
            let {action, payload, source, callbackId, success} = message;

            // Sanity check
            if (source !== SOURCES.portal || !action) {
                return;
            }

            if(DEBUG)console.log('remote', 'onMessage', message);

            const deferred = callbackMap[callbackId];
            if (!deferred) {
                // This is an error
                console.error(`No deferred for ${callbackId}`);
                return;
            }

            if (success) {
                deferred.resolve(payload.result);
            } else {
                deferred.reject(payload.error);
            }

            delete callbackMap[callbackId];
        };

        registerFn(portalMessageHandler);
    }


    async createAPI(api) {
        if ('function' === typeof api) {
            return this.createAPI(api());
        }
        console.log('is not function');
        const remoteAPI = {};
        const promises = [];

        // For each function...
        //
        // Add the function to the api
        Object.keys(api).forEach(name => {
            // Add wrapped function to host api
            const addFunctionPromise = sendMessageToPortal(ACTIONS.addFunction, {name, fnString: api[name].toString()}, this.sendFunction).then(() => {
                const sendFunction = this.sendFunction;
                remoteAPI[name] = function() {
                    return sendMessageToPortal(ACTIONS.runFunction, {name, params: Array.from(arguments)}, sendFunction);
                };
            });
            promises.push(addFunctionPromise);
        });

        return Promise.all(promises).then(() => remoteAPI);
    }

    async runScript(script) {
        return sendMessageToPortal(ACTIONS.runScript, {script}, this.sendFunction);
    }

}
