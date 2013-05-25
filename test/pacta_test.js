var assert = require('assert'),
    Promise = require('../lib/pacta').Promise;

describe('Promise', function () {
    var p, p2, p3, p4;

    beforeEach(function () {
        p = new Promise();
        setTimeout(function () {
            p.resolve('foo');
        }, 50);

        p2 = new Promise();
        setTimeout(function () {
            p2.resolve('bar');
        }, 25);

        p3 = new Promise();
        setTimeout(function () {
            p3.resolve('baz');
        }, 75);

        p4 = Promise.of('quux');
    });

    describe('.of', function () {
        it('wraps a value in a new promise', function () {
            Promise.of(1).map(function (x) {
                assert.equal(1, x);
            });
        });
    });

    describe('#map', function () {
        it('yields the value of the promise', function (done) {
            p.map(function (x) {
                assert.equal('foo', x);
                done();
            });
        });

        it('yields the value after resolution', function (done) {
            p.map(function (x) {
                /* Promise is now resolved so map again... */
                p.map(function (x) {
                    assert.equal('foo', x);
                    done();
                });
            });
        });

        it('can be chained', function (done) {
            p.map(function (x) {
                return x + '!';
            }).map(function (y) {
                assert.equal('foo!', y);
                done();
            });
        });

        it('can be nested', function (done) {
            p.map(function (x) {
                p2.map(function (y) {
                    p3.map(function (z) {
                        assert.equal('foo', x);
                        assert.equal('bar', y);
                        assert.equal('baz', z);
                        done();
                    });
                });
            });
        });

        it('fulfils the identity property of a functor', function (done) {
            p.map(function (x) {
                return x;
            }).map(function (x) {
                assert.equal('foo', x);
                done();
            });
        });

        it('fulfils the composition property of a functor #1', function (done) {
            var f = function (x) { return 'f(' + x + ')'; },
                g = function (x) { return 'g(' + x + ')'; };

            p.map(function (x) { return f(g(x)); }).map(function (x) {
                assert.equal('f(g(foo))', x);
                done();
            });
        });

        it('fulfils the composition property of a functor #2', function (done) {
            var f = function (x) { return 'f(' + x + ')'; },
                g = function (x) { return 'g(' + x + ')'; };

            p.map(g).map(f).map(function (x) {
                assert.equal('f(g(foo))', x);
                done();
            });
        });
    });

    describe('#concat', function () {
        it('fulfils the associativity property of semigroups #1', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of([2]),
                p3 = Promise.of([3]);

            p.concat(p2).concat(p3).map(function (x) {
                assert.equal(1, x[0]);
                assert.equal(2, x[1]);
                assert.equal(3, x[2]);
                done();
            });
        });

        it('fulfils the associativity property of semigroups #2', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of([2]),
                p3 = Promise.of([3]);

            p.concat(p2.concat(p3)).map(function (x) {
                assert.equal(1, x[0]);
                assert.equal(2, x[1]);
                assert.equal(3, x[2]);
                done();
            });
        });

        it('fulfils the identity of a semigroup', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of([2]),
                p3 = Promise.of([3]);

            p.concat(p2).concat(p3).map(function (x) {
                return x;
            }).map(function (x) {
                assert.deepEqual([1, 2, 3], x);
                done();
            });
        });

        it('concatenates any monoid including strings', function (done) {
            p.concat(p2).concat(p3).map(function (x) {
                assert.equal('foobarbaz', x);
                done();
            });
        });
    });

    describe('#chain', function () {
        it('fulfils the associativity property of chain #1', function (done) {
            var f = function (x) { return Promise.of('f(' + x + ')'); },
                g = function (x) { return Promise.of('g(' + x + ')'); };

            p.chain(f).chain(g).map(function (x) {
                assert.equal('g(f(foo))', x);
                done();
            });
        });

        it('fulfils the associativity property of chain #2', function (done) {
            var f = function (x) { return Promise.of('f(' + x + ')'); },
                g = function (x) { return Promise.of('g(' + x + ')'); };

            p.chain(function (x) { return f(x).chain(g); }).map(function (x) {
                assert.equal('g(f(foo))', x);
                done();
            });
        });
    });

    describe('#ap', function () {
        it('fulfils the identity property of applicative', function (done) {
            Promise.of(function (a) { return a; }).ap(p).map(function (x) {
                assert.equal('foo', x);
                done();
            });
        });

        it('fulfils the composition property of applicative #1', function (done) {
            var u = Promise.of(function (x) { return 'u(' + x + ')'; }),
                v = Promise.of(function (x) { return 'v(' + x + ')'; }),
                w = Promise.of('foo');

            Promise.of(function (f) {
                return function (g) {
                    return function (x) {
                        return f(g(x));
                    };
                };
            }).ap(u).ap(v).ap(w).map(function (x) {
                assert.equal('u(v(foo))', x);
                done();
            });
        });

        it('fulfils the composition property of applicative #2', function (done) {
            var u = Promise.of(function (x) { return 'u(' + x + ')'; }),
                v = Promise.of(function (x) { return 'v(' + x + ')'; }),
                w = Promise.of('foo');

            u.ap(v.ap(w)).map(function (x) {
                assert.equal('u(v(foo))', x);
                done();
            });
        });

        it('fulfils the homomorphism property of applicative #1', function (done) {
            var f = function (x) { return 'f(' + x + ')'; };

            Promise.of(f).ap(Promise.of('foo')).map(function (x) {
                assert.equal('f(foo)', x);
                done();
            });
        });

        it('fulfils the homomorphism property of applicative #2', function (done) {
            var f = function (x) { return 'f(' + x + ')'; };

            Promise.of(f('foo')).map(function (x) {
                assert.equal('f(foo)', x);
                done();
            });
        });

        it('fulfils the interchange property of applicative #1', function (done) {
            var u = Promise.of(function (x) { return 'u(' + x + ')'; }),
                y = 'y';

            u.ap(Promise.of(y)).map(function (x) {
                assert.equal('u(y)', x);
                done();
            });
        });

        it('fulfils the interchange property of applicative #2', function (done) {
            var u = Promise.of(function (x) { return 'u(' + x + ')'; }),
                y = 'y';

            Promise.of(function (f) {
                return f(y);
            }).ap(u).map(function (x) {
                assert.equal('u(y)', x);
                done();
            });
        });
    });

    describe('#empty', function () {
        it('conforms to the right identity', function (done) {
            var p = Promise.of([1]);

            p.concat(p.empty()).map(function (x) {
                assert.deepEqual([1], x);
                done();
            });
        });

        it('conforms to the left identity', function (done) {
            var p = Promise.of([1]);

            p.empty().concat(p).map(function (x) {
                assert.deepEqual([1], x);
                done();
            });
        });
    });

    describe('#conjoin', function () {
        it('concatenates values into a list regardless of type', function (done) {
            p.conjoin(p2).conjoin(p3).map(function (x) {
                assert.deepEqual(['foo', 'bar', 'baz'], x);
                done();
            });
        });

        it('concatenates values into a list even if already a list', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of([2, 3]),
                p3 = Promise.of([4]);

            p.conjoin(p2).conjoin(p3).map(function (x) {
                assert.deepEqual([1, 2, 3, 4], x);
                done();
            });
        });

        it('concatenates values of mixed types', function (done) {
            var p2 = Promise.of([2, 3]);

            p.conjoin(p2).map(function (x) {
                assert.deepEqual(['foo', 2, 3], x);
                done();
            });
        });
    });

    describe('#append', function () {
        it('appends promises to a promise of an array', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of(2);

            p.append(p2).map(function (x) {
                assert.deepEqual([1, 2], x);
                done();
            });
        });

        it('appends promises of arrays to arrays without joining them', function (done) {
            var p = Promise.of([1]),
                p2 = Promise.of([2]);

            p.append(p2).map(function (x) {
                assert.deepEqual([1, [2]], x);
                done();
            });
        });

        it('can be chained without nesting arrays', function (done) {
            var p = Promise.of([]),
                p2 = Promise.of([1]),
                p3 = Promise.of([2, 3]),
                p4 = Promise.of([4]);

            p.append(p2).append(p3).append(p4).map(function (x) {
                assert.deepEqual([[1], [2, 3], [4]], x);
                done();
            });
        });
    });

    describe('#spread', function () {
        it('calls the given function with each value of the Promise', function (done) {
            var p = Promise.of([1, 2, 3]);

            p.spread(function (x, y, z) {
                assert.equal(1, x);
                assert.equal(2, y);
                assert.equal(3, z);
                done();
            });
        });

        it('returns a promise with a single value', function (done) {
            var p = Promise.of([1, 2, 3]);

            p.spread(function (x, y, z) {
                return x + y + z;
            }).map(function (x) {
                assert.equal(6, x);
                done();
            });
        });
    });

    describe('#reduce', function () {
        it('returns a new promise with the result', function (done) {
            var p = Promise.of([[1], [2], [3]]);

            p.reduce(function (acc, e) {
                return acc.concat(e);
            }).map(function (x) {
                assert.deepEqual([1, 2, 3], x);
                done();
            });
        });

        it('takes an optional initial value', function (done) {
            var p = Promise.of([1, 2, 3]);

            p.reduce(function (acc, e) {
                return acc + e;
            }, 0).map(function (x) {
                assert.equal(6, x);
                done();
            });
        });
    });
});

describe('Array', function () {
    describe('.empty', function () {
        assert.deepEqual([], Array.empty());
    });
});

describe('String', function () {
    describe('.empty', function () {
        assert.equal('', String.empty());
    });
});
