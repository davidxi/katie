/**
 * @providesModule fromClause
 */
/*jshint -W061 */

var _ = require('underscore');
var invariant = require('../utils/invariant');
var TableObj = require('../core/TableObject');
var assertNodeType = require('../core/assertNodeType');

function from(traverseTreeFn, node) {
    if (assertNodeType(node, 'table')) {
        return _fromTable(node);
    } else if (assertNodeType(node, 'subSelect')) {
        var selectNode = node.select;
        var tableName = node.name.value;
        var tableObj = traverseTreeFn(selectNode);
        tableObj.name = tableName;
        return tableObj;
    } else {
        invariant(false, 'table or sub-select required');
    }
}

function _fromTable(tableNode) /* TableObj */ {
    invariant(assertNodeType(tableNode, 'table'));

    var source = tableNode.name,
        tableName = source.value;

    var data = eval(tableName);
    invariant(data && _.isArray(data));

    return new TableObj(Array.prototype.slice.call(data, 0), tableName);
}

module.exports = from;