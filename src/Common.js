// Common functionality between portal and remote

// When 'true', debugging will be enabled; useful for development work
export const DEBUG = false;

// Valid source keys for messsaging
export const SOURCES = {
    remote: 'remote',
    portal: 'portal'
};

// Valid action keys for messsaging
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
