import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { eslint } from 'rollup-plugin-eslint';

const inputOptions = {
    input: 'src/index.js',
    plugins: [
        eslint({
            throwOnError: true,
        }),
        babel({
            plugins: ['@babel/plugin-proposal-class-properties'],
            exclude: ['node_modules/**'],
        }),
        resolve(),
        commonjs({
            namedExports: {
                'google-libphonenumber': ['PhoneNumberUtil', 'PhoneNumberFormat'],
            }
        }),
    ],
};
const outputOptions = {
    file: 'dist/asce.esm.js',
    format: 'esm',
};

export default {
    output: outputOptions,
    ...inputOptions,
};
