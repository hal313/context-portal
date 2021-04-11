export const DEBUG = false;

export const SOURCES = {
    remote: 'remote',
    portal: 'portal'
};

export const ACTIONS = {
    // Remote messages
    addFunction: 'addFunction',
    runFunction: 'runFunction',
    runScript: 'runScript',

    // Portal messages
    error: 'error',
    addFunctionComplete: 'addFunctionComplete',
    runScriptComplete: 'runScriptComplete',
    runFunctionComplete: 'runFunctionComplete',
};
