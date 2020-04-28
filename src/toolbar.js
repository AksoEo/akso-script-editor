import config from './config';
import { View } from './view';

export class Toolbar extends View {
    constructor () {
        super();

        this.layer.background = config.toolbar.background;
    }

    layout () {
        super.layout();
    }
}
