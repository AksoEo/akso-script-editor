import { evaluate, analyze, NULL, BOOL, NUMBER, STRING, array, TypeVar, Timestamp } from '@tejo/akso-script';

const bareIdentRegex = /^([_a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ@][a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
const bareFormIdentRegexU = /(@[a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
const bareIdentRegexU = /([_a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ@][a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
const bareIdentRegexF = /^([_a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ@][a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9~!@#$%^&*_+\-=<>/'\\|]*)$/;
const infixIdentRegex = /^([+\-*/\\|~!@#$%^&=<>]+)/;
const infixIdentRegexU = /([+\-*/\\|~!@#$%^&=<>]+)/;
const infixIdentRegexF = /^([+\-*/\\|~!@#$%^&=<>]+)$/;
const numberRegex = /^(-?[0-9]+)(?:\.([0-9]+))?/;
const numberRegexU = /(-?[0-9]+)(?:\.([0-9]+))?/;
const OP_PREC = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['>=', '<=', '>', '<'],
    ['|'],
    ['&'],
    ['<<', '>>'],
    ['+', '-'],
    ['*', '/', '%'],
    ['^'],
];

const fontStack = '"Avenir Next", "Museo Sans", Roboto, "Helvetica Neue", Ubuntu, Cantarell, sans-serif';
const dateUnits = {
  days: 'tagoj',
  weeks: 'semajnoj',
  months: 'monatoj',
  years: 'jaroj'
};
const dateFields = {
  d: 'tago',
  M: 'monato',
  y: 'jaro'
};
const timestampFields = {
  s: 'sekundo',
  m: 'minuto',
  h: 'horo',
  d: 'tago',
  M: 'monato',
  y: 'jaro'
};
const timestampUnits = {
  s: 'sekundoj',
  m: 'minutoj',
  h: 'horoj',
  d: 'tagoj',
  w: 'semajnoj',
  M: 'monatoj',
  y: 'jaroj'
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
    background: [0.2, 0.2, 0.2, 1]
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
    stringHighlight: [0.1, 0.62, 0, 1],
    // dropdown hilight
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
    switchOtherwise: 'alie'
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
      deleteColorIdle: [0, 0, 0, 0.7]
    },
    tableExtension: {
      background: [0.3, 0.9, 0.1, 1],
      backgroundIdle: [0.9, 0.9, 0.9, 1],
      color: [0, 0, 0, 1],
      colorIdle: [0, 0, 0, 0.6]
    },
    cellTypes: {
      null: 'NUL',
      bool: 'buleo',
      number: 'nombro',
      string: 'teksto',
      matrix: 'matrico'
    },
    typeSwitch: {
      background: [0.9, 0.9, 0.9, 1],
      color: [0, 0, 0, 1],
      activeBackground: [0.3, 0.3, 0.3, 1],
      activeColor: [1, 1, 1, 1],
      paddingX: 8,
      paddingY: 4
    }
  },
  defs: {
    background: [0.9, 0.9, 0.9, 1],
    newDefName: n => `nova difino (${n})`
  },
  def: {
    cornerRadius: 12,
    padding: 8,
    background: [1, 1, 1, 1]
  },
  exprSlot: {
    weight: 2,
    hoverWeight: 4,
    stroke: [0.5, 0.5, 0.5, 0],
    emptyStroke: [0.5, 0.5, 0.5, 1],
    hoverStroke: [0.2, 0.2, 0.2, 1],
    background: [0, 0, 0, 0],
    hoverBackground: [0, 0, 0, 0.2]
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
      handle: 'M9.5,3 C9.5,2 10.3333333,1.5 12,1.5 C13.6666667,1.5 14.5,2 14.5,3'
    },
    can: {
      rect: 'M18.5,7.5 L18.5,20 C18.5,20.6903559 18.220178,21.3153559 17.767767,21.767767 C17.3153559,22.220178 16.6903559,22.5 16,22.5 L16,22.5 L8,22.5 C7.30964406,22.5 6.68464406,22.220178 6.23223305,21.767767 C5.77982203,21.3153559 5.5,20.6903559 5.5,20 L5.5,20 L5.5,7.5 L18.5,7.5 Z',
      lines: 'M13,10 L13,20 L11,20 L11,10 L13,10 Z M9,10 L9,20 L7,20 L7,10 L9,10 Z M17,10 L17,20 L15,20 L15,10 L17,10 Z'
    }
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
      pactiveOutline: [0.1, 0.9, 1, 1]
    },
    buttons: {
      code: 'Kodo',
      graph: 'Grafeo',
      test: '[[Test Mode]]',
      help: 'Helpo',
      dup: 'Kopii',
      undo: '[[Undo]]',
      redo: '[[Redo]]',
      save: 'Konservi'
    }
  },
  scrollbar: {
    margin: 2,
    size: 8,
    background: [0, 0, 0, 0.1],
    thumb: [0, 0, 0, 0.3],
    hoverThumb: [0, 0, 0, 0.5],
    minThumbSize: 16
  },
  library: {
    items: {
      primitives: {
        title: 'Fundamentaĵoj'
      },
      references: {
        title: 'Referencoj'
      },
      stdlib: {
        title: 'Baza biblioteko'
      },
      formVars: {
        title: 'Formulaj variabloj'
      }
    },
    background: [0.95, 0.95, 0.95, 1],
    sideTabs: {
      background: [0.6, 0.6, 0.6, 1],
      tab: [0.7, 0.7, 0.7, 1],
      activeTab: [0.95, 0.95, 0.95, 1]
    }
  },
  formVars: {
    defaultName: n => `form-var-${n}`,
    types: {
      u: 'NUL',
      b: 'buleo',
      n: 'nombro',
      s: 'teksto',
      m: 'matrico'
    },
    add: {
      label: 'Aldoni testvariablon',
      color: [0, 0, 0, 1],
      noColor: [0, 0, 0, 0],
      activeBackground: [0.5, 0.5, 0.5, 1]
    },
    remove: {
      color: [1, 1, 1, 1],
      background: [0.9, 0, 0.34, 1],
      activeBackground: [0.7, 0, 0.14, 1]
    },
    color: [0, 0, 0, 1],
    background: [0.8, 0.8, 0.8, 1],
    insetY: 4,
    insetX: 8
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
    exclamTop: 'M6.005,2.851 C6.082,1.816 6.946,1 8,1 C9.105,1 10,1.895 10,3 C10,3.711 9.736,4.406 9.388,5.298 C9.040,6.190 8.481,7.285 7.903,8.432 C7.737,8.762 7.397,9 7,9 C6.487,9 6.064,8.614 6.007,8.12 C5.949,7.620 5.930,3.886 6.005,2.851 Z'
  },
  stdlibCategories: {
    math: ['+', '-', '*', '/', '^', 'mod', 'floor', 'ceil', 'round', 'trunc', 'sign', 'abs'],
    logic: ['==', '!=', '>', '<', '>=', '<=', 'and', 'or', 'not', 'xor', 'id'],
    functor_stuff: ['++', 'map', 'flat_map', 'fold', 'fold1', 'filter', 'index', 'find_index', 'length', 'contains', 'head', 'tail', 'sort', 'sum', 'min', 'max', 'avg', 'med'],
    date_time: ['date_today', 'ts_now', 'date_get', 'date_set', 'ts_get', 'ts_set', 'date_sub', 'date_add', 'ts_add', 'ts_sub', 'ts_from_unix', 'ts_to_unix', 'ts_from_date', 'ts_to_date', 'ts_parse', 'ts_to_string', 'date_fmt', 'ts_fmt'],
    misc: ['currency_fmt', 'country_fmt', 'phone_fmt']
  },
  stdlibCategoryNames: {
    math: 'Matematiko',
    logic: 'Logiko',
    functor_stuff: 'Listoj',
    date_time: 'Dato kaj horo',
    misc: 'Aliaj'
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
    phone_fmt: 'formatigi telefonnumeron'
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
    phone_fmt: ['telefonnumero']
  },
  stdlibSlots: {
    date_sub: [{
      type: 'enum',
      variants: dateUnits
    }],
    date_add: [{
      type: 'enum',
      variants: dateUnits
    }],
    date_get: [{
      type: 'enum',
      variants: dateFields
    }],
    date_set: [{
      type: 'enum',
      variants: dateFields
    }],
    ts_add: [{
      type: 'enum',
      variants: timestampUnits
    }],
    ts_sub: [{
      type: 'enum',
      variants: timestampUnits
    }],
    ts_get: [{
      type: 'enum',
      variants: timestampFields
    }],
    ts_set: [{
      type: 'enum',
      variants: timestampFields
    }],
    currency_fmt: [{
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
        SGD: 'Singapuraj Dolaroj (SGD)'
      }
    }]
  }
};
const hNodes = {
  ref(name) {
    return {
      type: 'r',
      name,
      refNode: {
        type: 'ds',
        name,
        expr: {
          type: 'u'
        }
      }
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
          slots: config.stdlibSlots[name]
        },
        nameOverride: config.stdlibNames[name]
      }
    };
  },
  call(f, ...args) {
    return {
      type: 'c',
      func: f,
      args
    };
  },
  str(value) {
    return {
      type: 's',
      value
    };
  },
  bool(value) {
    return {
      type: 'b',
      value
    };
  },
  num(value) {
    return {
      type: 'n',
      value
    };
  },
  mat(value) {
    return {
      type: 'm',
      value
    };
  },
  list(...items) {
    return {
      type: 'l',
      items
    };
  }
};
const stdlibDocs = {
  '+': [{
    type: 'text',
    content: '[[Adds two numbers together. If the inputs aren’t numbers, it will return null.]]'
  }],
  '-': [{
    type: 'text',
    content: '[[Subtracts two numbers. If the inputs aren’t numbers, it will return null.]]'
  }],
  '*': [{
    type: 'text',
    content: '[[Multiplies two numbers. If the inputs aren’t numbers, it will return null.]]'
  }],
  '/': [{
    type: 'text',
    content: '[[Divides two numbers. If the inputs aren’t numbers, it will return null.]]'
  }],
  '^': [{
    type: 'text',
    content: '[[Computes the exponentiation of two numbers. If the inputs aren’t numbers, it will return null.]]'
  }],
  mod: [{
    type: 'text',
    content: '[[Returns the mathematical modulo of two numbers. If the inputs aren’t numbers, it will return null.]]'
  }],
  floor: [{
    type: 'text',
    content: '[[Returns the closest whole number towards -Infinity. If the input isn’t a number, it will return null.]]'
  }],
  ceil: [{
    type: 'text',
    content: '[[Returns the closest whole number towards +Infinity. If the input isn’t a number, it will return null.]]'
  }],
  round: [{
    type: 'text',
    content: '[[Returns the closest whole number. If the input isn’t a number, it will return null.]]'
  }],
  trunc: [{
    type: 'text',
    content: '[[Removes any fractional part of the number (e.g. 3.14 → 3, -3.14 → -3). If the input isn’t a number, it will return null.]]'
  }],
  sign: [{
    type: 'text',
    content: '[[Returns 1, 0, or -1 depending on whether the number is positive, zero, or negative. If the input isn’t a number, it will return null.]]'
  }],
  abs: [{
    type: 'text',
    content: '[[Returns the absolute value of a number, i.e. removing any negative signs. If the input isn’t a number, it will return null.]]'
  }],
  '==': [{
    type: 'text',
    content: '[[Compares two values. If they are the same, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[and otherwise]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  '!=': [{
    type: 'text',
    content: '[[Compares two values. If they are *not* the same, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[If they are the same, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  '>': [{
    type: 'text',
    content: '[[Compares two numbers. If the first is larger than the second, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[and otherwise]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  '<': [{
    type: 'text',
    content: '[[Compares two numbers. If the first is smaller than the second, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[and otherwise]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  '>=': [{
    type: 'text',
    content: '[[Compares two numbers. If the first is larger or equal to the second, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[and otherwise]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  '<=': [{
    type: 'text',
    content: '[[Compares two numbers. If the first is smaller or equal to the second, it will return]]'
  }, {
    type: 'node',
    node: hNodes.bool(true)
  }, {
    type: 'text',
    content: '[[and otherwise]]'
  }, {
    type: 'node',
    node: hNodes.bool(false)
  }],
  and: [{
    type: 'text',
    content: '[[Combines two booleans. Returns yes only if both are yes.]]'
  }, {
    type: 'text',
    content: 'yes, yes -> yes'
  }, {
    type: 'text',
    content: 'yes, no -> no'
  }, {
    type: 'text',
    content: 'no, yes -> no'
  }, {
    type: 'text',
    content: 'no, no -> no'
  }],
  or: [{
    type: 'text',
    content: '[[Combines two booleans. Returns yes if either is yes.]]'
  }, {
    type: 'text',
    content: 'yes, yes -> yes'
  }, {
    type: 'text',
    content: 'yes, no -> yes'
  }, {
    type: 'text',
    content: 'no, yes -> yes'
  }, {
    type: 'text',
    content: 'no, no -> no'
  }],
  not: [{
    type: 'text',
    content: '[[Inverts a boolean. Returns yes for no and no for yes.]]'
  }],
  xor: [{
    type: 'text',
    content: '[[Compares two booleans. Returns yes if they are different.]]'
  }, {
    type: 'text',
    content: 'yes, yes -> no'
  }, {
    type: 'text',
    content: 'no, yes -> yes'
  }, {
    type: 'text',
    content: 'yes, no -> yes'
  }, {
    type: 'text',
    content: 'no, no -> no'
  }],
  id: [{
    type: 'text',
    content: '[[Identity function: returns its input without doing anything.]]'
  }],
  '++': [{
    type: 'text',
    content: '[[Adds two lists or strings together. You can use this to combine values with text:]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('++'), hNodes.str('valuto: '), hNodes.ref('valuto'))
  }, {
    type: 'text',
    content: '[[or to combine lists or matrices:]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('++'), hNodes.mat([1, 2]), hNodes.list(hNodes.num(3)))
  }],
  map: [{
    type: 'text',
    content: '[[Applies a function on each element of an input. ??]]'
  }],
  flat_map: [{
    type: 'text',
    content: '[[Applies a function on each element of an input and combines the results into one list.]]'
  }],
  fold: [{
    type: 'text',
    content: '[[Reduces a list to one value. ??]]'
  }],
  fold1: [{
    type: 'text',
    content: '[[Reduces a list to one value. ??]]'
  }],
  filter: [{
    type: 'text',
    content: '[[Filters a list using a function. ??]]'
  }],
  index: [{
    type: 'text',
    content: '[[Returns a single item from a list, by index. Indices start at zero. For example, to get the second item of a list (5):]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('index'), hNodes.mat([3, 5]), hNodes.num(1))
  }],
  find_index: [{
    type: 'text',
    content: '[[Finds the index of an item in a list. Indices start at zero. For example:]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('find_index'), hNodes.mat([3, 5]), hNodes.num(3))
  }, {
    type: 'text',
    content: '[[The item 3 is the first item, so the index will be 0. For 5, the index would be 1. If the item it is looking for is not in the list, it will return null.]]'
  }],
  length: [{
    type: 'text',
    content: '[[Returns the length of a list or string.]]'
  }],
  contains: [{
    type: 'text',
    content: '[[Returns yes or no depending on whether the list contains the item.]]'
  }],
  head: [{
    type: 'text',
    content: '[[Returns the first N items of a list, or first N characters of a string.]]'
  }],
  tail: [{
    type: 'text',
    content: '[[Returns the last N items of a list, or last N characters of a tsring.]]'
  }],
  sort: [{
    type: 'text',
    content: '[[Sorts the list in ascending order.]]'
  }],
  sum: [{
    type: 'text',
    content: '[[Returns the sum of the input list.]]'
  }],
  min: [{
    type: 'text',
    content: '[[Returns the minimum value in the input list.]]'
  }],
  max: [{
    type: 'text',
    content: '[[Returns the maximum value in the input list.]]'
  }],
  avg: [{
    type: 'text',
    content: '[[Returns the arithmetic mean of the input list.]]'
  }],
  med: [{
    type: 'text',
    content: '[[Returns the median value of the input list.]]'
  }],
  date_sub: [{
    type: 'text',
    content: '[[Subtracts two dates and returns the difference in the desired unit. Returns null if the inputs aren’t dates.]]'
  }],
  date_add: [{
    type: 'text',
    content: '[[Adds a duration to a date.]]'
  }],
  date_today: [{
    type: 'text',
    content: '[[Returns today’s date, formatted as YYYY-MM-DD.]]'
  }],
  date_fmt: [{
    type: 'text',
    content: '[[Formats the date into a human-readable string in Esperanto.]]'
  }],
  date_get: [{
    type: 'text',
    content: '[[Returns the desired property of the input date, or null if the input is not a date.]]'
  }],
  date_set: [{
    type: 'text',
    content: '[[Returns a new date with the desired property changed, or returns null if the input is not a date.]]'
  }],
  ts_now: [{
    type: 'text',
    content: '[[Returns the current timestamp.]]'
  }],
  tz_utc: [{
    type: 'text',
    content: '[[Returns the UTC timezone offset in minutes (always 0).]]'
  }],
  tz_local: [{
    type: 'text',
    content: '[[Returns the local timezone offset in minutes from UTC.]]'
  }],
  ts_from_unix: [{
    type: 'text',
    content: '[[Converts a unix epoch time number to a timestamp.]]'
  }],
  ts_to_unix: [{
    type: 'text',
    content: '[[Converts a timestamp to a unix epoch time number.]]'
  }],
  ts_from_date: [{
    type: 'text',
    content: '[[Creates a timestamp from a date and a time.]]'
  }],
  ts_get: [{
    type: 'text',
    content: '[[Returns the desired property of the input timestamp.]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('ts_get'), hNodes.str('h'), hNodes.num(0), hNodes.ref('dato'))
  }, {
    type: 'text',
    content: '[[The time zone is the UTC offset in hours.]]'
  }],
  ts_set: [{
    type: 'text',
    content: '[[Returns a new timestamp with the desired property changed.]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('ts_set'), hNodes.str('h'), hNodes.num(0), hNodes.ref('dato'), hNodes.num(5))
  }, {
    type: 'text',
    content: '[[The time zone is the UTC offset in hours.]]'
  }],
  ts_add: [{
    type: 'text',
    content: '[[Adds a time quantity to a timestamp and returns the result.]]'
  }],
  ts_sub: [{
    type: 'text',
    content: '[[Subtracts a time quanitty from a timestamp and returns the result.]]'
  }],
  ts_to_date: [{
    type: 'text',
    content: '[[Returns the date portion of a timestam.]]'
  }],
  ts_parse: [{
    type: 'text',
    content: '[[Parses a timestamp from a string in a format like 2022-05-18T13:44:02Z]]'
  }],
  ts_to_string: [{
    type: 'text',
    content: '[[Converts a timestamp to a string in a format like 2022-05-18T13:44:02Z.]]'
  }],
  ts_fmt: [{
    type: 'text',
    content: '[[Formats a timestamp into a human-readable string in Esperanto.]]'
  }],
  currency_fmt: [{
    type: 'text',
    content: '[[Formats the currency value into a human-readable string like “6,24 USD.” Note that for all currencies except JPY, the input value must be in cents!]]'
  }],
  country_fmt: [{
    type: 'text',
    content: '[[Returns the country name, given a two-letter country code like NL.]]'
  }],
  phone_fmt: [{
    type: 'text',
    content: '[[Formats a phone-number with spacing, given input like +3112345678]]'
  }]
};
const helpContent = {
  background: '#eee',
  foreground: 'black',
  highlight: [0.8, 0.5, 0.3, 1],
  title: 'Helpo',
  font: '500 16px ' + fontStack,
  default: [{
    type: 'text',
    content: '[[Hover over or click a highlighted item to learn more.]]'
  }],
  'expr': [{
    type: 'text',
    content: '[[Error: empty expression]]'
  }],
  'expr.u': [{
    type: 'text',
    content: '[[A null expression represents the absence of a value.]]'
  }],
  'expr.b': [{
    type: 'text',
    content: '[[A boolean expression represents a truthfulness value: yes or no. Click to swap the value.]]'
  }],
  'expr.n': [{
    type: 'text',
    content: '[[A number. Click to edit the value.]]'
  }],
  'expr.s': [{
    type: 'text',
    content: '[[A piece of text. Click to edit the value. You can use the ++ function:]]'
  }, {
    type: 'node',
    node: hNodes.call(hNodes.refStdlib('++'), hNodes.str('valuto: '), hNodes.ref('valuto'))
  }, {
    type: 'text',
    content: '[[to combine text with other values.]]'
  }],
  'expr.m': [{
    type: 'text',
    content: '[[A matrix value stores a spreadsheet or something.]]'
  }],
  'expr.r': [{
    type: 'text',
    content: '[[A reference represents the value of another definition. Click to edit the name that this is referencing.]]'
  }],
  'expr.r.def': [{
    type: 'text',
    content: '[[The name of a definition. Drag this to get a new reference to this definition. The reference will represent its value.]]'
  }],
  'expr.l': [{
    type: 'text',
    content: '[[Creates a list of values. ??]]'
  }],
  'expr.f': [{
    type: 'text',
    content: '[[Declares a function.]]'
  }],
  'expr.w': [{
    type: 'text',
    content: '[[A switch allows you to evaluate to a different value depending on certain conditions.]]'
  }, {
    type: 'node',
    node: {
      type: 'w',
      matches: [{
        cond: hNodes.call(hNodes.refStdlib('=='), hNodes.ref('valuto'), hNodes.str('a')),
        value: hNodes.str('valuto 1')
      }, {
        cond: hNodes.call(hNodes.refStdlib('=='), hNodes.ref('valuto'), hNodes.str('b')),
        value: hNodes.str('valuto 2')
      }, {
        cond: null,
        value: hNodes.str('valuto 3')
      }]
    }
  }],
  'expr.c': expr => {
    if (expr.func.type === 'r' && expr.func.refNode?.isStdlib) {
      return stdlibDocs[expr.func.name];
    } else if (expr.func.type === 'r') {
      return [{
        type: 'text',
        content: `[[This is a call to the function ${expr.func.name}]]`
      }];
    }
    return [];
  }
};

//! # Editor model
//! - Defs: { type: 'd', defs: Set<Def> }
//! - Def: { type: 'ds', name: string, expr: Expr }
//! - Expr: union
//!    - Expr.Ref: { type: 'r', name: string }
//!    - Expr.Null: { type: 'u' }
//!    - Expr.Bool: { type: 'b', value: bool }
//!    - Expr.Number: { type: 'n', value: number }
//!    - Expr.String: { type: 's', value: string }
//!    - Expr.Matrix: { type: 'm', value: [any] }
//!    - Expr.List: { type: 'l', items: [Expr] }
//!    - Expr.Call: { type: 'c', func: Expr, args: [Expr] }
//!        - prefer Expr.Ref for func with a valid function reference
//!    - Expr.FnDef: { type: 'f', params: [string], body: Defs }
//!    - Expr.Switch: { type: 'w', matches: [{ cond: Expr?, value: Expr }] }
//!
//! ## Additional fields on all objects
//! - parent: object or nullish
const NODE_DEFS = 'd';
const NODE_DEF = 'ds';
const NODE_REF = 'r';
const NODE_NULL = 'u';
const NODE_BOOL = 'b';
const NODE_NUM = 'n';
const NODE_STR = 's';
const NODE_MAT = 'm';
const NODE_LIST = 'l';
const NODE_CALL = 'c';
const NODE_FNDEF = 'f';
const NODE_SWITCH = 'w';
const NODE_FUNC_PARAM = 'fp';
const NODE_DEF_EXT = 'ds-ext';
const FORM_VAR = 'form-var'; // form var ref sentinel value
function createContext() {
    const mutationListeners = [];
    const startMutListeners = [];
    const flushListeners = [];
    const extMutationListeners = [];
    const fvMutationListeners = [];
    const ctx = {
        onMutation: listener => mutationListeners.push(listener),
        notifyMutation: node => {
            for (const listener of mutationListeners) {
                try {
                    listener(node);
                }
                catch (err) {
                    console.error(err);
                }
            }
        },
        externalDefs: [],
        externalRefs: new Set(),
        _prevExternalRefs: new Set(),
        onExternalDefsMutation: listener => extMutationListeners.push(listener),
        notifyExternalDefsMutation: () => {
            ctx.startMutation();
            for (const ref of ctx.externalRefs)
                ctx.notifyMutation(ref.source);
            // we also need to notify anything that isn't an ext ref anymore
            for (const ref of ctx._prevExternalRefs)
                ctx.notifyMutation(ref.source);
            ctx._prevExternalRefs = ctx.externalRefs;
            ctx.flushMutation();
            for (const listener of extMutationListeners) {
                try {
                    listener();
                }
                catch (err) {
                    console.error(err);
                }
            }
        },
        formVars: [],
        formVarRefs: new Set(),
        onFormVarsMutation: listener => fvMutationListeners.push(listener),
        notifyFormVarsMutation: () => {
            ctx.startMutation();
            for (const ref of ctx.formVarRefs)
                ctx.notifyMutation(ref.source);
            ctx.flushMutation();
            for (const listener of fvMutationListeners) {
                try {
                    listener();
                }
                catch (err) {
                    console.error(err);
                }
            }
        },
        onStartMutation: listener => startMutListeners.push(listener),
        onFlushMutation: listener => flushListeners.push(listener),
        startMutation: () => {
            for (const listener of startMutListeners) {
                try {
                    listener();
                }
                catch (err) {
                    console.error(err);
                }
            }
        },
        flushMutation: () => {
            for (const listener of flushListeners) {
                try {
                    listener();
                }
                catch (err) {
                    console.error(err);
                }
            }
        },
    };
    return ctx;
}
function makeRef(name, ctx) {
    return { ctx, parent: null, type: NODE_REF, name };
}
function cloneExprObject(expr) {
    if (typeof expr !== 'object')
        return expr;
    if (expr.type === NODE_CALL) {
        return {
            ctx: expr.ctx,
            parent: null,
            type: NODE_CALL,
            func: cloneExprObject(expr.func),
            args: expr.args.map(cloneExprObject),
        };
    }
    else if (expr.type === NODE_FNDEF) {
        // FIXME: body needs to be cloned too
        return {
            ctx: expr.ctx,
            parent: null,
            type: NODE_FNDEF,
            params: [...expr.params],
            body: expr.body,
        };
    }
    else if (expr.type === NODE_SWITCH) {
        return {
            ctx: expr.ctx,
            parent: null,
            type: NODE_SWITCH,
            matches: expr.matches.map(match => {
                let cond = null;
                if ('cond' in match)
                    cond = cloneExprObject(match.cond);
                const value = cloneExprObject(match.value);
                return { cond, value };
            }),
        };
    }
    else if (expr.type === NODE_LIST) {
        return {
            ctx: expr.ctx,
            parent: null,
            type: NODE_LIST,
            items: expr.items.map(cloneExprObject),
        };
    }
    else if (expr.type === NODE_MAT) {
        const cloneMatrix = o => {
            if (Array.isArray(o))
                return o.map(cloneMatrix);
            else
                return o;
        };
        return {
            ctx: expr.ctx,
            parent: null,
            type: NODE_MAT,
            value: cloneMatrix(expr.value),
        };
    }
    else
        return { ...expr };
}
/// Converts raw defs to editor defs.
function fromRawDefs(defs, ctx) {
    // mapping from definition names to exprs
    const defMapping = new Map();
    // cache mapping _defs to objects
    const subexprCache = new Map();
    // locks to prevent infinite recursion when resolving _defs
    const subexprLocks = new Set();
    // _defs that needed to be turned into actual user-visible defs. contains their new name
    const elevatedSubExprs = new Map();
    // resolves references in expressions
    // this is evaluated lazily because we would need to toposort _def declarations otherwise
    const resolveExpr = (name, forceRef = false) => {
        if (!name.startsWith('_')) {
            // this is a regular old reference
            return makeRef(name, ctx);
        }
        if (subexprCache.has(name))
            return cloneExprObject(subexprCache.get(name));
        if (subexprLocks.has(name) || !defs[name] || forceRef) {
            // EITHER a)
            // cycle!! oh no
            // simply turn this into a real definition to solve this dependency cycle
            // OR b)
            // broken reference!! oh no
            // simply turn this into a reference and let the user deal with it
            // we can arbitrarily rename it not to contain underscores because it doesn’t exist
            // anyway
            // OR c)
            // we need this thing to be a reference instead of an expression
            //
            // (this code currently works for all cases but does not have the same semantics
            // in each case, so watch out when refactoring!)
            let resolvedName = '';
            // FIXME: we need to check the parent scope for collisions too
            let realName = name.replace(/^_+/, ''); // name without leading underscore(s)
            if (!realName)
                realName = 'a';
            for (let i = 0; i < 10; i++) {
                // try adding ' until it's not taken
                const tryName = realName + '\''.repeat(i);
                if (!defMapping.has(tryName)) {
                    resolvedName = tryName;
                    break;
                }
            }
            while (!resolvedName) {
                // when all that has failed, just pick something random
                resolvedName = 'a' + Math.random().toString();
                if (defMapping.has(resolvedName))
                    resolvedName = '';
            }
            // we only return the resolved ref object here; inserting into defMapping
            // is handled below by the lock owner
            elevatedSubExprs.set(name, resolvedName);
            const ref = makeRef(resolvedName, ctx);
            subexprCache.set(name, ref);
            return ref;
        }
        subexprLocks.add(name);
        const expr = fromRawExpr(defs[name], resolveExpr, ctx);
        subexprLocks.delete(name);
        if (elevatedSubExprs.has(name)) {
            // this expr needs to be turned into a real definition due to a dependency cycle
            const newName = elevatedSubExprs.get(name);
            defMapping.set(newName, expr);
            // return a ref instead
            const ref = makeRef(newName, ctx);
            subexprCache.set(name, ref);
            return ref;
        }
        subexprCache.set(name, expr);
        return expr;
    };
    for (const name in defs) {
        if (name.startsWith('_'))
            continue; // skip definitions that arent real
        defMapping.set(name, fromRawExpr(defs[name], resolveExpr, ctx));
    }
    const output = {
        ctx,
        type: 'd',
        defs: new Set(),
        floatingExpr: new Set(),
        parent: null,
    };
    for (const [k, v] of defMapping) {
        const def = {
            ctx,
            type: 'ds',
            name: k,
            expr: v,
            parent: output,
        };
        v.parent = def;
        output.defs.add(def);
    }
    return output;
}
function fromRawExpr(expr, resolveExpr, ctx) {
    if (expr.t === 'u') {
        return { ctx, parent: null, type: 'u' };
    }
    else if (expr.t === 'b') {
        return { ctx, parent: null, type: 'b', value: expr.v };
    }
    else if (expr.t === 'n') {
        return { ctx, parent: null, type: 'n', value: expr.v };
    }
    else if (expr.t === 's') {
        return { ctx, parent: null, type: 's', value: expr.v };
    }
    else if (expr.t === 'm') {
        return { ctx, parent: null, type: 'm', value: expr.v };
    }
    else if (expr.t === 'l') {
        const list = {
            ctx,
            parent: null,
            type: 'l',
            items: expr.v.map(x => resolveExpr(x)),
        };
        for (const item of list.items)
            item.parent = list;
        return list;
    }
    else if (expr.t === 'c') {
        if (!expr.a || !expr.a.length) {
            // no arguments--this is simply a reference
            return resolveExpr(expr.f);
        }
        const call = {
            ctx,
            parent: null,
            type: 'c',
            func: resolveExpr(expr.f, true),
            args: expr.a.map(x => resolveExpr(x)),
        };
        call.func.parent = call;
        for (const arg of call.args)
            arg.parent = call;
        return call;
    }
    else if (expr.t === 'f') {
        const defs = fromRawDefs(expr.b, ctx);
        const func = {
            ctx,
            parent: null,
            type: 'f',
            params: expr.p,
            body: defs,
        };
        func.body.parent = func;
        return func;
    }
    else if (expr.t === 'w') {
        const sw = {
            ctx,
            parent: null,
            type: 'w',
            matches: [],
        };
        for (const match of expr.m) {
            const cond = match.c ? resolveExpr(match.c) : null;
            const value = resolveExpr(match.v);
            if (cond)
                cond.parent = sw;
            value.parent = sw;
            sw.matches.push({ cond, value });
        }
        return sw;
    }
    else {
        throw new Error(`unknown expression type ${expr.t}`);
    }
}
function toRawDefs(defs) {
    let idCounter = 0;
    // Returns a new _def identifier
    const getIdent = () => {
        return `_${idCounter++}`;
    };
    const output = {};
    // creates an auxiliary definition and returns its name
    const makeAux = (def) => {
        const id = getIdent();
        output[id] = def;
        return id;
    };
    for (const def of defs.defs) {
        output[def.name] = toRawExpr(def.expr, makeAux);
    }
    return output;
}
/// Tries to turn an expr into a string if it’s a ref, and creates an auxiliary definition
/// otherwise.
function stringifyRef(expr, makeAux) {
    if (!expr)
        return makeAux({ t: 'u' });
    if (expr.type === 'r')
        return expr.name;
    else
        return makeAux(toRawExpr(expr, makeAux));
}
function toRawExpr(expr, makeAux) {
    if (!expr)
        return { t: 'u' };
    if (expr.type === 'r') {
        // we can't call directly in case it's a function, so we pass it through id
        return { t: 'c', f: 'id', a: [stringifyRef(expr, makeAux)] };
    }
    else if (expr.type === 'u') {
        return { t: 'u' };
    }
    else if (expr.type === 'b') {
        return { t: 'b', v: expr.value };
    }
    else if (expr.type === 'n') {
        return { t: 'n', v: expr.value };
    }
    else if (expr.type === 's') {
        return { t: 's', v: expr.value };
    }
    else if (expr.type === 'm') {
        return { t: 'm', v: expr.value };
    }
    else if (expr.type === 'l') {
        return { t: 'l', v: expr.items.map(e => stringifyRef(e, makeAux)) };
    }
    else if (expr.type === 'c') {
        const args = [...expr.args];
        // drop any trailing null refs
        for (let i = args.length - 1; i >= 0; i--) {
            if (!args[i])
                args.pop();
            else
                break;
        }
        return {
            t: 'c',
            f: stringifyRef(expr.func, makeAux),
            a: args.map(e => stringifyRef(e, makeAux)),
        };
    }
    else if (expr.type === 'f') {
        return {
            t: 'f',
            p: expr.params,
            b: toRawDefs(expr.body),
        };
    }
    else if (expr.type === 'w') {
        return {
            t: 'w',
            m: expr.matches.map(({ cond, value }) => {
                const c = cond ? stringifyRef(cond, makeAux) : null;
                const v = stringifyRef(value, makeAux);
                return { c, v };
            }),
        };
    }
    else
        throw new Error('invalid internal repr');
}
/// Removes a node from its parent.
///
/// Returns an object that can undo the removal, assuming nothing else was mutated.
function remove(node) {
    const parent = node.parent;
    if (!parent)
        return;
    let innerUndo;
    if (parent.type === 'd') {
        if (node.type !== 'ds')
            throw new Error('internal inconsistency: expected defs child to be a def');
        if (!parent.defs.has(node))
            throw new Error('internal inconsistency: expected parent defs to contain self');
        parent.defs.delete(node);
        innerUndo = () => parent.defs.add(node);
    }
    else if (parent.type === 'ds') {
        if (parent.expr !== node)
            throw new Error('internal inconsistency: expected expr in parent def to be self');
        parent.expr = null;
        innerUndo = () => parent.expr = node;
    }
    else if (parent.type === 'l') {
        const expr = node;
        const index = parent.items.indexOf(expr);
        if (index === -1)
            throw new Error('internal inconsistency: expected parent list to contain self');
        parent.items.splice(index, 1);
        innerUndo = () => parent.items.splice(index, 0, expr);
    }
    else if (parent.type === 'c') {
        const expr = node;
        if (parent.func === expr) {
            parent.func = null;
            innerUndo = () => parent.func = expr;
        }
        else {
            const index = parent.args.indexOf(expr);
            if (index === -1)
                throw new Error('internal inconsistency: expected parent call to contain self');
            parent.args[index] = null;
            innerUndo = () => parent.args[index] = expr;
        }
    }
    else if (parent.type === 'f') {
        if (parent.body !== node)
            throw new Error('internal inconsistency: expected body in parent func to be self');
        parent.body = null;
        innerUndo = () => parent.body = node;
    }
    else if (parent.type === 'w') {
        for (const m of parent.matches) {
            if (m.cond === node) {
                m.cond = null;
                innerUndo = () => m.cond = node;
            }
            else if (m.value === node) {
                m.value = null;
                innerUndo = () => m.value = node;
            }
        }
    }
    node.parent = null;
    node.ctx.startMutation();
    node.ctx.notifyMutation(parent);
    node.ctx.notifyMutation(node);
    node.ctx.flushMutation();
    return {
        undo: () => {
            innerUndo();
            node.parent = parent;
            node.ctx.startMutation();
            node.ctx.notifyMutation(parent);
            node.ctx.notifyMutation(node);
            node.ctx.flushMutation();
        },
    };
}
function makeStdRefs() {
    const refs = new Map();
    for (const category in config.stdlibCategories) {
        const items = config.stdlibCategories[category];
        for (const name of items) {
            const nameOverride = config.stdlibNames[name] || null;
            const args = config.stdlibArgs[name] || [];
            const infix = !!name.match(infixIdentRegexF);
            refs.set(name, {
                type: 'ds',
                name,
                isStdlib: true,
                nameOverride,
                expr: {
                    type: 'f',
                    params: args,
                    body: {},
                    slots: config.stdlibSlots[name],
                    infix,
                },
            });
        }
    }
    return refs;
}
/// Resolves refs in defs.
function resolveRefs(defs, reducing = false, parentScope) {
    const ctx = defs.ctx;
    if (!parentScope) {
        // if there's no parent scope, we'll use the standard library
        parentScope = makeStdRefs();
    }
    // an index of def name -> def object
    const defIndex = new Map(parentScope);
    for (const def of defs.defs) {
        defIndex.set(def.name, def);
    }
    const reverseRefs = new Map();
    const externalDefs = new Set();
    for (const defs of ctx.externalDefs) {
        for (const def in defs) {
            if (typeof def !== 'string' || def.startsWith('_'))
                continue;
            const defObj = { ctx, parent: null, type: NODE_DEF_EXT, isExternal: true };
            defIndex.set(def, defObj);
            externalDefs.add(defObj);
        }
    }
    for (const def of defs.defs) {
        const refs = new Set();
        resolveRefsInExpr(def.expr, reducing, defIndex, refs);
        def.references = refs;
        def.referencedBy = new Set();
        for (const ref of refs) {
            const { target, expr, ...etc } = ref;
            if (!reverseRefs.has(target))
                reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def, source: expr, ...etc });
        }
    }
    for (const expr of defs.floatingExpr) {
        const refs = new Set();
        resolveRefsInExpr(expr, reducing, defIndex, refs);
        expr.references = refs;
        for (const ref of refs) {
            const { target, expr, ...etc } = ref;
            if (!reverseRefs.has(target))
                reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def: null, source: expr, ...etc });
        }
    }
    // find all references to external defs
    ctx.externalRefs = new Set();
    for (const def of externalDefs) {
        const refs = reverseRefs.get(def);
        if (refs)
            for (const ref of refs)
                ctx.externalRefs.add(ref);
    }
    // single out refs to special FORM_VAR value
    ctx.formVarRefs = reverseRefs.get(FORM_VAR) || new Set();
    reverseRefs.delete(FORM_VAR);
    for (const [def, refs] of reverseRefs) {
        def.referencedBy = refs;
    }
}
/// Resolves refs in the given expression, recursively
function resolveRefsInExpr(expr, reducing, defs, refs, source = expr) {
    var _a;
    if (!expr)
        return;
    if (expr.type === 'r') {
        // this is a ref!
        if (expr.name.startsWith('@')) {
            // this is a form var ref
            // ONLY add a reverse ref
            refs.add({ target: FORM_VAR, name: expr.name, expr: source });
        }
        else {
            // this is a regular ref
            expr.refNode = defs.get(expr.name);
            if (expr.refNode)
                refs.add({ target: expr.refNode, expr: source });
        }
    }
    else if (expr.type === 'l') {
        for (const item of expr.items) {
            resolveRefsInExpr(item, reducing, defs, refs);
        }
    }
    else if (expr.type === 'c') {
        resolveRefsInExpr(expr.func, reducing, defs, refs, expr);
        for (const arg of expr.args) {
            resolveRefsInExpr(arg, reducing, defs, refs);
        }
        if (reducing
            && expr.func.type === NODE_REF
            && ((_a = expr.func.refNode) === null || _a === void 0 ? void 0 : _a.type) === NODE_DEF
            && expr.func.refNode.isStdlib
            && expr.func.refNode.name === 'id') {
            // identity function!
            if (expr.args.length === 1) {
                // if there's just one argument id doesn't actually do anything
                const inner = expr.args[0];
                expr.func = null;
                expr.args = null;
                const exprParent = expr.parent;
                Object.assign(expr, inner);
                expr.parent = exprParent;
            }
        }
    }
    else if (expr.type === 'f') {
        const bodyScope = new Map(defs);
        for (const param of expr.params) {
            bodyScope.set(param, {
                ctx: expr.ctx,
                parent: expr,
                type: NODE_FUNC_PARAM,
                name: param,
            });
        }
        resolveRefs(expr.body, reducing, bodyScope);
    }
    else if (expr.type === 'w') {
        for (const m of expr.matches) {
            resolveRefsInExpr(m.cond, reducing, defs, refs);
            resolveRefsInExpr(m.value, reducing, defs, refs);
        }
    }
}
function evalExpr(expr) {
    if (!expr || !expr.parent)
        return;
    let def = expr;
    while (def) {
        if (def.type === 'ds') {
            break;
        }
        if (def.parent === def)
            throw new Error('cycle');
        def = def.parent;
    }
    if (!def)
        return; // no def?
    const defs = def.parent;
    if (!defs)
        return; // no defs
    const rawDefs = toRawDefs(defs);
    const rawExpr = toRawExpr(expr, def => {
        const rid = Symbol();
        rawDefs[rid] = def;
        return rid;
    });
    const out = Symbol();
    rawDefs[out] = rawExpr;
    let invocations = 0;
    let result = undefined;
    try {
        result = evaluate(expr.ctx.externalDefs.concat([rawDefs]), out, id => {
            for (const fv of expr.ctx.formVars) {
                if (fv.name === id) {
                    return fv.value;
                }
            }
            return null;
        }, {
            shouldHalt: () => {
                invocations++;
                if (invocations > config.maxEvalIterations)
                    return true;
            },
        });
    }
    catch (err) {
        console.debug(err);
    }
    let analysis = null;
    try {
        analysis = analyze(expr.ctx.externalDefs.concat(rawDefs), out, id => {
            for (const fv of expr.ctx.formVars) {
                if (fv.name === id) {
                    if (fv.type === 'u')
                        return NULL;
                    if (fv.type === 'b')
                        return BOOL;
                    if (fv.type === 'n')
                        return NUMBER;
                    if (fv.type === 's')
                        return STRING;
                    if (fv.type === 'm')
                        return array(new TypeVar());
                    if (fv.type === 'timestamp')
                        return Timestamp;
                }
            }
        });
    }
    catch (err) {
        console.debug(err);
        return null;
    }
    return {
        result,
        analysis,
    };
}
function cloneWithContext(node, ctx, clearParents) {
    if (!node || !('type' in node))
        return null;
    if (node.type === NODE_NULL) {
        return {
            type: node.type,
            parent: null,
            ctx,
        };
    }
    else if (node.type === NODE_BOOL
        || node.type === NODE_NUM
        || node.type === NODE_STR
        || node.type === NODE_MAT) {
        return {
            type: node.type,
            ctx,
            parent: null,
            value: node.value,
        };
    }
    else if (node.type === NODE_LIST) {
        const expr = {
            type: node.type,
            parent: null,
            ctx,
            items: node.items.map(item => cloneWithContext(item, ctx, clearParents)),
        };
        if (!clearParents) {
            for (const item of expr.items)
                item.parent = expr;
        }
        return expr;
    }
    else if (node.type === NODE_CALL) {
        const expr = {
            type: node.type,
            parent: null,
            ctx,
            func: cloneWithContext(node.func, ctx, clearParents),
            args: node.args.map(item => cloneWithContext(item, ctx, clearParents)),
        };
        if (!clearParents) {
            if (expr.func)
                expr.func.parent = expr;
            for (const arg of expr.args)
                arg.parent = expr;
        }
        return expr;
    }
    else if (node.type === NODE_SWITCH) {
        const expr = {
            type: node.type,
            parent: null,
            ctx,
            matches: node.matches.map(({ cond, value }) => {
                return {
                    cond: cond ? cloneWithContext(cond, ctx, clearParents) : cond,
                    value: cloneWithContext(value, ctx, clearParents),
                };
            }),
        };
        if (!clearParents) {
            for (const m of expr.matches) {
                if (m.cond)
                    m.cond.parent = expr;
                m.value.parent = expr;
            }
        }
        return expr;
    }
    else if (node.type === NODE_REF) {
        return {
            type: node.type,
            parent: null,
            ctx,
            name: node.name,
        };
    }
    else if (node.type === NODE_FNDEF) {
        const expr = {
            type: node.type,
            parent: null,
            ctx,
            params: node.params,
            body: cloneWithContext(node.body, ctx, clearParents),
        };
        if (!clearParents && expr.body)
            expr.body.parent = expr;
        return expr;
    }
    else if (node.type === NODE_DEF) {
        const def = {
            type: node.type,
            parent: null,
            ctx,
            name: node.name,
            expr: cloneWithContext(node.expr, ctx, clearParents),
        };
        if (!clearParents && def.expr)
            def.expr.parent = def;
        return def;
    }
    else if (node.type === NODE_DEFS) {
        const defs = {
            type: node.type,
            parent: null,
            ctx,
            defs: new Set([...node.defs].map(item => cloneWithContext(item, ctx, clearParents))),
            floatingExpr: new Set([...node.floatingExpr].map(item => cloneWithContext(item, ctx, clearParents))),
        };
        if (!clearParents) {
            for (const def of defs.defs)
                def.parent = defs;
            for (const expr of defs.floatingExpr)
                expr.parent = defs;
        }
        return defs;
    }
}

var model = /*#__PURE__*/Object.freeze({
    __proto__: null,
    NODE_DEFS: NODE_DEFS,
    NODE_DEF: NODE_DEF,
    NODE_REF: NODE_REF,
    NODE_NULL: NODE_NULL,
    NODE_BOOL: NODE_BOOL,
    NODE_NUM: NODE_NUM,
    NODE_STR: NODE_STR,
    NODE_MAT: NODE_MAT,
    NODE_LIST: NODE_LIST,
    NODE_CALL: NODE_CALL,
    NODE_FNDEF: NODE_FNDEF,
    NODE_SWITCH: NODE_SWITCH,
    NODE_FUNC_PARAM: NODE_FUNC_PARAM,
    NODE_DEF_EXT: NODE_DEF_EXT,
    createContext: createContext,
    makeRef: makeRef,
    fromRawDefs: fromRawDefs,
    fromRawExpr: fromRawExpr,
    toRawDefs: toRawDefs,
    toRawExpr: toRawExpr,
    remove: remove,
    makeStdRefs: makeStdRefs,
    resolveRefs: resolveRefs,
    evalExpr: evalExpr,
    cloneWithContext: cloneWithContext
});

//! Parser combinators.
class EOFError extends Error {
}
const cat = (...parsers) => (str) => parsers.map(parser => parser(str));
const tag = (tag, desc = 'tag') => (str) => {
    for (const c of tag) {
        const d = str.next();
        if (d !== c)
            str.throw(`failed to parse ${desc}: unexpected ${d}, expected ${c}`);
    }
    return tag;
};
const wrap = (left, right, inner, desc = 'token') => (str) => {
    const start = str.next();
    if (start !== left)
        str.throw(`failed to parse ${desc}: unexpected ${start}, expected ${left}`);
    const data = inner(str);
    const end = str.next();
    if (end !== right)
        str.throw(`failed to parse ${desc}: unexpected ${end}, expected ${right}`);
    return data;
};
const oneOf = (...parsers) => (str) => {
    for (const parser of parsers) {
        try {
            const s = str.clone();
            const result = parser(s);
            str.copyFrom(s);
            return result;
        }
        catch (err) {
            // save error and try the next one
            str.addErrorToCurrentPos(err);
        }
    }
    str.throw(str.getCurrentError('empty oneOf'));
};
const prefixMatch = (...prefixes) => (str) => {
    for (const [prefix, parser] of prefixes) {
        if (!prefix || str.peek() === prefix) {
            return parser(str);
        }
    }
    str.throw(str.getCurrentError('no prefix matched'));
};
const takeUntil = (parser) => (str) => {
    let contents = '';
    while (true) {
        try {
            const s = str.clone();
            parser(s);
            break;
        }
        catch (err) {
            if (err instanceof EOFError)
                throw err;
            str.addErrorToCurrentPos(err);
        }
        contents += str.next();
    }
    return contents;
};
const map = (parser, morph) => (str) => {
    const result = parser(str);
    return morph(result, str);
};
const regex = (re, desc = 'regex') => (str) => {
    const match = str.regexMatch(re);
    if (!match) {
        const peek = str.eof() ? '<EOF>' : str.peek();
        str.throw(`unexpected ${peek}, expected match for ${desc} (${re})`);
    }
    for (let i = 0; i < match[0].length; i++)
        str.next();
    return match;
};
const opt = (parser) => (str) => {
    try {
        const s = str.clone();
        const res = parser(s);
        str.copyFrom(s);
        return [res];
    }
    catch (err) {
        str.addErrorToCurrentPos(err);
        return [];
    }
};
const match = (pred, desc = 'predicate match') => (str) => {
    const s = str.next();
    if (!(pred(s)))
        str.throw(`unexpected ${s}, expected ${desc}`);
    return s;
};
const many = (parser) => (str) => {
    const items = [];
    while (true) {
        try {
            const s = str.clone();
            items.push(parser(s));
            str.copyFrom(s);
        }
        catch (err) {
            str.addErrorToCurrentPos(err);
            break;
        }
    }
    return items;
};
const not = (notParser, parser, desc = 'token') => (str) => {
    try {
        notParser(str.clone());
    }
    catch {
        return parser(str);
    }
    str.throw(`unexpected ${desc}`);
};

class StrCursor {
    constructor(str) {
        this.str = str;
        this.pos = 0;
        this.errors = [];
    }
    getPos() {
        return this.pos.toString();
    }
    peek() {
        if (this.eof())
            throw new EOFError(`unexpected EOF`);
        return this.str[this.pos];
    }
    next() {
        const c = this.peek();
        this.pos++;
        this.errors = [];
        return c;
    }
    clone() {
        const cursor = new StrCursor(this.str);
        cursor.pos = this.pos;
        cursor.errors = this.errors;
        return cursor;
    }
    copyFrom(str) {
        this.str = str.str;
        this.pos = str.pos;
        this.errors = str.errors;
    }
    eof() {
        return this.pos === this.str.length;
    }
    regexMatch(re) {
        return this.str.substr(this.pos).match(re);
    }
    addErrorToCurrentPos(err) {
        this.errors.push(err);
    }
    getCurrentError(fallback = 'unknown error') {
        if (this.errors.length) {
            return new LexError(this.errors);
        }
        return new LexError(fallback);
    }
    throw(msg) {
        if (typeof msg === 'string')
            throw new LexError(msg);
        else
            throw msg;
    }
}
class LexError {
    constructor(msgOrErrs) {
        this.contents = msgOrErrs;
    }
    toString() {
        if (typeof this.contents === 'string') {
            return this.contents;
        }
        else {
            return this.contents.map(x => x.toString()).join('\n');
        }
    }
    valueOf() {
        return `[LexError ${this.toString()}]`;
    }
    getSpan() {
        if (this.span)
            return this.span;
        if (Array.isArray(this.contents)) {
            for (const c of this.contents) {
                const s = c.getSpan();
                if (s)
                    return s;
            }
        }
        return null;
    }
}
class Token {
    constructor() {
        this.span = null;
    }
    valueOf() {
        return this.toString();
    }
}
class IdentToken extends Token {
    constructor(ident, isRaw = false) {
        super();
        this.ident = ident;
        this.isRaw = isRaw;
    }
    toString() {
        return `ident(${this.ident}${this.isRaw ? ' (raw)' : ''})`;
    }
}
class InfixToken extends IdentToken {
    toString() {
        return `infix(${this.ident})`;
    }
}
class NumberToken extends Token {
    constructor(int, frac) {
        super();
        this.int = int;
        this.frac = frac;
    }
    toString() {
        return `number(${this.int}.${this.frac})`;
    }
}
class BoolToken extends Token {
    constructor(value) {
        super();
        this.value = value;
    }
    toString() {
        return `bool(${this.value})`;
    }
}
class NullToken extends Token {
    toString() {
        return `null`;
    }
}
class WhitespaceToken extends Token {
}
class SpaceToken extends WhitespaceToken {
    toString() {
        return `·`;
    }
}
class BreakToken extends WhitespaceToken {
    toString() {
        return `⏎`;
    }
}
class StringToken extends Token {
    constructor(contents) {
        super();
        this.contents = contents;
    }
    toString() {
        return `"${this.contents.substr(0, 50)}"`;
    }
}
class DelimToken extends Token {
    toString() {
        return `,`;
    }
}
class ContainerToken extends Token {
    constructor(contents) {
        super();
        this.contents = contents;
    }
}
class BracketsToken extends ContainerToken {
    toString() {
        return `[ ${this.contents.join('')} ]`;
    }
}
class BracesToken extends ContainerToken {
    toString() {
        return `{ ${this.contents.join('')} }`;
    }
}
class ParensToken extends ContainerToken {
    toString() {
        return `( ${this.contents.join('')} )`;
    }
}
class IndentToken extends ContainerToken {
    toString() {
        return `⇥{ ${this.contents.join('')} }`;
    }
}
const spanned = parser => (str) => {
    const start = str.pos;
    try {
        const item = parser(str);
        const end = str.pos;
        item.span = [start, end];
        return item;
    }
    catch (err) {
        const err2 = err instanceof LexError ? err : new LexError(err);
        err2.span = [start, str.pos];
        throw err2;
    }
};
const xtag = (t, desc) => {
    const u = tag(t, desc);
    return (str) => {
        const tm = u(str);
        if (!str.eof()) {
            const bareMatch = (t + str.peek()).match(bareIdentRegex);
            if (bareMatch[0].length === t.length + 1) {
                throw new LexError(`unexpected ${str.peek()}, expected non-identifier symbol`);
            }
        }
        return tm;
    };
};
const rawIdentInner = (str) => {
    let hashes = 0;
    let c;
    while ((c = str.peek())) {
        if (c !== '#')
            break;
        hashes++;
        str.next();
    }
    if (str.next() !== '"')
        throw new LexError(`expected " at beginning of raw ident`);
    const closeTag = '"' + '#'.repeat(hashes + 1);
    const contents = takeUntil(tag(closeTag, 'raw ident close tag'))(str);
    for (let i = 0; i < closeTag.length; i++)
        str.next();
    return contents;
};
const rawIdent = spanned(map(cat(tag('r#', 'raw ident start tag'), rawIdentInner), (a) => new IdentToken(a[1], true)));
const bareIdent = spanned(map(regex(bareIdentRegex, 'bare ident'), match => new IdentToken(match[1])));
const ident = oneOf(rawIdent, bareIdent);
const infixIdent = spanned(map(regex(infixIdentRegex, 'infix ident'), match => new InfixToken(match[1])));
const number = spanned(map(regex(numberRegex, 'number'), match => new NumberToken(match[1], match[2] || '')));
const bool = spanned(map(oneOf(xtag('yes'), xtag('no'), xtag('true'), xtag('false')), token => new BoolToken(token === 'yes' || token === 'true')));
const nul = spanned(map(xtag('null'), () => new NullToken()));
const ws = spanned(map(regex(/^(\s+)/, 'whitespace'), match => match[1].includes('\n') ? new BreakToken() : new SpaceToken()));
const string = spanned((str) => {
    if (str.next() !== '"')
        throw new LexError('expected " at beginning of string');
    let c;
    let contents = '';
    let escapeNext = false;
    while ((c = str.next())) {
        if (c === '\\') {
            escapeNext = true;
            continue;
        }
        if (!escapeNext && c === '"') {
            break;
        }
        escapeNext = false;
        contents += c;
    }
    return new StringToken(contents);
});
const treeBracket = spanned(map(wrap('[', ']', tokenStream, '[...]'), inner => new BracketsToken(inner)));
const treeBrace = spanned(map(wrap('{', '}', tokenStream, '{...}'), inner => new BracesToken(inner)));
const treeParens = spanned(map(wrap('(', ')', tokenStream, '(...)'), inner => new ParensToken(inner)));
const delim$1 = spanned(map(tag(','), () => new DelimToken()));
const oneUnprefixedValueToken = oneOf(nul, bool, delim$1, number, string, ident, infixIdent);
const oneValueToken = prefixMatch(['[', treeBracket], ['{', treeBrace], ['(', treeParens], [null, oneUnprefixedValueToken]);
const nbws$1 = spanned(map(regex(/^[ \t]+/, 'non-breaking whitespace'), () => new SpaceToken()));
const nbToken = oneOf(nbws$1, oneValueToken);
const treeIndent = spanned((str) => {
    // find next line break
    while (true) {
        const c = str.peek();
        if (c === '\n')
            break;
        else if (c.match(/\s/))
            str.next();
        else
            throw new Error(`unexpected ${c}, expected breaking whitespace`);
    }
    const getLineIndentation = str => {
        if (str.eof())
            return -1;
        let indent;
        outer: while (true) {
            indent = 0;
            while (true) {
                if (str.eof())
                    return -1;
                const c = str.peek();
                if (c === ' ')
                    indent++;
                else if (c === '\t')
                    indent += 4;
                else if (c === '\n') {
                    str.next();
                    continue outer; // skip empty lines
                }
                else
                    break outer;
                str.next();
            }
        }
        return indent;
    };
    // we're now at the beginning of a line
    // find min indetation level
    const minIndent = getLineIndentation(str);
    const contents = [];
    // we're now at the beginning of the first line's contents
    let atSOL = false;
    while (true) {
        if (str.eof())
            break;
        else if (str.peek() === '\n') {
            // line break!
            atSOL = true;
            contents.push(new BreakToken());
            str.next();
            continue;
        }
        else if (atSOL) {
            atSOL = false;
            // count indentation
            const s = str.clone();
            const currentIndent = getLineIndentation(s);
            if (currentIndent < minIndent)
                break; // end of block
            str.copyFrom(s); // otherwise continue
        }
        contents.push(...nbTreeToken(str));
    }
    return new IndentToken(contents);
});
const whereClauseKey = spanned(map(xtag('where'), () => new IdentToken('where')));
const switchClauseKey = spanned(map(xtag('switch'), () => new IdentToken('switch')));
// treeIndent will swallow trailing line breaks
const wsWhereClause = map(cat(whereClauseKey, treeIndent), ([a, b]) => [a, b, new BreakToken()]);
const wsSwitchClause = map(cat(switchClauseKey, treeIndent), ([a, b]) => [a, b, new BreakToken()]);
const indentClause = oneOf(wsWhereClause, wsSwitchClause);
const _nbTreeToken = oneOf(indentClause, map(nbToken, x => [x]));
function nbTreeToken(str) {
    return _nbTreeToken(str);
}
const oneTokenList = oneOf(indentClause, map(ws, x => [x]), map(nbToken, x => [x]));
const _tokenStream = map(many(oneTokenList), x => x.flatMap(y => y));
function tokenStream(str) {
    return _tokenStream(str);
}
function lex(src) {
    const cursor = new StrCursor(src.normalize());
    const tokens = tokenStream(cursor);
    if (!cursor.eof()) {
        throw cursor.getCurrentError();
    }
    return tokens;
}

class TokenCursor {
    constructor(tokenStream, ctx) {
        this.tokens = tokenStream;
        this.pos = [0];
        this.proxy = null;
        this.errors = [];
        this.ctx = ctx;
        this.prevTok = null;
    }
    getPos() {
        return this.pos.join(',');
    }
    peek() {
        if (this.eof())
            throw new EOFError(`unexpected stream end`);
        let t = { contents: this.tokens };
        for (const p of this.pos) {
            t = t.contents[p];
        }
        return t;
    }
    span() {
        if (this.eof())
            return this.prevTok.span;
        return this.peek().span;
    }
    next() {
        const t = this.peek();
        this.pos[this.pos.length - 1]++;
        this.errors = [];
        this.prevTok = t;
        return t;
    }
    enter() {
        const t = this.peek();
        if (!Array.isArray(t.contents))
            this.throw(`cannot enter token without contents`);
        this.pos.push(0);
    }
    exitAssertingEnd() {
        if (!this.eof())
            this.throw(`attempt to exit token without reading all contents`);
        this.pos.pop();
    }
    eof() {
        const pos = [...this.pos];
        const lastPos = pos.pop();
        let t = { contents: this.tokens };
        for (const p of pos) {
            t = t.contents[p];
        }
        return t.contents.length === lastPos;
    }
    topLevelEof() {
        return this.pos.length === 1 && this.eof();
    }
    clone() {
        const tc = new TokenCursor(this.tokens, this.ctx);
        tc.pos = [...this.pos];
        tc.errors = this.errors;
        return tc;
    }
    copyFrom(tc) {
        this.tokens = tc.tokens;
        this.ctx = tc.ctx;
        this.pos = [...tc.pos];
        this.errors = tc.errors;
    }
    addErrorToCurrentPos(err) {
        this.errors.push(err);
    }
    throw(err) {
        if (typeof err === 'string')
            throw new ParseError(err, this.clone());
        else
            throw err;
    }
    getCurrentError(fallback = 'unknown error') {
        if (this.errors.length) {
            return new ParseError(this.errors, this.clone());
        }
        return new ParseError(fallback, this.clone());
    }
}
class ParseError {
    constructor(msgOrErrs, state = null) {
        this.contents = msgOrErrs;
        this.state = state;
    }
    get nextFewTokens() {
        const s = this.state.clone();
        const tokens = [];
        for (let i = 0; i < 10; i++) {
            if (s.eof())
                break;
            tokens.push(s.next());
        }
        return tokens;
    }
    get _debug__stringified() {
        return this.toString();
    }
    toString() {
        if (typeof this.contents === 'string') {
            return this.contents;
        }
        else {
            return this.contents.map(x => x.toString()).join('\n');
        }
    }
    valueOf() {
        return `[ParseError ${this.toString()}]`;
    }
    getSpan() {
        if (!this.state)
            return null;
        return this.state.span();
    }
}
const group = (gclass, inner) => (tok) => {
    const node = tok.peek();
    if (!(node instanceof gclass))
        tok.throw(`unexpected ${node}, expected ${gclass.name}`);
    tok.enter();
    const i = inner(tok);
    tok.exitAssertingEnd();
    tok.next();
    return i;
};
const ctxify = (inner) => (tok) => {
    const res = inner(tok);
    res.ctx = tok.ctx;
    return res;
};
const nbws = many(match(x => x instanceof SpaceToken, 'non-breaking whitespace'));
const anyws = many(match(x => x instanceof WhitespaceToken, 'whitespace'));
const bws = tok => {
    const r = anyws(tok);
    for (const x of r)
        if (x instanceof BreakToken)
            return null;
    tok.throw('expected line break');
};
const tnull = ctxify(map(match(x => x instanceof NullToken, 'null'), () => ({
    type: 'u',
    parent: null,
})));
const tnumber = ctxify(map(match(x => x instanceof NumberToken, 'number'), x => ({
    type: 'n',
    parent: null,
    value: parseFloat(x.int + '.' + (x.frac || '0')),
})));
const tbool = ctxify(map(match(x => x instanceof BoolToken, 'bool'), x => ({
    type: 'b',
    parent: null,
    value: x.value,
})));
const tstring = ctxify(map(match(x => x instanceof StringToken, 'string'), x => ({
    type: 's',
    parent: null,
    value: x.contents,
})));
const primitive = oneOf(tnull, tbool, tnumber, tstring);
const delim = match(x => x instanceof DelimToken, 'delimiter');
const callArgsInner = map(cat(many(map(cat(anyws, expr, anyws, delim), x => x[1])), anyws, opt(expr), anyws), ([a, , b]) => a.concat(b));
const callArgs = map(cat(nbws, group(ParensToken, callArgsInner)), a => a[1]);
const callExpr = ctxify(map(cat(match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'callee identifier'), opt(callArgs)), ([a, c]) => {
    if (c.length) {
        const ex = {
            type: 'c',
            parent: null,
            func: {
                type: 'r',
                parent: null,
                name: a.ident,
            },
            args: c[0],
        };
        ex.func.parent = ex;
        for (const arg of c[0])
            arg.parent = ex;
        return ex;
    }
    else {
        return { type: 'r', parent: null, name: a.ident };
    }
}));
const IS_INFIX = Symbol();
const IS_INFIX_OP = Symbol();
const groupExpr = map(group(ParensToken, cat(anyws, expr, anyws)), a => {
    const ex = a[1];
    if (!ex)
        return ex;
    delete ex[IS_INFIX]; // mark this non-infix so fixPrec doesn't mess it up
    return ex;
});
const matrixInner = map(cat(many(map(cat(anyws, expr, anyws, delim), a => a[1])), opt(map(cat(anyws, expr), a => a[1])), anyws), ([a, b]) => a.concat(b));
const matrixExpr = ctxify(map(group(BracketsToken, matrixInner), items => {
    const MATRIX_TYPES = 'ubnsm';
    let isPure = true;
    for (const item of items) {
        if (!MATRIX_TYPES.includes(item.type)) {
            isPure = false;
        }
    }
    if (isPure) {
        return {
            type: 'm',
            parent: null,
            value: items.map(item => {
                if (item.type === 'u')
                    return null;
                return item.value;
            }),
        };
    }
    else {
        const ex = { type: 'l', parent: null, items };
        for (const item of items)
            item.parent = ex;
        return ex;
    }
}));
const arrow = match(x => x instanceof InfixToken && x.ident === '->', '->');
const fatArrow = match(x => x instanceof InfixToken && x.ident === '=>', '=>');
const equals = match(x => x instanceof InfixToken && x.ident === '=', '=');
const switchIdent = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'switch', 'switch keyword');
const wildcardSwitchKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'otherwise', 'otherwise');
const notLastSwitchCase = not(wildcardSwitchKey, expr, 'wildcard case');
const undelimSwitchCase = map(cat(anyws, notLastSwitchCase, anyws, fatArrow, anyws, expr), ([, a, , , , e]) => ({ cond: a, value: e }));
const switchCaseDelim = oneOf(bws, cat(nbws, delim, anyws));
const delimSwitchCase = map(cat(undelimSwitchCase, switchCaseDelim), a => a[0]);
const wildcardSwitchCase = map(cat(anyws, wildcardSwitchKey, anyws, expr), ([, , , e]) => ({ cond: null, value: e }));
const lastSwitchCase = oneOf(wildcardSwitchCase, undelimSwitchCase);
const switchCases = map(cat(many(delimSwitchCase), opt(lastSwitchCase), anyws, opt(delim), anyws), ([a, b]) => a.concat(b));
const switchContents = oneOf(group(IndentToken, switchCases), map(cat(anyws, group(BracesToken, switchCases)), a => a[1]), map(cat(nbws, lastSwitchCase), ([, c]) => [c]));
const switchExpr = ctxify(map(cat(switchIdent, switchContents), ([, m]) => {
    const ex = { type: 'w', parent: null, matches: m };
    for (const { cond, value } of m) {
        if (cond)
            cond.parent = ex;
        value.parent = ex;
    }
    return ex;
}));
const closureArg = map(match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'argument name'), x => x.ident);
const closureArgsInner = map(cat(many(map(cat(anyws, closureArg, anyws, delim), ([, a]) => a)), opt(map(cat(anyws, closureArg), ([, a]) => a)), anyws), ([a, b]) => a.concat(b));
const closureArgs = oneOf(map(closureArg, arg => [arg]), group(ParensToken, closureArgsInner));
const closureWhereKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'where', 'where keyword');
const closureWhereInner = oneOf(group(IndentToken, program), map(cat(anyws, group(BracesToken, program)), a => a[1]), ctxify(map(cat(nbws, definition), a => {
    const defs = {
        type: 'd',
        defs: new Set([a[1]]),
        floatingExpr: new Set(),
    };
    a[1].parent = defs;
    return defs;
})));
const closureWhere = map(opt(map(cat(anyws, closureWhereKey, closureWhereInner), a => a[2])), a => a[0]);
const closureBody = map(cat(expr, closureWhere), ([e, w], tok) => {
    const body = {
        ctx: tok.ctx,
        type: 'd',
        parent: null,
        defs: new Set(),
        floatingExpr: new Set(),
    };
    body.defs.add({
        ctx: tok.ctx,
        type: 'ds',
        parent: null,
        name: '=',
        expr: e,
    });
    if (w)
        for (const d of w.defs)
            body.defs.add(d);
    for (const d of body.defs)
        d.parent = body;
    return body;
});
const closureExpr = ctxify(map(cat(closureArgs, nbws, arrow, anyws, closureBody), ([p, , , , b]) => ({
    type: 'f',
    parent: null,
    params: p,
    body: b,
})));
const minus = match(x => x instanceof InfixToken && x.ident === '-', 'minus sign');
const unaryMinusExpr = ctxify(map(cat(minus, nbws, nonInfixExpr), ([, , e]) => {
    const ex = {
        type: 'c',
        parent: null,
        func: { type: 'r', parent: null, name: '-' },
        args: [{ type: 'n', parent: null, value: 0 }, e],
    };
    ex.func.parent = ex;
    for (const arg of ex.args)
        arg.parent = ex;
    return ex;
}));
const _nonInfixExpr = oneOf(unaryMinusExpr, primitive, matrixExpr, switchExpr, closureExpr, groupExpr, callExpr);
function nonInfixExpr(tok) {
    return _nonInfixExpr(tok);
}
const isInfixOp = x => x instanceof InfixToken && x.ident !== '=' && x.ident !== '->' && x.ident !== '=>';
const mkInfix = a => {
    Object.defineProperty(a, IS_INFIX, {
        value: true,
        enumerable: false,
        configurable: true,
    });
    return a;
};
const mkInfixOp = a => {
    Object.defineProperty(a, IS_INFIX_OP, {
        value: true,
        enumerable: false,
        configurable: true,
    });
    return a;
};
const infixExpr = ctxify(map(cat(nonInfixExpr, anyws, match(isInfixOp, 'infix operator'), anyws, expr), ([a, , o, , b]) => {
    const iex = mkInfix({
        type: 'c',
        parent: null,
        func: mkInfixOp({ type: 'r', name: o.ident }),
        args: [a, b],
        [IS_INFIX]: true,
    });
    iex.func.parent = iex;
    a.parent = iex;
    b.parent = iex;
    return iex;
}));
const KNOWN_PREC_OPS = OP_PREC.flatMap(x => x);
function fixPrec(infixExpr) {
    return tok => {
        const expr = infixExpr(tok);
        const parts = [];
        const additionalOps = [];
        const flatten = e => {
            if (e[IS_INFIX]) {
                flatten(e.args[0]);
                parts.push(e.func);
                if (!KNOWN_PREC_OPS.includes(e.func.name))
                    additionalOps.push(e.func.name);
                flatten(e.args[1]);
            }
            else
                parts.push(e);
        };
        flatten(expr);
        const precLevels = OP_PREC.concat([additionalOps]).reverse();
        for (const ops of precLevels) {
            let i = 0;
            while (i < parts.length) {
                const part = parts[i];
                if (part[IS_INFIX_OP] && ops.includes(part.name)) {
                    const pLeft = parts[i - 1];
                    const pRight = parts[i + 1];
                    if (!pLeft || !pRight)
                        tok.throw(`error during precedence sort: lonely operator`);
                    i--;
                    const iex = mkInfix({
                        ctx: tok.ctx,
                        type: 'c',
                        parent: null,
                        func: part,
                        args: [pLeft, pRight],
                    });
                    pLeft.parent = iex;
                    pRight.parent = iex;
                    parts.splice(i, 3, iex);
                }
                i++;
            }
        }
        if (parts.length !== 1)
            tok.throw(`error during precedence sort: incomplete reduction`);
        return parts[0];
    };
}
const _expr = oneOf(fixPrec(infixExpr), nonInfixExpr);
function expr(tok) {
    return _expr(tok);
}
const defName = match(x => x instanceof IdentToken, 'definition name');
const _definition = ctxify(map(cat(defName, anyws, equals, anyws, expr), ([n, , , , e]) => {
    const def = {
        type: 'ds',
        parent: null,
        name: n.ident,
        expr: e,
    };
    e.parent = def;
    return def;
}));
function definition(tok) {
    return _definition(tok);
}
const _program = map(cat(anyws, many(map(cat(definition, bws), ([a]) => a)), opt(definition), anyws), ([, a, b], tok) => {
    const defs = new Set();
    const out = {
        ctx: tok.ctx,
        type: 'd',
        parent: null,
        defs,
        floatingExpr: new Set(),
    };
    for (const d of a.concat(b)) {
        defs.add(d);
        d.parent = out;
    }
    return out;
});
function program(tok) {
    return _program(tok);
}
function parse(tokenStream, ctx) {
    const cursor = new TokenCursor(tokenStream, ctx);
    const defs = program(cursor);
    if (!cursor.topLevelEof()) {
        throw cursor.getCurrentError();
    }
    return defs;
}

export { NODE_DEF as N, OP_PREC as O, cloneWithContext as a, createContext as b, config as c, bareIdentRegexF as d, evalExpr as e, fromRawDefs as f, toRawDefs as g, resolveRefs as h, infixIdentRegexF as i, bareFormIdentRegexU as j, bareIdentRegexU as k, lex as l, makeStdRefs as m, numberRegexU as n, infixIdentRegexU as o, parse as p, helpContent as q, remove as r, NODE_DEFS as s, toRawExpr as t, model as u };
