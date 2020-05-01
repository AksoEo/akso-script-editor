export default {
    cornerRadius: 4,

    identFont: '500 14px Avenir Next, system, sans-serif',
    labelFont: '500 13px Avenir Next, system, sans-serif',
    callArgFont: '500 12px Avenir Next, system, sans-serif',

    maxEvalIterations: 16384,

    // width to align the left hand side at
    lhsAlignWidth: 200,

    peek: {
        background: [0.2, 0.2, 0.2, 1],
    },

    primitives: {
        outlineWeight: 2,
        hoverOutlineWeight: 4,
        paddingX: 8,
        paddingY: 4,
        paddingYS: 2,

        color: [0, 0, 0, 1],
        colorH: [1, 1, 1, 1],
        color0: [0, 0, 0, 0],
        iconColor: [0, 0, 0, 0.7],
        iconColor0: [0, 0, 0, 0],

        ref: [1, 1, 1, 1],
        refOutline: [0.9, 0.3, 0.6, 1],
        refBroken: [1, 0.3, 0.4, 1],
        refBrokenOutline: [0.3, 0, 0, 1],
        null: [1, 1, 1, 1],
        nullOutline: [0.73, 0.13, 0.25, 1],
        bool: [1, 1, 1, 1],
        boolOutline: [0.83, 0.48, 0.05, 1],
        number: [1, 1, 1, 1],
        numberOutline: [0.9, 0.73, 0, 1],
        string: [1, 1, 1, 1],
        stringOutline: [0.4, 0.82, 0, 1],
        stringHighlight: [0.1, 0.62, 0, 1], // dropdown hilight
        matrix: [1, 1, 1, 1],
        matrixOutline: [0, 0.85, 0.58, 1],
        list: [1, 1, 1, 1],
        listOutline: [0, 0.76, 0.9, 1],
        call: [1, 1, 1, 1],
        callOutline: [0.9, 0, 0.34, 1],
        callHoverOutline: [0.8, 0, 0.24, 1],
        func: [1, 1, 1, 1],
        funcOutline: [0.8, 0.5, 0.5, 1],

        true: 'yes',
        false: 'no',
        listLabel: 'create list containing...',
        functionLabel: 'function',
        switchLabel: 'switch',
        switchIf: 'if',
        switchThen: 'then',
        switchOtherwise: 'otherwise',
    },

    defs: {
        background: [0.9, 0.9, 0.9, 1],
        newDefName: n => `new def (${n})`,
    },
    def: {
        cornerRadius: 12,
        padding: 8,
        background: [1, 1, 1, 1],
    },

    exprSlot: {
        weight: 2,
        hoverWeight: 4,
        stroke: [0.5, 0.5, 0.5, 0],
        emptyStroke: [0.5, 0.5, 0.5, 1],
        hoverStroke: [0.2, 0.2, 0.2, 1],
        background: [0, 0, 0, 0],
        hoverBackground: [0, 0, 0, 0.2],
    },

    trash: {
        title: 'Drag here to delete',
        background: [0.7, 0.7, 0.7, 1],
        activeBackground: [1, 0.3, 0.2, 1],
        bigBackground: [0.95, 0.95, 0.95, 0.5],
        bigActiveBackground: [1, 0.3, 0.2, 0.4],
    },

    toolbar: {
        background: [0.7, 0.7, 0.7, 1],
        button: {
            background: [0.8, 0.8, 0.8, 1],
            activeBackground: [0.5, 0.5, 0.5, 1],
            outlineWidth: 2,
            outline: [1, 1, 1, 0],
            hoverOutline: [1, 1, 1, 1],
            activeOutline: [0, 0, 0, 1],
            paddingX: 7,
            paddingY: 3,
        },
    },

    library: {
        items: {
            primitives: {
                title: 'Primitives',
            },
            references: {
                title: 'References',
            },
            stdlib: {
                title: 'Standard Library',
            },
        },
        background: [0.95, 0.95, 0.95, 1],
        sideTabs: {
            background: [0.6, 0.6, 0.6, 1],
            tab: [0.7, 0.7, 0.7, 1],
            activeTab: [0.95, 0.95, 0.95, 1],
        },
    },

    formVars: {
        title: 'Form Variables',
        description: 'Enter form variable values here for testing',
        defaultName: n => `form-var-${n}`,
        types: {
            null: 'null',
            bool: 'bool',
            number: 'number',
            string: 'string',
        },
    },

    icons: {
        size: 14,
        number: 'M7,2 L6.8,4 L8.8,4 L9,2 L11,2 L10.8,4 L12,4 L12,6 L10.6,6 L10.4,7.999 L12,8 L12,10 L10.2,9.999 L10,12 L8,12 L8.2,9.999 L6.2,9.999 L6,12 L4,12 L4.2,9.999 L3,10 L3,8 L4.4,7.999 L4.6,6 L3,6 L3,4 L4.8,4 L5,2 L7,2 Z M8.6,6 L6.6,6 L6.4,7.999 L8.4,7.999 L8.6,6 Z',
        string: 'M2.5,2 L11.5,2 L11.5,5 L10.5,5 L10,4 L8,4 L8,10.5 L9,11 L9,12 L5,12 L5,11 L6,10.5 L6,4 L4,4 L3.5,5 L2.5,5',
        ref: 'M12,2 L6,2 L6,4 L8.5,4 L2.5,10 L4,11.5 L10,5.5 L10,8 L12,8',
        refBroken: 'M5.5,7 L6,9.5 L4,11.5 L2.5,10 L5.5,7 Z M12,2 L12,8 L10,8 L10,5.5 L8,7.5 L7.5,5 L8.5,4 L6,4 L6,2 L12,2 Z',
        matrix: 'M4,1 L4,3 L3,3 L3,11 L4,11 L4,13 L1,13 L1,1 L4,1 Z M13,1 L13,13 L10,13 L10,11 L11,11 L11,3 L10,3 L10,1 L13,1 Z M7,5 C8.1045695,5 9,5.8954305 9,7 C9,8.1045695 8.1045695,9 7,9 C5.8954305,9 5,8.1045695 5,7 C5,5.8954305 5.8954305,5 7,5 Z',
        bool: 'M11.5,6 L13,7.5 L11,9.5 L13,11.5 L11.5,13 L9.5,11 L7.5,13 L6,11.5 L8,9.5 L6,7.5 L7.5,6 L9.5,8 L11.5,6 Z M7,1.5 L8.5,3 L3.5,8 L0.5,5 L2,3.5 L3.5,5 L7,1.5 Z',
        null: 'M7,9.93526786 L5.44708573,12.795555 L5.53236607,9.54201653 L2.75735931,11.2426407 L4.45798347,8.46763393 L1.20444504,8.55291427 L4.06473214,7 L1.20444504,5.44708573 L4.45798347,5.53236607 L2.75735931,2.75735931 L5.53236607,4.45798347 L5.44708573,1.20444504 L7,4.06473214 L8.55291427,1.20444504 L8.46763393,4.45798347 L11.2426407,2.75735931 L9.54201653,5.53236607 L12.795555,5.44708573 L9.93526786,7 L12.795555,8.55291427 L9.54201653,8.46763393 L11.2426407,11.2426407 L8.46763393,9.54201653 L8.55291427,12.795555',
        dropdown: 'M2,5 L12,5 L7,10',
    },

    stdlibCategories: {
        math: [
            '+',
            '-',
            '*',
            '/',
            '^',
            'mod',
            'floor',
            'ceil',
            'round',
            'trunc',
            'sign',
            'abs',
        ],
        logic: [
            '==',
            '!=',
            '>',
            '<',
            '>=',
            '<=',
            'and',
            'or',
            'not',
            'xor',
            'id',
        ],
        functor_stuff: [
            '++',
            'map',
            'flat_map',
            'fold',
            'fold1',
            'filter',
            'index',
            'length',
            'contains',
            'sort',
            'sum',
            'min',
            'max',
            'avg',
            'med',
        ],
        date_time: [
            'date_sub',
            'date_add',
            'date_today',
            'date_fmt',
            'time_now',
            'datetime_fmt',
        ],
        misc: [
            'currency_fmt',
            'country_fmt',
            'phone_fmt',
        ],
    },
    stdlibNames: {
        '+': '+',
        '-': '−',
        '*': '×',
        '/': '÷',
        '^': '^',
        mod: 'mod',
        floor: 'floor',
        ceil: 'ceil',
        round: 'round',
        trunc: 'trunc',
        sign: 'sign',
        abs: 'abs',
        if: 'if',
        '==': '=',
        '!=': '≠',
        '>': '>',
        '<': '<',
        '>=': '≥',
        '<=': '≤',
        and: '∧',
        or: '∨',
        not: '¬',
        xor: '⊕',
        id: 'copy',
        '++': '++',
        map: 'map',
        flat_map: 'flat map',
        fold: 'fold',
        fold1: 'fold1',
        filter: 'filter',
        index: 'get item',
        length: 'length',
        contains: 'contains',
        sort: 'sort',
        sum: 'sum',
        min: 'minimum',
        max: 'maximum',
        avg: 'average',
        med: 'median',
        date_sub: 'subtract dates',
        date_add: 'add to date',
        date_fmt: 'format date',
        datetime_fmt: 'format date time',
        currency_fmt: 'format currency',
        country_fmt: 'format country',
        phone_fmt: 'format phone number',
    },
    stdlibArgs: {
        '+': ['summand', 'summand'],
        '-': ['minuend', 'subtrahend'],
        '*': ['factor', 'factor'],
        '/': ['dividend', 'divisor'],
        '^': ['base', 'exponent'],
        mod: ['value', 'mod'],
        floor: ['value'],
        ceil: ['value'],
        round: ['value'],
        trunc: ['value'],
        sign: ['value'],
        abs: ['value'],
        '==': ['value', 'value'],
        '!=': ['value', 'value'],
        '>': ['value', 'value'],
        '<': ['value', 'value'],
        '>=': ['value', 'value'],
        '<=': ['value', 'value'],
        and: ['value', 'value'],
        or: ['value', 'value'],
        not: ['value'],
        xor: ['value', 'value'],
        id: ['value'],
        '++': ['functor', 'functor'],
        map: ['morphism', 'functor'],
        flat_map: ['morphism', 'functor'],
        fold: ['morphism', 'initial', 'functor'],
        fold1: ['morphism', 'functor'],
        filter: ['filter', 'functor'],
        index: ['functor', 'index'],
        length: ['functor'],
        contains: ['functor', 'element'],
        sort: ['functor'],
        sum: ['functor'],
        min: ['functor'],
        max: ['functor'],
        avg: ['functor'],
        med: ['functor'],
        date_sub: ['result unit', 'minuend', 'subtrahend'],
        date_add: ['factor unit', 'augend', 'factor'],
        date_fmt: ['date'],
        datetime_fmt: ['datetime'],
        currency_fmt: ['currency', 'value'],
        country_fmt: ['code'],
        phone_fmt: ['phone number'],
    },
    stdlibSlots: {
        date_sub: [
            {
                type: 'enum',
                variants: {
                    days: 'days',
                    weeks: 'weeks',
                    months: 'months',
                    years: 'years',
                },
            },
        ],
        date_add: [
            {
                type: 'enum',
                variants: {
                    days: 'days',
                    weeks: 'weeks',
                    months: 'months',
                    years: 'years',
                },
            },
        ],
        currency_fmt: [
            {
                type: 'enum',
                variants: {
                    USD: 'US Dollar (USD)',
                    AUD: 'Australian Dollar (AUD)',
                    CAD: 'Canadian Dollar (CAD)',
                    CHF: 'Swiss Franc (CHF)',
                    DKK: 'Danish Krone (DKK)',
                    EUR: 'Euro (EUR)',
                    GBP: 'Great British Pound (GBP)',
                    HKD: 'Hong Kong Dollar (HKD)',
                    JPY: 'Japanese Yen (JPY)',
                    MXN: 'Mexican Peso (MXN)',
                    MYR: 'Malaysian Ringgit (MYR)',
                    NOK: 'Norwegian Krone (NOK)',
                    NZD: 'New Zealand Dollar (NZD)',
                    PLN: 'Polish Zloty (PLN)',
                    SEK: 'Swedish Krona (SEK)',
                    SGD: 'Singapore Dollar (SGD)',
                },
            },
        ],
    },
};
