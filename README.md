```
@___,__
(   ^'_] Piglet is watching.
//-\\'
^^  ^^   ^C to stop him.
```
piglet
======

Piglet is a watcher for less projects. It was inspired by Twitter Bootstrap's Makefile, and me getting tired of having to go to the command line every time I made a change to a less file.

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

Make a change to any .less file in `/Users/me/my/less/`, and piglet will compile.

```
Compiling...
Compiled in 0.948 seconds.
```
If you have an error in your less, piglet will notify you...

```
Compiling...

  __,___@
 [_'^   ) Error
   //-\\
   ^^  ^^

Command failed: FileError: 'missing.less' wasn't found in /Users/me/my/less/styles.less on line 14, column 1:
13 @import "footer";
14 @import "missing";
```

..and continue watching.

## Command Line Usage

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

## Using piglet with Twitter Bootstrap

This is how we're using piglet to help with Twitter Bootstrap. We're setting up our projects like this:

```
- wordpress
  - wp-content
    - themes
      - blue
        - assets
          - less
            - (bootstrap source .less files)
            - style.less
            - (project source .less files, e.g. header.less)
          - css
            - style.min.css
          - img
            - glyphicons-halflings.png
            - glyphicons-halflings-white.png
          - fonts
          - ico
          - etc
          
        
```

Note that this setup ensures that relative URLs in the less files (like `../img/glyphicons-halflings.png`) are valid in the css files as well.

The Twitter Bootstrap .less files can be found [here](https://github.com/twitter/bootstrap/tree/master/less). Just paste them into the `less` directory.

We set up our style.less like this:

```
@import "variables"; //Bootstrap's variables
@import "mixins";    //Bootstrap's mixins

@import "mytheme_mixins";
@import "mytheme_variables";
@import "../fonts/myfunfont/style.css";

@import "bootstrap";
/* optionally add desktop-only styles here */
@import "responsive";

@import "header";
@import "content";
@import "sidebar";
@import "footer";
```

Then we use piglet to watch the entire less directory:

```
# pwd: /Users/me/project/wordpress/wp-content/themes/blue/assets
piglet less less/style.less css
```
This compiles Bootstrap and our custom styles into one minified css, `css/styles.min.css`, that we can include in the header.


## Credits

Inspired by work done on Bootstrap by [@rno and @fat](https://github.com/twitter/bootstrap#authors).

Piglet makes use of [optimist](https://github.com/substack/node-optimist).

ASCII piglet art courtesy of [Joan G Stark](http://www.geocities.com/SoHo/7373/index.htm) | [Wikipedia](https://en.wikipedia.org/wiki/Joan_Stark)

```
      __,___@
     [_'^   )
       `//-\\
       ^^  ^^
     @___,__
jgs  (   ^'_]
     //-\\'
     ^^  ^^
```


