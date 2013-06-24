var 	fs = require('fs')
	,	path = require('path')
	,	os = require('os')
	,	crypto = require('crypto')
	,	util = require('util')
	,	exec = require('child_process').exec;

exports = module.exports = new Piglet;
exports.Piglet = Piglet;

function Piglet() {
	this.quit_str = '-q';
	var pkg = require('../package');
	this.program = require('commander').version(pkg.version);

	this.program.option('-u --update', 'update a project');
	this.program.option('-l --list', 'list current projects');
	this.program.option('-a --add', 'add a project');
	this.program.option('-r --remove', 'remove a project');
	this.program.option('-s --settings', 'manage settings');



}

Piglet.prototype.start = function(){
	this.program.parse(process.argv);
	if (this.program.settings) this.settings_prompt();
	if (this.program.add) this.add_project_prompt();
};

Piglet.prototype.copy_less = function(project){
	var files = [
		'bootstrap.less',
		'responsive.less',
		'variables.less'
	];

	for(var i in files){
		var to = path.join(project.less_directory, files[i]);
		var from = path.join(this.data.bootstrap_path, 'less', files[i]);
		fs.writeFileSync(to, fs.readFileSync(from));
	}
};

Piglet.prototype.add_project_prompt = function(){
	var that = this;
	this.data = this.read_data();
	var prompt, steps, add_project;
	var project = {};
	var write_less = false;
	add_project = function(){
		project.added = new Date();
		project.updated = 'never';
		that.data.add_project(project);
		that.write_data(that.data);
		that.say(['Project added.']);
		if (write_less){
			that.copy_less(project);
			that.say(['Clean less files copied from Bootstrap.']);
		} else {
			that.say(['Remember to put less files into your less path.', project.less_directory]);
		}
	};
	prompt = function(step){
		that.program.prompt(steps[step].prompt, steps[step].callback);
	};
	steps = [
		{
			//prompt 0
			prompt: 'Give this project an ID (only word chars.) ID: ',
			callback: function(id){
				that.check_for_quit(id);
				var rx = /^[\w]+$/;
				if (! rx.test(id)){
					that.squeal(
						['That\'s not a valid ID!']
					);
					prompt(0);
					return;
				} else {
					var t = that.data.get_project(id);
					if (t){
						that.squeal(
							['Another project has that ID!']
						);
						prompt(0);
						return;
					}
				}

				project.id = id;
				prompt(1);
			}
		},
		{
			//prompt 1
			prompt: 'Specify the path to your less source directory. Path: ',
			callback: function(dir){
				that.check_for_quit(dir);
				if (! that.is_dir(dir)){
					that.squeal(
						[
							'That is not a valid directory! You said:',
							dir
						]
					);
					prompt(1);
					return;
				}
				project.less_directory = path.resolve(dir);
				that.say([
					'Do you want me to write clean copies of bootstrap.less, responsive.less, and variables.less to that directory?',
					'Piglet requires those files to be present in order to compile your less into css.'
				]);
				prompt(2);

			}
		},
		{
			//prompt 2
			prompt: 'Say "yes" or "no": ',
			callback: function(yn){
				that.check_for_quit(yn);
				if ('yes' != yn && 'no' != yn){
					that.squeal('Answer the question. Say "yes" or "no".');
					prompt(2);
					return;
				}
				write_less = 'yes' == yn;
				if (! write_less){
					that.say([
						'OK. You\'ll have to take charge of making sure bootstrap.less, responsive.less, and variables.less are in:',
						project.less_directory
					]);
				} else {
					that.say([
						'OK. I\'ll wite bootstrap.less, responsive.less, and variables.less to:',
						project.less_directory
					]);
				}
				prompt(3);
			}
		},
		{
			//prompt 3
			prompt: 'Specify where you want your Bootstrap assets to go. Path: ',
			callback: function(dir){
				that.check_for_quit(dir);
				if (! that.is_dir(dir)){
					that.squeal(
						[
							'That is not a valid directory! You said:',
							dir
						]
					);
					prompt(3);
					return;
				}
				project.target_directory = path.resolve(dir);
				var p = path.join(p, 'bootstrap');
				if (that.is_dir(p)){
					that.squeal(
						[
							'There\'s already a bootstrap directory in ',
							project.target_directory + '.',
							p,
							'I don\'t want to overwrite that directory. Move it somewhere else and try again. I\'ll wait.'
						]
					);
					prompt(3);
					return;
				}

				add_project();

			}
		}
	];
	this.hello(
		[
			'Let me set up a project. I need to ask you a few questions.',
			'Answer "' + this.quit_str + '" at any time to cancel out.'
		]
	);
	prompt(0);




};



