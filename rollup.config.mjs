import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import offMainThread from '@surma/rollup-plugin-off-main-thread';
import { eslint } from 'rollup-plugin-eslint';
import path from 'node:path';
import pkg from './package.json' assert { type: 'json' };

const isTestEnv = process.env.NODE_ENV === 'test';

const inputOptions = {
    input: 'src/index.ts',
    plugins: [
        postcss({
            extract: path.resolve('dist/asce.css'),
        }),
        offMainThread({
            silenceESMWorkerWarning: true,
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
        resolve(),
        commonjs(),
        typescript(),
        babel({
            babelHelpers: 'bundled',
            plugins: ['@babel/plugin-proposal-class-properties'],
            exclude: ['node_modules/**'],
        }),
        !isTestEnv && addBackCssImport(),
    ].filter(x => x),
    external: isTestEnv ? [] : Object.keys(pkg.dependencies),
};
const outputOptions = {
    dir: 'dist',
    format: 'esm',
};

function addBackCssImport() {
    return {
        name: 'add-back-css-import-removed-by-rollup-postcss',
        banner(chunk) {
            if (chunk.isEntry && chunk.name === 'index') {
                return `import './asce.css';\n`;
            }
            return null;
        },
    };
}

export default {
    output: outputOptions,
    ...inputOptions,
};
