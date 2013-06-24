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
	this.program.parse(process.argv);

}

Piglet.prototype.setup = function(){
	var that = this;
	var env = new PigletEnvironment();
	var prompt, steps;
	prompt = function(step){
		that.program.prompt(steps[step].prompt,steps[step].callback);
	};
	steps = [
		{
			prompt: 'What\'s the path to your Twitter Bootstrap directory?',
			callback: function(dir){
				that.check_for_quit(dir);
				var errors = [];
				if (! that.check_bootstrap_path(dir, errors)){
					that.squeal(errors);
					prompt(0);
				}
				env = path.resolve(dir);
			}
		}
	];
	this.say(
		[
			'-- Hello from Piglet --',
			'Let me set your sty up right. I need to ask you a few questions.',
			'Answer "' + this.quit_str + '" at any time to cancel out.'
		]
	);




};

Piglet.prototype.say = function(msg){
	if (util.isArray(msg)){
		msg = msg.join(os.EOL);
	}
	console.log('');
	console.log(msg);
	console.log('');
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

Piglet.prototype.check_bootstrap_path = function(dir, errors){
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
		while(req.length > 0){
			p = path.join(p, req.shift());
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
		this.say('Oink. Good-bye.');
		process.exit();
	}
};

function PigletEnvironment(init){
	this.bootstrap_path = (! init) ? '' : init.bootstrap_path;
}

