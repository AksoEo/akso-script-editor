import { View, TextLayer, Transaction, Gesture } from './ui';
import config from './config';

export class Toolbar extends View {
    constructor () {
        super();

        this.layer.background = config.toolbar.background;

        this.buttons = [
            new Button(config.toolbar.buttons.code, this.toggleCodeView),
            new Button(config.toolbar.buttons.graph, this.toggleGraphView),
            new Button(config.toolbar.buttons.help, this.toggleHelp),
            new Button(config.toolbar.buttons.dup, this.toggleDuplicate),
        ];

        this.fileButtons = [
            new Button(config.toolbar.buttons.save, this.save, true),
        ];

        for (const b of this.buttons) this.addSubview(b);
    }

    toggleGraphView = (graphButton) => {
        const enabled = this.canvas.isInGraphView;
        graphButton.active = !enabled;
        if (enabled) {
            this.canvas.exitGraphView();
        } else {
            this.canvas.enterGraphView();
        }
    };

    toggleCodeView = (codeButton) => {
        const enabled = this.canvas.isInCodeMode;
        codeButton.active = !enabled;
        if (enabled) {
            this.canvas.exitCodeMode();
        } else {
            this.canvas.enterCodeMode();
        }
    };

    toggleHelp = (helpButton) => {
        const enabled = this.canvas.isInHelpMode;
        helpButton.active = !enabled;
        if (enabled) {
            this.canvas.exitHelpMode();
        } else {
            this.canvas.enterHelpMode();
        }
        // kinda janky...
        this.ctx.helpSheet.onClose = () => {
            helpButton.active = false;
            this.canvas.isInHelpMode = false;
        };
    }

    toggleDuplicate = (dupButton) => {
        this.ctx.isInDupMode = !this.ctx.isInDupMode;
        dupButton.active = this.ctx.isInDupMode;
    };

    save = () => this.editor.onSave();

    layout () {
        super.layout();

        let x = 16;
        for (const b of this.buttons) {
            b.layoutIfNeeded();
            b.position = [x, (this.size[1] - b.size[1]) / 2];
            x += b.size[0] + 8;
        }

        x = this.size[0] - 16;
        for (const b of this.fileButtons) {
            b.layoutIfNeeded();
            x -= b.size[0];
            b.position = [x, (this.size[1] - b.size[1]) / 2];
            x -= 8;
        }
    }

    *iterSubviews () {
        if (!this.editor || !this.editor.onSave) return;
        for (const b of this.fileButtons) {
            yield b;
        }
    }
}

class Button extends View {
    constructor (label, onClick, primary) {
        super();
        this.isPrimary = primary;
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.strokeWidth = config.toolbar.button.outlineWidth;
        this.onClick = onClick;
        this.label = new TextLayer();
        this.label.text = label;
        this.label.font = config.identFont;
        this.label.color = this.isPrimary
            ? config.toolbar.button.pcolor
            : config.toolbar.button.color;
        this.needsLayout = true;

        Gesture.onTap(this, () => this.onClick(this), this.onTapStart, this.onTapEnd);
    }

    #active = false;
    get active () {
        return this.#active;
    }
    set active (v) {
        this.#active = v;
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        const { paddingX, paddingY } = config.toolbar.button;

        const p = id => this.isPrimary
            ? config.toolbar.button['p' + id]
            : config.toolbar.button[id];

        this.layer.stroke = this.active
            ? p('activeOutline')
            : this.hovering ? p('hoverOutline') : p('outline');
        this.layer.background = this.pressed
            ? p('activeBackground')
            : p('background');

        const labelSize = this.label.getNaturalSize();
        this.layer.size = [
            paddingX * 2 + labelSize[0],
            paddingY * 2 + labelSize[1],
        ];
        this.label.position = [paddingX, this.layer.size[1] / 2];
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
}
