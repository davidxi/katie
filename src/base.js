/**
 * @providesModule base
 */
var _ = require('underscore');
var parser = require('sql-parser');
var invariant = require('./utils/invariant');
var traverse = require('./core/traverseTree');

module.exports = {
    parse: function(stmt, dataSourcesMapping) {
        invariant(stmt && _.isString(stmt));

        var tree = parser.parse(stmt);
        var tableObj = traverse(tree, null, dataSourcesMapping);

        return tableObj.data();
    }
};