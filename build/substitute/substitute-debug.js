// requires lang, dump
YUI.add("substitute", function(Y) {

    var L = Y.Lang, DUMP='dump', SPACE=' ', LBRACE='{', RBRACE='}',

    /**
     * Does variable substitution on a string. It scans through the string 
     * looking for expressions enclosed in { } braces. If an expression 
     * is found, it is used a key on the object.  If there is a space in
     * the key, the first word is used for the key and the rest is provided
     * to an optional function to be used to programatically determine the
     * value (the extra information might be used for this decision). If 
     * the value for the key in the object, or what is returned from the
     * function has a string value, number value, or object value, it is 
     * substituted for the bracket expression and it repeats.  If this
     * value is an object, it uses the Object's toString() if this has
     * been overridden, otherwise it does a shallow dump of the key/value
     * pairs.
     *
     * This method is included in the 'i18n' module.  It is not included
     * in the YUI module.
     *
     * @method substitute
     * @param s {String} The string that will be modified.
     * @param o {Object} An object containing the replacement values
     * @param f {Function} An optional function that can be used to
     *                     process each match.  It receives the key,
     *                     value, and any extra metadata included with
     *                     the key inside of the braces.
     * @return {String} the substituted string
     */
    substitute = function (s, o, f) {
        var i, j, k, key, v, meta, saved=[], token;

        for (;;) {
            i = s.lastIndexOf(LBRACE);
            if (i < 0) {
                break;
            }
            j = s.indexOf(RBRACE, i);
            if (i + 1 >= j) {
                break;
            }

            //Extract key and meta info 
            token = s.substring(i + 1, j);
            key = token;
            meta = null;
            k = key.indexOf(SPACE);
            if (k > -1) {
                meta = key.substring(k + 1);
                key = key.substring(0, k);
            }

            // lookup the value
            v = o[key];

            // if a substitution function was provided, execute it
            if (f) {
                v = f(key, v, meta);
            }

            if (L.isObject(v)) {
                if (L.isArray(v)) {
                    v = L.dump(v, parseInt(meta, 10));
                } else {
                    meta = meta || "";

                    // look for the keyword 'dump', if found force obj dump
                    var dump = meta.indexOf(DUMP);
                    if (dump > -1) {
                        meta = meta.substring(4);
                    }

                    // use the toString if it is not the Object toString 
                    // and the 'dump' meta info was not found
                    if (v.toString===Object.prototype.toString||dump>-1) {
                        v = L.dump(v, parseInt(meta, 10));
                    } else {
                        v = v.toString();
                    }
                }
            } else if (!L.isString(v) && !L.isNumber(v)) {
                // This {block} has no replace string. Save it for later.
                v = "~-" + saved.length + "-~";
                saved[saved.length] = token;

                // break;
            }

            s = s.substring(0, i) + v + s.substring(j + 1);


        }

        // restore saved {block}s
        for (i=saved.length-1; i>=0; i=i-1) {
            s = s.replace(new RegExp("~-" + i + "-~"), "{"  + saved[i] + "}", "g");
        }

        return s;

    };

    Y.substitute = substitute;
    L.substitute = substitute;

}, "@VERSION@", {
    optional: ['dump']
});