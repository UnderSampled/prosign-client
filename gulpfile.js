/// <binding BeforeBuild='default' Clean='clean' />
var gulp = require('gulp'),
  del = require('del'),
  nib = require('nib'),
  es = require('event-stream'),
  p = require('gulp-load-plugins')();

gulp.task('styles', function () {
  return gulp.src('src/**/*.?(styl|css)')
  .pipe(p.changed('www'))
  .pipe(p.plumber())
  .pipe(p.sourcemaps.init())
  .pipe(p.if('*.styl', p.stylus({ use: nib() })))
  //.pipe(p.autoprefixer('last 2 version'))
  .pipe(p.cleanCss())
  .pipe(p.sourcemaps.write('maps'))
  .pipe(gulp.dest('www'))
});

gulp.task('lint', function () {
  return gulp.src(['src/app/**/*.js'])
  .pipe(p.plumber())
  .pipe(p.standard())
  .pipe(p.standard.reporter('default', {
    breakOnError: true
  }))
})

gulp.task('scripts', ['lint'], function () {
 return gulp.src('src/app/**/*.js')
 .pipe(p.changed('www'))
 .pipe(p.plumber())
 .pipe(p.sourcemaps.init())
 .pipe(p.babel({presets: ['es2015']}))
 .pipe(p.uglify())
 .pipe(p.sourcemaps.write('maps'))
 .pipe(gulp.dest('www/app'))
});

gulp.task('markup', function () {
  return gulp.src('src/**/*.?(jade|html)')
  .pipe(p.changed('www'))
   .pipe(p.plumber())
  .pipe(p.if('*.jade', p.jade()))
  .pipe(p.minifyHtml({ conditionals: true, }))
  .pipe(gulp.dest('www'))
});

gulp.task('riot', function () {
  return gulp.src('src/**/*.tag')
  .pipe(p.changed('www'))
  .pipe(p.plumber())
  .pipe(p.riot())
  .pipe(p.sourcemaps.init())
  .pipe(p.uglify())
  .pipe(p.sourcemaps.write('maps'))
  .pipe(gulp.dest('www'))
});

var copyPaths = [{ path: 'config.js', base: './' },
                 { path: 'src/lib/**/*.js', base: 'src/' }];
gulp.task('copy', function () {
  //List all paths that need to be copied directly to www
  return es.merge(copyPaths.map(function (p) {
    return gulp.src(p.path, { base: p.base })
  }))
  .pipe(p.changed('www'))
  .pipe(gulp.dest('www'))
});

gulp.task('clean', function (cb) {
  return del(['www/**/*'], cb)
});

gulp.task('watch', function () {
  gulp.watch(['src/**/*.styl', 'src/**/*.css'], ['styles']);
  gulp.watch('src/**/*.js', ['scripts']);
  gulp.watch(['src/**/*.jade', 'src/**/*.html'], ['markup']);
  gulp.watch('src/**/*.tag', ['riot']);

  gulp.watch(copyPaths.map(function (p) { return p.path }), ['copy'])
});

gulp.task('default', ['clean'], function () {
  gulp.start('styles', 'scripts', 'riot', 'markup', 'copy');
});