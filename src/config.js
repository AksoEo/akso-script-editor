import { infixIdentRegexF } from './asct/shared';

const fontStack = '"Avenir Next", "Museo Sans", Roboto, "Helvetica Neue", Ubuntu, Cantarell, sans-serif';

const dateUnits = {
    days: 'tagoj',
    weeks: 'semajnoj',
    months: 'monatoj',
    years: 'jaroj',
};
const dateFields = {
    d: 'tago',
    M: 'monato',
    y: 'jaro',
};
const timestampFields = {
    s: 'sekundo',
    m: 'minuto',
    h: 'horo',
    d: 'tago',
    M: 'monato',
    y: 'jaro',
};
const timestampUnits = {
    s: 'sekundoj',
    m: 'minutoj',
    h: 'horoj',
    d: 'tagoj',
    w: 'semajnoj',
    M: 'monatoj',
    y: 'jaroj',
};

const config = {
    cornerRadius: 4,

    sectionFont: '500 18px ' + fontStack,
    identFont: '500 14px ' + fontStack,
    labelFont: '500 13px ' + fontStack,
    callArgFont: '500 12px ' + fontStack,

    maxEvalIterations: 4096,

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
        paddingXS: 4,
        paddingYS: 2,

        color: [0, 0, 0, 1],
        colorH: [1, 1, 1, 1],
        color0: [0, 0, 0, 0],
        trueNameColor: [0, 0, 0, 0.5],
        iconColor: [0, 0, 0, 0.7],
        iconColor0: [0, 0, 0, 0],
        refOnlyColor: [0, 0, 0, 0.5],

        error: [1, 0.3, 0.4, 1],
        errorOutline: [0.3, 0, 0, 1],
        errorColor: [1, 1, 1, 1],

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
        switch: [1, 1, 1, 1],
        switchOutline: [0.5, 0.5, 0.8, 1],
        timestamp: [1, 1, 1, 1],
        timestampOutline: [0.82, 0.5, 0.38, 1],

        true: 'jes',
        false: 'ne',
        listLabel: 'krei liston enhavantan ...',
        functionLabel: 'funkcio',
        switchLabel: 'se-listo',
        switchIf: 'se',
        switchThen: 'tiuokaze',
        switchOtherwise: 'alie',
    },

    matrix: {
        backdrop: [1, 1, 1, 0.3],
        background: [1, 1, 1, 1],
        cellSpacing: 4,
        minCellWidth: 60,
        minCellHeight: 30,

        selectionColor: [0.1, 0.3, 0.6, 1],
        selectionBoundSize: 8,
        selectionOutlineWidth: 2,

        tableHeader: {
            background: [0.9, 0.9, 0.9, 1],
            delete: [1, 0.3, 0.1, 1],
            deleteIdle: [1, 0.3, 0.1, 0],
            deleteColor: [1, 1, 1, 1],
            deleteColorIdle: [0, 0, 0, 0.7],
        },
        tableExtension: {
            background: [0.3, 0.9, 0.1, 1],
            backgroundIdle: [0.9, 0.9, 0.9, 1],
            color: [0, 0, 0, 1],
            colorIdle: [0, 0, 0, 0.6],
        },
        cellTypes: {
            null: 'NUL',
            bool: 'buleo',
            number: 'nombro',
            string: 'teksto',
            matrix: 'matrico',
        },
        typeSwitch: {
            background: [0.9, 0.9, 0.9, 1],
            color: [0, 0, 0, 1],
            activeBackground: [0.3, 0.3, 0.3, 1],
            activeColor: [1, 1, 1, 1],
            paddingX: 8,
            paddingY: 4,
        },
    },

    defs: {
        background: [0.9, 0.9, 0.9, 1],
        newDefName: n => `nova difino (${n})`,
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
        title: 'Ŝovi tien ĉi por forigi',
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
            color: [0, 0, 0, 1],
            outlineWidth: 2,
            outline: [1, 1, 1, 0],
            hoverOutline: [1, 1, 1, 1],
            activeOutline: [0, 0, 0, 1],
            paddingX: 7,
            paddingY: 3,

            pbackground: [0.2, 0.2, 0.2, 1],
            pactiveBackground: [0, 0, 0, 1],
            pcolor: [1, 1, 1, 1],
            poutline: [0, 0.76, 0.9, 0],
            phoverOutline: [0, 0.76, 0.9, 1],
            pactiveOutline: [0.1, 0.9, 1, 1],
        },
        buttons: {
            code: 'Kodo',
            graph: 'Grafeo',
            help: 'Helpo',
            dup: 'Kopii',
            undo: '[[Undo]]',
            redo: '[[Redo]]',

            save: 'Konservi',
        },
    },

    scrollbar: {
        margin: 2,
        size: 8,
        background: [0, 0, 0, 0.1],
        thumb: [0, 0, 0, 0.3],
        hoverThumb: [0, 0, 0, 0.5],
        minThumbSize: 16,
    },

    library: {
        items: {
            primitives: {
                title: 'Fundamentaĵoj',
            },
            references: {
                title: 'Referencoj',
            },
            stdlib: {
                title: 'Baza biblioteko',
            },
            formVars: {
                title: 'Formulaj variabloj',
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
        defaultName: n => `form-var-${n}`,
        types: {
            u: 'NUL',
            b: 'buleo',
            n: 'nombro',
            s: 'teksto',
            m: 'matrico',
        },
        add: {
            label: 'Aldoni testvariablon',
            color: [0, 0, 0, 1],
            noColor: [0, 0, 0, 0],
            activeBackground: [0.5, 0.5, 0.5, 1],
        },
        remove: {
            color: [1, 1, 1, 1],
            background: [0.9, 0, 0.34, 1],
            activeBackground: [0.7, 0, 0.14, 1],
        },
        color: [0, 0, 0, 1],
        background: [0.8, 0.8, 0.8, 1],
        insetY: 4,
        insetX: 8,
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
        timestamp: 'M7,1 C10.3137085,1 13,3.6862915 13,7 C13,10.3137085 10.3137085,13 7,13 C3.6862915,13 1,10.3137085 1,7 C1,3.6862915 3.6862915,1 7,1 Z M7,3 C4.790861,3 3,4.790861 3,7 C3,9.209139 4.790861,11 7,11 C9.209139,11 11,9.209139 11,7 C11,4.790861 9.209139,3 7,3 Z M7.5,4 L7.5,6.793 L9.35355339,8.64644661 L8.64644661,9.35355339 L6.5,7.20710678 L6.5,4 L7.5,4 Z',
        delete: 'M2,3 L3,2 L7,6 L11,2 L12,3 L8,7 L12,11 L11,12 L7,8 L3,12 L2,11 L6,7 Z',
        add: 'M6,2 L8,2 L8,6 L12,6 L12,8 L8,8 L8,12 L6,12 L6,8 L2,8 L2,6 L6,6 Z',

        exclamTop: 'M6.005,2.851 C6.082,1.816 6.946,1 8,1 C9.105,1 10,1.895 10,3 C10,3.711 9.736,4.406 9.388,5.298 C9.040,6.190 8.481,7.285 7.903,8.432 C7.737,8.762 7.397,9 7,9 C6.487,9 6.064,8.614 6.007,8.12 C5.949,7.620 5.930,3.886 6.005,2.851 Z',
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
            'find_index',
            'length',
            'contains',
            'head',
            'tail',
            'sort',
            'sum',
            'min',
            'max',
            'avg',
            'med',
        ],
        date_time: [
            'date_today',
            'ts_now',
            'date_get',
            'date_set',
            'ts_get',
            'ts_set',
            'date_sub',
            'date_add',
            'ts_add',
            'ts_sub',
            'ts_from_unix',
            'ts_to_unix',
            'ts_from_date',
            'ts_to_date',
            'ts_parse',
            'ts_to_string',
            'date_fmt',
            'ts_fmt',
        ],
        misc: [
            'currency_fmt',
            'country_fmt',
            'phone_fmt',
        ],
    },
    stdlibCategoryNames: {
        math: 'Matematiko',
        logic: 'Logiko',
        functor_stuff: 'Listoj',
        date_time: 'Dato kaj horo',
        misc: 'Aliaj',
    },
    stdlibNames: {
        '+': '+',
        '-': '−',
        '*': '×',
        '/': '÷',
        '^': '^',
        mod: 'modulo',
        floor: '⌊n⌋',
        ceil: '⌈n⌉',
        round: 'rondigi',
        trunc: 'trunc',
        sign: 'sgn',
        abs: '|n|',
        '==': 'x=y',
        '!=': 'x≠y',
        '>': 'x>y',
        '<': 'x<y',
        '>=': 'x≥y',
        '<=': 'x≤y',
        and: 'x∧y',
        or: 'x∨y',
        not: '¬n',
        xor: 'x⊕y',
        id: 'id',
        '++': 'kunigi',
        map: 'mapigi',
        flat_map: 'plate mapigi',
        fold: 'volvi',
        fold1: 'volvi1',
        filter: 'filtri',
        index: 'je indekso',
        find_index: 'indekso de',
        length: 'longeco',
        contains: 'enhavas',
        head: '[[head]]',
        tail: '[[tail]]',
        sort: 'ordigi',
        sum: 'sumo',
        min: 'minimumo',
        max: 'maksimumo',
        avg: 'averaĝo',
        med: 'mediano',
        date_sub: 'subtrahi datojn',
        date_add: 'aldoni al dato',
        date_today: 'hodiaŭa dato',
        date_fmt: 'formatigi daton',
        date_get: 'akiri dateron',
        date_set: 'agordi dateron',
        ts_now: 'nuna horo',
        tz_utc: 'UTC-horzono',
        tz_local: 'loka horzono',
        ts_from_unix: 'tempindiko el unix-tempo',
        ts_to_unix: 'tempindiko al unix-tempo',
        ts_from_date: 'tempindiko el dato',
        ts_get: 'akiri tempindikeron',
        ts_set: 'agordi tempindikeron',
        ts_add: 'aldoni al tempindiko',
        ts_sub: 'subtrahi de tempindiko',
        ts_to_date: 'tempindiko al dato',
        ts_parse: 'parse timestamp',
        ts_to_string: 'timestamp to string',
        ts_fmt: 'formatigi tempindikon',
        currency_fmt: 'formatigi valuton',
        country_fmt: 'formatigi landon',
        phone_fmt: 'formatigi telefonnumeron',
    },
    stdlibArgs: {
        '+': ['adiciato', 'adiciato'],
        '-': ['malpliigato', 'subtrahanto'],
        '*': ['faktoro', 'faktoro'],
        '/': ['numeratoro', 'denominatoro'],
        '^': ['bazo', 'eksponento'],
        mod: ['n', 'modulo'],
        floor: ['n'],
        ceil: ['n'],
        round: ['n'],
        trunc: ['n'],
        sign: ['n'],
        abs: ['n'],
        '==': ['x', 'y'],
        '!=': ['x', 'y'],
        '>': ['x', 'y'],
        '<': ['x', 'y'],
        '>=': ['x', 'y'],
        '<=': ['x', 'y'],
        and: ['x', 'y'],
        or: ['x', 'y'],
        not: ['n'],
        xor: ['x', 'y'],
        id: ['x'],
        '++': ['x', 'y'],
        map: ['funkcio', 'listo'],
        flat_map: ['funkcio', 'listo'],
        fold: ['funkcio', 'ekvaloro', 'listo'],
        fold1: ['funkcio', 'listo'],
        filter: ['funkcio', 'listo'],
        index: ['listo', 'indekso'],
        find_index: ['listo', 'valoro'],
        length: ['valoro'],
        contains: ['valoro', 'trovoto'],
        head: ['valoro', 'ĝis'],
        tail: ['valoro', 'ekde'],
        sort: ['listo'],
        sum: ['listo'],
        min: ['listo'],
        max: ['listo'],
        avg: ['listo'],
        med: ['listo'],
        date_sub: ['rezulta unuo', 'malpliigato', 'subtrahanto'],
        date_add: ['aldona unuo', 'dato', 'valoro'],
        date_fmt: ['dato'],
        date_get: ['kampo', 'dato'],
        date_set: ['kampo', 'dato', 'valoro'],
        ts_from_unix: ['unix-tempo'],
        ts_to_unix: ['tempindiko'],
        ts_from_date: ['dato', 'horzono', 'horoj', 'minutoj', 'sekundoj'],
        ts_to_date: ['dato', 'horzono'],
        ts_parse: ['dato kiel teksto'],
        ts_to_string: ['tempindiko'],
        ts_fmt: ['tempindiko'],
        ts_add: ['aldona unuo', 'tempindiko', 'valoro'],
        ts_sub: ['rezulta unuo', 'malpliigato', 'subtrahanto'],
        ts_get: ['kampo', 'tempindiko', 'horzono'],
        ts_set: ['kampo', 'tempindiko', 'horzono', 'valoro'],
        currency_fmt: ['valuto', 'valoro'],
        country_fmt: ['landokodo'],
        phone_fmt: ['telefonnumero'],
    },
    stdlibSlots: {
        date_sub: [{ type: 'enum', variants: dateUnits }],
        date_add: [{ type: 'enum', variants: dateUnits }],
        date_get: [{ type: 'enum', variants: dateFields }],
        date_set: [{ type: 'enum', variants: dateFields }],
        ts_add: [{ type: 'enum', variants: timestampUnits }],
        ts_sub: [{ type: 'enum', variants: timestampUnits }],
        ts_get: [{ type: 'enum', variants: timestampFields }],
        ts_set: [{ type: 'enum', variants: timestampFields }],
        currency_fmt: [
            {
                type: 'enum',
                variants: {
                    USD: 'Usonaj Dolaroj (USD)',
                    AUD: 'Aŭstraliaj Dolaroj (AUD)',
                    CAD: 'Kanadaj Dolaroj (CAD)',
                    CHF: 'Svisaj Frankoj (CHF)',
                    DKK: 'Danaj Kronoj (DKK)',
                    EUR: 'Eŭroj (EUR)',
                    GBP: 'Britaj Pundoj (GBP)',
                    HKD: 'Honkongaj Dolaroj (HKD)',
                    JPY: 'Japanaj Enoj (JPY)',
                    MXN: 'Meksikaj Pesoj (MXN)',
                    MYR: 'Malajziaj Ringitoj (MYR)',
                    NOK: 'Norvegaj Kronoj (NOK)',
                    NZD: 'Nov-Zelandaj Dolaroj (NZD)',
                    PLN: 'Polaj Zlotoj (PLN)',
                    SEK: 'Svedaj Kronoj (SEK)',
                    SGD: 'Singapuraj Dolaroj (SGD)',
                },
            },
        ],
    },
};
export default config;

