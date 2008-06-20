/**
 * Extended Node interface for managing classNames.
 * @module nodeclassname
 */

YUI.add('noderegion', function(Y) {

    /**
     * A Region interface for Node.
     * @interface NodeRegion
     */

    var ATTR = ['region', 'viewportRegion'],
        getNode = Y.Node.getDOMNode;

    Y.each(ATTR, function(v, n) {
        Y.Node.getters(v, Y.Node.wrapDOMMethod(v));
    });

    Y.Node.addDOMMethods([
        'inViewportRegion'
    ]);

    // these need special treatment to extract 2nd node arg
    Y.Node.methods({
        intersect: function(node1, node2, altRegion) {
            return Y.DOM.intersect(getNode(node1), getNode(node2), altRegion); 
        },

        inRegion: function(node1, node2, all, altRegion) {
            if (node2 instanceof Y.Node) { // might be a region object
                node2 = getNode(node2);
            }
            return Y.DOM.inRegion(getNode(node1), node2, all, altRegion); 
        }
    });

}, '3.0.0', { requires: ['node', 'screen', 'region'] });