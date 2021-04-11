import { Portal } from '../../src/Portal.js';

// Assign testing functions
const describe = Mocha.describe;
const it = Mocha.it;
const afterEach = Mocha.afterEach;
const expect = chai.expect;
const spy = sinon.spy;

// Configure mocha
mocha.setup({
    ui: 'bdd'
});


// Passing arrow functions (aka “lambdas”) to Mocha is discouraged
//   https://mochajs.org/#asynchronous-code
describe('Portal', function () {

    const ERROR_MESSAGE_SHOULD_HAVE_REJECTED = 'should have rejected';
    const ERROR_MESSAGE_SHOULD_HAVE_THROWN = 'should have thrown';


    // The callback seed
    let callbackId = 1;


    const messageFn = sinon.fake();
    const registerFn = sinon.fake();
    // Instantiate the portal
    const portal = new Portal(
        messageFn,
        registerFn
    );


    afterEach(function incrementCallbackId() {
        callbackId++;
    });

    afterEach(function stopPortal() {
        portal.stop();
    });

    afterEach(function cleanupSinon() {
        sinon.restore();
    });


    describe('Lifecycle', function () {

        it('should have registered using the registerFn', function () {
            expect(registerFn.getCalls().length).to.equal(1);
        });

        it('should start listening when "start" is invoked', function () {
            expect(portal.listening).to.be.false;
            portal.start();
            expect(portal.listening).to.be.true;
        });

        it('should stop listening when "stop" is invoked', function () {
            portal.start();
            expect(portal.listening).to.be.true;
            portal.stop();
            expect(portal.listening).to.be.false;
        });

    });

    describe('Running scripts', function () {

        describe('Messaging', function () {

            it('should send a message with the corrext metadata and a payload after execution', async function () {
                await portal.runScript(`return 1+1;`, callbackId);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('runScriptComplete');
                expect(args[0].callbackId).to.equal(callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(2);
            });

        });

        describe('Success', function () {

            describe('No Return Value', function () {

                it('should run code snippets (using await)', async function () {
                    spy(console, 'log');

                    await portal.runScript(`console.log('running simple code');`, callbackId);

                    // console.log should have been called once
                    expect(console.log.callCount).to.equal(1);
                    // Check the args
                    expect(console.log.getCall(0).args[0]).to.equal('running simple code');
                });

                it('should run code snippets (using promises)', function () {
                    spy(console, 'log');

                    // Check the args
                    return portal.runScript(`console.log('running simple code'); return 1;`, callbackId)
                    .then(() => {
                        // console.log should have been called once
                        expect(console.log.callCount).to.equal(1);
                        // Check the args
                        expect(console.log.getCall(0).args[0]).to.equal('running simple code');
                    });
                });

            });

            describe('Return Value', function () {

                it('should run code snippets (using await)', async function () {
                    expect(await portal.runScript(`return 1+1;`, callbackId)).to.equal(2);
                });

                it('should run code snippets (using promises)', function () {
                    return portal.runScript(`return 1+1;`, callbackId)
                    .then(result => expect(result).to.equal(2));
                });

            });

        });

        describe('Fail', function () {
            const message = 'because i said so';

            it('should throw when code snipets fail (using await)', async function () {
                try {
                    await portal.runScript(`throw new Error('${message}')`, callbackId);
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                } catch (error) {
                    expect(error.message).to.equal(message);
                }
            });

            it('should reject when code snipets fail (using promises)', function () {
                return portal.runScript(`throw new Error('${message}')`, callbackId)
                .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                .catch(error => expect(error.message).to.equal(message));
            });

        });

    });

    describe('Adding Functions', function () {

        describe('Messaging', function () {

            it('should send a message with the corrext metadata and a payload after execution', async function () {
                const fnName = 'echo'
                await portal.addFunction(fnName, text => text, callbackId);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('addFunctionComplete');
                expect(args[0].callbackId).to.equal(callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(fnName);
            });

        });

        describe('Success', function () {

            it('should add a function (using await)', async function () {
                await portal.addFunction('echo', text => text, callbackId);
            });

            it('should add a function (using promises)', function () {
                return portal.addFunction('echo', text => text, callbackId);
            });

        });

        describe('Fail', function () {
            const ERROR_FUNCTION_NAME_MUST_BE_STRING = 'Function name must be a string';

            it('should throw when adding an invalid function (using await)', async function () {
                try {
                    await portal.addFunction(function echo(text) {return text;}, callbackId);
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                } catch (error) {
                    expect(error).to.equal(ERROR_FUNCTION_NAME_MUST_BE_STRING);
                }
            });

            it('should throw when adding an invalid function (using promises)', function () {
                return portal.addFunction(function echo(text) {return text;}, callbackId)
                .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                .catch(error => expect(error).to.equal(ERROR_FUNCTION_NAME_MUST_BE_STRING));
            });

        });

    });

    describe('Executing Functions', function () {

        describe('Messaging', function () {

            it('should send a message with the corrext metadata and a payload after execution', async function () {
                const fnName = 'mult';

                await portal.addFunction(fnName, (a, b) => a * b, callbackId);
                await portal.runFunction(fnName, callbackId, 1, 5);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('runFunctionComplete');
                expect(args[0].callbackId).to.equal(callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(5);
            });

        });

        describe('With Parameters', function () {

            describe('No Return Value', function () {

                it('should correctly pass parameters (using await)', async function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    spy(console, 'log');

                    await portal.addFunction(functionName, function paramsFunctionSum(a, b, c) {console.log('paramsFunctionSum', a, b, c)}, callbackId);
                    await portal.runFunction(functionName, callbackId, ...args);

                    // console.log should have been called once
                    expect(console.log.callCount).to.equal(1);
                    //
                    // Check the args
                    expect(console.log.getCall(0).args[1]).to.equal(args[0]);
                    expect(console.log.getCall(0).args[2]).to.equal(args[1]);
                    expect(console.log.getCall(0).args[3]).to.equal(args[2]);
                });

                it('should correctly pass parameters (using promises)', function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    spy(console, 'log');

                    // portal.addFunction(functionName, function paramsFunctionSum() {console.log('paramsFunctionSum', Array.from(arguments))}, callbackId)
                    return portal.addFunction(functionName, function paramsFunctionSum(a, b, c) {console.log('paramsFunctionSum', a, b, c)}, callbackId)
                    .then(() => portal.runFunction(functionName, callbackId, ...args))
                    .then(() => {
                        // console.log should have been called once
                        expect(console.log.callCount).to.equal(1);
                        //
                        // Check the args
                        expect(console.log.getCall(0).args[1]).to.equal(args[0]);
                        expect(console.log.getCall(0).args[2]).to.equal(args[1]);
                        expect(console.log.getCall(0).args[3]).to.equal(args[2]);
                    });
                });

            });

            describe('With Return Value', function () {

                it('should return the correct value (using async)', async function () {
                    await portal.addFunction('sum', (a, b) => a+b, callbackId);
                    expect(await portal.runFunction('sum', callbackId, 10, 20)).to.equal(30);
                });

                it('should return the correct value (using promises)', async function () {
                    return portal.addFunction('sum', (a, b) => a+b, callbackId)
                    .then(() => portal.runFunction('sum', callbackId, 10, 20))
                    .then(sum => expect(sum).to.equal(30));
                });

            });

            describe('Using Arrow Functions', function() {

                it('should not use arguments in an arrow function (using async)', async function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    spy(console, 'log');

                    await portal.addFunction(functionName, () => console.log('paramsFunctionSum', Array.from(arguments)), callbackId);
                    await portal.runFunction(functionName, callbackId, ...args);

                    // console.log should have been called once
                    expect(console.log.callCount).to.equal(1);
                    //
                    // Check the args (if using arrow functions, the "arguments" object cannot be used; this code will print an empty array)
                    expect(console.log.getCall(0).args[1].length).to.equal(0);
                });

                it('should not use arguments in an arrow function (using promises)', function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    spy(console, 'log');

                    return portal.addFunction(functionName, () => console.log('paramsFunctionSum', Array.from(arguments)), callbackId)
                    .then(() => portal.runFunction(functionName, callbackId, ...args))
                    .then(() => {
                        // console.log should have been called once
                        expect(console.log.callCount).to.equal(1);
                        //
                        // Check the args (if using arrow functions, the "arguments" object cannot be used; this code will print an empty array)
                        expect(console.log.getCall(0).args[1].length).to.equal(0);
                    });
                });

            });

            describe('Invoking Other Functions', function () {

                it('should be able to execute other functions which have been defined (using async)', async function () {
                    await portal.addFunction('a', () => 'A', callbackId);
                    await portal.addFunction('b', () => a() + 'B', callbackId);
                    expect(await portal.runFunction('b', callbackId)).to.equal('AB');
                });

                it('should be able to execute other functions which have been defined (using promises)', function () {
                    return portal.addFunction('a', () => 'A', callbackId)
                    .then(() => portal.addFunction('b', () => a() + 'B', callbackId))
                    .then(() => portal.runFunction('b', callbackId))
                    .then(result => expect(result).to.equal('AB'));
                });

            });

            describe('Unknown Functions', function () {
                const ERROR_UNKNOWN_FUNCTION = `Unknown function 'notfunction'`;

                it('should fail when the function does not exist (using await)', async function () {
                    try {
                        await portal.runFunction('notfunction', callbackId);
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED);
                    } catch (error) {
                        expect(error).to.equal(ERROR_UNKNOWN_FUNCTION);
                    }
                });

                it('should fail when the function does not exist (using promises)', function () {
                    return portal.runFunction('notfunction', callbackId)
                    .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                    .catch(error => expect(error).to.equal(ERROR_UNKNOWN_FUNCTION));
                });

            });

            describe('Throwing Errors', function () {
                const message = 'throwing an error';

                it('should throw an error when the function throws an error (using await)', async function () {
                    // Cannot use "message" because that is not defined in the execution scope
                    await portal.addFunction('throwingFunction', () => {throw new Error('throwing an error');}, callbackId);

                    try {
                        await portal.runFunction('throwingFunction', callbackId);
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                    } catch (error) {
                        expect(error.message).to.equal(message);
                    }
                });

                it('should throw an error when the function throws an error (using promises)', function () {
                    // Cannot use "message" because that is not defined in the execution scope
                    return portal.addFunction('throwingFunction', () => {throw new Error('throwing an error');}, callbackId)
                    .then(() => portal.runFunction('throwingFunction', callbackId))
                    .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                    .catch(error => expect(error.message).to.equal(message));
                });

            });

        });

    });

});


// Run the tests
mocha.run();
