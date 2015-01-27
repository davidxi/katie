/**
 * @providesModule base
 */
var parser = this.SQLParser;

var _ = require('underscore');
var invariant = require('./utils/invariant');
var traverse = require('./core/traverseTree');

module.exports = {
    parse: function(stmt) {
        invariant(stmt && _.isString(stmt));

        var tree = parser.parse(stmt);
        var tableObj = traverse(tree);

        return tableObj.data();
    }
};