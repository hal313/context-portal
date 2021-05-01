import { Remote } from '../../src/Remote.js';
import { Portal } from '../../src/Portal.js';

// Assign testing functions
const describe = Mocha.describe;
const it = Mocha.it;
const afterEach = Mocha.afterEach;
const after = Mocha.after;
const before = Mocha.before;
const expect = chai.expect;

// Configure mocha
mocha.setup({
    ui: 'bdd'
});


// Passing arrow functions (aka “lambdas”) to Mocha is discouraged
//   https://mochajs.org/#asynchronous-code
describe('Remote', function () {

    const ERROR_MESSAGE_SHOULD_HAVE_REJECTED = 'should have rejected';
    const ERROR_MESSAGE_SHOULD_HAVE_THROWN = 'should have thrown';


    const portalMessageFn = sinon.fake(message => window.postMessage(message));
    const portalRegisterFn = sinon.fake(handler => window.addEventListener('message', (event) => handler(event.data)));
    // Create the portal
    const portal = new Portal(
        portalMessageFn,
        portalRegisterFn
    );


    const remoteMessageFn = sinon.fake(message => window.postMessage(message));
    const remoteRegisterFn = sinon.fake(handler => window.addEventListener('message', (event) => handler(event.data)));
    // Create the remote
    const remotePortal = new Remote(
        remoteMessageFn,
        remoteRegisterFn
    );

    let hostAPI;


    beforeEach(function spyOnConsole() {
        // Replace console.log and console.error with fakes so that they can be spied on without cluttering the console
        sinon.replace(console, 'error', sinon.fake.returns(undefined));
        sinon.replace(console, 'log', sinon.fake.returns(undefined));
    });

    before(function startPortal() {
        portal.start();
    });

    before(async function createAPI() {
        hostAPI = await remotePortal.createAPI({
            returnString: () => 'someString',
            returnNumber: () => 123,
            returnTrue: () => true,
            returnFalse: () => false,
            returnUndefined: () => undefined,
            returnNull: () => null,
            returnArray: () => ['one', 2, true, false, undefined, null, {sub: 1}, Promise.resolve(3), [1, 2, Promise.resolve(3)]],
            returnPromise: () => Promise.resolve({dale: 3}),
            rejectPromise: () => Promise.reject('because i said so'),
            throwError: () => {throw new Error('some error')},
            returnJSON: () => ({one: 1, two: 'too', three: true}),
            echo: message => `${message}, ${typeof message}`,
            add: (a, b) => a+b
        });
    });


    afterEach(function cleanupSinon() {
        window.sinon.restore();
    });


    after(function stopPortal() {
        portal.stop();
    });


    describe('Lifecycle', function () {

        it('should invoke the portal register function', function () {
            expect(portalRegisterFn.calledOnce).to.be.true;
        });

        it('should invoke the remote register function', function () {
            expect(remoteRegisterFn.calledOnce).to.be.true;
        });

    });

    describe('Executing Host', function () {

        describe('Parameter Types', function () {

            it('should properly handle a string parameter', async function () {
                const result = await hostAPI.echo('some string');
                expect(result).to.equal('some string, string');
            });

            it('should properly handle a number parameter', async function () {
                const result = await hostAPI.echo(1);
                expect(result).to.equal('1, number');
            });

            it('should properly handle a boolean parameter', async function () {
                const result = await hostAPI.echo(true);
                expect(result).to.equal('true, boolean');
            });

            it('should properly handle a null parameter', async function () {
                const result = await hostAPI.echo(null);
                console.log('result', result);
                expect(result).to.equal('null, object');
            });

            it('should properly handle an undefined parameter', async function () {
                const result = await hostAPI.echo(undefined);
                expect(result).to.equal('undefined, undefined');
            });

        });

        describe('String', function () {

            it('should return a string value (using await)', async function () {
                const result = await hostAPI.returnString();
                expect(result).to.be.a('string');
                expect(result).to.equal('someString');
            });

            it('should return a string value (using promises)', function () {
                return hostAPI.returnString()
                .then(result => {
                    expect(result).to.be.a('string');
                    expect(result).to.equal('someString');
                });
            });

        });

        describe('Number', function () {

            it('should return a number value (using await)', async function () {
                const result = await hostAPI.returnNumber();
                expect(result).to.be.a('number');
                expect(result).to.equal(123);
            });

            it('should return a number value (using promises)', function () {
                return hostAPI.returnNumber()
                .then(result => {
                    expect(result).to.be.a('number');
                    expect(result).to.equal(123);
                });
            });

        });

        describe('Boolean', function () {

            it('should return a boolean value (using await)', async function () {
                const trueResult = await hostAPI.returnTrue();
                expect(trueResult).to.be.a('boolean');
                expect(trueResult).to.true;

                const falseResult = await hostAPI.returnFalse();
                expect(falseResult).to.be.a('boolean');
                expect(falseResult).to.false;
            });

            it('should return a boolean value (using promises)', function () {
                return hostAPI.returnTrue()
                .then(trueResult => {
                    expect(trueResult).to.be.a('boolean');
                    expect(trueResult).to.true;
                })
                .then(() => hostAPI.returnFalse())
                .then(falseResult => {
                    expect(falseResult).to.be.a('boolean');
                    expect(falseResult).to.false;
                });
            });

        });

        describe('Undefined', function () {

            it('should return undefined (using await)', async function () {
                const result = await hostAPI.returnUndefined();
                expect(result).to.be.a('undefined');
                expect(result).to.be.undefined;
            });

            it('should return undefined (using promises)', function () {
                return hostAPI.returnUndefined()
                .then(result => {
                    expect(result).to.be.a('undefined');
                    expect(result).to.be.undefined;
                });
            });

        });

        describe('Null', function () {

            it('should return null (using await)', async function () {
                const result = await hostAPI.returnNull();
                expect(result).to.be.a('null');
                expect(result).to.be.null;
            });

            it('should return null (using promises)', function () {
                return hostAPI.returnNull()
                .then(result => {
                    expect(result).to.be.a('null');
                    expect(result).to.be.null;
                });
            });

        });

        describe('Array', function () {

            it('should return an array (using await)', async function () {
                const result = await hostAPI.returnArray();
                expect(result).to.be.a('array');
                expect(result.length).to.equal(9);
                expect(result[0]).to.equal('one');
                expect(result[0]).to.be.a('string');
                expect(result[1]).to.equal(2);
                expect(result[1]).to.be.a('number');
                expect(result[2]).to.equal(true);
                expect(result[2]).to.be.a('boolean');
                expect(result[3]).to.equal(false);
                expect(result[3]).to.be.a('boolean');
                expect(result[4]).to.equal(undefined);
                expect(result[4]).to.be.a('undefined');
                expect(result[5]).to.equal(null);
                expect(result[5]).to.be.a('null');
                expect(result[6]).to.eql({sub: 1});
                expect(result[6]).to.be.an('object');
                expect(result[7]).to.eql(3);
                expect(result[7]).to.be.a('number');
                expect(result[8]).to.eql([1, 2, 3]);
                expect(result[8]).to.be.an('array');
            });

            it('should return an array (using promises)', function () {
                return hostAPI.returnArray()
                .then(result => {
                    expect(result).to.be.a('array');
                    expect(result.length).to.equal(9);
                    expect(result[0]).to.equal('one');
                    expect(result[0]).to.be.a('string');
                    expect(result[1]).to.equal(2);
                    expect(result[1]).to.be.a('number');
                    expect(result[2]).to.equal(true);
                    expect(result[2]).to.be.a('boolean');
                    expect(result[3]).to.equal(false);
                    expect(result[3]).to.be.a('boolean');
                    expect(result[4]).to.equal(undefined);
                    expect(result[4]).to.be.a('undefined');
                    expect(result[5]).to.equal(null);
                    expect(result[5]).to.be.a('null');
                    expect(result[6]).to.eql({sub: 1});
                    expect(result[6]).to.be.an('object');
                    expect(result[7]).to.eql(3);
                    expect(result[7]).to.be.a('number');
                    expect(result[8]).to.eql([1, 2, 3]);
                    expect(result[8]).to.be.an('array');
                });
            });

        });

        describe('Promise', function () {
            const message = 'because i said so';

            it('should return the value of a resolved promise (using await)', async function () {
                const result = await hostAPI.returnPromise();
                expect(result).to.eql({dale: 3});
            });

            it('should return the value of a resolved promise (using promises)', function () {
                return hostAPI.returnPromise()
                .then(result => expect(result).to.eql({dale: 3}))
            });

            it('should throw when a promise is rejected (using await)', async function () {
                try {
                    await hostAPI.rejectPromise();
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED);
                } catch (error) {
                    expect(error.message).to.equal(message);
                }
            });

            it('should throw when a promise is rejected (using promises)', function () {
                return hostAPI.rejectPromise()
                .then(() => {throw new Error(ERROR_MESSAGE_SHOULD_HAVE_REJECTED);})
                .catch(error => expect(error.message).to.equal(message))
            });

        });

        describe('Throws Error', function () {
            const message = 'some error';

            it('should throw an error when the function throws an error (using await)', async function () {
                try{
                    await hostAPI.throwError();
                    throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                } catch(error) {
                    expect(error.message).to.equal(message);
                }
            });

            it('should throw an error when the function throws an error (using promises)', function () {
                return hostAPI.throwError()
                .then(() => {throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);})
                .catch(error => expect(error.message).to.equal(message));
            });

        });

        describe('JSON', function () {

            it('should return a JSON value (using await)', async function () {
                const result = await hostAPI.returnJSON();
                expect(result).to.be.an('object');
                expect(result).to.eql({
                    one: 1,
                    two: 'too',
                    three: true
                });
            });

            it('should return a JSON value (using promises)', function () {
                return hostAPI.returnJSON()
                .then(result => {
                    expect(result).to.be.an('object');
                    expect(result).to.eql({
                        one: 1,
                        two: 'too',
                        three: true
                    });
                });
            });

        });

        describe('With Parameters', function () {

            it('should return a value indicating that parameters were used (using await)', async function () {
                const sum = await hostAPI.add(2, 3);
                expect(sum).to.equal(5);
            });

            it('should return a value indicating that parameters were used (using promises)', function () {
                return hostAPI.add(2, 3)
                .then(sum => expect(sum).to.equal(5));
            });

        });

    });

    describe('Running scripts', function () {

        describe('Success', function () {

            it('should run a script (using await)', async function () {
                const result = await remotePortal.runScript('console.log("test"); return 4;');

                expect(console.log.calledOnce).to.be.true;
                expect(console.log.lastCall.args[0]).to.equal('test');
                expect(result).to.equal(4);
            });

            it('should run a script (using promises)', function () {
                return remotePortal.runScript('console.log("test"); return 4;')
                .then(result => {
                    expect(console.log.calledOnce).to.be.true;
                    expect(console.log.lastCall.args[0]).to.equal('test');
                    expect(result).to.equal(4);
                });
            });

        });

        describe('Fail', function () {
            const message = 'this is an error';

            describe('Error Object', function () {

                it('should throw when the script throws (using await)', async function () {
                    try {
                        await remotePortal.runScript(`throw new Error('${message}')`);
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                    } catch (error) {
                        expect(error.message).to.equal(message);
                    }
                });

                it('should throw when the script throws (using promises)', function () {
                    return remotePortal.runScript(`throw new Error('${message}')`)
                    .then(() => {throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);})
                    .catch(error => expect(error.message).to.equal(message));
                });

            });

            describe('Non Error Object', function () {

                it('should throw when the script throws (using await)', async function () {
                    try {
                        await remotePortal.runScript(`throw '${message}'`);
                        throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);
                    } catch (error) {
                        expect(error.message).to.equal(message);
                    }
                });

                it('should throw when the script throws (using promises)', function () {
                    return remotePortal.runScript(`throw '${message}'`)
                    .then(() => {throw new Error(ERROR_MESSAGE_SHOULD_HAVE_THROWN);})
                    .catch(error => expect(error.message).to.equal(message));
                });

            });

        });

    });

});


// Run the tests
mocha.run();
