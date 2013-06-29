var
	path = require('path')
	, program = require('commander')
	,fs = require('fs')
	,os = require('os')
	, _ = require('underscore');


function Piglet(){

	var that = this;

	program.version(require('./package.json').version)

	program
		.command('init <id> <bootstrap_path> <project_less_path> <project_target_path>')
		.description('initialize a project')
		.action(function(id, bootstrap_path, project_less_path, project_target_path){
			that.cmd_init(id, bootstrap_path, project_less_path, project_target_path);
		});

	program.parse(process.argv);


}

Piglet.prototype.cmd_init = function(id, bootstrap_path, project_less_path, project_target_path){
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

	this.writeJSON(path.join('./projects', id + '.json'), project);

};

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
	if (! /\^\w+$/.test(id)){
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
		return this.readJSON(path.join('./', 'projects', id + '.json'));
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
	var project_less_path = this.real_path(project_less_path);
	if (! project_less_path){
		errors.push('The project_less_path does not seem to exist.',
			'Path: ' + project_less_path);
		return false;
	}
	if (! this.is_dir(project_less_path)){
		errors.push('The project_less_path is not a directory.',
			'Path: ' + project_less_path);
		return false;
	}
	var files = this.readJSON('./config/project_less_files.json');
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

/** End Validation ***/


/** fs wrappers **/

/**
 * Whether a given path (relative or not) exists.
 *
 * @param p
 * @returns bool
 */
Piglet.prototype.exists = fs.existsSync;

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
Piglet.prototype.mkdir = function(p){
	return fs.mkdirSync(p);
};
Piglet.prototype.path_join_array = function(a){
	var p = a.shift();
	while (a.length > 0){
		var r = a.shift();
		p = path.join(p, r);
	}
	return p;
};

/** end fs wrappers **/





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

/** end say/squeal  **/




exports = module.exports = new Piglet;
exports.Piglet = Piglet;


