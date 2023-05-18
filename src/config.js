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
        title: 'Tiru tien ĉi por forigi',
        background: [0.7, 0.7, 0.7, 0.4],
        activeBackground: [1, 0.3, 0.2, 0.5],
        bigBackground: [0.95, 0.95, 0.95, 0.5],
        bigActiveBackground: [1, 0.3, 0.2, 0.4],

        fill: [0.75, 0.75, 0.75, 1],
        fillLines: [0, 0, 0, 0.5],
        outline: [0, 0, 0, 1],
        outlineWidth: 1,
        iconSize: 24,
        lid: {
            rect: 'M18.5,3.5 C18.7761424,3.5 19.0261424,3.61192881 19.2071068,3.79289322 C19.3880712,3.97385763 19.5,4.22385763 19.5,4.5 L19.5,4.5 L19.5,5.5 L4.5,5.5 L4.5,4.5 C4.5,4.22385763 4.61192881,3.97385763 4.79289322,3.79289322 C4.97385763,3.61192881 5.22385763,3.5 5.5,3.5 L5.5,3.5 Z',
            handle: 'M9.5,3 C9.5,2 10.3333333,1.5 12,1.5 C13.6666667,1.5 14.5,2 14.5,3',
        },
        can: {
            rect: 'M18.5,7.5 L18.5,20 C18.5,20.6903559 18.220178,21.3153559 17.767767,21.767767 C17.3153559,22.220178 16.6903559,22.5 16,22.5 L16,22.5 L8,22.5 C7.30964406,22.5 6.68464406,22.220178 6.23223305,21.767767 C5.77982203,21.3153559 5.5,20.6903559 5.5,20 L5.5,20 L5.5,7.5 L18.5,7.5 Z',
            lines: 'M13,10 L13,20 L11,20 L11,10 L13,10 Z M9,10 L9,20 L7,20 L7,10 L9,10 Z M17,10 L17,20 L15,20 L15,10 L17,10 Z',
        },
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
            test: 'Test-moduso',
            help: 'Helpo',
            dup: 'Kopii',
            undo: 'Malfari',
            redo: 'Refari',

            cancel: 'Nuligi',
            save: 'Konservi',
        },
        versionColor: [0, 0, 0, 0.5],
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
        head: 'kapo',
        tail: 'vosto',
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
        ts_get: ['kampo', 'horzono', 'tempindiko'],
        ts_set: ['kampo', 'horzono', 'tempindiko', 'valoro'],
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
    '+': [{ type: 'text', content: 'Sumas du nombrojn. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    '-': [{ type: 'text', content: 'Subtrahas du numbrojn. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    '*': [{ type: 'text', content: 'Obligas du nombrojn, unu je la alia. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    '/': [{ type: 'text', content: 'Dividas du nombrojn, la unua je la dua. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    '^': [{ type: 'text', content: 'Komputas la potencon de du nombroj. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    mod: [{ type: 'text', content: 'Komputas la matematikan modulon de du nombroj. Se la argumentoj ne estas nombroj, ĝi redonos NUL.' }],
    floor: [{ type: 'text', content: 'Redonas la plej proksiman entjeron laŭ la direkto -infinito. Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    ceil: [{ type: 'text', content: 'Redonas la plej proksiman entjeron laŭ la direkto infinito. Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    round: [{ type: 'text', content: 'Redonas la plej proksiman entjeron. Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    trunc: [{ type: 'text', content: 'Forigas ajnan frakcian parton de la nombro (ekz. 3,14 → 3, 2,72 → 2, -3,14 → -3, -2,72 → -2). Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    sign: [{ type: 'text', content: 'Redonas 1, 0 aŭ -1 por respektive pozitiva nombro, nulo kaj negativa nombro. Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    abs: [{ type: 'text', content: 'Redonas la absolutan valoron de nombro, t.e. ĝi forigas ajnan minus-signon. Se la argumento ne estas nombro, ĝi redonos NUL.' }],
    '==': [
        { type: 'text', content: 'Komparas du valorojn. Se ili egalas, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '!=': [
        { type: 'text', content: 'Komparas du valorojn. Se ili *ne* egalas, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '>': [
        { type: 'text', content: 'Komparas du nombrojn. Se la unua pli grandas ol la dua, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '<': [
        { type: 'text', content: 'Komparas du nombrojn. Se la unua mapli grandas ol la dua, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '>=': [
        { type: 'text', content: 'Komparas du nombrojn. Se la unua estas pli granda ol aŭ same granda kiel la dua, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    '<=': [
        { type: 'text', content: 'Komparas du nombrojn. se la unua estas malpli granda ol aŭ same granda kiel la dua, ĝi redonos' },
        { type: 'node', node: hNodes.bool(true) },
        { type: 'text', content: 'kaj alie' },
        { type: 'node', node: hNodes.bool(false) },
    ],
    and: [
        { type: 'text', content: 'Kombinas du buleojn. Ĝi redonos jes, nur se ambaŭ estas jes.' },
        { type: 'text', content: 'jes, jes → jes' },
        { type: 'text', content: 'jes, ne → ne' },
        { type: 'text', content: 'ne, jes → ne' },
        { type: 'text', content: 'ne, ne → ne' },
    ],
    or: [
        { type: 'text', content: 'Kombinas du buleojn. Ĝi ĉiam redonos jes, krom se ambaŭ buleoj estas ne.' },
        { type: 'text', content: 'jes, jes → jes' },
        { type: 'text', content: 'jes, ne → jes' },
        { type: 'text', content: 'ne, jes → jes' },
        { type: 'text', content: 'ne, ne → ne' },
    ],
    not: [
        { type: 'text', content: 'Inversas buleon. Ĝi redonos jes, se la buleo estas ne, kaj ne, se la buleo estas jes.' },
    ],
    xor: [
        { type: 'text', content: 'Komparas du buleojn. Ĝi redonos jes, nur se la buleoj estas malsamaj.' },
        { type: 'text', content: 'jes, jes → ne' },
        { type: 'text', content: 'ne, jes → jes' },
        { type: 'text', content: 'jes, ne → jes' },
        { type: 'text', content: 'ne, ne → ne' },
    ],
    id: [
        { type: 'text', content: 'Identec-funkcio: Redonas sian argumenton sen ŝanĝi ĝin.' },
    ],
    '++': [
        { type: 'text', content: 'Kunigas du tekstojn aŭ du listojn/matricojn. Ekzemplo kun teksto:' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('++'),
                hNodes.str('valuto: '),
                hNodes.ref('valuto')),
        },
        { type: 'text', content: 'Ekzemplo kun listo aŭ matrico:' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('++'),
                hNodes.mat([1, 2]),
                hNodes.list(hNodes.num(3))),
        },
    ],
    map: [{ type: 'text', content: 'Uzigas funkcion sur ĉiun eron de la argumento.' }],
    flat_map: [{ type: 'text', content: 'Uzigas funkcion sur ĉiun eron de la argumento kaj kombinas la rezulton en unu liston.' }],
    fold: [{ type: 'text', content: 'Reduktas liston al unu valoro kun defaŭlta valoro.' }],
    fold1: [{ type: 'text', content: 'Reduktas liston al unu valoro uzante la unuan listeron kiel defaŭltan valoron.' }],
    filter: [{ type: 'text', content: 'Trafiltras liston uzante argumenton kiel funkcion.' }],
    index: [
        { type: 'text', content: 'Redonas specifan listeron el la proviziita listo. Indeksoj komenciĝas je nulo. Ekzemple, por ekhavi la duan listeron (5):' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('index'),
                hNodes.mat([3, 5]),
                hNodes.num(1)),
        },
    ],
    find_index: [
        { type: 'text', content: 'Trovas la indekson de listero. Indeksoj komenciĝas je nulo. Ekzemple:' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('find_index'),
                hNodes.mat([3, 5]),
                hNodes.num(3)),
        },
        { type: 'text', content: 'La listero 3 estas la unua, tial la indekso estas nulo. Por 5, la indekso estus 1. Se la serĉata listero ne troviĝas, ĝi redonos NUL.' },
    ],
    length: [
        { type: 'text', content: 'Redonas la longecon de listo aŭ teksto.' },
    ],
    contains: [
        { type: 'text', content: 'Redonas ĉu listero troviĝas en listo.' },
    ],
    head: [
        { type: 'text', content: 'Redonas la unuajn N listeroj el listo, aŭ la unuajn N signojn el teksto.' },
    ],
    tail: [
        { type: 'text', content: 'Redonas la lastajn N listerojn el listo, aŭ la lastajn N signojn el teksto.' },
    ],
    sort: [
        { type: 'text', content: 'Ordigas liston laŭ kreskanta ordo.' },
    ],
    sum: [
        { type: 'text', content: 'Redonas la sumon de la listo.' },
    ],
    min: [
        { type: 'text', content: 'Redonas la plej malgrandan valoron en listo.' },
    ],
    max: [
        { type: 'text', content: 'Redonas la plej grandan valoron en listo.' },
    ],
    avg: [
        { type: 'text', content: 'Redonas la meznombron de la valoroj en listo.' },
    ],
    med: [
        { type: 'text', content: 'Redonas la medianan valoron de listo.' },
    ],
    date_sub: [
        { type: 'text', content: 'Subtrahas du datojn kaj redonas la diferencon laŭ la proviziita unuo. Redonas NUL se la argumentoj ne estas datoj.' },
    ],
    date_add: [
        { type: 'text', content: 'Adicias daton per tempodaŭro.' },
    ],
    date_today: [{ type: 'text', content: 'Redonas la hodiaŭan daton formatigitan kiel JJJJ-MM-DD.' }],
    date_fmt: [{ type: 'text', content: 'Formatigas daton kiel homlegeblan tekston en Esperanto.' }],
    date_get: [{ type: 'text', content: 'Redonas specifan eron de dato. Redonas NUL se la argumento ne estas dato.' }],
    date_set: [{ type: 'text', content: 'Redonas novan daton kie specifa datero estis ŝanĝita laŭ la argumentoj. Redonas NUL se la argumento ne estas dato.' }],
    ts_now: [{ type: 'text', content: 'Redonas la nunan tempindikon.' }],
    tz_utc: [{ type: 'text', content: 'Redonas la UTC-horzonan deŝovon en minutoj (ĉiam 0).' }],
    tz_local: [{ type: 'text', content: 'Redonas la lokan horzonan deŝovon kompare al UTC en minutoj.' }],
    ts_from_unix: [{ type: 'text', content: 'Konvertas Unix-epoĥan tempo-numeron al tempindiko.' }],
    ts_to_unix: [{ type: 'text', content: 'Konvertas tempindikon al Unix-epoĥan tempo-numeron.' }],
    ts_from_date: [{ type: 'text', content: 'Kreas tempoindikon el dato kaj horo.' }],
    ts_get: [
        { type: 'text', content: 'Redonas la deziratan tempindikeron. Ekzemple:' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('ts_get'),
                hNodes.str('h'),
                hNodes.num(0),
                hNodes.ref('dato')),
        },
        { type: 'text', content: 'La horzono estas la UTC-horozna deŝovo en minutoj.' },
    ],
    ts_set: [
        { type: 'text', content: 'Redonas novan tempindikon kie specifa tempindikero estis ŝanĝita laŭ la argumentoj. Redonas NUL se la argumento ne estas dato.' },
        {
            type: 'node',
            node: hNodes.call(hNodes.refStdlib('ts_set'),
                hNodes.str('h'),
                hNodes.num(0),
                hNodes.ref('dato'),
                hNodes.num(5)),
        },
        { type: 'text', content: 'La horzono estas la UTC-horozna deŝovo en minutoj.' },
    ],
    ts_add: [{ type: 'text', content: 'Aldonas tempo-daŭron al tempindiko.' }],
    ts_sub: [{ type: 'text', content: 'Subtrahas tempo-daŭron de tempindiko.' }],
    ts_to_date: [{ type: 'text', content: 'Redonas la dato-parton de tempindiko.' }],
    ts_parse: [{ type: 'text', content: 'Konvertas tekston kiel “2022-05-18T13:44:02Z” al tempindiko.' }],
    ts_to_string: [{ type: 'text', content: 'Konvertas tempindikon al teksto kiel “2022-05-18T13:44:02Z”.' }],
    ts_fmt: [{ type: 'text', content: 'Formatigas tempindikon kiel homlegeblan tekston en Esperanto.' }],
    currency_fmt: [{ type: 'text', content: 'Formatigas monsumon en specifa valuto kiel homlegeblan tekston kiel “6,24 USD.” Atentu, ke la valoro ĉiam estu en plej malgranda valuto-unuo (ĉiam cendoj, krom por JPY).' }],
    country_fmt: [{ type: 'text', content: 'Redonas landonomon en Esperanto ricevinte landokodon.' }],
    phone_fmt: [{ type: 'text', content: 'Bele formatigas telefonnumeron en internacia formato ricevinte tekston kiel “+3112345678”.' }],
};

export const helpContent = {
    background: '#eee',
    foreground: 'black',
    highlight: [0.8, 0.5, 0.3, 1],
    title: 'Helpo',
    font: '500 16px ' + fontStack,

    default: [{
        type: 'text',
        content: 'Musumu super aŭ alklaku sur emfazita elemento por lerni pli.',
    }],
    'expr': [{ type: 'text', content: 'Eraro: malplena esprimo' }],
    'expr.u': [{
        type: 'text',
        content: 'NUL estas malĉeesto de valoro. Ĝi estas malsama ol la numero 0 aŭ malplena teksto.',
    }],
    'expr.b': [{
        type: 'text',
        content: 'Buleo estas vereca valoro: jes aŭ ne. Alklaku buleon por inversigi ĝin.',
    }],
    'expr.n': [{
        type: 'text',
        content: 'Nombro. Aklkaku nombron por redakti ĝian valoron.',
    }],
    'expr.s': [{
        type: 'text',
        content: 'Teksto. Alklaku tekston por redakti ĝian valoron. Eblas uzi la ++-funkcion',
    }, {
        type: 'node',
        node: hNodes.call(
            hNodes.refStdlib('++'),
            hNodes.str('valuto: '),
            hNodes.ref('valuto')),
    }, {
        type: 'text',
        content: 'por kombini tekston kun aliaj valoroj.',
    }],
    'expr.m': [{
        type: 'text',
        content: 'Matrrico konservas 2-dimensian tabelon de valoroj. Ĝi similas al kalkultabelo, sed sen enaj kalkuloj kaj sen kapa teksto.',
    }],
    'expr.r': [{
        type: 'text',
        content: 'Referenco estas referenco al la valoro de alia difino. Alklaku referencon por ŝanĝi kion ĝi referencas.',
    }],
    'expr.r.def': [{
        type: 'text',
        content: 'La nomo de referenco. Tiru la nomon por ekhavi novan referencon al tiu ĉi difino. La referenco reprezentos ĝian valoron.',
    }],
    'expr.l': [{
        type: 'text',
        content: 'Kreas 1-dimensian liston de valoroj.',
    }],
    'expr.f': [{
        type: 'text',
        content: 'Deklaras funkcion.',
    }],
    'expr.w': [{
        type: 'text',
        content: 'Ŝaltilo permesas al vi redoni specifan valoron surbaze de takso de eniga valoro.',
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
                content: `Tio ĉi estas alvoko al la funkcio ${expr.func.name}`,
            }];
        }
        return [];
    },
};
