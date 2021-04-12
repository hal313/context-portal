/**
 * A class which implements the Deferred pattern.
 */
export class Deferred {

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

}
