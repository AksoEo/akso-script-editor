import typescript2 from 'rollup-plugin-typescript2';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import workerLoader from 'rollup-plugin-web-worker-loader';
import { eslint } from 'rollup-plugin-eslint';

const isTestEnv = process.env.NODE_ENV === 'test';

const inputOptions = {
    input: 'src/index.ts',
    plugins: [
        postcss(),
        workerLoader({ targetPlatform: 'browser', extensions: ['.js', '.ts'] }),
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
        resolve(),
        commonjs({
            namedExports: {
                'google-libphonenumber': ['PhoneNumberUtil', 'PhoneNumberFormat'],
            }
        }),
        typescript2(),
        babel({
            plugins: ['@babel/plugin-proposal-class-properties'],
            exclude: ['node_modules/**'],
        }),
    ],
    external: isTestEnv ? [] : [
        'google-libphonenumber',
        '@tejo/akso-script',
        'codemirror',
        'codemirror/addon/mode/simple',
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
