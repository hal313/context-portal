// Import the modules
import { Portal } from '../../src/Portal.js';
import { Remote } from '../../src/Remote.js';
import { defaultCode } from './default-code.js';

// Assign the global classes
window.Portal = Portal;
window.Remote = Remote;

// The container for console messages
const consoleContainer = document.getElementById('console-container');

let editor;

// Wrap the code in an async IIFE so that await can be used
const runCode = () => eval(`(async () => {${editor.getValue()}})()`);

const clearConsole = () => consoleContainer.innerHTML = '';

const resetCode = () => editor.setValue(defaultCode);

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

        const line = document.createElement('div');
        // line.innerHTML = strings.join(' ');
        line.innerHTML = strings.reduce((previous, current) => {
            if ('object' === typeof current) {
                previous += `\n${JSON.stringify(current, null, 2)}`;
            } else {
                previous += '' + current;
            }
            return previous + ' ';
        }, '');
        consoleContainer.append(line);
    };
    // Overwrite the original console.error function
    window.console.error = (...strings) => {
        // Delegagte to the original
        orignalConsole.error(...strings);

        const line = document.createElement('div');
        line.classList.add('error');
        line.innerHTML = strings.reduce((previous, current) => {
            if ('object' === typeof current) {
                previous += `\n${JSON.stringify(current, null, 2)}`;
            } else {
                previous += '' + current;
            }
            return previous + ' ';
        }, '');
        consoleContainer.append(line);
    };
};

const initListeners = () => {
    document.getElementById('js-button-clear').addEventListener('click', clearConsole);
    document.getElementById('js-button-run').addEventListener('click', runCode);
    document.getElementById('js-button-reset').addEventListener('click', resetCode);
};

const initEditor = () => {
    // Set the theme for the editor
    monaco.editor.setTheme('vs-dark');

    // Construct the editor
    editor = monaco.editor.create(document.getElementById('code-container'), {
        value: defaultCode,
        language: 'javascript'
    });

    // Add a resize listener
    window.addEventListener('resize', () => editor.layout());

    // Focus the editor
    editor.focus();

    // Add a shortcut command to run the code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
};






initConsole();
initListeners();
initEditor();
