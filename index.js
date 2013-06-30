/**
 *
 * @type {*}
 */
var
	path = require('path')
	, program = require('commander')
	,fs = require('fs')
	,os = require('os')
	,exec = require('child_process').exec
	, _ = require('underscore');


function Piglet(){


	var that = this;

	program.version(require('./package.json').version);

	program
		.option('-n, --noWarning', 'no warning prompt')
		.option('-s, --showDetail', 'show details')
		.option('-v, --validateProjects', 'validate projects')
		.option('-a, --all', 'remove all less src.less:dst.css pairs from a project');



	program
		.command('add <id> <bootstrap_path> <project_less_path> <project_target_path>')
		.description('initialize a project')
		.action(function(id, bootstrap_path, project_less_path, project_target_path){
			that.cmd_add(id, bootstrap_path, project_less_path, project_target_path);
		});

	program
		.command('rm <id>')
		.description('delete a project')
		.action(function(id){
			that.cmd_rm(id);
		})
		.option('-n, --noWarning', 'no warning prompt');

	program
		.command('ls')
		.description('list projects')
		.action(function(){
			that.cmd_ls();
		})
		.option('-s, --showDetail', 'show details')
		.option('-v, --validateProjects', 'validate projects');

	program
		.command('pair <id> <pair>')
		.description('add a less src.less:dst.css pair to a project')
		.action(function(id, src_dst){
			that.cmd_pair(id, src_dst);
		});
	program
		.command('pairrm <id> <src_dst>')
		.description('remove a less src.less:dst.css pair from a project')
		.action(function(id, src_dst){
			that.cmd_pairrm(id, src_dst);
		})
		.option('-a, --all', 'remove all less src.less:dst.css pairs from a project');

	program.parse(process.argv);

	console.log(program);



}

/***  Commands **/

Piglet.prototype.cmd_add = function(id, bootstrap_path, project_less_path, project_target_path){
	var errors = [];
	var valid = true;

	//Validate id...
	var project = this.validate_id(id, errors, true);
	if (! project){
		valid = false;
	}

	//Validate bootstrap_path. The validation returns a realpath if valid, false if not.
	bootstrap_path = this.validate_bootstrap_path(bootstrap_path, errors, true);
	if (! bootstrap_path){
		valid = false;
	}

	//Validate project_less_path. The validation returns a realpath if valid, false if not.
	project_less_path = this.validate_project_less_path(project_less_path, errors, true);
	if (! project_less_path){
		valid = false;
	}


	//Validate project_target_path. The validation returns a realpath if valid, false if not.
	project_target_path = this.validate_project_target_path(project_target_path, errors, true);
	if (! project_target_path){
		valid = false;
	}


	//If ! valid, bail
	if (! valid){
		this.squeal(errors);
		process.exit();
	}

	project.id = id;
	project.bootstrap_path = bootstrap_path;
	project.project_less_path = project_less_path;
	project.project_target_path = project_target_path;
	project.created_at = new Date();

	var queue = [];
	var cmd;
	var that = this;

	var less = this.readJSON('./const/project_less_files.json');
	cmd = 'cp ';
	_.each(less, function(val){
		cmd += path.join(bootstrap_path, 'less', val) + ' ';
	});
	cmd += project_less_path;
	queue.push(cmd);

	this.exec_queue(queue, function(){
		that.writeJSON(that.get_project_path(id), project);
		that.say(
			[
				'The following project has been added.'
				, that.stringify(id, project)
			]
		);
	});



};


