const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class Promise {
    constructor(executor) {
        this._status = PENDING;
        this._value = undefined;
        this._reason = undefined;
        this.onFulfilledQueue = [];
        this.onRejectedQueue = [];

        const resolve = value => {
            if (PENDING === this._status) {
                this._status = FULFILLED;
                this._value = value;
                this.onFulfilledQueue.forEach(fn => fn(value));
                this.onFulfilledQueue = [];
                this.onRejectedQueue = [];
            }
        };

        const reject = reason => {
            if (PENDING === this._status) {
                this._status = REJECTED;
                this._reason = reason;
                this.onRejectedQueue.forEach(fn => fn(reason));
                this.onFulfilledQueue = [];
                this.onRejectedQueue = [];
            }
        };
        executor(resolve, reject);
    }

    then(onFulfilled, onRejected) {
        const self = new Promise((resolve, reject) => {
            if (typeof onFulfilled !== 'function') {
                onFulfilled = value => value;
            }

            if (onRejected && typeof onRejected !== 'function') {
                onRejected = value => { throw value; };
            }

            const resolveThenable = (mayBeThenable, resolve, reject) => {
                if (mayBeThenable === self) {
                    reject(TypeError('cannot resolve Promise self'));
                    return;
                }
                if (mayBeThenable && typeof mayBeThenable === 'object' || typeof mayBeThenable === 'function') {
                    let use = false;
                    try {
                        const then = mayBeThenable.then;
                        if (typeof then === 'function') {
                            then.call(mayBeThenable, newVal => {
                                if (use) return;
                                use = true;
                                resolveThenable(newVal, resolve, reject);
                            }, rejectVale => {
                                if (use) return;
                                use = true;
                                reject(rejectVale);
                            });
                        } else {
                            if (use) return;
                            use = true;
                            resolve(mayBeThenable);
                        }
                    } catch (e) {
                        if (use) return;
                        use = true;
                        reject(e);
                    }
                    return;
                }
                resolve(mayBeThenable);
            }

            const onFulfilledWrap = value => {
                setTimeout(_ => {
                    try {
                        const newValue = onFulfilled(value);
                        resolveThenable(newValue, resolve, reject);
                    } catch (e) {
                        reject(e);
                    }
                })
            };

            const onRejectedWrap = reason => {
                setTimeout(() => {
                    if (onRejected) {
                        try {
                            const newValue = onRejected(reason);
                            resolveThenable(newValue, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(reason);
                    }
                });
            };

            switch (this._status) {
                case PENDING:
                    this.onFulfilledQueue.push(onFulfilledWrap);
                    this.onRejectedQueue.push(onRejectedWrap);
                    break;
                case FULFILLED:
                    onFulfilledWrap(this._value);
                    break;
                case REJECTED:
                    onRejectedWrap(this._reason);
                    break;
            }
        });
        return self;
    }
}


Promise.defer = Promise.deferred = function () {
    let dfd = {};
    dfd.promise = new Promise((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    });
    return dfd;
}

module.exports = Promise;