/**
 * @providesModule traverseTree
 */
var invariant = require('../utils/invariant');

var assertNodeType = require('./assertNodeType');

var _from = require('../clauses/fromClause');
var _join = require('../clauses/joinClause');
var _limit = require('../clauses/limitClause');
var _orderBy = require('../clauses/orderByClause');
var _select = require('../clauses/selectClause');
var _where = require('../clauses/whereClause');

function traverseTree(tree, result) /*tableObj*/ {
    invariant(assertNodeType(tree, 'select'), 'expect select node being root');

    var node;
    result = result || [];

    // FROM clause
    node = tree.source;
    result = _from(node);

    // JOIN clause
    node = tree.joins; // array of [Join]
    // TODO : only process the first table in join clause
    if ((node = node[0]) && assertNodeType(node, 'join')) {
        result = _join(traverseTree, result, node);
    }

    // WHERE clause
    node = tree.where;
    if (assertNodeType(node, 'where')) {
        result = _where(traverseTree, result, node.conditions);
    }

    // GROUP BY clause
    node = tree.group;
    if (assertNodeType(node, 'group')) {
        result = _groupBy(traverseTree, [result].concat(node.fields));
    }

    // SELECT clause
    node = tree.fields; // array of [Field]
    if ((node.length >>> 0) && assertNodeType(node[0], 'field')) {

        // TODO check if exist non-aggregate fields not in aggregate function

        result = _select(traverseTree, [result].concat(node));
    }

    // ORDER BY clause
    node = tree.order;
    if (assertNodeType(node, 'order')) {
        result = _orderBy(traverseTree, [result].concat(node.orderings));
    }

    // LIMIT clause
    node = tree.limit;
    if (node && assertNodeType(node, 'limit')) {
        result = _limit(traverseTree, [result].concat(node));
    }

    return result;
}

module.exports = traverseTree;