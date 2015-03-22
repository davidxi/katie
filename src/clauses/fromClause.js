/**
 * @providesModule fromClause
 */
/*jshint -W061 */

var _ = require('underscore');
var invariant = require('../utils/invariant');
var TableObj = require('../core/TableObject');
var assertNodeType = require('../core/assertNodeType');

function from(traverseTreeFn, node, dataSourcesMapping) {
    if (assertNodeType(node, 'table')) {
        return _fromTable(node, dataSourcesMapping);
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

function _fromTable(tableNode, dataSourcesMapping) /* TableObj */ {
    invariant(assertNodeType(tableNode, 'table'));
    invariant(!dataSourcesMapping || _.isObject(dataSourcesMapping));

    var source = tableNode.name,
        tableName = source.value;

    var data;
    if (!dataSourcesMapping) {
        data = eval(tableName);
    } else {
        invariant(tableName in dataSourcesMapping);
        data = dataSourcesMapping[tableName];
    }
    invariant(data && _.isArray(data));

    return new TableObj(Array.prototype.slice.call(data, 0), tableName);
}

module.exports = from;