Piglet.prototype.cmd_rm = function(id){
	var errors = [];

	//Validate id...
	var project = this.validate_id(id, errors, false);
	if (! project){
		this.squeal('No project found with an id \'' + id + '\'');
		process.exit();
	}

	var that = this;
	var cb = function(){
		that.unlink(that.get_project_path(id));
		that.say(
			[
				'The following project has been deleted.'
				, that.stringify(id, project)
			]
		);
		process.exit(0);
	};

	if (program.noWarning){
		cb();
	} else {
		program.confirm(
			'Are you sure you want to delete the project ' + id  + '? ',
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
Piglet.prototype.cmd_ls = function(){
	var files = this.read_dir('./projects');
	var pct = 0;
	var out = [];
	if (program.validateProjects || program.showDetails){

		_.each(files, function(val){
			if ('.json' == path.extname(val)){
				pct++;
				var project = this.readJSON(path.join('./projects', val));
				out.push('Project: ' + project.id);
				if (program.showDetail){
					out.push(this.stringify(project.id, project));
				}
				if (program.validateProjects){
					var errors = [];
					var valid = true;
					if (! this.validate_bootstrap_path(project.bootstrap_path, errors)){
						valid = false;
					}
					if (! this.validate_project_less_path(project.project_less_path, errors, false)){
						valid = false;
					}
					if (! this.validate_project_target_path(project.project_target_path, errors, false)){
						valid = false;
					}
					if (errors.length > 0){
						out.push('Invalid project. Errors: ');
						out.concat(errors)
					} else {
						out.push('Everything is valid.');
					}
					out.push('');
				}
			}
		}, this);
	} else {

		_.each(files, function(val){
			if ('.json' == path.extname(val)){
				pct++;
				out.push(path.basename(val, '.json'))
			}
		}, this);
	}
	out.unshift(' ');
	out.unshift(pct.toString() + ' project(s)');
	this.say(out);


};
Piglet.prototype.cmd_pair = function(id, pair){
	var project = this.validate_id(id, errors, false);
	if (! project){
		this.squeal('No project found with an id \'' + id + '\'');
		process.exit();
	}
	pair = this.validate_pair(pair, errors);
	if (! pair){
		this.squeal(errors);
		process.exit();
	}
	if (_.indexOf(project.pairs, pair) > -1){
		errors.push(
			pair + 'already exists in ' + id + '.'
		);
		this.squeal(errors);
		process.exit();
	}
	project.pairs.push(pair);
	this.say(
		[
			'Pair added to project ' + id
		]

	)

};
Piglet.prototype.cmd_alsorm = function(id, src_dst){
	var project = this.validate_id(id, errors, false);
	if (! project){
		this.squeal('No project found with an id \'' + id + '\'');
		process.exit();
	}
};


/*** end Commands **/


/** Validation ***/

/**
 *
 * @param id
 * @param errors
 * @param is_new
 * @returns {*}
 */
Piglet.prototype.validate_id = function(id, errors, is_new){
	var project;
	if (! /^\w+$/.test(id)){
		errors.push('Invalid id \'' + id + '\'. Please use only word characters.');
		return false;
	}

	var projects = this.read_dir('./projects');
	var exists = false;
	_.each(projects, function(val){
		if (id == path.basename(val, '.json')){
			exists = true;
		}
	}, this);

	if (is_new){
		if (exists){
			errors.push('A project with the id \'' + id + '\' already exists. Please choose a unique id.');
			return false;
		}
		return this.readJSON('./const/project.json');
	}

	if (! is_new){
		if (! exists){
			errors.push('No project with the id \'' + id + '\' exists.');
			return false;
		}
		return this.readJSON(this.get_project_path(id));
	}
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
Piglet.prototype.validate_project_less_path = function(p, errors, is_new_project){
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
Piglet.prototype.validate_project_target_path = function(p, errors, is_new_project){
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

Piglet.prototype.validate_pair = function(pair, errors){
	var valid = true;
	var split = pair.split(':');
	if (split.length != 2){
		errors.push(
			'The source and destination of the src.less:dst.css pair  ' +
				'should be separated by a colon.',
			'Pair: ' + pair

		);
		return false;
	}
	var src = this.real_path(split[0]);
	if (! src){
		errors.push(
			'The source  of the src.less:dst.css pair ' +
				'does not seem to exist.',
			'Path: ' + split[0]
		);
		valid = false;
	}
	var dir = path.dirname(split[1]);
	var dst = this.real_path(dir);
	if (! dst){
		errors.push(
			'The destination directory of the src.less:dst.css pair ' +
				'does not seem to exist.',
			'Path: ' + split[1]
		);
		valid = false;
	}

	if (! valid) return false;

	dst = path.join(dst, path.basename(split[1]));
	return src + ':' + dst;


};


/** End Validation ***/


/** fs  **/

Piglet.prototype.get_project_path = function(id){
	return path.join('./', 'projects', id + '.json');
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
			that.exec_queue(queue, callback);
		}
	);
};


exports = module.exports = new Piglet;
exports.Piglet = Piglet;


