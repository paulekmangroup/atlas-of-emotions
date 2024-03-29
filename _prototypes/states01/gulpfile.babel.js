import gulp from 'gulp';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import browserify from 'browserify';
import watchify from 'watchify';
import babelify from 'babelify';
import gulpLoadPlugins from 'gulp-load-plugins';
import rimraf from 'rimraf';

// Automatically load any gulp plugins in your package.json
const $ = gulpLoadPlugins();

// External dependencies you do not want to rebundle while developing,
// but include in your application deployment
const dependencies = [
	'd3'
];

const WEB_SERVER_PORT = 8888;

function browserifyTask (options) {

	// Bundle the application with browserify
	let appBundler = browserify({
		entries: [options.src],			// Application entry point; browserify finds and bundles all dependencies from there
		transform: [babelify],			// Convert ES6 and React .jsx -> vanilla, ES5-compliant .js
		debug: options.development,		// Gives us sourcemapping
		cache: {}, packageCache: {}, fullPaths: options.development // watchify requirements
	});

	// We set our dependencies as externals on our app bundler when developing.
	// You might consider doing this for production also and load two javascript
	// files (main.js and vendors.js), as vendors.js will probably not change and
	// takes full advantage of caching
	appBundler.external(options.development ? dependencies : []);

	// The bundling process
	function createBundle () {

		let start = Date.now();
		console.log('Building APP bundle');
		if (options.development) {
			lintTask(options);
			appBundler.bundle()
				.on('error', $.util.log)
				.pipe(source('main.js'))
				.pipe(gulp.dest(options.dest))
				.pipe($.notify({
					'onLast': true,
					'message': function () { return 'APP bundle built in ' + (Date.now() - start) + 'ms'; }
				}));
		} else {
			appBundler.bundle()
				.on('error', $.util.log)
				.pipe(source('main.js'))
				.pipe(buffer())
				.pipe($.uglify())
				.pipe(gulp.dest(options.dest))
				.pipe($.notify({
					'onLast': true,
					'message': function () { return 'APP bundle built in ' + (Date.now() - start) + 'ms'; }
				}));
		}

	};

	// Fire up Watchify when developing
	if (options.development) {
		appBundler = watchify(appBundler);
		appBundler.on('update', createBundle);
	}

	createBundle();

	// We create a separate bundle for our dependencies as they
	// should not rebundle on file changes. This only happens when
	// we develop. When deploying the dependencies will be included
	// in the application bundle
	if (options.development) {

		let vendorsBundler = browserify({
			debug: true,
			require: dependencies
		});

		// Run the vendor bundle
		let start = new Date();
		console.log('Building VENDORS bundle');
		vendorsBundler.bundle()
			.on('error', $.util.log)
			.pipe(source('vendors.js'))
			.pipe(gulp.dest(options.dest))
			.pipe($.notify({
				'onLast': true,
				'title': 'VENDORS bundle',
				'message': function () { return 'built in ' + (Date.now() - start) + 'ms'; },
				'notifier': function () {}
			}));

	} else {

		browserify({ require: '' })
			.bundle()
			.pipe(source('vendors.js'))
			.pipe(gulp.dest(options.dest));

	}

}

function cssTask (options) {
	if (options.development) {
		let run = function () {
			let start = new Date();
			console.log('Building CSS bundle');
			gulp.src(options.src)
				.pipe($.sass())
				.pipe(gulp.dest(options.dest))
				.pipe($.notify({
					'onLast': true,
					'title': 'CSS bundle',
					'message': function () { return 'built in ' + (Date.now() - start) + 'ms'; },
					'notifier': function () {}
				}));
		};
		run();
		gulp.watch(options.watchfiles, run);
	} else {
		gulp.src(options.src)
			.pipe($.sass())
			.pipe($.cssmin())
			.pipe(gulp.dest(options.dest));
	}
}

function copyTask (options) {
	return gulp.src(options.src)
		.pipe($.copy(options.dest, {
			'prefix': options.pathDepth || 1
		}));
}

function lintTask (options) {
	console.log('ESLinting...');
	return gulp.src(options.lintsrc)
		.pipe($.eslint())
		.pipe($.eslint.format())
		.pipe($.eslint.failAfterError())	// Exit on lint error with code (1).
		.pipe($.notify({
			'onLast': true,
			'title': 'Lint task',
			'message': function () { return 'Linted.'; },
			'notifier': function () {}
		}));
}

function webserverTask (options) {
	options = options || {}
	const port = options.port || WEB_SERVER_PORT;

	return $.connect.server({
		root: './build/',
		port: port
	});
}


/**
 * Local development workflow:
 * build component and test on local server (localhost:8888)
 * with watcher to pick up changes and rebuild
 */
gulp.task('default', () => {

	rimraf('./build/**', () => {

		const dest = './build';

		// Copy static html files
		copyTask({
			src: './src/*.html',
			dest: dest
		});

		// Copy static assets
		copyTask({
			src: './static/**',
			dest: dest
		});

		// Lint and bundle and watch for changes
		browserifyTask({
			development: true,
			lintsrc: './src/**/*.js*',
			src: './src/main.js',
			dest: dest
		});

		// Compile Sass and watch for changes
		cssTask({
			development: true,
			src: './scss/*.scss',
			watchfiles: './scss/**/*.scss',
			dest: dest
		});

		// Fire up local server
		webserverTask();

	});

});


/**
 * Build package for deployment
 */
gulp.task('deploy', () => {

	rimraf('./deploy/**', () => {

		const dest = './deploy';

		// Copy static html files
		copyTask({
			src: './src/*.html',
			dest: dest
		});

		// Copy static assets
		copyTask({
			src: './static/**',
			dest: dest
		});

		// Bundle
		browserifyTask({
			development: false,
			src: './src/main.js',
			dest: dest
		});

		// Compile Sass
		cssTask({
			development: false,
			src: './scss/*.scss',
			dest: dest
		});

	});

});
