'use strict';

// import
import fs from 'fs';
import gulp from 'gulp';
import gutil from 'gutil';
import browserify from 'browserify';
import babelify from 'babelify';
import watchify from 'watchify';
import buffer from 'vinyl-buffer';
import source from 'vinyl-source-stream';
import readConfig from 'read-config';
import browserSync from 'browser-sync';
import del from 'del';
import chokidar from 'chokidar';
import gulpLoadPlugins from 'gulp-load-plugins';
const $ = gulpLoadPlugins();

// const
const DIR = {
  CONFIG: './src/config',
  SRC: './src',
  DEST: './dest'
};
const BASE_PATH = '';

/**
 * jsのエントリポイントファイル 取得
 *
 * @return {Array} jsのエントリポイントファイル
 */
const getEntryJsFileList = () => {
  const files = fs.readdirSync(`${DIR.SRC}/js`);
  const fileList = files.filter((file) => {
    const filePath = `${DIR.SRC}/js/${file}`;
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile() && /^[!_]*(\.js)$/.test(filePath);
  });

  return fileList;
};

/**
 * トランスパイル
 *
 * @param {String} fileName エントリポイントファイル名
 * @param {Boolean} [isWatch] watchify利用フラグ
 *
 * @return {Object} gulpストリーム
 */
const transpile = (fileName, isWatch = false) => {
  const bundler = browserify({
    entries: [`${DIR.SRC}/js/${fileName}`],
    transform: ['babelify'],
    debug: true,
    plugin: (isWatch) ? [watchify] : null,
    cache: {},
    packageCache: {}
  });

  const bundle = () => {
    return bundler
      .bundle()
      .on('error', $.notify.onError({
        title: 'Build Error',
        message: "<%= error.message %>"
      }))
      .pipe(source(fileName))
      .pipe(buffer())
      .pipe($.sourcemaps.init({loadMaps: true}))
      .pipe($.uglify())
      .pipe($.sourcemaps.write('./maps'))
      .pipe($.duration(`build ${fileName}`))
      .pipe(gulp.dest(`${DIR.DEST}${BASE_PATH}/js`));
  };

  bundler.on('update', bundle);
  bundler.on('log', gutil.log);

  return bundle();
};

// clean
gulp.task('clean', (done) => {
  del.sync(`${DIR.DEST}/**/*`);
  done();
});

// build js
gulp.task('build:js', (done) => {
  const fileList = getEntryJsFileList();

  fileList.forEach((file) => {
    transpile(file);
  });
  done();
});

// build css
gulp.task('build:css', () => {
  const pleeeaseConfig = readConfig(`${DIR.CONFIG}/pleeease.json`);

  return gulp.src(`${DIR.SRC}/scss/**/*.scss`)
    .pipe($.plumber({
      errorHandler: $.notify.onError("<%= error.message %>")
    }))
    .pipe($.duration('compiled css'))
    .pipe($.sourcemaps.init())
    .pipe($.sassGlob())
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.pleeease(pleeeaseConfig))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(`${DIR.DEST}${BASE_PATH}/css`));
});

// build html
gulp.task('build:html', () => {
  const locals = readConfig(`${DIR.CONFIG}/pug-info.yml`);
  locals.basePath = BASE_PATH;

  return gulp.src(`${DIR.SRC}/pug/**/[!_]*.pug`)
    .pipe($.pug({
      locals,
      pretty: true,
      basedir: `${DIR.SRC}/pug`
    }))
    .pipe(gulp.dest(`${DIR.DEST}${BASE_PATH}`));
});

// build all
gulp.task('build', gulp.parallel('build:js', 'build:css', 'build:html'));

// watch all
gulp.task('watch', (done) => {
  const fileList = getEntryJsFileList();
  fileList.forEach((file) => {
    transpile(file, true);
  });

  $.watch([`${DIR.SRC}/scss/**/*.scss`], gulp.series('build:css'));

  $.watch([
    `${DIR.SRC}/pug/**/*.pug`,
    `${DIR.SRC}/config/pug-info.yml`
  ], gulp.series('build:html'));
  done();
});

// watch new javascript file for transpile
gulp.task('standby:transpile', (done) => {
  const fileList = getEntryJsFileList();
  const watcher = chokidar.watch(
    `${DIR.SRC}/js/*.js`,
    {
      ignored: fileList.map(file => `${DIR.SRC}/js/${file}`),
      persistent: true
    }
  );
  watcher.on('add', (path) => {
    gutil.log(`add file => ${path}`);
    const fileName = path.replace(/^(.*\/)/, '');
    !/^_/.test(fileName) && transpile(path.replace(/.*\//, ''), true);
  });
  done();
});

// serve
gulp.task('serve',
  gulp.series(
    'watch',
    (done) => {
      browserSync({
        server: {
          baseDir: DIR.DEST
        },
        startPath: `${BASE_PATH}/`,
        ghostMode: false
      });

      $.watch([
        `${DIR.SRC}/pug/**/*.pug`,
        `${DIR.SRC}/config/pug-info.yml`,
        `${DIR.SRC}/scss/**/*.scss`,
        `${DIR.SRC}/js/**/*.js`
      ]).on('change', browserSync.reload);
      done();
    },
    'standby:transpile'
  )
);

// default
gulp.task('default', gulp.series('build', 'serve'));
