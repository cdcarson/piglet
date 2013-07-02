/**
 *
 * @type {*}
 */
var
	path = require('path')
	, program = require('commander')
	, opt = require('optimist')
	, fs = require('fs')
	, os = require('os')
	, exec = require('child_process').exec
	, _ = require('underscore');


function Piglet(){
	var cmds = this.read_constant('cmds');
	var c = process.argv[2];
	if (c && cmds[c]) {
		var cmd = cmds[c];

		opt.usage(cmd.usage);
		if (cmd.demand){
			opt.demand(cmd.demand);
		}
		_.each(cmd.options, function(o, key){
			opt.options(key, o);
			if (o.required){
				opt.demand(key);
			}
			if (o.boolean){
				opt.boolean(key);
			}
		});

		var argv = opt.parse(_.rest(process.argv, 3));
		//console.log(argv);

		var req_count = 0;
		var args = {};
		_.each(cmd.usage.match( /<(\w+)>/g), function(val, key){
			val = val.replace(/<|>/g, '');
			args[val] = argv._[key];
			req_count++;
		});
		var all_count = req_count;
		_.each(cmd.usage.match( /\[(\w+)\]/g), function(val, key){
			val = val.replace(/\[|\]/g, '');
			args[val] = argv._[key + req_count];
			all_count++;
		});

		var repeating = cmd.usage.match( /\[(\w+)\.\.\.\]/g);
		if (repeating && repeating.length > 0){
			var key = repeating[0].replace(/\[|\.|]/g, '');
			args[key] = _.rest(argv._, all_count);

		}

		_.each(cmd.options, function(o, key){
			if (argv[o.alias]){
				args[o.alias] = argv[o.alias];
			} else {
				args[o.alias] = false;
			}
		});

		this.cmd(c, args);

	} else {
		console.log('Command not found!');
	}
}



/***  Commands **/
Piglet.prototype.cmd = function(c, args){
	switch (c){
		case 'compile':
			this.cmd_compile(args);
			break;
		case 'add':
			this.cmd_add(args);
			break;
		case 'rm':
			this.cmd_rm(args);
			break;
		case 'ls':
			this.cmd_ls(args);
			break;
		case 'show':
			this.cmd_show(args);
			break;
		case 'set':
			this.cmd_set(args);
			break;
		case 'pair':
			this.cmd_pair(args);
			break;
		case 'watch':
			this.cmd_watch(args);
			break;
	}
};



Piglet.prototype.cmd_add = function(args){
	var errors = [];
	//If ! valid, bail
	if (! this.validate_id(args.id, errors, true)){
		this.squeal(errors);
		process.exit();
	}

	var project = this.read_constant('project');
	project.id = args.id;
	project.created_at = new Date();
	var p = this.get_project_path(args.id);
	this.write_project(project);

	this.say(
		[
			'The project ' + project.id + ' has been added.'
			, this.stringify(project.id, project)
			, 'Use piglet set <id> <setting> [value] to set project properties.'
		]
	);
};



Piglet.prototype.cmd_watch = function(args){
	var errors = [];
	if (! this.validate_id(args.id, errors, false)){
		this.squeal(errors);
		process.exit();
	}
	var project = this.read_project(args.id);
};



