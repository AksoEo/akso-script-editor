export const bareIdentRegex = /^([_a-zA-Z@][a-zA-Z0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
export const bareFormIdentRegexU = /(@[a-zA-Z0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
export const bareIdentRegexU = /([_a-zA-Z@][a-zA-Z0-9~!@#$%^&*_+\-=<>/'\\|]*)/;
export const bareIdentRegexF = /^([_a-zA-Z@][a-zA-Z0-9~!@#$%^&*_+\-=<>/'\\|]*)$/;
export const infixIdentRegex = /^([+\-*/\\|~!@#$%^&=<>]+)/;
export const infixIdentRegexU = /([+\-*/\\|~!@#$%^&=<>]+)/;
export const infixIdentRegexF = /^([+\-*/\\|~!@#$%^&=<>]+)$/;
export const numberRegex = /^(-?[0-9]+)(?:\.([0-9]+))?/;
export const numberRegexU = /(-?[0-9]+)(?:\.([0-9]+))?/;
export const OP_PREC = [
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
