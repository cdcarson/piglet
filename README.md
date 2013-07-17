```
@___,__
(   ^'_] Piglet is watching.
//-\\'
^^  ^^   ^C to stop him.
```
piglet
======

A Twitter Bootstrap command line manager. Use (and keep up-to-date) one GitHub install of Bootstrap. Update multiple Bootstrapped projects.

## Quick start

	git clone https://github.com/cdcarson/piglet.git
	cd piglet
	npm install
	# make sure piglet is executable
	chmod +x
	# run piglet
	./piglet ~/my/less ~/my/less/styles.less ~/my/css
	

    @___,__
    (   ^'_] Piglet is watching.
    //-\\'
    ^^  ^^   ^C to stop him.
    
    Watch:       /Users/me/my/less/
    Compile:     /Users/me/my/less/styles.less
    Target:      /Users/me/my/css/styles.less
    Compiler:   lessc

## Usage

```
Usage: piglet [options] <watch> <source> <target>

    Required Arguments:

    watch: The directory path to watch. Changes to .less
           files in this directory will trigger compilation.

    source: The single source .less file to compile.

    target: The directory path or file path to which piglet
            will compile.

    Options:

    -r --recess: Use recess instead of lessc to compile.
                 Much slower.
```
	
	
## Optionally, add piglet to .bash_profile

If you want to command piglet from any directory add it to your .bash_profile

    nano ~/.bash_profile
    # add this…
    export PATH=~/bin:/Users/your/path/to/piglet:$PATH
    source ~/.bash_profile

This will allow you to do this:

    # pwd: /Users/me/my/fabulously/long/path/wordpress/wp-content/themes/blue/assets
    piglet less less/styles.less css
    

    @___,__
    (   ^'_] Piglet is watching.
    //-\\'
    ^^  ^^   ^C to stop him.
    
    Watch:  /Users/me/my/fabulously/long/path/wordpress/wp-content/themes/blue/assets/less/
    Compile: /Users/me/my/fabulously/long/path/wordpress/wp-content/themes/blue/assets/less/styles.less
    Target: /Users/me/my/fabulously/long/path/wordpress/wp-content/themes/blue/assets/css/styles.less
    Compiler:   lessc

    