Piglet.prototype.cmd_set = function(args){
	var errors = [];
	if (! this.validate_id(args.id, errors, false)){
		this.squeal(errors);
		process.exit();
	}

	var msg = '';
	var project = this.read_project(args.id);

	var property =  args.property;
	var value = args.value;
	var p;
	var parts = property.split('.');
	switch (parts[0]){
		case 'id':
			errors.push('Please don\'t try to set the id.');
			break;
		case 'created_at':
		case 'compiled_at':
			errors.push('Please don\'t try to set a date.');
			break;
		case 'bootstrap_path':
		case 'less_path':
		case 'target_path':

			if (args.empty){
				project[parts[0]] = '';
			} else {
				p = this.real_path(value);
				if (! p){
					errors.push('That doesn\'t seem to be a valid path.', 'Path: ' + value);
				} else {
					project[parts[0]] = p;
					msg = pair_id + '.' + parts[2] + ' set to ' + p;
				}
			}
			break;

		case 'pairs':
			switch (parts.length){
				case 1:
					if (args.empty){
						project.pairs = {};
						msg = 'All source.less > destination.css pairs removed from project '+ project.id + '.';
					} else {
						errors.push('Cannot set pairs to nothing. To remove all pairs use piglet <id> set --empty pairs.');
					}
					break;
				default:
					var pair_id = parts[1];
					var exists = (pair_id && project.pairs[pair_id]);
					if (exists){
						switch (parts.length){
							case 2:
								if (args.empty){
									delete project.pairs[pair_id];
									msg = 'The source.less > destination.css pair ' + pair_id  + ' removed from project ' + project.id + '.';
								} else {
									errors.push('Cannot set pairs.' + pair_id + ' to nothing. To remove this pair use piglet <id> set --empty pairs.' + pair_id);
								}
								break;

							case 3:
								switch (parts[2]){
									case 'id':
										errors.push('Please don\'t try to set the id.');
										break;
									case 'src':
									case 'dst':
										if (args.clear){
											project.pairs[pair_id][parts[2]] = '';
										} else {
											p = this.real_path(value);
											if (! p){
												errors.push('That doesn\'t seem to be a valid path.', 'Path: ' + value);
											} else {
												project.pairs[pair_id][parts[2]] = p;
												msg = pair_id + '.' + parts[2] + ' set to ' + value;
											}
										}
										break;
									default:
										errors.push('Cannot set an unknown property.');
										break;
								}
								break;
						}


					} else {
						switch (parts.length){
							case 2:
								project.pairs[pair_id] = this.read_constant('pair');
								project.pairs[pair_id]['id'] = pair_id;
								msg = 'The source.less > destination.css pair ' + pair_id  + ' added to project ' + project.id + '.';
								break;
							default:
								errors.push('Cannot set ' + property + ' because the source.less > destination.css pair ' + pair_id + ' does not yet exist.');
								break;
						}
					}
					break;


			}
			break;


		default:

			errors.push('Cannot set an unknown property.');
			break;
	}
	if ('less_path' == property){
		if (errors.length == 0 && this.is_dir(project.less_path)){
			var queue = [];
			var less = this.read_constant('project_less_files');

			_.each(less, function(val){
				var lp = project.less_path;
				if (! this.exists(path.join(lp, val))){
					queue.push(
						'cp ' + path.join(project.bootstrap_path, 'less', val) + ' ' + lp
					)
				}

			}, this);
			if (queue.length > 0) {
				this.exec_queue(queue, function(){}, true);
			}
		}

	}
	if (errors.length > 0){
		this.squeal(errors);

	} else {

		this.write_project(project);
		this.say(
			[
				msg, this.stringify(project.id, project)
			]
		);
	}

};

