extract="s:/\*.*\*/::sg; s://.*::g; s/.*SEARCH\s*=\s*\[(.*?)\].*/\1/s; s/\s*'//g; s/,/\n/g; s/\s*$$/\n/;"
styles= $(shell perl -p0e "$(shell echo $(extract) | sed 's/SEARCH/html5_styles/g')" index.html)
scripts=$(shell perl -p0e "$(shell echo $(extract) | sed 's/SEARCH/html5_scripts/g')" index.html)

estyles= $(shell perl -p0e "$(shell echo $(extract) | sed 's/SEARCH/html5_styles/g')" engine.html)
escripts=$(shell perl -p0e "$(shell echo $(extract) | sed 's/SEARCH/html5_scripts/g')" engine.html)


all: build build/plumber-engine.css build/plumber-engine.js

build:
	mkdir -p $@
	cp scripts/lib/three.js $@
	cp images/cubemap.png $@/plumber-cubemap.png
	cp images/atlas.svg $@/plumber-atlas.svg

build/index.html: index.html
	cp index.html $@
	perl -i -p0e 's/(html5_scripts.*?\[).*?\]/\1"common.js"]/;' $@
	perl -i -p0e 's/(html5_styles.*?\[).*?\]/\1"common.css"]/;' $@

build/plumber-engine.css: $(estyles)
	cat $^ > $@
	# remove utf-8 BOM char as it's not on start of file
	perl -i -p0e 's/\x{EF}\x{BB}\x{BF}//g' $@

build/plumber-engine.js: $(escripts)
	uglifyjs $^ --compress --mangle --output $@
	# uglifyjs puts "use strict" to start of resulting file - make troubles
	perl -i -p0e 's/^"use strict";//' $@
	# and removes not used variables - IE gets bleeding on setter without arguments
	perl -i -p0e 's/\(set \w\+\)()/\1(_)/' $@



packagedir="$$HOME/web/plumber-engine/"

pack: all
	cp build/plumber-* $(packagedir)
	cd $(packagedir) && git commit -a && git push

clean:
	rm -rf build/

fix:
	perl -i -p0e 's/\s*visibility="hidden"//g' images/atlas.svg
	perl -i -p0e 's/\s*display="none"//g' images/atlas.svg
	perl -i -p0e '/metadata/ d' images/atlas.svg


.PHONY: all build fix package
