/**
 * Recursively resolves all members on an object. Should handle array, promises, promises of arrays, arrays of
 * promises, objects, functions, etc.
 *
 * Once the returned promise has been resolved, the resolved value should contain no promises or functions; the
 * resolved value should be ready for serialization.
 *
 * @param {any} item the item to resolve
 * @returns {Promise} resolves to the item, with all members and decendants resolved
 */
export const deepResolve = async (item) => {

    // Dispatch based on the type of the item

    // Array
    if (Array.isArray(item)) {
        return await Promise.all(item.map(value => deepResolve(value)));
    } else if (item instanceof Promise) {
        // Promise
        return await deepResolve(await item);
    } else if (undefined === item || null == item || 'string' === typeof item || 'number' === typeof item || 'boolean' === typeof item) {
        // Primative (undefined, null, string, number or boolean)
        return item;
    } else if ('function' === typeof item) {
        // Function
        return await deepResolve(item());
    } else if ('object' === typeof item) {
        // Object
        return await (object => {
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
        })(item);
    } else {
        // Unknown type, should be unreachable
        throw new Error(`item '${item}' (${typeof item}) is not a known type`);
    }

};