Piglet.prototype.cmd_rm = function(args){

	var errors = [];
	if (! this.validate_id(args.id, errors, false)){
		this.squeal(errors);
		process.exit();
	}
	var project = this.read_project(args.id);
	var that = this;
	var cb = function(){
		that.unlink(that.get_project_path(args.id));
		that.say(
			[
				'The following project has been deleted.'
				, that.stringify(project.id, project)
			]
		);
		process.exit(0);
	};
	if (args.withoutWarningPrompt){
		cb();
	} else {
		program.confirm(
			'Are you sure you want to delete the project ' + args.id  + '? ',
			function(ok){
				if (ok) {
					cb();
				} else{
					that.say('Delete cancelled.')
				}
				process.exit(0);
			}
		);
	}

};
Piglet.prototype.cmd_ls = function(args){
	var files = this.read_dir(this.piglet_path('projects'));
	var ids = [];
	_.each(files, function(val, i){
		if ('.json' == path.extname(val)){
			ids.push(path.basename(val, '.json'));
		}
	});
	var header = ids.length + ' project';
	header += 1 == ids.length ? '' : 's';
	header = [header, '--------------------'];
	if (! args.details){
		this.say(header.concat(ids));
		process.exit(0);
	}

	this.say(header);
	_.each(ids, function(val){
		args.id = val;
		this.cmd_show(args);
	}, this);

};
Piglet.prototype.cmd_show = function(args){

	var errors = [];
	if (! this.validate_id(args.id, errors, false)){
		this.squeal(errors);
		process.exit();
	}


	var project = this.read_project(args.id);

	var valid = this.validate_project(project, errors, false);
	var header = 'Project: ' + project.id + ' Status: ';
	header += (valid) ? ' Everything is good' : ' SOMETHING\'S WRONG';
	var out = [
		'--------------------',
		header,
		'--------------------',
		this.stringify(project.id, project),
		'--------------------'

	];
	if (! valid){
		out.push('Here\'s what\'s wrong:', '');
		out = out.concat(errors);
	}
	this.say(out);

};
Piglet.prototype.cmd_compile = function(args){
	var errors = [];
	if (! this.validate_id(args.id, errors, false)){
		this.squeal(errors);
		process.exit();
	}
	var project = this.read_project(args.id);
	if (! this.validate_project(project, errors, false)){
		this.squeal(errors);
		process.exit();
	}

	var queue = [];
	var target_path = path.join(project.target_path, 'bootstrap');
	/**
	 * remove the target bootstrap dir recursively
	 * and make the target bootstrap dir structure...
	 */
	queue.push(
		'rm -r ' + target_path
		, 'mkdir ' 	+
			[
				target_path
				, path.join(target_path, 'js')
				, path.join(target_path, 'img')
				, path.join(target_path, 'css')
			].join(' ')
	);

	/**
	 * copy the images...
	 */
	queue.push(
		'cp ' + path.join(project.bootstrap_path, 'img', '*') + ' ' + path.join(target_path, 'img')
	);

	/**
	 * deal with bootstrap js...
	 */
	var files = this.read_constant('bootstrap_js_sources');
	_.each(files, function(val, i, arr){
		arr[i] = path.join(project.bootstrap_path, 'js', val);
	});

	queue.push(
		'cat ' + files.join(' ') + ' > ' + path.join(target_path, 'js', 'bootstrap.js')
		, path.join(__dirname, 'node_modules', '.bin', 'uglifyjs') +
			' -nc ' +
			path.join(target_path, 'js', 'bootstrap.js') +
			' > ' +
			path.join(target_path, 'js', 'bootstrap.min.tmp.js')
		, 'echo "/*!\n* Bootstrap.js by @fat & @mdo\n* Copyright 2012 Twitter, Inc.\n* http://www.apache.org/licenses/LICENSE-2.0.txt\n*/"' +
			' > ' + path.join(target_path, 'js', 'copyright.js')
		, 'cat ' + path.join(target_path, 'js', 'copyright.js') + ' ' +
			path.join(target_path, 'js', 'bootstrap.min.tmp.js') +
			' > ' +
			path.join(target_path, 'js', 'bootstrap.min.js')
		, 'rm ' + path.join(target_path, 'js', 'copyright.js') + ' ' +
			path.join(target_path, 'js', 'bootstrap.min.tmp.js')
	);

	/**
	 * deal with bootstrap less...
	 */
	var recess = path.join(__dirname, 'node_modules', '.bin', 'recess');
	var include_path = path.join(project.bootstrap_path, 'less');
	var target_css = path.join(project.target_path, 'bootstrap', 'css');
	queue.push(
		recess +
			' --compile --includePath ' + include_path + ' '  +
			path.join(project.less_path, 'bootstrap.less') +
			' > ' +
			path.join(target_css, 'bootstrap.css')

		,recess +
			' --compress --includePath ' + include_path + ' '  +
			path.join(project.less_path, 'bootstrap.less') +
			' > ' +
			path.join(target_css, 'bootstrap.min.css')
		,recess +
			' --compile --includePath ' + include_path + ' '  +
			path.join(project.less_path, 'responsive.less') +
			' > ' +
			path.join(target_css, 'bootstrap-responsive.css')

		,recess +
			' --compress --includePath ' + include_path + ' '  +
			path.join(project.less_path, 'responsive.less') +
			' > ' +
			path.join(target_css, 'bootstrap-responsive.min.css')
	);

	_.each(project.pairs, function(o, key){
		var min = path.join(path.dirname(o.src), path.basename(o.dst, '.css') + '.min.css');
		queue.push(
			recess +
				' --compile ' +
				o.src +
				' > ' +
				o.dst

			,recess +
				' --compress '  +
				o.src  +
				' > ' +
				min
		);
	});

	var that = this;
	this.exec_queue(queue, function(){
		project.compiled_at = new Date();
		that.write_project(project);
		that.say(
			'Project ' + project.id + ' compiled.'
		);
	}, false);


};





/*** end Commands **/


/** Validation ***/

Piglet.prototype.validate_project = function(project, errors, is_new){
	var valid = true;
	if (! this.validate_id(project.id, errors, is_new)) valid = false;

	//Validate bootstrap_path. The validation returns a realpath if valid, false if not.
	project.bootstrap_path = this.validate_bootstrap_path(project.bootstrap_path, errors, is_new);
	if (! project.bootstrap_path) valid = false;


	//Validate project_less_path. The validation returns a realpath if valid, false if not.
	project.less_path = this.validate_less_path(project.less_path, errors, is_new);
	if (! project.less_path) valid = false;

	//Validate project_target_path. The validation returns a realpath if valid, false if not.
	project.target_path = this.validate_target_path(project.target_path, errors, is_new);
	if (! project.target_path) valid = false;

	project.pairs = this.validate_pairs(project.pairs, errors, is_new);
	if (! project.pairs) valid = false;

	if (! valid) return false;

	return (is_new) ? project : true;

};
/**
 *
 * @param id
 * @param errors
 * @param is_new
 * @returns {boolean}
 */
