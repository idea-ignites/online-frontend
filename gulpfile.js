const { src, dest, watch, series } = require('gulp');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const tsify = require('tsify');
const source = require('vinyl-source-stream');
const browserify = require('browserify');

function build() {
    return browserify({
        basedir: '.',
        debug: true,
        entries: ['main.ts']
    })
    .plugin(tsify)
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(dest('.'));
}

function onSourceChanged() {
    return build();
}

function watchFileChange() {
    watch('*.ts', onSourceChanged);
}

exports.default = watchFileChange;
exports.build = build;