/**
 * @providesModule selectClause
 */
var _ = require('underscore');

var aggregateFields = require('../core/aggregateFields');
var assertNodeType = require('../core/assertNodeType');

function select(traverseTreeFn, tableObj, column /*, ?column, ?column ... */) {
    var table = tableObj.data();

    var result = [],
        columns;

    columns = Array.prototype.slice.call(arguments, 2);

    table = aggregateFields(tableObj);

    _.each(table, function(row) {
        var item = {};
        var displayName,
            value,
            columnObj, // Field
            i = columns.length;
        while (i--) {
            columnObj = columns[i];
            displayName = _getSelectFieldDisplayName(columnObj);
            value = _walkSelectField(row, columnObj.field);
            item[displayName] = value;
        }

        result.push(item);
    });

    return tableObj.update(result);
}

function _getSelectFieldDisplayName(columnObj) {
    if (columnObj.name) {
        return columnObj.name.value;
    } else {
        return columnObj.field.value;
    }
}

function _walkSelectField(row, columnNode) {
    if (assertNodeType(columnNode, 'function')) {
        var fnArgs = columnNode.arguments;
        var fnName = columnNode.name;
        // TODO : only deal first argument
        return aggregateFields.applyAggregate(fnName, _walkSelectField(row, fnArgs[0]));
    } else if (assertNodeType(columnNode, 'literal')) {
        var values = columnNode.values; // array
        if (values.length == 1) {
            return row[values[0]];
        } else {
            // column has joined table name
            return row[values[0] + '.' + values[1]];
        }
    } else if (assertNodeType(columnNode, 'number')) {
        return columnNode.value;
    } else if (assertNodeType(columnNode, 'op')) {
        var left  = _walkSelectField(row, columnNode.left);
        var op    = columnNode.operation;
        var right = _walkSelectField(row, columnNode.right);
        return _operand(left, op, right);
    } else {
        invariant(false, 'unsupport select field : %s', columnNode);
    }
}

function _operand(op1, op, op2) {
    var result = op1;
    if (_.isArray(op2)) {
        invariant(false, "operand 2 can't be an array : %s", op2);
        op2 = op2[0];
    }
    if (_.isArray(result)) {
        return result.map(function(item) {
            return _operand(item, op, op2);
        });
    }
    switch (op) {
        case '+': result = (+result) + (+op2); break;
        case '-': result = result - op2; break;
        case '*': result = result * op2; break;
        case '/': result = result / op2; break;
        default: invariant(false, 'unsupport operand : %s', op2); break;
    }
    return result;
}

module.exports = select;