Piglet.prototype.validate_id = function(id, errors, is_new){
	if (! /^\w+$/.test(id)){
		errors.push('Invalid id \'' + id + '\'. Please use only word characters.');
		return false;
	}
	var exists = this.exists(this.get_project_path(id));
	if (is_new && exists){
		errors.push('A project with the id \'' + id + '\' already exists. Please choose a unique id.');
		return false;
	}
	if (! is_new && ! exists){
		errors.push('No project with the id \'' + id + '\' exists.');
		return false;
	}
	return true;
};

/**
 * Makes sure that the project's bootstrap_path exists,
 * and that all the bootstrap files that Piglet uses exist inside
 * of it. Returns a real_path'ed path if all validation passes.
 * @param p
 * @param errors
 * @returns {*}
 */
Piglet.prototype.validate_bootstrap_path = function(p, errors){
	var bootstrap_path = this.real_path(p);

	if (! this.is_dir(bootstrap_path)){
		errors.push(
			'The bootstrap_path is not a directory.',
			'Path: ' + bootstrap_path
		);
		return false;
	}

	var req = this.readJSON('./const/required_bootstrap_paths.json');
	var missing = [];
	_.each(req, function(value){
		value.unshift(p);
		var fn = this.path_join_array(value);
		if (! this.exists(fn)){
			missing.push(fn);
		}
	}, this);

	if (missing.length > 0){
		errors.unshift(
			'Some files went missing from bootstrap_path! Are you sure you got cloned it from GitHub?'
			, 'Path: ' + p
			,'The missing files are: '
			,missing.join(', ')
		);
		return false;
	}
	return bootstrap_path;
};

/**
 * Makes sure that the project target less exists.
 * If it's a new project, makes sure none of the less files
 * that we use are present in the path.
 * If it's not a new project, makes sure that all the less
 * files we need are there.
 * Returns a real_path'ed path if all validation passes.
 * @param p
 * @param errors
 * @param is_new_project
 * @returns {*}
 */
Piglet.prototype.validate_less_path = function(p, errors, is_new_project){
	//Validate project_less_path...
	var project_less_path = this.real_path(p);
	if (! project_less_path){
		errors.push('The project_less_path does not seem to exist.',
			'Path: ' + p);
		return false;
	}
	if (! this.is_dir(project_less_path)){
		errors.push('The project_less_path is not a directory.',
			'Path: ' + project_less_path);
		return false;
	}
	var files = this.readJSON('./const/project_less_files.json');
	var existing = [];
	var missing = [];
	_.each(files, function(val){
		if (this.exists(path.join(project_less_path, val))){
			existing.push(val);
		}
		if (! this.is_file(path.join(project_less_path, val))){
			missing.push(val);
		}
	}, this);

	if (is_new_project && existing.length > 0){
		errors.unshift(
			'Some bootstrap less files ' +
				'that Piglet installs when initializing a project ' +
				'already exist in project_less_path. ' +
				'Move them to a safer place.'
			, 'Path: ' + project_less_path
			,'The existing files are: '
			,existing.join(', ')
		);
		return false;
	}
	if (! is_new_project && missing.length > 0){
		errors.unshift(
			'Some bootstrap less files ' +
				'that Piglet needs are missing ' +
				'in project_less_path.'
			, 'Path: ' + project_less_path
			,'The missing files are: '
			,missing.join(', ')
		);
		return false;
	}

	return project_less_path;
};

/**
 * Makes sure that the project target path exists and, if it's a
 * new project, that a 'bootstrap' directory does not exist in it.
 * The validation returns a real path if valid, false if not.
 * @param p
 * @param errors
 * @param is_new_project
 * @returns {*}
 */
Piglet.prototype.validate_target_path = function(p, errors, is_new_project){
	//Validate project_target_path...
	var project_target_path = this.real_path(p);
	if (! project_target_path){
		errors.push('The project_target_path does not seem to exist.',
			'Path: ' + project_target_path);
		return false;
	}

	if (is_new_project){
		if (this.exists(path.join(project_target_path, 'bootstrap'))){

			errors.push(
				'The project_target_path you specified already ' +
				'contains a \'bootstrap\' directory. Piglet will ' +
				'overwrite this directory. Move it to a safe place.',
				'Path: ' + project_target_path
			);
			return false;
		}
	}
	return project_target_path;
};

