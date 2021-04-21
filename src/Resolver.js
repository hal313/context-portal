/**
 * Deeply resolves all values within the object.
 *
 * @param {Object} object an object of values
 * @returns {Object} An object with all the same names, whose values are resolved
 */
const resolveObject = (object) => {
    // Keep track of the promises which need to be resolved
    const promises = [];

    // The object to return; should mirror the passed in object with names and structure
    const returnedObject = {};

    // For each key, save the promise and resolve the value
    Object.keys(object).forEach((name) => promises.push(deepResolve(object[name]).then(result => returnedObject[name] = result)));

    // Once all the promises have resolved
    return Promise.all(promises)
    // Return the built object
    .then(async () => await (returnedObject));
};


const isPrimative = item => undefined === item || null == item || 'string' === typeof item || 'number' === typeof item || 'boolean' === typeof item;
const isFunction = fn => 'function' === typeof fn;
const isArray = array => Array.isArray(array);
const isPromise = promise => (promise) instanceof Promise;
const isObject = object => 'object' === typeof object;

export const deepResolve = async (item) => {

    if (isArray(item)) {
        return await Promise.all(item.map(value => deepResolve(value)));
    } else if (isPromise(item)) {
        return await deepResolve(await item);
    } else if (isPrimative(item)) {
        return item;
    } else if (isFunction(item)) {
        return await deepResolve(item());
    } else if (isObject(item)) {
        return await resolveObject(item);
    } else {
        throw new Error(`item '${item}' (${typeof item}) is not a known type`);
    }

};