import * as Resolver from '../../src/Resolver.js';

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
describe('Resolve', function () {

    afterEach(function cleanupSinon() {
        window.sinon.restore();
    });


    describe('Simple Resolvers', function () {

        it('should resolve primative values', async () => {
            expect(await Resolver.deepResolve(undefined)).to.equal(undefined);
            expect(await Resolver.deepResolve(null)).to.equal(null);
            expect(await Resolver.deepResolve(2)).to.equal(2);
            expect(await Resolver.deepResolve(3.14)).to.equal(3.14);
            expect(await Resolver.deepResolve(true)).to.equal(true);
            expect(await Resolver.deepResolve(false)).to.equal(false);
            expect(await Resolver.deepResolve('string')).to.equal('string');
            expect(await Resolver.deepResolve(NaN)).to.eql(NaN);
        });

        it('should resolve functions which return primative values', async () => {
            expect(await Resolver.deepResolve(() => undefined)).to.equal(undefined);
            expect(await Resolver.deepResolve(() => null)).to.equal(null);
            expect(await Resolver.deepResolve(() => 2)).to.equal(2);
            expect(await Resolver.deepResolve(() => 3.14)).to.equal(3.14);
            expect(await Resolver.deepResolve(() => true)).to.equal(true);
            expect(await Resolver.deepResolve(() => false)).to.equal(false);
            expect(await Resolver.deepResolve(() => 'string')).to.equal('string');
            expect(await Resolver.deepResolve(() => NaN)).to.eql(NaN);
        });

        it('should resolve promises which resolve to primative values', async () => {
            expect(await Resolver.deepResolve(Promise.resolve(undefined))).to.equal(undefined);
            expect(await Resolver.deepResolve(Promise.resolve(null))).to.equal(null);
            expect(await Resolver.deepResolve(Promise.resolve(2))).to.equal(2);
            expect(await Resolver.deepResolve(Promise.resolve(3.14))).to.equal(3.14);
            expect(await Resolver.deepResolve(Promise.resolve(true))).to.equal(true);
            expect(await Resolver.deepResolve(Promise.resolve(false))).to.equal(false);
            expect(await Resolver.deepResolve(Promise.resolve('string'))).to.equal('string');
            expect(await Resolver.deepResolve(Promise.resolve(NaN))).to.eql(NaN);
        });

        it('should resolve functions which return promises which resolve to primative values', async () => {
            expect(await Resolver.deepResolve(() => Promise.resolve(undefined))).to.equal(undefined);
            expect(await Resolver.deepResolve(() => Promise.resolve(null))).to.equal(null);
            expect(await Resolver.deepResolve(() => Promise.resolve(2))).to.equal(2);
            expect(await Resolver.deepResolve(() => Promise.resolve(3.14))).to.equal(3.14);
            expect(await Resolver.deepResolve(() => Promise.resolve(true))).to.equal(true);
            expect(await Resolver.deepResolve(() => Promise.resolve(false))).to.equal(false);
            expect(await Resolver.deepResolve(() => Promise.resolve('string'))).to.equal('string');
            expect(await Resolver.deepResolve(() => Promise.resolve(NaN))).to.eql(NaN);
        });

        describe('Arrays', () => {

            it('should resolve arrays of primative values', async () => {
                expect(await Resolver.deepResolve([undefined, null, 2, 3.14, true, false, 'string', NaN])).to.eql([undefined, null, 2, 3.14, true, false, 'string', NaN]);
            });

            it('should resolve functions which return arrays of primative values', async () => {
                expect(await Resolver.deepResolve(() => [undefined, null, 2, 3.14, true, false, 'string', NaN])).to.eql([undefined, null, 2, 3.14, true, false, 'string', NaN]);
            });

            it('should resolve functions which return arrays of primative values', async () => {
                expect(await Resolver.deepResolve(Promise.resolve([undefined, null, 2, 3.14, true, false, 'string', NaN]))).to.eql([undefined, null, 2, 3.14, true, false, 'string', NaN]);
            });

            it('should resolve functions which return promises which resolve to arrays of primative values', async () => {
                expect(await Resolver.deepResolve(() => Promise.resolve([undefined, null, 2, 3.14, true, false, 'string', NaN]))).to.eql([undefined, null, 2, 3.14, true, false, 'string', NaN]);
            });

            it('should resolve arrays of promises which resolve to primative values', async () => {
                expect(await Resolver.deepResolve([
                    Promise.resolve(undefined),
                    Promise.resolve(null),
                    Promise.resolve(2),
                    Promise.resolve(3.14),
                    Promise.resolve(true),
                    Promise.resolve(false),
                    Promise.resolve('string'),
                    Promise.resolve(NaN)
                ])).to.eql([undefined, null, 2, 3.14, true, false, 'string', NaN]);
            });

            it('should resolve arrays which have arrays which have embedded promises', async () => {
                const resolved = await Resolver.deepResolve([
                    [undefined, null, 2, 3.14, true, false, 'string', NaN],
                    Promise.resolve([undefined, null, 2, 3.14, true, false, 'string', NaN]),
                    () => Promise.resolve([undefined, null, 2, 3.14, true, false, 'string', NaN]),
                    () => Promise.resolve([Promise.resolve(undefined), Promise.resolve(null), Promise.resolve(2), Promise.resolve(3.14), Promise.resolve(true), Promise.resolve(false), Promise.resolve('string'), Promise.resolve(NaN)])
                ]);

                const expected = [
                    [undefined, null, 2, 3.14, true, false, 'string', NaN],
                    [undefined, null, 2, 3.14, true, false, 'string', NaN],
                    [undefined, null, 2, 3.14, true, false, 'string', NaN],
                    [undefined, null, 2, 3.14, true, false, 'string', NaN]
                ];
                expect(resolved).to.eql(expected);
            });

        });

        describe('Objects', () => {

            it('should resolve objects with primitive values', async () => {
                const expected = {
                    one: 1,
                    two: 'two',
                    three: true,
                    four: false,
                    five: null,
                    six: undefined,
                    seven: NaN
                };

                expect(await Resolver.deepResolve(expected)).to.eql(expected);
                expect(await Resolver.deepResolve(Promise.resolve(expected))).to.eql(expected);
                expect(await Resolver.deepResolve(() => expected)).to.eql(expected);
                expect(await Resolver.deepResolve(() => Promise.resolve(expected))).to.eql(expected);
            });

            it('should resolve objects with arrays', async () => {
                const expected = {
                    one: 1,
                    two: 'two',
                    three: true,
                    four: false,
                    five: null,
                    six: undefined,
                    seven: NaN
                };

                expect(await Resolver.deepResolve([expected, Promise.resolve(expected), () => expected, () => Promise.resolve(expected), Promise.resolve(() => expected)])).to.eql([expected, expected, expected, expected, expected]);
            });

        });

        describe('Complex Cases', () => {

            it('should resolve very complex cases', async () => {
                const input = {
                    a: 1,
                    b: Promise.resolve(2),
                    c: [Promise.resolve(3), Promise.resolve([Promise.resolve(4), Promise.resolve(5)])],
                    d: {
                        a: 1,
                        b: Promise.resolve(2),
                        c: [Promise.resolve(3), Promise.resolve([Promise.resolve(4), Promise.resolve(5)])],
                    }
                };
                const expected = {
                    a: 1,
                    b: 2,
                    c: [3, [4, 5]],
                    d: {
                        a: 1,
                        b: 2,
                        c: [3, [4, 5]]
                    }
                };

                const actual = await Resolver.deepResolve(input);

                expect(actual).to.eql(expected);
            });

        });

    });

});


// Run the tests
mocha.run();
