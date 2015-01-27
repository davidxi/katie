/**
 * @providesModule whereClause
 */
/* jshint eqnull:true */

var _ = require('underscore');
var invariant = require('../utils/invariant');

function where(traverseTreeFn, tableObj, whereNode) {
    var table = tableObj.data();

    var result = [];
    _.each(table, function(row) {
        var eligible = _whereEvalWalkTree(row, whereNode);
        if (eligible) {
            result.push(row);
        }
    });

    return tableObj.update(result);
}

function _whereEvalWalkTree(row, node) /*boolean*/{
    if (!node) {
        return true;
    }

    /* column, op, val */
    var op = node.operation,
        column,
        val;

    op = op.trim().toLowerCase();

    switch (op) {
        case 'and':
            return _whereEvalWalkTree(row, node.left) &&
                    _whereEvalWalkTree(row, node.right);
        case 'or':
            return _whereEvalWalkTree(row, node.left) ||
                    _whereEvalWalkTree(row, node.right);
        default:
            break;
    }

    column = node.left.value;
    val = node.right.value;

    switch (op) {
        case '=':
            return row[column] == val;
        case '<>':
            return row[column] != val;
        case '>':
            return row[column] > val;
        case '<':
            return row[column] < val;
        case 'like':
            return (function() {
                var reg = new RegExp(val, 'ig');
                return reg.test(row[column]);
            })();
        case 'in':
            return (function() {
                if (!_.isArray(val)) {
                    invariant(false, 'should be an array in IN clause');
                    return row[column] == val;
                }

                // expect StingValue || NumberValue
                val = _.pluck(val, 'value');

                return _.intersection(val, [row[column]]).length > 0;
            })();
        case 'is':
            if (val == null) {
                return row[column] === null;
            }
            /* falls through */
        case 'is not':
            if (val == null) {
                return row[column] !== null;
            }
            /* falls through */
        default:
            invariant(false, "unsupported operand : %s %s %s", column, op, val);
    }
}

module.exports = where;