import { helpContent } from '../config';
import { AnyNode, NODE_DEF, NODE_DEFS } from '../model';
import { RenderViewRoot, View } from '../ui';
import { DefsView, DefView } from '../defs-view';
import { ExprView } from '../expr-view';
import { HelpTagsView } from './help-tag';
import { PushedWindow } from '../ui/context';

type HelpContentBlock = HelpContentBlockText | HelpContentBlockNode;
interface HelpContentBlockText {
    type: 'text';
    content: string;
}
interface HelpContentBlockNode {
    type: 'node';
    node: AnyNode;
}

export class HelpSheet {
    node: HTMLDivElement;
    tags: HelpTagsView;
    contentNode: HTMLDivElement;
    onClose?: () => void;

    constructor(rootView: View) {
        this.tags = new HelpTagsView(rootView, () => this.close());
        this.tags.onSetHelpContent = (tag) => {
            if (typeof helpContent[tag.id] === 'function') {
                this.updateContent(helpContent[tag.id](...tag.args));
            } else {
                this.updateContent(helpContent[tag.id]);
            }
        };

        this.node = document.createElement('div');
        this.node.className = 'asct-help-sheet';
        Object.assign(this.node.style, {
            position: 'absolute',
            top: '0',
            right: '0',
            margin: '16px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '50%',
            overflow: 'hidden auto',
            borderRadius: '8px',
            background: helpContent.background,
            color: helpContent.foreground,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
            padding: '8px 16px',
            display: 'none',
            font: helpContent.font,
        });

        const title = document.createElement('div');
        title.textContent = helpContent.title;
        this.node.appendChild(title);

        this.contentNode = document.createElement('div');
        this.node.appendChild(this.contentNode);

        this.updateContent(helpContent.default);
    }

    tagsWindow: PushedWindow | null = null;
    open() {
        this.node.style.display = '';
        this.tagsWindow = this.tags.rootView.ctx.push(this.tags);
        this.tags.recreate();
    }

    close() {
        this.onClose && this.onClose();
        this.tagsWindow!.pop();
        this.node.style.display = 'none';
        this.tags.destroy();
    }

    updateContent(blocks: HelpContentBlock[]) {
        this.contentNode.innerHTML = '';
        for (const block of blocks) {
            if (block.type === 'text') {
                const node = document.createElement('div');
                node.textContent = block.content;
                this.contentNode.appendChild(node);
            } else if (block.type === 'node') {
                const node = new RenderViewRoot();

                if (block.node.type === NODE_DEF) {
                    node.pushWindow(new DefView(block.node));
                } else if (block.node.type == NODE_DEFS) {
                    node.pushWindow(new DefsView(block.node));
                } else {
                    node.pushWindow(new ExprView(block.node));
                }

                node.layout();
                this.contentNode.appendChild(node.node);
            }
        }
    }
}
