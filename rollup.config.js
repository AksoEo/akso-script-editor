import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import alias from '@rollup/plugin-alias';
import { eslint } from 'rollup-plugin-eslint';

const inputOptions = {
    input: 'src/index.ts',
    plugins: [
        postcss(),
        alias({
            entries: [
                { find: '@tejo/akso-script', replacement: '@tejo/akso-script/dist-esm' },
            ],
        }),
        eslint({
            throwOnError: true,
            include: ['src/**'],
            useEslintrc: false,
            parser: '@typescript-eslint/parser',
            envs: ['browser', 'node', 'es6'],
            plugins: ['@typescript-eslint'],
            rules: {
                'no-unused-vars': 'warn',
                'semi': 'warn',
                'comma-dangle': ['warn', 'always-multiline'],
                'indent': 'warn',
                'no-trailing-spaces': 'warn',
                'yield-star-spacing': 'warn',
                'prefer-const': 'warn',
                'no-undef': 'error',
                'no-const-assign': 'error',
            },
        }),
        typescript(),
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
