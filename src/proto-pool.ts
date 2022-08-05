/// Pool mapping ASCE model objects to views.
/// Note that this is a global object, however assuming all objects are unique, no crosstalk should
/// occur.
import { AnyNode } from './model';
import { View } from './ui';

export const viewPool = new WeakMap<AnyNode, View>();

/// Returns a view from the pool, creating it if necessary.
export function getProtoView<N extends AnyNode, T extends View> (item: N, proto: { new(item: N): T }): T {
    if (!viewPool.has(item) || !(viewPool.get(item) instanceof proto)) {
        viewPool.set(item, new proto(item));
    }
    return viewPool.get(item) as T;
}
