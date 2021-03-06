    /**
     * The Node Utility provides a DOM-like interface for interacting with DOM nodes.
     * @module node
     * @submodule node-base
     */    

    /**
     * The Node class provides a wrapper for manipulating DOM Nodes.
     * Node properties can be accessed via the set/get methods.
     * Use Y.get() to retrieve Node instances.
     *
     * <strong>NOTE:</strong> Node properties are accessed using
     * the <code>set</code> and <code>get</code> methods.
     *
     * @class Node
     * @constructor
     */

    var OWNER_DOCUMENT = 'ownerDocument',
        TAG_NAME = 'tagName',
        NODE_NAME = 'nodeName',
        NODE_TYPE = 'nodeType',

        Selector = Y.Selector,
        _instances = {},
        _restrict = {},
        _slice = [].slice;

    // used with previous/next/ancestor tests
    var _wrapFn = function(fn) {
        var ret = null;
        if (fn) {
            ret = (typeof fn === 'string') ?
            function(n) {
                return Y.Selector.test(n, fn);
            } : 
            function(n) {
                return fn(Y.get(n));
            };
        }

        return ret;
    };

    var _getDoc = function(node) {
        var doc = Y.config.doc;

        if (node) {
            if (node[NODE_TYPE]) { // use nodeName: #document
                if (node[NODE_TYPE] === 9) { // already a document node
                    doc = node;
                } else {
                    doc = node[OWNER_DOCUMENT];
                }
            } else if (Node[node._yuid]) { // Node instance document
                doc = Node[node._yuid]()[0];
            }
        }

        return doc;
    };

    var _getDOMNode = function(node) {
        if (node && !node[NODE_TYPE] && node._yuid) {
            node = Node[node._yuid]()[0];
        }

        return  node || null;
    };

    var Node = function() {
        this.init.apply(this, arguments);
    };

    /**
     * @property PLUGINS
     * Registry for statically configured plugins.
     * Default plugins added to all Node instances. 
     * @static
     * Plugins are registered as objects with "fn" and "cfg" fields:
     * Y.Node.PLUGINS.push({ fn: Y.plugin.NodeFX, cfg: {easing: 'easeOut'} });
     */
    Node.PLUGINS = [];

    /**
     * @method Node.plug
     * Add a default plugin to be plugged into all instances. 
     * @static
     * @param {Function || String} p The plugin class. String assumes Y.plugin[p]
     * @param {Object} config A default plugin configuration applied to all instances.
     * 
     */
    Node.plug = function(p, config) {
        Node.PLUGINS.push({fn: p, cfg: config}); 
    };

    Node._deepGet = function (path, val) {
        var pl = path.length,
            i;

        if (pl > 0) {
            for (i = 0; val !== undefined && i < pl; ++i) {
                val = val[path[i]];
            }
        }

        return val;
    };

    Node._deepSet = function(path, val, subval) {
        var leafIdx = path.length-1,
            i,
            o;

        if (leafIdx >= 0) {
            o = val;

            for (i = 0; o !== undefined && i < leafIdx; ++i) {
                o = o[path[i]];
            }

            if (o !== undefined && o[path[i]] !== undefined) {
                o[path[i]] = subval;
            }
        }
    };

    Node.scrubVal = function(val, node, depth) {
        if (val !== undefined) {
            if (typeof val === 'object' || typeof val === 'function') { // safari nodeList === function
                if (val !== null && (
                        NODE_TYPE in val || // dom node
                        val.item || // dom collection or Node instance
                        (val[0] && val[0][NODE_TYPE]) || // assume array of nodes
                        val.document) // window TODO: restrict?
                    ) { 
                    if (node && _restrict && _restrict[node._yuid] && !node.contains(val)) {
                        val = null; // not allowed to go outside of root node
                    } else {
                        if (val[NODE_TYPE] || val.document) { // node or window
                            val = Node.get(val);
                        } else {
                            val = Node.all(val);
                        }
                    }
                } else {
                    depth = (depth === undefined) ? 4 : depth;
                    if (depth > 0) {
                        for (var i in val) { // TODO: test this and pull hasOwnProperty check if safe?
                            if (val.hasOwnProperty && val.hasOwnProperty(i)) {
                                val[i] = Node.scrubVal(val[i], node, --depth);
                            }
                        }
                    }
                    
                }
            }
        } else {
            val = node; // for chaining
        }

        return val;
    };

    Node.setters = {};
    Node.getters = {
        /**
         * Normalizes nodeInnerText and textContent. 
         * @property text
         * @type String
         */
        'text': function(node) {
            return Y.DOM.getText(node);
        },

        'options': function(node) {
            return (node) ? node.getElementsByTagName('option') : [];
        },

        /**
         * Returns a NodeList instance. 
         * @property children
         * @type NodeList
         */
        'children': function(node) {
            var children = node.children;

            if (children === undefined) {
                var childNodes = node.childNodes;
                children = [];

                for (var i = 0, len = childNodes.length; i < len; ++i) {
                    if (childNodes[i][TAG_NAME]) {
                        children[children.length] = childNodes[i];
                    }
                }
            }
            return children;
        }
    };

    Node.methods = function(name, fn) {
        if (typeof name == 'string') {
            Node.prototype[name] = function() {
                var args = _slice.call(arguments, 0),
                    instance = this,
                    getAll =  (_instances[this._yuid]) ? false : true, // return array of vals for lists
                    ret = (getAll) ? [] : null,
                    val;

                var getValue = function(node) {
                    args[0] = node;
                    val = Node.scrubVal(fn.apply(instance, args), instance);

                    if (getAll) {
                        ret[ret.length] = val;
                    } else {
                        ret = val;
                    }
                };

                args.unshift('');
                Node[instance._yuid](getValue);
                return ret;
            };
        } else { // assume object
            Y.each(name, function(fn, name) {
                Node.methods(name, fn);
            });
        }

    };

    /** 
     *   @method getDOMNode
     *   @static
     *   @param node A Node instance
     * @return DOMNode The DOM node bound to the Node instance
     */
    Node.getDOMNode = _getDOMNode;
    
    Node.wrapDOMMethod = function(name) {
        return function() {
            return Y.DOM[name].apply(Y.DOM, arguments);
        };

    };

    // rename and mark as protected
    Node.addDOMMethods = function(methods) {
        var add = {}; 
        Y.each(methods, function(v, n) {
            add[v] = Node.wrapDOMMethod(v);
        });

        Node.methods(add);
    };

    Node.prototype = {
        init: function(nodes, doc, isRoot, getAll) {
            var uid,
                instance = this;

            doc = _getDoc(doc);

            this.getId = function() {
                return uid;
            };

            var _all = function(fn, i, context) {
                if (fn) {
                    i = i || 0;
                    context = context || instance;

                    for (var node; node = nodes[i++];) {
                        fn.call(context, node, i - 1, instance);
                    }
                }
                return nodes;
            };

            // uid = selector || Y.guid(); // to cache queryAll results
            uid = Y.guid();

            if (nodes) { // zero length collection returns null
                if (nodes[NODE_TYPE] || nodes.document) { // node or window TODO: move to helper fn
                    nodes = [nodes];
                }
            } else {
                nodes = [];
            }

            if (!getAll && nodes.length) { // stamp the dom node
                try { // IE only allows ID on Element
                    if (nodes[0].uniqueID) {
                        uid = nodes[0].uniqueID;
                    }
                    nodes[0]._yuid = uid;
                } catch(e) { // not cacheable
                    Y.log(nodes[0] + ' is not cacheable', 'warn', 'Node'); 
                }
            }

            this._yuid = uid;
            Node[uid] = _all; // for applying/returning dom nodes

            if (!getAll) {
                _instances[uid] = this;
            }

            this._initPlugins();
        },

        _initPlugins: function(config) { 
            if (Y.Node.PLUGINS) { 
                this.plug(Y.Node.PLUGINS); 
            } 
        }, 

        /**
         * Filters the NodeList instance down to only nodes matching the given selector.
         * @method filter
         * @param {String} selector The selector to filter against
         * @return {NodeList} NodeList containing the updated collection 
         * @see Selector
         */
        filter: function(selector) {
            return Node.scrubVal(Selector.filter(Node[this._yuid](), selector), this);
        },

        /**
         * Applies the given function to each Node in the NodeList.
         * @method each
         * @param {Function} fn The function to apply 
         * @param {Object} context optional An optional context to apply the function with
         * Default context is the NodeList instance
         * @return {NodeList} NodeList containing the updated collection 
         * @chainable
         */
        each: function(fn, context) {
            var instance = this;
            context = context || this;
            Y.each(Node[this._yuid](), function(node, index) {
                return fn.call(context, Y.get(node), index, instance);
            });
        },

        /**
         * Returns the current number of items in the NodeList.
         * @method size
         * @return {Int} The number of items in the NodeList. 
         */
        size: function() {
            return Node[this._yuid]().length;
        },

        /**
         * Retrieves the Node instance at the given index. 
         * @method item
         *
         * @param {Number} index The index of the target Node.
         * @return {Node} The Node instance at the given index.
         */
        item: function(index) {
            var node = Node[this._yuid]()[index];
            return Node.get(node);
        },

       /**
         * Attaches a DOM event handler.
         * @method attach
         * @param {String} type The type of DOM Event to listen for 
         * @param {Function} fn The handler to call when the event fires 
         * @param {Object} context An optional context to execute the handler,
         * with, defaults to the Node instance
         * @param {Object} arg An argument object to pass to the handler 
         */

        attach: function(type, fn, context, arg) {
            var args = _slice.call(arguments, 0);
            args.splice(2, 0, Node[this._yuid]());
            return Y.Event.attach.apply(Y.Event, args);
        },

       /**
         * Alias for attach.
         * @method on
         * @param {String} type The type of DOM Event to listen for 
         * @param {Function} fn The handler to call when the event fires 
         * @param {Object} arg An argument object to pass to the handler 
         * @see attach
         */
        on: function(type, fn, arg) {
            return this.attach.apply(this, arguments);
        },

       /**
         * Detaches a DOM event handler. 
         * @method detach
         * @param {String} type The type of DOM Event
         * @param {Function} fn The handler to call when the event fires 
         */
        detach: function(type, fn) {
            var args = _slice.call(arguments, 0);
            args.splice(2, 0, Node[this._yuid]());
            return Y.Event.detach.apply(Y.Event, args);
        },

       /**
         * Creates a Node instance from HTML string
         * @method create
         * @param {String|Array} html The string of html to create
         * @return {Node} A new Node instance 
         */
        create: function(html) {
            return Y.Node.create(html);
        },

        /**
         * Applies the supplied plugin to the node.
         * @method plug
         * @param {Function} The plugin Class to apply
         * @param {Object} config An optional config to pass to the constructor
         * @chainable
         */
        plug: function(p, cfg) {
            if (p) {
                if (typeof p === 'string' && Y.plugin) {
                    this._plug(Y.plugin[p], cfg);
                } else if (p.fn) {
                    this.plug(p.fn, p.cfg);
                } else if (Y.Lang.isFunction(p)) {
                    this._plug(p, cfg);
                } else {
                    for (var i = 0, len = p.length; i < len; ++i) {
                        this.plug(p[i]);
                    }
                }
            }
            return this;
        },

        _plug: function(PluginClass, config) {
            if (PluginClass && PluginClass.NS) {
                var ns = PluginClass.NS;

                // TODO: configurable plugin nodeType?
                if (PluginClass.ALLOW_LISTS === true || Node[this._yuid]().length === 1) {
                    config = config || {};
                    config.owner = this;

                    this[ns] = new PluginClass(config);
                } else {
                    this[ns] = null;
                    Y.log(ns + ' plugin is not enabled for multiple nodes', 'warn', 'Node');
                }
            }
        },

        //normalize: function() {},
        //isSupported: function(feature, version) {},
        toString: function() {
            var str = this._yuid + ': ',
                errorMsg = this._yuid + ': not bound to any nodes',
                nodes = Node[this._yuid]() || {};

            if (nodes) {
                var node = nodes[0];
                str += node[NODE_NAME];
                if (node.id) {
                    str += '#' + node.id; 
                }

                if (node.className) {
                    str += '.' + node.className.replace(' ', '.'); 
                }

                if (nodes.length > 1) {
                    str += '...[' + nodes.length + ' items]';
                }
            }
            return str || errorMsg;
        }
    };

    Node.methods({
        addEventListener: function() {
            return Y.Event.nativeAdd.apply(Y.Event, arguments);
        },
        
        removeEventListener: function() {
            return Y.Event.nativeRemove.apply(Y.Event, arguments);
        },

        /**
         * Set the value of the property/attribute on the HTMLElement bound to this Node.
         * Only strings/numbers/booleans are passed through unless a SETTER exists.
         * @method set
         * @param {String} prop Property to set 
         * @param {any} val Value to apply to the given property
         * @chainable
         */
        // TODO: document.location.href
        // TODO: blacklist?
        set: function(node, prop, val) {
            if (prop.indexOf('.') < 0) {
                if (prop in Node.setters) { // use custom setter
                    Node.setters[prop](node, val, prop);  // passing Node instance
                } else if (node[prop] !== undefined) { // no expandos 
                    node[prop] = val;
                } else {
                    Y.log(prop + ' not in ' + node, 'warn', 'Node');
                }
            } else {
                Node._deepSet(prop.split('.'), node, val);
            }
        },

        /**
         * Get the value of the property/attribute on the HTMLElement bound to this Node.
         * Only strings/numbers/booleans are passed through unless a GETTER exists.
         * @method get
         * @param {String} prop Property to get 
         * @return {any} Current value of the property
         */

        // TODO: blacklist?
        get: function(node, prop) {
            var val = null;
            if (prop) {
                if (prop.indexOf('.') < 0) {
                    if (prop in Node.getters) { // use custom getter
                        val = Node.getters[prop].call(this, node, prop);
                    } else {
                        val = node[prop];
                    }

                    // method wrapper uses undefined in chaining test
                    if (val === undefined) {
                        val = null;
                    }
                } else {
                    val = Node._deepGet(prop.split('.'), node);
                }
            }

            return val;
        },

        // TODO: safe enough? 
        invoke: function(node, method, a, b, c, d, e) {
            var ret;

            if (a) { // first 2 may be Node instances
                a = (a[NODE_TYPE]) ? a : _getDOMNode(a);
                if (b) {
                    b = (b[NODE_TYPE]) ? b : _getDOMNode(b);
                }
            }

            ret = node[method](a, b, c, d, e);    
            return ret;
        },

// TODO: need this?  check for fn; document this
        hasMethod: function(node, method) {
            return !! node[method];
        },

        /**
         * Retrieves a Node instance of nodes based on the given CSS selector. 
         * @method query
         *
         * @param {string} selector The CSS selector to test against.
         * @return {Node} A Node instance for the matching HTMLElement.
         */
        query: function(node, selector) {
            var ret = Selector.query(selector, node, true);
            if (!ret) {
                ret = null;
            }

            return ret;
        },

        /**
         * Retrieves a nodeList based on the given CSS selector. 
         * @method queryAll
         *
         * @param {string} selector The CSS selector to test against.
         * @return {NodeList} A NodeList instance for the matching HTMLCollection/Array.
         */
        queryAll: function(node, selector) {
            var ret = Selector.query(selector, node);
            if (!ret.length) {
                ret = null;
            }

            return ret;
        },

        // TODO: allow fn test
        /**
         * Test if the supplied node matches the supplied selector.
         * @method test
         *
         * @param {string} selector The CSS selector to test against.
         * @return {boolean} Whether or not the node matches the selector.
         */
        test: function(node, selector) {
            return Selector.test(node, selector);
        },

        /**
         * Compares nodes to determine if they match.
         * Node instances can be compared to each other and/or HTMLElements.
         * @method compareTo
         * @param {HTMLElement | Node} refNode The reference node to compare to the node.
         * @return {Boolean} True if the nodes match, false if they do not. 
         */
        compareTo: function(node, refNode) {
            refNode = _getDOMNode(refNode) || node;
            return node === refNode;
        },

       /**
         * Returns the nearest ancestor that passes the test applied by supplied boolean method.
         * @method ancestor
         * @param {String | Function} fn A selector or boolean method for testing elements.
         * If a function is used, it receives the current node being tested as the only argument.
         * @return {Node} The matching Node instance or null if not found
         */
        ancestor: function(node, fn) {
            return Y.DOM.elementByAxis(node, 'parentNode', _wrapFn(fn));
        },

        /**
         * Returns the previous matching sibling. 
         * Returns the nearest element node sibling if no method provided.
         * @method previous
         * @param {String | Function} fn A selector or boolean method for testing elements.
         * If a function is used, it receives the current node being tested as the only argument.
         * @param {Boolean} all optional Whether all node types should be returned, or just element nodes.
         * @return {Node} Node instance or null if not found
         */
        previous: function(node, fn, all) {
            return Y.DOM.elementByAxis(node, 'previousSibling', _wrapFn(fn), all);
        }, 

        /**
         * Returns the next matching sibling. 
         * Returns the nearest element node sibling if no method provided.
         * @method next
         * @param {String | Function} fn A selector or boolean method for testing elements.
         * If a function is used, it receives the current node being tested as the only argument.
         * @param {Boolean} all optional Whether all node types should be returned, or just element nodes.
         * @return {Node} Node instance or null if not found
         */
        next: function(node, fn, all) {
            return Y.DOM.elementByAxis(node, 'nextSibling', _wrapFn(fn), all);
        },
        
        /**
         * Determines whether the ndoe is an ancestor of another HTML element in the DOM hierarchy.
         * @method contains
         * @param {Node | HTMLElement} needle The possible node or descendent
         * @return {Boolean} Whether or not this node is the needle its ancestor
         */
        contains: function(node, needle) {
            return Y.DOM.contains(node, _getDOMNode(needle));
        },

        /**
         * Determines whether the node is appended to the document.
         * @method inDoc
         * @param {Node|HTMLElement} doc optional An optional document to check against.
         * Defaults to current document. 
         * @return {Boolean} Whether or not this node is appended to the document. 
         */
        inDoc: function(node, doc) {
            doc = (doc) ? _getDoc(doc) : node.ownerDocument;
            if (doc.documentElement) {
                return Y.DOM.contains(doc.documentElement, node);
            }
        },

        getById: function(node, id) {
            var ret = node[OWNER_DOCUMENT].getElementById(id);
            if (!ret || !Y.DOM.contains(node, ret)) {
                ret = null;
            }
            return ret;
        }

    });

    /** 
     * Creates a Node instance from an HTML string
     * @method create
     * @param {String} html HTML string
     */
    Node.create = function(html) {
        return Node.get(Y.DOM.create(html));
    };

    Node.getById = function(id, doc) {
        doc = (doc && doc[NODE_TYPE]) ? doc : Y.config.doc;
        return Node.get(doc.getElementById(id));
    };

    /**
     * Retrieves a Node instance for the given query or nodes. 
     * Note: Use 'document' string to retrieve document Node instance from string
     * @method Y.get
     * @static
     * @param {document|HTMLElement|HTMLCollection|Array|String} node The object to wrap.
     * @param {document|Node} doc optional The document containing the node. Defaults to current document.
     * @param {boolean} isRoot optional Whether or not this node should be treated as a root node. Root nodes
     * aren't allowed to traverse outside their DOM tree.
     * @return {Node} A Node instance bound to the supplied node(s).
     */
    // TODO: check restricted return
    // rename isRoot to restricted
    Node.get = function(node, doc, isRoot, getAll) {
        var instance;


        if (node && node instanceof Node) { // return existing Node instance
            return node;
        } else if (typeof node === 'string') {
            node = Node._getByString(node, doc, getAll);
        }

        if (node) {
            if (!getAll) { // reuse single element node instances
                if (node._yuid) {
                    // verify IE's uniqueID in case the node was cloned
                    if (!node.uniqueID || (node.uniqueID === node._yuid)) {
                        instance = _instances[node._yuid];
                    }
                }
            }

            if (!instance) {
                instance = new Node(node, doc, isRoot, getAll);
            }

            if (instance && isRoot && !getAll) {
                _restrict[instance._yuid] = true;
            }
        }

        // zero length collection returns null
        return (instance && instance.size()) ? instance : null;
    };

    Node._getByString = function(str, doc, getAll) {
        var node;

        if (/^win(?:dow)?/.test(str)) {
                node = Y.config.win;
        } else if (/^doc(?:ument)?/.test(str)) {
                node = Y.config.doc;
        } else {
            node = Selector.query(str, doc, !getAll);
        }

        return node;
    };

    /**
     * Retrieves a NodeList instance for the given object/string. 
     * @method Y.all
     * @static
     * @param {HTMLCollection|Array|String} node The object to wrap.
     * @param {document|Node} doc optional The document containing the node. Defaults to current document.
     * @param {boolean} isRoot optional Whether or not this node should be treated as a root node. Root nodes
     * @return {NodeList} A NodeList instance for the supplied nodes.
     */
    Node.all = function(node, doc, isRoot) {
        return Node.get.call(Node, node, doc, isRoot, true);
    };

    Y.Array.each([
        /**
         * Passes through to DOM method.
         * @method replaceChild
         * @param {HTMLElement | Node} node Node to be inserted 
         * @param {HTMLElement | Node} refNode Node to be replaced 
         * @return {Node} The replaced node 
         */
        'replaceChild',

        /**
         * Passes through to DOM method.
         * @method appendChild
         * @param {HTMLElement | Node} node Node to be appended 
         * @return {Node} The appended node 
         */
        'appendChild',

        /**
         * Passes through to DOM method.
         * @method insertBefore
         * @param {HTMLElement | Node} newNode Node to be appended 
         * @param {HTMLElement | Node} refNode Node to be inserted before 
         * @return {Node} The inserted node 
         */
        'insertBefore',

        /**
         * Passes through to DOM method.
         * @method removeChild
         * @param {HTMLElement | Node} node Node to be removed 
         * @return {Node} The removed node 
         */
        'removeChild',

        /**
         * Passes through to DOM method.
         * @method hasChildNodes
         * @return {Boolean} Whether or not the node has any childNodes 
         */
        'hasChildNodes',

        /**
         * Passes through to DOM method.
         * @method cloneNode
         * @param {HTMLElement | Node} node Node to be cloned 
         * @return {Node} The clone 
         */
        'cloneNode',

        /**
         * Passes through to DOM method.
         * @method hasAttribute
         * @param {String} attribute The attribute to test for 
         * @return {Boolean} Whether or not the attribute is present 
         */
        'hasAttribute',

        /**
         * Passes through to DOM method.
         * @method removeAttribute
         * @param {String} attribute The attribute to be removed 
         * @chainable
         */
        'removeAttribute',

        /**
         * Passes through to DOM method.
         * @method scrollIntoView
         * @chainable
         */
        'scrollIntoView',

        /**
         * Passes through to DOM method.
         * @method getElementsByTagName
         * @param {String} tagName The tagName to collect 
         * @return {NodeList} A NodeList representing the HTMLCollection
         */
        'getElementsByTagName',

        /**
         * Passes through to DOM method.
         * @method focus
         * @chainable
         */
        'focus',

        /**
         * Passes through to DOM method.
         * @method blur
         * @chainable
         */
        'blur',

        /**
         * Passes through to DOM method.
         * Only valid on FORM elements
         * @method submit
         * @chainable
         */
        'submit',

        /**
         * Passes through to DOM method.
         * Only valid on FORM elements
         * @method reset
         * @chainable
         */
        'reset',

        /**
         * Passes through to DOM method.
         * @method select
         * @chainable
         */
         'select'
    ], function(method) {
        Node.prototype[method] = function(arg1, arg2, arg3) {
            var ret = this.invoke(method, arg1, arg2, arg3);
            return ret;
        };
    });

    if (!document.documentElement.hasAttribute) { // IE < 8
        Node.methods('hasAttribute', function(node, attr) {
            return Y.DOM.getAttribute(node, attr) !== '';
        });
    }

    Node.addDOMMethods([
        'getAttribute',
        'setAttribute'
    ]);

    // used to call Node methods against NodeList nodes
    Y.Node = Node;
    Y.all = Y.Node.all;
    Y.get = Y.Node.get;
