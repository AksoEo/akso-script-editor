import { Gesture, Transaction, View } from '../ui';
import { helpContent } from '../config';

export interface HelpTagged extends View {
    helpTag?: HelpData;
    helpHidden?: boolean;
}
export interface HelpData {
    id: string;
    args?: any[];
}

export interface HelpTag {
    pos: [number, number];
    size: [number, number];
    data: HelpData;
    zIndex: number;
}

export function findAllHelpTags(view: View, _tags = [], _zIndex = 0): HelpTag[] {
    if ('helpTag' in view) {
        const tagged = view as HelpTagged;
        _tags.push({
            pos: view.absolutePosition,
            size: view.size,
            data: tagged.helpTag,
            zIndex: _zIndex,
        });
    }
    if ('helpHidden' in view && (view as HelpTagged).helpHidden) {
        return _tags;
    }
    for (const subview of view.subviews) {
        findAllHelpTags(subview, _tags, _zIndex + 1);
    }
    return _tags;
}

export class HelpTagView extends View {
    tag: HelpTag;
    isVisible = false;
    hovering = false;
    onSetHelpContent?: (tag: HelpData) => void;

    constructor(tag, animationDelay = 0) {
        super();
        this.tag = tag;

        setTimeout(() => {
            const tx = new Transaction(0.4, 0.3);
            this.isVisible = true;
            this.layout();
            tx.commit();
        }, animationDelay * 1000);

        Gesture.onTap(this, () => {
            // TODO: lock
        });
    }

    onPointerEnter () {
        this.hovering = true;
        const tx = new Transaction(1, 0.1);
        this.layout();
        tx.commit();

        this.onSetHelpContent(this.tag.data);
    }
    onPointerExit () {
        this.hovering = false;
        const tx = new Transaction(1, 0.3);
        this.layout();
        tx.commit();
    }

    layout() {
        this.layer.position = [
            this.tag.pos[0] - this.parent.absolutePosition[0] - 2,
            this.tag.pos[1] - this.parent.absolutePosition[1] - 2,
        ];
        this.layer.size = [
            this.tag.size[0] + 4,
            this.tag.size[1] + 4,
        ];
        this.layer.cornerRadius = 6;
        this.layer.strokeWidth = this.isVisible
            ? (this.hovering ? 2 : 4)
            : 0;
        this.layer.stroke = helpContent.highlight;
        this.layer.background = this.hovering
            ? [...helpContent.highlight.slice(0, 3), 0.4]
            : [0, 0, 0, 0];
    }
}

export class HelpTagsView extends View {
    tags: HelpTag[];
    rootView: View;
    onSetHelpContent?: (tag: HelpData) => void;

    constructor(rootView: View, close: () => void) {
        super();
        this.rootView = rootView;

        Gesture.onTap(this, () => close());
    }

    recreate() {
        this.destroy();
        this.tags = findAllHelpTags(this.rootView);
        const tx = new Transaction(1, 0);
        for (const tag of this.tags) {
            const view = new HelpTagView(tag, this.getStaggerAt(tag.pos));
            view.onSetHelpContent = (content) => this.onSetHelpContent(content);
            this.addSubview(view);
            view.layout();
        }
        tx.commit();
        this.needsLayout = true;
    }

    layout() {
        super.layout();
        const tx = new Transaction();
        this.layer.background = [0, 0, 0, 0.1];
        tx.commit();
    }

    get wantsRootSize() {
        return true;
    }

    destroy() {
        for (const view of [...this.subviews]) {
            if (view instanceof HelpTagView) this.removeSubview(view);
        }
    }

    getStaggerAt(pos: [number, number]) {
        const hyp = Math.hypot(pos[0], pos[1]);
        const size = Math.hypot(this.size[0], this.size[1]);
        return hyp / size * 0.5;
    }
}
