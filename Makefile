extract=":JOIN /anchor/ { s/.*\[\(.*\)\]/\\1/; t TRIM; N; b JOIN; :TRIM; s/^\s*'\|',\?$$//gm; p }"
styles= $(shell sed -n "$(shell echo $(extract) | sed 's/anchor/styles.html5/')" index.html)
scripts=$(shell sed -n "$(shell echo $(extract) | sed 's/anchor/scripts.html5/')" index.html)


all: build build/index.html build/common.js build/common.css


samples/awg.json: samples/*.awg
	echo "{ \"date\": \"`date`\"" > $@
	for i in $^; do echo -n ",\"`basename $$i`\": "; cat $$i; done >> $@
	echo "}" >> $@
	sed -i 's/\r//g' $@

configs/config.js: configs/*.json samples/awg.json
	echo "var config = { \"date\": \"`date`\"" > $@
	for i in $^; do echo -n ",\"`basename $$i .json`\": "; cat $$i; done >> $@
	echo "}" >> $@


build:
	mkdir -p $@
	ln -s ../images $@/images
	ln -s ../samples $@/samples

build/index.html: index.html gtm.html
	cp index.html $@
	sed -i ':JOIN /scripts.html5/ { s/\[.*\]/["common.js"]/; t END; N; b JOIN }; :END' $@
	sed -i ':JOIN /styles.html5/ { s/\[.*\]/["common.css"]/; t END; N; b JOIN }; :END' $@
	cat gtm.html >> $@

build/common.css: $(styles)
	cat $^ > $@
	# remove utf-8 BOM char as it's not on start of file
	sed -i 's/\xEF\xBB\xBF//g' $@

build/common.js: configs/config.js $(scripts)
	uglifyjs $^ --compress --mangle --output $@
	# uglifyjs puts "use strict" to start of resulting file - make troubles
	sed -i 's/^"use strict";//' $@
	# and removes not used variables - IE gets bleeding on setter without arguments
	sed -i 's/\(set \w\+\)()/\1(_)/' $@

clean:
	rm configs/config.js samples/awg.json
	rm -rf build/

fix:
	sed -i 's/ visibility="hidden"//g' images/atlas.svg
	sed -i '/metadata/ d' images/atlas.svg


.PHONY: all fix
