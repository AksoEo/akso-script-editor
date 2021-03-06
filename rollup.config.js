import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import { eslint } from 'rollup-plugin-eslint';

const inputOptions = {
    input: 'src/index.js',
    plugins: [
        postcss(),
        eslint({
            throwOnError: true,
            include: ['src/**'],
            useEslintrc: false,
            parser: 'babel-eslint',
            envs: ['browser', 'node', 'es6'],
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
        babel({
            presets: [
                ['@babel/preset-react', { pragma: 'h' }]
            ],
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
