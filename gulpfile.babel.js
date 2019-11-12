import gulp from 'gulp';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import browserify from 'browserify';
import watchify from 'watchify';
import babelify from 'babelify';
import gulpLoadPlugins from 'gulp-load-plugins';
import rimraf from 'rimraf';
import connect from 'gulp-connect';
import gulpif from 'gulp-if';
import stringsConfig from './static/strings/stringsConfig.json';

// Automatically load any gulp plugins in your package.json
const $ = gulpLoadPlugins();

// External dependencies you do not want to rebundle while developing,
// but include in your application deployment
const dependencies = [
	'd3'
];

const WEB_SERVER_PORT = 8888;

function browserifyTask( options ) {

	// Bundle the application with browserify
	let appBundler = browserify( {
		entries: [ options.src ],			// Application entry point; browserify finds and bundles all dependencies from there
		transform: [ babelify ],			// Convert ES6 and React .jsx -> vanilla, ES5-compliant .js
		debug: options.development,		// Gives us sourcemapping
		cache: {}, packageCache: {}, fullPaths: options.development // watchify requirements
	} );

	// We set our dependencies as externals on our app bundler when developing.
	// You might consider doing this for production also and load two javascript
	// files (main.js and vendors.js), as vendors.js will probably not change and
	// takes full advantage of caching
	appBundler.external( options.development ? dependencies : [] );

	// The bundling process
	function createBundle() {

		let start = Date.now();
		console.log( 'Building APP bundle' );
		if ( options.development ) {
			lintTask( options );
			appBundler.bundle()
				.on( 'error', $.util.log )
				.pipe( source( 'main.js' ) )
				.pipe( gulp.dest( options.dest ) )
				.pipe( gulpif( options.reload, connect.reload() ) )
				.pipe( $.notify( {
					'onLast': true,
					'message': function () {
						return 'APP bundle built in ' + (Date.now() - start) + 'ms';
					}
				} ) );
		} else {
			appBundler.bundle()
				.on( 'error', $.util.log )
				.pipe( source( 'main.js' ) )
				.pipe( buffer() )
				.pipe( $.uglify() )
				.pipe( gulp.dest( options.dest ) )
				.pipe( $.notify( {
					'onLast': true,
					'message': function () {
						return 'APP bundle built in ' + (Date.now() - start) + 'ms';
					}
				} ) );
		}

	};

	// Fire up Watchify when developing
	if ( options.development ) {
		appBundler = watchify( appBundler );
		appBundler.on( 'update', createBundle );
	}

	createBundle();

	// We create a separate bundle for our dependencies as they
	// should not rebundle on file changes. This only happens when
	// we develop. When deploying the dependencies will be included
	// in the application bundle
	if ( options.development ) {

		let vendorsBundler = browserify( {
			debug: true,
			require: dependencies
		} );

		// Run the vendor bundle
		let start = new Date();
		console.log( 'Building VENDORS bundle' );
		vendorsBundler.bundle()
			.on( 'error', $.util.log )
			.pipe( source( 'vendors.js' ) )
			.pipe( gulp.dest( options.dest ) )
			.pipe( $.notify( {
				'onLast': true,
				'title': 'VENDORS bundle',
				'message': function () {
					return 'built in ' + (Date.now() - start) + 'ms';
				},
				'notifier': function () {
				}
			} ) );

	} else {

		browserify( { require: '' } )
			.bundle()
			.pipe( source( 'vendors.js' ) )
			.pipe( gulp.dest( options.dest ) );

	}

}

function sassVariablesTask( options ) {
	let run = function () {
		let start = new Date();
		console.log( 'Building Sass variables' );
		gulp.src( options.src )
			.pipe( $.jsonSass() )
			.pipe( $.concat( './variables-derived.scss' ) )
			.pipe( gulp.dest( options.dest ) )
			.pipe( gulpif( options.reload, connect.reload() ) );
	};
	run();

	if ( options.development && options.watchfiles ) {
		gulp.watch( options.watchfiles, run );
	}
}

function cssTask( options ) {
	if ( options.development ) {
		let run = function () {
			let start = new Date();
			console.log( 'Building CSS bundle' );
			gulp.src( options.src )
				.pipe( $.sass() )
				.pipe( $.autoprefixer( {
					browsers: [ '> 1%', 'last 2 versions' ]
				} ) )
				.pipe( gulp.dest( options.dest ) )
				.pipe( gulpif( options.reload, connect.reload() ) )
				.pipe( $.notify( {
					'onLast': true,
					'title': 'CSS bundle',
					'message': function () {
						return 'built in ' + (Date.now() - start) + 'ms';
					},
					'notifier': function () {
					}
				} ) );
		};
		run();
		gulp.watch( options.watchfiles, run );
	} else {
		gulp.src( options.src )
			.pipe( $.sass() )
			.pipe( $.autoprefixer( {
				browsers: [ '> 1%', 'last 2 versions' ]
			} ) )
			.pipe( $.cssmin() )
			.pipe( gulp.dest( options.dest ) );
	}
}

