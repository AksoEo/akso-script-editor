/// Pool mapping ASCE model objects to views.
/// Note that this is a global object, however assuming all objects are unique, no crosstalk should
/// occur.
export const viewPool = new WeakMap();

/// Returns a view from the pool, creating it if necessary.
export function getProtoView (item, proto) {
    if (!viewPool.has(item) || !(viewPool.get(item) instanceof proto)) {
        viewPool.set(item, new proto(item));
    }
    return viewPool.get(item);
}