Piglet.prototype.validate_pairs = function(pairs, errors, is_new){
	var valid = true;




	_.each(pairs, function(o, id){
		o.src = this.real_path(path.resolve(o.src));
		if (! o.src){
			errors.push(
				'The source  of the src.less:dst.css pair ' +
					'does not seem to exist.',
				'Path: ' + o.src
			);
			valid = false;
		}

		o.dst = this.real_path(path.resolve(o.dst));
		if (! o.dst){
			errors.push(
				'The destination of the src.less:dst.css pair ' +
					'does not seem to exist.',
				'Path: ' + o.dst
			);
			valid = false;
		}
		pairs[id] = o;

	}, this);



	if (! valid) return false;
	return pairs;

};


/** End Validation ***/


/** fs  **/

Piglet.prototype.piglet_path = function(p){
	if (!_.isArray(p)) p = [p];
	p.unshift(__dirname);
	return this.path_join_array(p);
};
Piglet.prototype.read_constant = function(key){
	var p = this.piglet_path(['const', key + '.json']);
	return this.readJSON(p);
};

Piglet.prototype.read_project = function(id){
	return this.readJSON(this.get_project_path(id));
};
Piglet.prototype.write_project = function(project){
	return this.writeJSON(this.get_project_path(project.id), project);
};


Piglet.prototype.get_project_path = function(id){
	return this.piglet_path(['projects', id + '.json'])
};

/**
 * Whether a given path (relative or not) exists.
 *
 * @param p
 * @returns bool
 */
Piglet.prototype.exists = fs.existsSync;

Piglet.prototype.unlink = fs.unlinkSync;

/**
 *
 * @param p
 * @returns bool
 */
Piglet.prototype.is_dir = function(p){
	if (! this.exists(p)) return false;
	return fs.statSync(p).isDirectory();
};
Piglet.prototype.is_file = function(p){
	if (! this.exists(p)) return false;
	return fs.statSync(p).isFile();
};

Piglet.prototype.real_path = function(p){
	try{
		return fs.realpathSync(p);
	} catch (e){
		return false;
	}
};
Piglet.prototype.read_dir = function(p){
	return fs.readdirSync(p);
};

Piglet.prototype.read = function(p){
	return fs.readFileSync(p, {'encoding': 'utf8'});
};
Piglet.prototype.write = function(p, data){
	return fs.writeFileSync(p, data, {'encoding': 'utf8'});
};
Piglet.prototype.readJSON = function(p){
	return JSON.parse(this.read(p));
};
Piglet.prototype.writeJSON = function(p, data){
	return this.write(p, JSON.stringify(data, null, '    '));
};
Piglet.prototype.mkdir = fs.mkdirSync;
Piglet.prototype.path_join_array = function(a){
	var p = a.shift();
	while (a.length > 0){
		var r = a.shift();
		p = path.join(p, r);
	}
	return p;
};


/** end fs  **/





/** say/squeal  **/

Piglet.prototype.say = function(msg){
	if (! _.isArray(msg)){
		msg = [msg];
	}
	msg.unshift('');
	msg.push('');
	console.log(msg.join(os.EOL) );
};

Piglet.prototype.squeal = function(err){
	if (! _.isArray(err)){
		err = [err];
	}
	err.unshift('Squeal!');
	this.say(err);

};
Piglet.prototype.stringify = function(label, thing){
	return label + ' = ' + JSON.stringify(thing, null, '    ')
};

/** end say/squeal  **/

Piglet.prototype.exec_queue = function(queue, callback, verbose){
	if (queue.length == 0){
		callback();
		return;
	}
	var that = this;
	var cmd = queue.shift();

	exec(
		cmd,
		function (error, stdout, stderr) {
			if (verbose){
				console.log('exec: ' + cmd);
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
			}

			if (error !== null) {
				console.log('exec error: ' + error);
			}
			that.exec_queue(queue, callback, verbose);
		}
	);
};

Piglet.prototype.array_chunk = function(arr, s){
	var ch = [];
	var i = 0;
	if (s < 1) return ch;
	while (i < arr.length){
		ch.push(arr.slice(i, i + s));
		i += s;
	}
	return ch;
};




exports = module.exports = new Piglet;
exports.Piglet = Piglet;