function copyTask( options ) {
	console.log( 'Copying files: ' + options.src );
	if ( options.watchfiles ) {
		gulp.watch( options.watchfiles, function () {
			gulp.src( options.src )
				.pipe( $.copy( options.dest, {
					'prefix': options.pathDepth || 1
				} ) );
		} );
	}
	return gulp.src( options.src )
		.pipe( $.copy( options.dest, {
			'prefix': options.pathDepth || 1
		} ) );
}

function lintTask( options ) {
	console.log( 'ESLinting...' );
	return gulp.src( options.lintsrc )
		.pipe( $.eslint() )
		.pipe( $.eslint.format() )
		.pipe( $.eslint.failAfterError() )	// Exit on lint error with code (1).
		.pipe( $.notify( {
			'onLast': true,
			'title': 'Lint task',
			'message': function () {
				return 'Linted.';
			},
			'notifier': function () {
			}
		} ) );
}

function stringsTask( options ) {
	let accessToken = options.token,
		langs = stringsConfig.stringsFiles;

	return gulp.src( options.src )
		.pipe( $.shell( [
			`mkdir ${ options.src }static/strings/langs`
		] ) )
		// NOTE: have to manually enumerate each worksheet tab...
		.pipe( $.shell( langs.map( lang => `gsjson ${ lang.fileId } ${ options.dest + lang.lang }.json -b -w 0 -w 1 -w 2 -w 3 -w 4 -w 5 -w 6 -w 7${ accessToken ? (' -t ' + accessToken) : '' }` ) ) );
}

function webserverTask( options ) {
	options = options || {};
	const port = options.port || WEB_SERVER_PORT;

	const opts = {
		root: './build/',
		port: port
	};

	if ( options.reload ) opts.livereload = true;

	return connect.server( opts );
}


/**
 * Local development workflow:
 * build component and test on local server (localhost:8888)
 * with watcher to pick up changes and rebuild
 */
gulp.task( 'default', () => {
	const reload = (process.argv.indexOf( '--reload' ) > -1) ? true : false;

	rimraf( './build/**', () => {

		const dest = './build';
		const development = true;
		// const reload = true;

		// Copy static html files
		copyTask( {
			src: './src/*.html',
			dest: dest,
			watchfiles: './src/*.html'
		} );

// Copy static assets
		copyTask( {
			src: './static/**',
			dest: dest,
			watchfiles: './static/**'
		} );

// Lint and bundle and watch for changes
		browserifyTask( {
			development,
			reload,
			lintsrc: './src/**/*.js*',
			src: './src/main.js',
			dest: dest
		} );

		// transpile variables.json into .scss
		sassVariablesTask( {
			development,
			reload,
			src: './scss/*.json',
			watchfiles: './scss/**/*.json',
			dest: './scss/'
		} );

		// Compile Sass and watch for changes
		cssTask( {
			development,
			reload,
			src: './scss/*.scss',
			watchfiles: './scss/**/*.scss',
			dest: dest
		} );

		// Fire up local server
		webserverTask( {
			reload
		} );

	} );

} );


/**
 * Build package for deployment
 */
gulp.task( 'dist', () => {

	rimraf( './dist/**', () => {

		const dest = './dist';

		// Copy static html files
		copyTask( {
			src: './src/*.html',
			dest: dest
		} );

		// Copy static assets
		copyTask( {
			src: './static/**',
			dest: dest
		} );

		// Bundle
		browserifyTask( {
			development: false,
			src: './src/main.js',
			dest: dest
		} );

		// transpile variables.json into .scss
		sassVariablesTask( {
			development: false,
			src: './scss/*.json',
			dest: './scss/'
		} );

		// Compile Sass
		cssTask( {
			development: false,
			src: './scss/*.scss',
			dest: dest
		} );

	} );

} );

/**
 * Pull down strings from Google Sheets and save locally
 */
gulp.task( 'strings', () => {

	rimraf( './static/strings/langs/**', () => {

		// Using a Google Sheets File > Publish to Web:
		stringsTask( {
			src: './',
			dest: './static/strings/langs/'
		} );

		/*
		 // Using Google OAuth:
		 stringsTask({
		 src: './',
		 dest: './static/strings/langs/',
		 token: stringsConfig.googleOAuthAccessToken
		 });
		 */

	} );

} );
