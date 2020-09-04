/// Handles text input; accessible via ctx.beginInput.
export class TextInput {
    constructor () {
        this.node = document.createElement('div');
        this.node.style.position = 'absolute';
        this.node.style.zIndex = 3;
        this.node.style.top = this.node.style.right = this.node.style.left = this.node.style.bottom = 0;
        this.node.style.display = 'none';

        this.input = document.createElement('input');
        this.node.appendChild(this.input);

        this.input.addEventListener('click', e => {
            e.stopPropagation();
        });
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.endInput(true);
            if (e.key === 'Enter') this.endInput();
        });
        Object.assign(this.input.style, {
            padding: '0 2px',
            border: 'none',
            margin: '0',
            borderRadius: '4px',
            boxSizing: 'border-box',
        });
        this.node.addEventListener('click', () => {
            this.endInput();
        });

    }

    inputOriginal = null;
    inputPromise = null;
    beginInput = ([x, y], [width, height], text, style = {}) => new Promise((resolve) => {
        this.endInput();

        this.node.style.display = 'block';
        Object.assign(this.input.style, style);
        this.input.style.transform = `translate(${x}px, ${y}px)`;
        this.input.style.width = width + 'px';
        this.input.style.height = height + 'px';
        this.input.style.lineHeight = height + 'px';
        this.input.value = text;
        this.inputOriginal = text;
        this.input.focus();
        setTimeout(() => this.input.focus(), 30); // sometimes it doesn't focus
        this.inputPromise = resolve;
    });
    endInput (cancel) {
        this.node.style.display = 'none';
        if (!this.inputPromise) return;
        const resolve = this.inputPromise;
        resolve((cancel ? this.inputOriginal : this.input.value).normalize());
        this.inputPromise = null;
    }
}

