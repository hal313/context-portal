import { Portal } from '../../src/Portal.js';

// Assign testing functions
const describe = Mocha.describe;
const it = Mocha.it;
const afterEach = Mocha.afterEach;
const expect = chai.expect;

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
    const createRemoteRequestMessage = () => ({callbackId: ++callbackId});


    const messageFn = sinon.fake();
    const registerFn = sinon.fake();
    // Instantiate the portal
    const portal = new Portal(
        messageFn,
        registerFn
    );

    beforeEach(function spyOnConsole() {
        // Replace console.log with a fake so that it can be spied on without cluttering the console
        sinon.replace(console, 'log', sinon.fake.returns(undefined));
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
                const remoteRequestMessage = createRemoteRequestMessage();
                await portal.runScript(`return 1+1;`, remoteRequestMessage);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('runScriptComplete');
                expect(args[0].callbackId).to.equal(remoteRequestMessage.callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(2);
            });

        });

        describe('Success', function () {

            describe('No Return Value', function () {

                it('should run code snippets (using await)', async function () {
                    await portal.runScript(`console.log('running simple code');`, createRemoteRequestMessage());

                    // console.log should have been called once
                    expect(console.log.callCount).to.equal(1);
                    // Check the args
                    expect(console.log.getCall(0).args[0]).to.equal('running simple code');
                });

                it('should run code snippets (using promises)', function () {
                    // Check the args
                    return portal.runScript(`console.log('running simple code'); return 1;`, createRemoteRequestMessage())
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
                    expect(await portal.runScript(`return 1+1;`, createRemoteRequestMessage())).to.equal(2);
                });

                it('should run code snippets (using promises)', function () {
                    return portal.runScript(`return 1+1;`, createRemoteRequestMessage())
                    .then(result => expect(result).to.equal(2));
                });

            });

        });

        describe('Fail', function () {
            const message = 'because i said so';

            it('should throw when code snipets fail (using await)', async function () {
                try {
                    await portal.runScript(`throw new Error('${message}')`, createRemoteRequestMessage());
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                } catch (error) {
                    expect(error.message).to.equal(message);
                }
            });

            it('should reject when code snipets fail (using promises)', function () {
                return portal.runScript(`throw new Error('${message}')`, createRemoteRequestMessage())
                .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                .catch(error => expect(error.message).to.equal(message));
            });

        });

    });

    describe('Adding Functions', function () {

        describe('Messaging', function () {

            it('should send a message with the correct metadata and a payload after execution', async function () {
                const fnName = 'echo'
                const remoteRequestMessage = createRemoteRequestMessage();
                await portal.addFunction(fnName, text => text, remoteRequestMessage);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('addFunctionComplete');
                expect(args[0].callbackId).to.equal(remoteRequestMessage.callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(fnName);
            });

        });

        describe('Success', function () {

            it('should add a function (using await)', async function () {
                await portal.addFunction('echo', text => text, createRemoteRequestMessage());
            });

            it('should add a function (using promises)', function () {
                return portal.addFunction('echo', text => text, createRemoteRequestMessage());
            });

        });

        describe('Fail', function () {
            const ERROR_FUNCTION_NAME_MUST_BE_STRING = 'Function name must be a string';

            it('should throw when adding an unnamed function (using await)', async function () {
                try {
                    await portal.addFunction(null, function echo(text) {return text;}, createRemoteRequestMessage());
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                } catch (error) {
                    expect(error).to.equal(ERROR_FUNCTION_NAME_MUST_BE_STRING);
                }
            });

            it('should throw when adding an unnamed function (using promises)', function () {
                return portal.addFunction(null, function echo(text) {return text;}, createRemoteRequestMessage())
                .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                .catch(error => expect(error).to.equal(ERROR_FUNCTION_NAME_MUST_BE_STRING));
            });

        });

    });

    describe('Executing Functions', function () {

        describe('Messaging', function () {

            it('should send a message with the correct metadata and a payload after execution', async function () {
                const fnName = 'mult';
                const remoteRequestMessage = createRemoteRequestMessage();

                await portal.addFunction(fnName, (a, b) => a * b, createRemoteRequestMessage());
                await portal.runFunction(fnName, remoteRequestMessage, 1, 5);

                const args = messageFn.lastCall.args
                expect(args[0].source).to.equal('portal');
                expect(args[0].action).to.equal('runFunctionComplete');
                expect(args[0].callbackId).to.equal(remoteRequestMessage.callbackId);
                expect(args[0].success).to.equal(true);
                expect(args[0].payload.result).to.equal(5);
            });

        });

        describe('With Parameters', function () {

            describe('No Return Value', function () {

                it('should correctly pass parameters (using await)', async function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    await portal.addFunction(functionName, function paramsFunctionSum(a, b, c) {console.log('paramsFunctionSum', a, b, c)}, createRemoteRequestMessage());
                    await portal.runFunction(functionName, createRemoteRequestMessage(), ...args);

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

                    return portal.addFunction(functionName, function paramsFunctionSum(a, b, c) {console.log('paramsFunctionSum', a, b, c)}, createRemoteRequestMessage())
                    .then(() => portal.runFunction(functionName, createRemoteRequestMessage(), ...args))
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
                    await portal.addFunction('sum', (a, b) => a+b, createRemoteRequestMessage());
                    expect(await portal.runFunction('sum', createRemoteRequestMessage(), 10, 20)).to.equal(30);
                });

                it('should return the correct value (using promises)', async function () {
                    return portal.addFunction('sum', (a, b) => a+b, createRemoteRequestMessage())
                    .then(() => portal.runFunction('sum', createRemoteRequestMessage(), 10, 20))
                    .then(sum => expect(sum).to.equal(30));
                });

            });

            describe('Using Arrow Functions', function() {

                it('should not use arguments in an arrow function (using async)', async function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    await portal.addFunction(functionName, () => console.log('paramsFunctionSum', Array.from(arguments)), createRemoteRequestMessage());
                    await portal.runFunction(functionName, createRemoteRequestMessage(), ...args);

                    // console.log should have been called once
                    expect(console.log.callCount).to.equal(1);
                    //
                    // Check the args (if using arrow functions, the "arguments" object cannot be used; this code will print an empty array)
                    expect(console.log.getCall(0).args[1].length).to.equal(0);
                });

                it('should not use arguments in an arrow function (using promises)', function () {
                    const functionName = 'paramsFunctionSum';
                    const args = ['eh', 'bee', 'sea'];

                    return portal.addFunction(functionName, () => console.log('paramsFunctionSum', Array.from(arguments)), createRemoteRequestMessage())
                    .then(() => portal.runFunction(functionName, createRemoteRequestMessage(), ...args))
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
                    await portal.addFunction('a', () => 'A', createRemoteRequestMessage());
                    await portal.addFunction('b', () => a() + 'B', createRemoteRequestMessage());
                    expect(await portal.runFunction('b', createRemoteRequestMessage())).to.equal('AB');
                });

                it('should be able to execute other functions which have been defined (using promises)', function () {
                    return portal.addFunction('a', () => 'A', createRemoteRequestMessage())
                    .then(() => portal.addFunction('b', () => a() + 'B', createRemoteRequestMessage()))
                    .then(() => portal.runFunction('b', createRemoteRequestMessage()))
                    .then(result => expect(result).to.equal('AB'));
                });

            });

            describe('Unknown Functions', function () {
                const ERROR_UNKNOWN_FUNCTION = `Unknown function 'notfunction'`;

                it('should fail when the function does not exist (using await)', async function () {
                    try {
                        await portal.runFunction('notfunction', createRemoteRequestMessage());
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED);
                    } catch (error) {
                        expect(error).to.equal(ERROR_UNKNOWN_FUNCTION);
                    }
                });

                it('should fail when the function does not exist (using promises)', function () {
                    return portal.runFunction('notfunction', createRemoteRequestMessage())
                    .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                    .catch(error => expect(error).to.equal(ERROR_UNKNOWN_FUNCTION));
                });

            });

            describe('Throwing Errors', function () {
                const message = 'throwing an error';

                it('should throw an error when the function throws an error (using await)', async function () {
                    // Cannot use "message" because that is not defined in the execution scope
                    await portal.addFunction('throwingFunction', () => {throw new Error('throwing an error');}, createRemoteRequestMessage());

                    try {
                        await portal.runFunction('throwingFunction', createRemoteRequestMessage());
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                    } catch (error) {
                        expect(error.message).to.equal(message);
                    }
                });

                it('should throw an error when the function throws an error (using promises)', function () {
                    // Cannot use "message" because that is not defined in the execution scope
                    return portal.addFunction('throwingFunction', () => {throw new Error('throwing an error');}, createRemoteRequestMessage())
                    .then(() => portal.runFunction('throwingFunction', createRemoteRequestMessage()))
                    .then(() => { throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED); })
                    .catch(error => expect(error.message).to.equal(message));
                });

            });

        });

    });

});


// Run the tests
mocha.run();