const hNodes = {
    ref(name) {
        return {
            type: 'r',
            name,
            refNode: {
                type: 'ds',
                name,
                expr: { type: 'u' },
            },
        };
    },
    refStdlib(name) {
        return {
            type: 'r',
            name,
            refNode: {
                type: 'ds',
                name,
                isStdlib: true,
                expr: {
                    type: 'f',
                    body: {},
                    params: config.stdlibArgs[name] || [],
                    infix: !!name.match(infixIdentRegexF),
                    slots: config.stdlibSlots[name],
                },
                nameOverride: config.stdlibNames[name],
            },
        };
    },
    call(f, ...args) {
        return { type: 'c', func: f, args };
    },
    str(value) {
        return { type: 's', value };
    },
    bool(value) {
        return { type: 'b', value };
    },
    num(value) {
        return { type: 'n', value };
    },
    mat(value) {
        return { type: 'm', value };
    },
    list(...items) {
        return { type: 'l', items };
    },
};

const stdlibDocs = {
    '+': [{ type: 'text', content: '[[Adds two numbers together. If the inputs aren’t numbers, it will return null.]]' }],
    '-': [{ type: 'text', content: '[[Subtracts two numbers. If the inputs aren’t numbers, it will return null.]]' }],
    '*': [{ type: 'text', content: '[[Multiplies two numbers. If the inputs aren’t numbers, it will return null.]]' }],
    '/': [{ type: 'text', content: '[[Divides two numbers. If the inputs aren’t numbers, it will return null.]]' }],
    '^': [{ type: 'text', content: '[[Computes the exponentiation of two numbers. If the inputs aren’t numbers, it will return null.]]' }],
    mod: [{ type: 'text', content: '[[Returns the mathematical modulo of two numbers. If the inputs aren’t numbers, it will return null.]]' }],
    floor: [{ type: 'text', content: '[[Returns the closest whole number towards -Infinity. If the input isn’t a number, it will return null.]]' }],
    ceil: [{ type: 'text', content: '[[Returns the closest whole number towards +Infinity. If the input isn’t a number, it will return null.]]' }],
    round: [{ type: 'text', content: '[[Returns the closest whole number. If the input isn’t a number, it will return null.]]' }],
    trunc: [{ type: 'text', content: '[[Removes any fractional part of the number (e.g. 3.14 → 3, -3.14 → -3). If the input isn’t a number, it will return null.]]' }],
    sign: [{ type: 'text', content: '[[Returns 1, 0, or -1 depending on whether the number is positive, zero, or negative. If the input isn’t a number, it will return null.]]' }],
    abs: [{ type: 'text', content: '[[Returns the absolute value of a number, i.e. removing any negative signs. If the input isn’t a number, it will return null.]]' }],
    '==': [
        { type: 'text', content: '[[Compares two values. If they are the same, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[and otherwise]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '!=': [
        { type: 'text', content: '[[Compares two values. If they are *not* the same, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[If they are the same, it will return]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '>': [
        { type: 'text', content: '[[Compares two numbers. If the first is larger than the second, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[and otherwise]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '<': [
        { type: 'text', content: '[[Compares two numbers. If the first is smaller than the second, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[and otherwise]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '>=': [
        { type: 'text', content: '[[Compares two numbers. If the first is larger or equal to the second, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[and otherwise]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '<=': [
        { type: 'text', content: '[[Compares two numbers. If the first is smaller or equal to the second, it will return]]' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: '[[and otherwise]]' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    and: [
        { type: 'text', content: '[[Combines two booleans. Returns yes only if both are yes.]]' },
        { type: 'text', content: 'yes, yes -> yes' },
        { type: 'text', content: 'yes, no -> no' },
        { type: 'text', content: 'no, yes -> no' },
        { type: 'text', content: 'no, no -> no' },
    ],
    or: [
        { type: 'text', content: '[[Combines two booleans. Returns yes if either is yes.]]' },
        { type: 'text', content: 'yes, yes -> yes' },
        { type: 'text', content: 'yes, no -> yes' },
        { type: 'text', content: 'no, yes -> yes' },
        { type: 'text', content: 'no, no -> no' },
    ],
    not: [
        { type: 'text', content: '[[Inverts a boolean. Returns yes for no and no for yes.]]' },
    ],
    xor: [
        { type: 'text', content: '[[Compares two booleans. Returns yes if they are different.]]' },
        { type: 'text', content: 'yes, yes -> no' },
        { type: 'text', content: 'no, yes -> yes' },
        { type: 'text', content: 'yes, no -> yes' },
        { type: 'text', content: 'no, no -> no' },
    ],
    id: [
        { type: 'text', content: '[[Identity function: returns its input without doing anything.]]' },
    ],
    '++': [
        { type: 'text', content: '[[Adds two lists or strings together. You can use this to combine values with text:]]' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('++'),
                hNodes.str('valuto: '),
                hNodes.ref('valuto')),
        },
        { type: 'text', content: '[[or to combine lists or matrices:]]' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('++'),
                hNodes.mat([1, 2]),
                hNodes.list(hNodes.num(3))),
        },
    ],
    map: [{ type: 'text', content: '[[Applies a function on each element of an input. ??]]' }],
    flat_map: [{ type: 'text', content: '[[Applies a function on each element of an input and combines the results into one list.]]' }],
    fold: [{ type: 'text', content: '[[Reduces a list to one value. ??]]' }],
    fold1: [{ type: 'text', content: '[[Reduces a list to one value. ??]]' }],
    filter: [{ type: 'text', content: '[[Filters a list using a function. ??]]' }],
    index: [
        { type: 'text', content: '[[Returns a single item from a list, by index. Indices start at zero. For example, to get the second item of a list (5):]]' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('index'),
                hNodes.mat([3, 5]),
                hNodes.num(1)),
        },
    ],
    find_index: [
        { type: 'text', content: '[[Finds the index of an item in a list. Indices start at zero. For example:]]' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('find_index'),
                hNodes.mat([3, 5]),
                hNodes.num(3)),
        },
        { type: 'text', content: '[[The item 3 is the first item, so the index will be 0. For 5, the index would be 1. If the item it is looking for is not in the list, it will return null.]]' },
    ],
    length: [
        { type: 'text', content: '[[Returns the length of a list or string.]]' },
    ],
    contains: [
        { type: 'text', content: '[[Returns yes or no depending on whether the list contains the item.]]' },
    ],
    head: [
        { type: 'text', content: '[[Returns the first N items of a list, or first N characters of a string.]]' },
    ],
    tail: [
        { type: 'text', content: '[[Returns the last N items of a list, or last N characters of a tsring.]]' },
    ],
    sort: [
        { type: 'text', content: '[[Sorts the list in ascending order.]]' },
    ],
    sum: [
        { type: 'text', content: '[[Returns the sum of the input list.]]' },
    ],
    min: [
        { type: 'text', content: '[[Returns the minimum value in the input list.]]' },
    ],
    max: [
        { type: 'text', content: '[[Returns the maximum value in the input list.]]' },
    ],
    avg: [
        { type: 'text', content: '[[Returns the arithmetic mean of the input list.]]' },
    ],
    med: [
        { type: 'text', content: '[[Returns the median value of the input list.]]' },
    ],
    date_sub: [
        { type: 'text', content: '[[Subtracts two dates and returns the difference in the desired unit. Returns null if the inputs aren’t dates.]]' },
    ],
    date_add: [
        { type: 'text', content: '[[Adds a duration to a date.]]' },
    ],
    date_today: [{ type: 'text', content: '[[Returns today’s date.]]' }],
    date_fmt: [{ type: 'text', content: '[[Formats the date into a human-readable string in Esperanto.]]' }],
    date_get: [{ type: 'text', content: '[[Returns the desired property of the input date, or null if the input is not a date.]]' }],
    date_set: [{ type: 'text', content: '[[Returns a new date with the desired property changed, or returns null if the input is not a date.]]' }],
    ts_now: [{ type: 'text', content: '[[Returns the current timestamp.]]' }],
    tz_utc: [{ type: 'text', content: '[[Returns the UTC timezone offset in minutes (always 0).]]' }],
    tz_local: [{ type: 'text', content: '[[Returns the local timezone offset in minutes from UTC.]]' }],
    ts_from_unix: [{ type: 'text', content: '[[Converts a unix epoch time number to a timestamp.]]' }],
    ts_to_unix: [{ type: 'text', content: '[[Converts a timestamp to a unix epoch time number.]]' }],
    ts_from_date: [{ type: 'text', content: '[[Creates a timestamp from a date and a time.]]' }],
    ts_get: [{ type: 'text', content: '[[Returns the desired property of the input timestamp.]]' }],
    ts_set: [{ type: 'text', content: '[[Returns a new timestamp with the desired property changed.]]' }],
    ts_add: [{ type: 'text', content: '[[Adds a time quantity to a timestamp and returns the result.]]' }],
    ts_sub: [{ type: 'text', content: '[[Subtracts a time quanitty from a timestamp and returns the result.]]' }],
    ts_to_date: [{ type: 'text', content: '[[Returns the date portion of a timestam.]]' }],
    ts_parse: [{ type: 'text', content: '[[Parses a timestamp from a string in a format like 2022-05-18T13:44:02Z]]' }],
    ts_to_string: [{ type: 'text', content: '[[Converts a timestamp to a string in a format like 2022-05-18T13:44:02Z.]]' }],
    ts_fmt: [{ type: 'text', content: '[[Formats a timestamp into a human-readable string in Esperanto.]]' }],
    currency_fmt: [{ type: 'text', content: '[[Formats the currency value into a human-readable string like “6,24 USD.” Note that for all currencies except JPY, the input value must be in cents!]]' }],
    country_fmt: [{ type: 'text', content: '[[Returns the country name, given a two-letter country code like NL.]]' }],
    phone_fmt: [{ type: 'text', content: '[[Formats a phone-number with spacing, given input like +3112345678]]' }],
};

export const helpContent = {
    background: '#eee',
    foreground: 'black',
    highlight: [0.8, 0.5, 0.3, 1],
    title: 'Helpo',
    font: '500 16px ' + fontStack,

    default: [{
        type: 'text',
        content: '[[Hover over or click a highlighted item to learn more.]]',
    }],
    'expr': [{ type: 'text', content: '[[Error: empty expression]]' }],
    'expr.u': [{
        type: 'text',
        content: '[[A null expression represents the absence of a value.]]',
    }],
    'expr.b': [{
        type: 'text',
        content: '[[A boolean expression represents a truthfulness value: yes or no. Click to swap the value.]]',
    }],
    'expr.n': [{
        type: 'text',
        content: '[[A number. Click to edit the value.]]',
    }],
    'expr.s': [{
        type: 'text',
        content: '[[A piece of text. Click to edit the value. You can use the ++ function:]]',
    }, {
        type: 'node',
        node: hNodes.call(
            hNodes.refStdlib('++'),
            hNodes.str('valuto: '),
            hNodes.ref('valuto')),
    }, {
        type: 'text',
        content: '[[to combine text with other values.]]',
    }],
    'expr.m': [{
        type: 'text',
        content: '[[A matrix value stores a spreadsheet or something.]]',
    }],
    'expr.r': [{
        type: 'text',
        content: '[[A reference represents the value of another definition. Click to edit the name that this is referencing.]]',
    }],
    'expr.r.def': [{
        type: 'text',
        content: '[[The name of a definition. Drag this to get a new reference to this definition. The reference will represent its value.]]',
    }],
    'expr.l': [{
        type: 'text',
        content: '[[Creates a list of values. ??]]',
    }],
    'expr.f': [{
        type: 'text',
        content: '[[Declares a function.]]',
    }],
    'expr.w': [{
        type: 'text',
        content: '[[A switch allows you to evaluate to a different value depending on certain conditions.]]',
    }, {
        type: 'node',
        node: {
            type: 'w',
            matches: [
                {
                    cond: hNodes.call(hNodes.refStdlib('=='),
                        hNodes.ref('valuto'),
                        hNodes.str('a')),
                    value: hNodes.str('valuto 1'),
                },
                {
                    cond: hNodes.call(hNodes.refStdlib('=='),
                        hNodes.ref('valuto'),
                        hNodes.str('b')),
                    value: hNodes.str('valuto 2'),
                },
                {
                    cond: null,
                    value: hNodes.str('valuto 3'),
                },
            ],
        },
    }],
    'expr.c': (expr) => {
        if (expr.func.type === 'r' && expr.func.refNode?.isStdlib) {
            return stdlibDocs[expr.func.name];
        } else if (expr.func.type === 'r') {
            return [{
                type: 'text',
                content: `[[This is a call to the function ${expr.func.name}]]`,
            }];
        }
        return [];
    },
};
