extract=":JOIN /SEARCH/ { s/.*\[\(.*\)\]/\\1/; t TRIM; N; b JOIN; :TRIM; s/^\s*'\|',\?$$//gm; p; q }"
styles= $(shell sed -n "$(shell echo $(extract) | sed 's/SEARCH/html5_styles/g')" index.html)
scripts=$(shell sed -n "$(shell echo $(extract) | sed 's/SEARCH/html5_scripts/g')" index.html)

estyles= $(shell sed -n "$(shell echo $(extract) | sed 's/SEARCH/html5_styles/g')" engine.html)
escripts=$(shell sed -n "$(shell echo $(extract) | sed 's/SEARCH/html5_scripts/g')" engine.html)


all: build build/plumber-engine.css build/plumber-engine.js

build:
	mkdir -p $@
	cp scripts/lib/three.js $@
	cp images/cubemap.png $@/plumber-cubemap.png
	cp images/atlas.svg $@/plumber-atlas.svg

build/index.html: index.html
	cp index.html $@
	sed -i ':JOIN /html5_scripts/ { s/\[.*\]/["common.js"]/; t END; N; b JOIN }; :END' $@
	sed -i ':JOIN /html5_styles/ { s/\[.*\]/["common.css"]/; t END; N; b JOIN }; :END' $@

build/plumber-engine.css: $(estyles)
	cat $^ > $@
	# remove utf-8 BOM char as it's not on start of file
	sed -i 's/\xEF\xBB\xBF//g' $@

build/plumber-engine.js: $(escripts)
	uglifyjs $^ --compress --mangle --output $@
	# uglifyjs puts "use strict" to start of resulting file - make troubles
	sed -i 's/^"use strict";//' $@
	# and removes not used variables - IE gets bleeding on setter without arguments
	sed -i 's/\(set \w\+\)()/\1(_)/' $@



pack: all
	cp build/plumber-* ../plumber-engine/

clean:
	rm -rf build/

fix:
	sed -i 's/ visibility="hidden"//g' images/atlas.svg
	sed -i '/metadata/ d' images/atlas.svg


.PHONY: all build fix package
