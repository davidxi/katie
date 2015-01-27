/**
 * @providesModule joinClause
 */
var _ = require('underscore');
var invariant = require('../utils/invariant');

var assertNodeType = require('../core/assertNodeType');

var _from = require('../clauses/fromClause');

function join(traverseTreeFn, tableObj, joinNode) {
    var table1 = tableObj.data(),
        table2;
    /* {condition: Op, right: Table||SubSelect, side: string} */

    var tableToJoin,
        tableNode = joinNode.right;
    if (!assertNodeType(tableNode, 'table') &&
        !assertNodeType(tableNode, 'subSelect')) {
        invariant(false, 'expect table node in join claus');
    }

    tableToJoin = _from(tableNode);
    table2 = tableToJoin.data();

    var joinMethod = joinNode.side || '',
        joinCondition = joinNode.conditions;

    var result = [];
    var tableName1 = tableObj.name,
        tableName2 = tableToJoin.name;

    joinMethod = joinMethod.toLowerCase();

    switch (joinMethod) {
        case 'left':
            result = _mergeTable(1, table1, table2, tableName1, tableName2, joinCondition);
            break;
        case 'right':
            result = _mergeTable(1, table2, table1, tableName2, tableName1, joinCondition);
            break;
        default:
            result = _mergeTable(0, table1, table2, tableName1, tableName2, joinCondition);
            break;
    }

    return tableObj.update(result);
}

// table2 --merge into--> table1
function _mergeTable(mode, table1, table2, tableName1, tableName2, joinCondition) /*array*/ {
    var result = [];

    var mergeProps = function(row1, row2, tableName1) {
        var item = {};
        for (var prop1 in row1) {
            if (!_.has(row1, prop1)) continue;

            if (_.has(row2, prop1)) {
                item[tableName1 + '.' + prop1] = row1[prop1];
            } else {
                item[prop1] = row1[prop1];
            }
        }
        return item;
    };

    var len1 = table1.length,
        len2 = table2.length,
        row1, row2, i, j,
        flagNewItem,
        item;

    for (i = 0; i < len1; i++) {
        row1 = table1[i];
        flagNewItem = false;
        for (j = 0; j < len2; j++) {
            row2 = table2[j];

            if (!_evalJoinCondition(row1, row2, tableName1, tableName2, joinCondition)) continue;

            // merge props from two rows
            item = {};
            item = _.extend(item, mergeProps(row1, row2, tableName1));
            item = _.extend(item, mergeProps(row2, row1, tableName2));
            result.push(item);

            flagNewItem = true;
            break;
        }

        // insert null field row for left-join/right-join
        if (mode > 0 && flagNewItem === false) {
            // create a blank row2 to merge row1
            var row2Blank = Object.clone(row2);
            for (var prop in row2Blank) {
                if (_.has(row2Blank, prop)) {
                    row2Blank[prop] = null;
                }
            }

            item = {};
            item = _.extend(item, mergeProps(row1, row2Blank, tableName1));
            item = _.extend(item, mergeProps(row2Blank, row1, tableName2));
            result.push(item);
        }
    }

    return result;
}

function _evalJoinCondition(row1, row2, tableName1, tableName2, /*Condition*/ node) {
    var op = node.operation,
        argsToKeep = Array.prototype.slice.call(arguments, 0, 4);

    op = op.toLowerCase();

    switch (op) {
        case 'and':
            /* falls through */
        case 'or':
            var _evalLeft = _evalJoinCondition.apply(null, argsToKeep.concat([node.left]));
            var _evalRight = _evalJoinCondition.apply(null, argsToKeep.concat([node.right]));

            if (op === 'and') {
                return _evalLeft && _evalRight;
            } else {
                return _evalLeft || _evalRight;
            }
            /* falls through */
        default:
            break;
    }

    // lhs and rhs should be LiteralValue node
    var value1, value2,
        lhs = node.left,
        rhs = node.right;

    var extractField = function(lhs) {
        var value,
            tableName = lhs.values[0],
            columnName = lhs.values[1];

        if (tableName1 === tableName)
            value = row1[columnName];
        else if (tableName2 === tableName)
            value = row2[columnName];
        else
            invariant(false, "can't find field in join on condition : %s.%s", tableName, columnName);
        return value;
    };

    value1 = extractField(lhs);
    value2 = extractField(rhs);

    switch (op) {
        case '=':
            return value1 === value2;
        default:
            invariant(false, 'not support this operand in join on condition : %s', op);
            return false;
    }
}

module.exports = join;