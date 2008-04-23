YUI.add('json-stringify', function(Y) {

/**
 * Provides Y.json.stringify method for converting objects to JSON strings.
 * @module json
 * @class Y.json
 * @static
 */
var isA = Y.lang.isArray;

Y.json = Y.json || {};

Y.mix(Y.json,{
    /**
     * Regex used to replace special characters in strings for JSON
     * stringification.
     * @property _SPECIAL_CHARS
     * @type {RegExp}
     * @static
     * @private
     */
    _SPECIAL_CHARS : /["\\\x00-\x1f\x7f-\x9f]/g,

    /**
     * Character substitution map for common escapes and special characters.
     * @property _CHARS
     * @type {Object}
     * @static
     * @private
     */
    _CHARS : {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },

    /**
     * Serializes a Date instance as a UTC date string.  Used internally by
     * stringify.  Override this method if you need Dates serialized in a
     * different format.
     * @method dateToString
     * @param d {Date} The Date to serialize
     * @return {String} stringified Date in UTC format YYYY-MM-DDTHH:mm:SSZ
     * @static
     */
    dateToString : function (d) {
        function _zeroPad(v) {
            return v < 10 ? '0' + v : v;
        }

        return '"' + d.getUTCFullYear()   + '-' +
            _zeroPad(d.getUTCMonth() + 1) + '-' +
            _zeroPad(d.getUTCDate())      + 'T' +
            _zeroPad(d.getUTCHours())     + ':' +
            _zeroPad(d.getUTCMinutes())   + ':' +
            _zeroPad(d.getUTCSeconds())   + 'Z"';
    },

    /**
     * Converts an arbitrary value to a JSON string representation.
     * Cyclical object or array references are replaced with null.
     * If a whitelist is provided, only matching object keys will be included.
     * If a depth limit is provided, objects and arrays at that depth will
     * be stringified as empty.
     * @method stringify
     * @param o {MIXED} any arbitrary object to convert to JSON string
     * @param w {Array} (optional) whitelist of acceptable object keys to include
     * @param d {number} (optional) depth limit to recurse objects/arrays (practical minimum 1)
     * @return {string} JSON string representation of the input
     * @static
     * @public
     */
    stringify : function (o,w,d) {

        var m      = Y.json._CHARS,
            str_re = Y.json._SPECIAL_CHARS,
            rep    = typeof w === 'function' ? w : null,
            pstack = []; // Processing stack used for cyclical ref protection

        if (rep || typeof w !== 'object') {
            w = undefined;
        }

        // escape encode special characters
        var _char = function (c) {
            if (!m[c]) {
                var a = c.charCodeAt();
                m[c] = '\\u00' + Math.floor(a / 16).toString(16) +
                                           (a % 16).toString(16);
            }
            return m[c];
        };

        // Enclose the escaped string in double quotes
        var _string = function (s) {
            return '"' + s.replace(str_re, _char) + '"';
        };

        // Use the configured date conversion
        var _date = Y.json.dateToString;
    
        // Worker function.  Fork behavior on data type and recurse objects and
        // arrays per the configured depth.
        var _stringify = function (h,key,d) {
            var o = typeof rep === 'function' ? rep.call(h,key,h[key]) : h[key],
                t = typeof o,
                i,len,j, // array iteration
                k,v,     // object iteration
                a;       // composition array for performance over string concat

            // String
            if (t === 'string') {
                return _string(o);
            }

            // native boolean and Boolean instance
            if (t === 'boolean' || o instanceof Boolean) {
                return String(o);
            }

            // native number and Number instance
            if (t === 'number' || o instanceof Number) {
                return isFinite(o) ? String(o) : 'null';
            }

            // Date
            if (o instanceof Date) {
                return _date(o);
            }

            // Object types
            if (t === 'object') {
                if (!o) {
                    return 'null';
                }

                // Check for cyclical references
                for (i = pstack.length - 1; i >= 0; --i) {
                    if (pstack[i] === o) {
                        return 'null';
                    }
                }

                // Add the object to the processing stack
                pstack[pstack.length] = o;

                a = [];

                // Only recurse if we're above depth config
                if (d > 0) {
                    // Array
                    if (isA(o)) {
                        for (i = o.length - 1; i >= 0; --i) {
                            a[i] = _stringify(o,i,d-1) || 'null';
                        }

                    // Object
                    } else {
                        // If whitelist provided, take only those keys
                        k = isA(w) ? w : Y.object.keys(w||o);

                        for (i = 0, j = 0, len = k.length; i < len; ++i) {
                            if (typeof k[i] === 'string') {
                                v = _stringify(o,k[i],d-1);
                                if (v) {
                                    a[j++] = _string(k[i]) + ':' + v;
                                }
                            }
                        }
                    }
                }

                // remove the array from the stack
                pstack.pop();

                return isA(o) ? '['+a.join(',')+']' : '{'+a.join(',')+'}';
            }

            return undefined; // invalid input
        };

        // Default depth to POSITIVE_INFINITY
        d = d >= 0 ? d : 1/0;

        // process the input
        return _stringify({'':o},'',d);
    }
});


}, '@VERSION@' );