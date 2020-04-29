import config from './config';
import { View } from './view';
import { TextLayer, Transaction } from './layer';

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
        ];
    }

    toggleGraphView = (graphButton) => {
        const t = new Transaction(1, 1);
        const enabled = this.canvas.defsView.useGraphView;
        graphButton.active = !enabled;
        if (enabled) {
            this.canvas.defsView.useGraphView = false;
            if (this._libraryWasOpen) {
                this.canvas.library.open();
            }
        } else {
            this.canvas.defsView.useGraphView = true;
            this._libraryWasOpen = this.canvas.library.isOpen;
            this.canvas.library.close();
        }
        t.commitAfterLayout(this.ctx);
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
