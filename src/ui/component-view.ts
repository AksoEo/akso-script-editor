import { LayoutProps, View } from './view';
import { Vec2 } from '../spring';
import { TextLayer } from './layer';

export abstract class ComponentView<Props extends Record<string, unknown>> extends View {
    props: Props;

    constructor(props: Props) {
        super();
        this.props = props;
    }

    update(props: Props) {
        let isSame = true;
        for (const k in new Set([...Object.keys(props), ...Object.keys(this.props)])) {
            if (props[k] !== this.props[k]) {
                isSame = false;
                break;
            }
        }

        this.props = props;
        if (!isSame) this.needsLayout = true;
    }

    abstract renderContents(): VNode<any> | VNode<any>[];

    #didDiff = false;
    set needsLayout(value: boolean) {
        super.needsLayout = value;
        if (value) this.#didDiff = false;
    }

    renderContentsIfNeeded() {
        if (this.#didDiff || !this.ctx) return;
        diff(this, this.renderContents());
        this.#didDiff = true;
        requestAnimationFrame(() => {
            this.#didDiff = false;
        });
    }

    getIntrinsicSize(): Vec2 {
        this.renderContentsIfNeeded();
        return super.getIntrinsicSize();
    }

    layout(): Vec2 {
        this.renderContentsIfNeeded();
        return super.layout();
    }
}

type ComponentViewProps<T> = T extends ComponentView<infer P> ? P : ((view: T) => void) | null;

export type VNode<T extends View> = {
    constructor: { new(props: ComponentViewProps<T>): T };
    props: ComponentViewProps<T>;
    layout?: Partial<LayoutProps>;
} | View | null;

export function h<V extends View>(
    component: { new(props: ComponentViewProps<V>): V },
    props: ComponentViewProps<V>,
    layout?: Partial<LayoutProps>,
): VNode<V> {
    return {
        constructor: component,
        props,
        layout,
    };
}

export class DivView extends ComponentView<{ subviews: VNode<any>[], clip?: boolean }> {
    wantsChildLayout = true;
    renderContents() {
        this.layer.clipContents = !!this.props.clip;
        return this.props.subviews;
    }
}

export class Label extends ComponentView<{ contents: string }> {
    textLayer = new TextLayer();

    constructor(props) {
        super(props);
        this.addSublayer(this.textLayer);
    }

    getIntrinsicSize(): Vec2 {
        return this.textLayer.getNaturalSize();
    }

    layout(): Vec2 {
        this.textLayer.position = [0, this.size.y / 2];
        return super.layout();
    }

    renderContents(): VNode<any> | VNode<any>[] {
        this.textLayer.text = this.props.contents;
        return [];
    }
}

interface PreviousRender {
    byKey: Record<string, View>,
    unkeyed: View[],
}

const previousRenders = new WeakMap<View, PreviousRender>();

function diff(view: View, subviews_: VNode<any> | VNode<any>[]) {
    const subviews = Array.isArray(subviews_) ? subviews_ : [subviews_];

    const prevRender = previousRenders.get(view) || {
        byKey: {},
        unkeyed: [],
    };
    const newRender = { byKey: {}, unkeyed: [] };

    let unkeyedIndex = 0;
    for (const subview of subviews) {
        if (!subview) continue;

        let prevView: View | null = null;
        let key: string | null = null;

        if (!(subview instanceof View) && subview.props && 'key' in subview.props) {
            key = subview.props.key as string;
            if (prevRender.byKey[key]) {
                prevView = prevRender.byKey[key];
            }
        } else {
            prevView = prevRender.unkeyed[unkeyedIndex++];
        }

        let newView: View;
        if (prevView && !(subview instanceof View) && prevView.constructor === subview.constructor) {
            newView = prevView;
            if (prevView instanceof ComponentView) {
                prevView.update(subview.props);
            } else if (typeof subview.props === 'function') {
                subview.props(prevView);
            }
            Object.assign(prevView.layoutProps, subview.layout);
        } else if (subview instanceof View) {
            if (prevView !== subview) {
                view.replaceSubview(prevView, subview);
            }
            newView = subview;
        } else {
            newView = new subview.constructor(subview.props);
            Object.assign(newView.layoutProps, subview.layout);
            view.replaceSubview(prevView, newView);
        }

        if (key !== null) {
            newRender.byKey[key] = newView;
        } else {
            newRender.unkeyed.push(newView);
        }
    }

    for (let i = unkeyedIndex; i < prevRender.unkeyed.length; i++) {
        view.removeSubview(prevRender.unkeyed[i]);
    }

    previousRenders.set(view, newRender);
}