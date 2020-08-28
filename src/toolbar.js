import config from './config';
import { View, TextLayer, Transaction } from './ui';

export class Toolbar extends View {
    constructor () {
        super();

        this.layer.background = config.toolbar.background;

        this.buttons = [
            new Button('Select', () => {}),
            new Button('Move', () => {}),
            new Button('MathExpr', () => {}),
            new Button('Help', () => {}),
            new Button('Graph', this.toggleGraphView),
            new Button('Code', this.toggleCodeView),
            new Button('Form Vars', this.toggleFormVars),
        ];
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

    toggleFormVars = () => {
        if (!this.ctx.extras.isVarsOpen()) {
            const t = new Transaction(1, 0.3);
            this.canvas.library.close();
            t.commitAfterLayout(this.ctx);
        }
        this.ctx.extras.toggleVars();
    };

    layout () {
        super.layout();

        let x = 16;
        for (const b of this.buttons) {
            b.layoutIfNeeded();
            b.position = [x, (this.size[1] - b.size[1]) / 2];
            x += b.size[0] + 8;
        }
    }

    *iterSubviews () {
        for (const b of this.buttons) yield b;
    }
}

class Button extends View {
    constructor (label, onClick) {
        super();
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.strokeWidth = config.toolbar.button.outlineWidth;
        this.onClick = onClick;
        this.label = new TextLayer();
        this.label.text = label;
        this.label.font = config.identFont;
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        const { paddingX, paddingY } = config.toolbar.button;

        this.layer.stroke = this.active
            ? config.toolbar.button.activeOutline
            : this.hovering ? config.toolbar.button.hoverOutline : config.toolbar.button.outline;
        this.layer.background = this.pressed
            ? config.toolbar.button.activeBackground
            : config.toolbar.button.background;

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
        const t = new Transaction(1, 0.1);
        this.hovering = false;
        this.layout();
        t.commit();
    }
    onPointerStart () {
        this.onClick(this);
        const t = new Transaction(1, 0);
        this.pressed = true;
        this.layout();
        t.commit();
    }
    onPointerEnd () {
        const t = new Transaction(1, 0.3);
        this.pressed = false;
        this.layout();
        t.commit();
    }

    *iterSublayers () {
        yield this.label;
    }
}
