/**
 * @providesModule assertNodeType
 */
var _ = require('underscore');
var parser = require('sql-parser');
var invariant = require('../utils/invariant');

function assertNodeType(node/*Object*/, type/*String*/) /* bool */{
    if (!node) {
        //invariant(node, 'node is empty');
        return false;
    }

    invariant(_.isObject(node));
    invariant(type && _.isString(type));

    var types = parser.nodes,
        typeToCompare;

    // Group, Having, Join, Limit, Op, Order, OrderArgument, Select, Star, SubSelect, Table, Union, Where
    typeToCompare = type.substring(0, 1).toUpperCase() + type.substring(1);
    if (types[typeToCompare]) {
        return node instanceof types[typeToCompare];
    }

    // LiteralValue, StringValue, FunctionValue, ListValue
    typeToCompare = typeToCompare + 'Value';
    if (types[typeToCompare]) {
        return node instanceof types[typeToCompare];
    }

    invariant(false, 'type is not found : %s', type);
}

module.exports = assertNodeType;