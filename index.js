// ==========================================
// piglet
// CORE: The core class definition
// ==========================================
// Copyright 2013 Modern Media, Inc
// Licensed under the Apache License v2.0
// http://www.apache.org/licenses/LICENSE-2.0
// ==========================================
 var
	 path = require('path')
	 ,fs = require('fs')
	 ,exec = require('child_process').exec
	 ,_ = require('underscore');

function Piglet(){
	this.help = fs.readFileSync(path.join(__dirname, 'assets' , 'help.txt'), {encoding: 'utf8'});
	this.art =  fs.readFileSync(path.join(__dirname, 'assets' , 'piglet.ascii'), {encoding: 'utf8'});
	this.error_art =  fs.readFileSync(path.join(__dirname, 'assets' , 'error.ascii'), {encoding: 'utf8'});

	this.opt = require('optimist')

		.boolean('h')
		.alias('h', 'help')
		.default('h', false)

		.boolean('r')
		.alias('r', 'recess')
		.default('r', false)
	;


	this.argv = this.opt.parse(process.argv);
	var args = this.argv._.slice(2);

	if (this.argv.help){
		console.log(this.help);
		process.exit();
	}


	if (args.length < 3){
		this.error_exit([
			'Too few arguments.'
		]);
	}

	this.start = null;
	this.paths = _.object(['watch', 'source', 'target'], args);
	if (! this.dirExists(this.paths.watch)){
		this.error_exit([
			'Specify a directory for me to watch.'
			, 'Watch: ' + this.paths.watch
		]);
	}
	this.paths.watch = path.resolve(this.paths.watch);
	if (! this.fileExists(this.paths.source)){
		this.error_exit([
			'Specify a single source file for me to compile.'
			, 'Source: ' + this.paths.source
		]);
	}
	this.paths.source = path.resolve(this.paths.source);

	if ('' != path.extname(this.paths.target)){
		//then we're dealing with a file path...
		if (! this.fileExists(this.paths.target)){
			var d = path.dirname(this.paths.target);
			if (! this.dirExists(d)){
				this.error_exit([
					'The directory doesn\'t exist for me to write the css to.'
					, 'Target: ' + this.paths.target
				]);
			}
		}

	} else {
		//we're dealing with a directory path
		if (! this.dirExists(this.paths.target)){
			this.error_exit([
				'Specify a directory for me to write the css to.'
				, 'Target: ' + this.paths.target
			]);
		} else {
			var fn = path.basename(this.paths.source, path.extname(this.paths.source)) + '.min.css';
			this.paths.target = path.join(this.paths.target, fn)

		}
	}
	this.paths.target = path.resolve(this.paths.target);

	var p = this.paths.target;

	if(this.paths.target.indexOf(this.paths.watch) >= 0){
		this.error_exit([
			'The target file is inside the watch directory That\'s not a good idea.'
			, 'Target: ' + this.paths.target
			, 'Watch: ' + this.paths.watch
		]);
	}

	this.isWatching();
	var that = this;
	fs.watch(
		this.paths.watch, function(event, filename){
			//console.log(event, filename);
			if ('.less' != path.extname(filename)) return;
			that.start = new Date();
			console.log ('Compiling...');

			var c = that.argv.recess ? 'recess --compress ' : 'lessc --verbose --yui-compress ';
			c = path.join (__dirname, 'node_modules', '.bin', c);


			var cmd = c +
				that.paths.source +
				' > ' +
				that.paths.target;

			exec(
				cmd,
				function(error, stdout, stderr){
					that.watchCallback(error, stdout, stderr);
				}
			);

		}
	);

}
Piglet.prototype.isWatching = function(){
	console.log('');
	console.log(this.art);
	console.log('Watch:     ' + this.paths.watch);
	console.log('Compile:   ' + this.paths.source);
	console.log('Target:    ' + this.paths.target);
	console.log('Compiler:  ' ,  this.argv.recess ? 'recess' : 'lessc');
	console.log('')
};
Piglet.prototype.watchCallback = function (error, stdout, stderr) {
	if (error !== null) {
		console.log (this.error_art);
		console.log(error.message);
	} else {
		var d = new Date();
		var elapsed = (d.getTime() - this.start.getTime())/1000;
		console.log('Compiled in '+ elapsed + ' seconds.')
	}
	this.isWatching();
};

Piglet.prototype.dirExists = function(p){
	if (fs.existsSync(p)){
		var s = fs.statSync(p);
		if (s.isDirectory()) return true;
	}
	return false;
};
Piglet.prototype.fileExists = function(p){
	if (fs.existsSync(p)){
		var s = fs.statSync(p);
		if (s.isFile()) return true;
	}
	return false;
};
Piglet.prototype.error_exit = function(errors){
	console.log (this.error_art);
	_.each(errors, function(e){
		console.log(e);
	});
	console.log(this.help);
	process.exit(1);
};

new Piglet();
