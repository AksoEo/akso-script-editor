import { View, TextLayer, Transaction, Gesture } from './ui';
// @ts-ignore
import { version as pkgVersion } from '../package.json';
import config from './config';
import { EditorView } from './editor-view';
import { CanvasView } from './canvas-view';
import { Vec2 } from './spring';
import { ComponentView, h, VNode } from './ui/component-view';

export class Toolbar extends ComponentView<{
    editor: EditorView,
    codeMode: boolean,
    toggleCodeMode: () => void,
    testMode: boolean,
    toggleTestMode: () => void,
    duplicate: boolean,
    toggleDuplicate: () => void,
    help: boolean,
    toggleHelp: () => void,
}> {
    constructor (props) {
        super(props);

        this.layer.background = config.toolbar.background;

        this.layoutProps.layout = 'flex';
        this.layoutProps.padding = new Vec2(8, 4);
    }

    undo = () => {
        this.ctx.history.undo();
    };

    redo = () => {
        this.ctx.history.redo();
    };

    clear = () => {
        this.ctx.history.commitChange('clear', () => {
            const root = this.props.editor.canvasView.getRawRoot();
            this.props.editor.canvasView.setRawRoot({});

            return () => {
                this.props.editor.canvasView.setRawRoot(root);
            };
        });
    };

    cancel = () => this.props.editor.onCancel();
    save = () => {
        if (this.props.editor.canvasView.isInCodeMode) {
            this.props.editor.canvasView.exitCodeMode();
        }
        this.props.editor.onSave();
    };

    renderContents(): VNode<any> | VNode<any>[] {
        return h(Subviews, {
            subviews: [
                h(Subviews, {
                    subviews: [
                        h(Button, {
                            label: config.toolbar.buttons.code,
                            active: this.props.codeMode,
                            onClick: this.props.toggleCodeMode,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.test,
                            active: this.props.testMode,
                            onClick: this.props.toggleTestMode,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.dup,
                            active: this.props.duplicate,
                            onClick: this.props.toggleDuplicate,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.help,
                            active: this.props.help,
                            onClick: this.props.toggleHelp,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.undo,
                            onClick: this.undo,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.redo,
                            onClick: this.redo,
                        }),
                        h(Button, {
                            label: config.toolbar.buttons.clear,
                            onClick: this.clear,
                        }),
                    ],
                }, {
                    layout: 'flex',
                    gap: 8,
                }),
                h(Subviews, { subviews: [] }, {
                    flexGrow: 1,
                }),
                h(Subviews, {
                    subviews: [
                        this.props.editor.onCancel ? h(Button, {
                            label: config.toolbar.buttons.cancel,
                            onClick: this.cancel,
                        }) : null,
                        this.props.editor.onSave ? h(Button, {
                            label: config.toolbar.buttons.save,
                            primary: true,
                            onClick: this.save,
                        }) : null,
                        h(VersionLabel, null),
                    ],
                }, {
                    layout: 'flex',
                    gap: 8,
                }),
            ],
        }, {
            layout: 'flex',
            gap: 8,
            flexGrow: 1,
        });
    }
}

class Subviews extends ComponentView<{ subviews: VNode<any>[] }> {
    wantsChildLayout = true;
    renderContents(): VNode<any> | VNode<any>[] {
        return this.props.subviews;
    }
}

class VersionLabel extends View {
    label: TextLayer;
    constructor() {
        super();

        this.label = new TextLayer();
        this.label.text = `v${pkgVersion}`;
        this.label.font = config.identFont;
        this.label.color = config.toolbar.versionColor;

        this.addSublayer(this.label);
    }

    getIntrinsicSize(): Vec2 {
        return this.label.getNaturalSize();
    }

    layout() {
        this.needsLayout = false;
        this.label.position = [0, this.size.y / 2];
        return this.size;
    }
}

class Button extends ComponentView<{ label: string, onClick: () => void, active?: boolean, primary?: boolean }> {
    label: TextLayer;
    hovering = false;
    pressed = false;

    constructor (props) {
        super(props);
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.strokeWidth = config.toolbar.button.outlineWidth;
        this.label = new TextLayer();
        this.label.font = config.identFont;
        this.needsLayout = true;

        Gesture.onTap(this, () => this.props.onClick(), this.onTapStart, this.onTapEnd);
    }

    getIntrinsicSize(): Vec2 {
        const { paddingX, paddingY } = config.toolbar.button;
        const labelSize = this.label.getNaturalSize();
        return new Vec2(
            paddingX * 2 + labelSize.x,
            paddingY * 2 + labelSize.y,
        );
    }

    layout () {
        this.needsLayout = false;
        this.label.text = this.props.label;
        this.label.color = this.props.primary
            ? config.toolbar.button.pcolor
            : config.toolbar.button.color;

        const p = id => this.props.primary
            ? config.toolbar.button['p' + id]
            : config.toolbar.button[id];

        this.layer.stroke = this.props.active
            ? p('activeOutline')
            : this.hovering ? p('hoverOutline') : p('outline');
        this.layer.background = this.pressed
            ? p('activeBackground')
            : p('background');

        this.label.align = 'center';
        this.label.position = [this.layer.size.x / 2, this.layer.size.y / 2];

        return this.size;
    }

    onPointerEnter () {
        const t = new Transaction(1, 0.1);
        this.hovering = true;
        this.layout();
        t.commit();
    }
    onPointerExit () {
        const t = new Transaction(1, 0.3);
        this.hovering = false;
        this.layout();
        t.commit();
    }
    onTapStart = () => {
        const t = new Transaction(1, 0.1);
        this.pressed = true;
        this.layout();
        t.commit();
    };
    onTapEnd = () => {
        const t = new Transaction(1, 0.4);
        this.pressed = false;
        this.layout();
        t.commit();
    };

    *iterSublayers () {
        yield this.label;
    }

    renderContents() {
        return [];
    }
}