Piglet.prototype.settings_prompt = function(){
	var that = this;
	this.data = this.read_data();
	var prompt, steps, write_bootstrap_path;
	var bootstrap_path;
	write_bootstrap_path = function(){
		that.data.bootstrap_path = bootstrap_path;
		that.write_data(that.data);
		that.goodbye(['Bootstrap path set to:', bootstrap_path]);
	};
	prompt = function(step){
		that.program.prompt(steps[step].prompt, steps[step].callback);
	};
	steps = [
		{
			prompt: 'What\'s the path to your Twitter Bootstrap directory? ',
			callback: function(dir){
				that.check_for_quit(dir);
				var errors = [];
				if (! that.check_bootstrap_path(dir, errors)){
					that.squeal(errors);
					prompt(0);
					return;
				}
				bootstrap_path = path.resolve(dir);
				that.say([
					'Woot. Your Bootstrap directory checks out.',
					'It will be set to: ',
					bootstrap_path
				]);

				if (that.data.bootstrap_path.length){
					prompt(1);
					return;
				}
				write_bootstrap_path();
			}
		},
		{
			prompt: 'You already have a Bootstrap path defined. Do you want to overwrite it? (type "yes") ',
			callback: function(r){
				if (that.is_yes(r)){
					write_bootstrap_path();
				} else {
					that.goodbye(['Bootstrap path NOT replaced. Your current path is:', that.data.bootstrap_path])
				}


			}
		}
	];
	this.hello(
		[
			'Let me set you up right. I need to ask you a few questions.',
			'Answer "' + this.quit_str + '" at any time to cancel out.'
		]
	);
	prompt(0);




};

Piglet.prototype.write_data = function(env){
	var p = this.piglet_path('data');
	if (! this.is_dir(p)){
		fs.mkdirSync(p);
	}
	p = this.piglet_path(['data', 'data.json']);
	fs.writeFileSync(p, JSON.stringify(env));
};

Piglet.prototype.read_data = function(){
	var data = false;
	var p = this.piglet_path(['data', 'data.json']);
	if (this.is_file(p)){
		data = JSON.parse(fs.readFileSync(p, 'utf8'));
	}
	return new PigletData(data);

};

Piglet.prototype.readFile = function(p){
	var command = 'cat '
};

Piglet.prototype.hello = function(msg){
	if (! util.isArray(msg)){
		msg = [msg];
	}
	msg.unshift ('-- Hello from Piglet --');
	msg.unshift ('');
	msg.unshift(
		fs.readFileSync(this.piglet_path(['inc', 'messages', 'piglet.txt']))
	)
	this.say(msg);
};

Piglet.prototype.goodbye = function(msg){
	if (! util.isArray(msg)){
		msg = [msg];
	}
	msg.push ('Bye 4 now. XOXOXO -Piglet');
	msg.push ('');
	this.say(msg);
	process.exit();
};

Piglet.prototype.is_yes = function(r){
	return r == 'yes';
};

Piglet.prototype.join_path_array = function(a){
	var p = a.shift();
	while(a.length > 0){
		p = path.join(p, a.shift());
	}
	return p;

};


Piglet.prototype.piglet_path = function(p){
	if (p){
		if (! util.isArray(p)){
			p = [p];
		}
	} else {
		p = [];
	}
	p.unshift(path.dirname(__dirname));
	return this.join_path_array(p);
};

Piglet.prototype.say = function(msg){
	if (util.isArray(msg)){
		msg = msg.join(os.EOL);
	}
	console.log(msg);
};

Piglet.prototype.squeal = function(err){
	if (! util.isArray(err)){
		err = [err];
	}
	err.unshift('!!! Squeak! Squeak! All\'s not well! !!!');
	this.say(err);

};

Piglet.prototype.is_dir = function(p){
	if (! fs.existsSync(p)) return false;
	var stats = fs.statSync(p);
	if (! stats.isDirectory()) return false;
	return true;
};

Piglet.prototype.is_file = function(p){
	if (! fs.existsSync(p)) return false;
	var stats = fs.statSync(p);
	if (! stats.isFile()) return false;
	return true;
};



Piglet.prototype.check_bootstrap_path = function(dir, errors){
	dir = path.resolve(dir);
	if (! this.is_dir(dir)){
		errors.push([
			'The bootstrap path is not a directory!',
			'You said: ' + dir
		]);
		return false;
	}
	var missing = [];
	var req = require('./required_bootstrap_paths.json');
	for (var n = 0; n < req.length; n++){
		var parts = req[n];
		var p = dir;
		while(parts.length > 0){
			p = path.join(p, parts.shift());
		}
		if (! fs.existsSync(p)){
			missing.push(p);
		}

	}
	if (missing.length > 0){
		missing.unshift(
			[
				'Some files went missing from Bootstrap! Are you sure you got it from GitHub?',
				'The missing files are: '
			]
		);
		errors.push(missing);
		return false;
	}
	return true;
};

Piglet.prototype.check_for_quit = function(str){
	if (this.quit_str.toLowerCase() == str.toLowerCase()){
		this.goodbye();
	}
};

function PigletData(init){
	this.bootstrap_path = (! init || ! init.bootstrap_path) ? '' : init.bootstrap_path;
	this.projects = (! init || 'object' != typeof init.projects) ? {} : init.projects;
}

PigletData.prototype.add_project = function(p){
	this.projects[p.id] = p;
};

PigletData.prototype.get_project = function(id){
	if (this.projects[id]) return this.projects[id];
	return false;
};
PigletData.prototype.remove_project = function(id){
	delete this.projects[id];
};



var piglet = new Piglet();
piglet.start();



