var path = require('path');

var gulp = require('gulp');
var browserify = require('browserify'),
    jshint = require('gulp-jshint'),
    source = require('vinyl-source-stream'),
    rename = require('gulp-rename'),
    runSequence = require('run-sequence'),
    uglify = require('gulp-uglify');

gulp.task('browserify', [], function() {
    var options = {
        entries: path.join(__dirname, './index.js'),
        standalone: 'katie'
    };
    return browserify(options)
        .bundle()
        .pipe(source('katie.js'))
        .pipe(gulp.dest('./'))
});

gulp.task('lint', [], function() {
    return gulp.src('src/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('compress', function() {
    gulp.src('build/*.js')
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename += "-min";
        }))
        .pipe(gulp.dest('build'));
});

gulp.task('default', [], function() {
    runSequence(['lint'], ['browserify']);
});
