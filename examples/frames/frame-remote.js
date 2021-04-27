// Import the modules
import { Portal } from '../../src/Portal.js';
import { Remote } from '../../src/Remote.js';
import { defaultCode } from './frame-remote-default-code.js';


// Assign the global classes (this will be helpful for the playground code window)
window.Portal = Portal;
window.Remote = Remote;


// The editor
let editor;
// The container for console messages
const consoleContainer = document.getElementById('console-container');


/**
 * Runs the code in the editor. The code is wrapped in an async IIFE so that await
 * may be used and also to protect the global context from contamination.
 *
 * @returns {Promise} which resolves once the code has executed
 */
const runCode = () => eval(`(async () => {${editor.getValue()}})()`);

/**
 * Clears the "console" elements.
 *
 * @returns {undefined}
 */
const clearConsole = () => consoleContainer.innerHTML = '';

/**
 * Resets the editor in the code to the default value.
 *
 * @returns {undefined}
 */
const resetCode = () => editor.setValue(defaultCode);


/**
 * Creates an Element which represents a line of console output.
 *
 * @param {string} className the class name to add to the created element
 * @param  {...any} strings the parameters to output
 * @returns {Element} an Element instance which represents a line of console output
 */
const createConsoleLine = (className, ...strings) => {
    const line = document.createElement('div');
    line.classList.add(className);
    line.innerHTML = strings.reduce((previous, current) => {
        if ('object' === typeof current) {
            previous += `\n${JSON.stringify(current, null, 2)}`;
        } else {
            previous += '' + current;
        }
        return previous + ' ';
    }, '');
    return line;
}

/**
 * Initializes the "console" by wrapping window.console.[log|info|warn|error] with functions which will
 * output to the console UI component as well as delegate to the intended function.
 */
const initConsole = () => {
    // Console management
    //
    //
    // Save references to the console functions
    const orignalConsole = {
        log: window.console.log,
        info: window.console.info,
        warn: window.console.warn,
        error: window.console.error
    };
    // Overwrite the original console.log function
    window.console.log = (...strings) => {
        orignalConsole.log(...strings);

        // Output to the "console"
        consoleContainer.append(createConsoleLine('log', ...strings));
    };
    // Overwrite the original console.info function
    window.console.info = (...strings) => {
        // Delegagte to the original
        orignalConsole.info(...strings);

        // Output to the "console"
        consoleContainer.append(createConsoleLine('info', ...strings));
    };
    // Overwrite the original console.warn function
    window.console.warn = (...strings) => {
        // Delegagte to the original
        orignalConsole.warn(...strings);

        // Output to the "console"
        consoleContainer.append(createConsoleLine('warn', ...strings));
    };
    // Overwrite the original console.error function
    window.console.error = (...strings) => {
        // Delegagte to the original
        orignalConsole.error(...strings);

        // Output to the "console"
        consoleContainer.append(createConsoleLine('error', ...strings));
    };
};

/**
 * Initializes the listeners for button clicks and such.
 */
const initListeners = () => {
    document.getElementById('js-button-clear').addEventListener('click', clearConsole);
    document.getElementById('js-button-run').addEventListener('click', runCode);
    document.getElementById('js-button-reset').addEventListener('click', resetCode);
};

/**
 * Initializes the code editor.
 */
const initEditor = () => {
    // Set the theme for the editor
    window.monaco.editor.setTheme('vs-dark');

    // Construct the editor
    editor = window.monaco.editor.create(document.getElementById('code-container'), {
        value: defaultCode,
        language: 'javascript'
    });

    // Add a resize listener
    window.addEventListener('resize', () => editor.layout());

    // Focus the editor
    editor.focus();

    // Add a shortcut command to run the code
    editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, runCode);
};


// Initialize the editor, console and listeners
initEditor();
initConsole();
initListeners();
