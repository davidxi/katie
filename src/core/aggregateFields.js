/**
 * @providesModule aggregateFields
 */
var _ = require('underscore');
var invariant = require('../utils/invariant');

function aggregateFields(tableObj, fields) /*array*/ {
    var table = tableObj.data();
    var internalGroupIdKey = tableObj.internalGroupIdKey;

    if (!tableObj.groupKey.length) {
        return table;
    }

    /**
     * alternative 1: each row with internal group id

    var map = {};

    var fields = Array.prototype.slice.call(arguments, 1);
    _.each(table, function(row) {
        var _groupId = row[internalGroupIdKey];

        if (_.isUndefined(_groupId)) {
            // no group-by proceed on this table obj
            throw $break;
        }

        map[_groupId] = map[_groupId] || (Object.clone(row));

        _.each(fields, function(fieldNode) {
            var fn = fieldNode['aggregate'];
            var field = fieldNode['originalColumn'];

            fn = fn.toLowerCase();
            map[_groupId][field] = _aggregateFn(fn, map[_groupId][field], row[field]);

        }); // ./ fields.forEach()

    }); // ./ table.forEach()

    var result = [];
    for (var _groupId in map) {
        if (!_.has(map, _groupId)) continue;
        result.push(map[_groupId]);
    }

    return result;  */  /* ./ alternative 1 */

    // alternative 2: each row for each group id, with bucket (array) of aggregated fields

    var map = {};

    _.each(table, function(row) {
        var _groupId = row[internalGroupIdKey];
        map[_groupId] = map[_groupId] || {};
        var item = map[_groupId];

        for (var prop in row) {
            if (!_.has(row, prop)) continue;

            if (!tableObj.isAggregateField(prop)) {
                // non-aggregate fied
                item[prop] = item[prop] || [];
                item[prop].push(row[prop]);
            } else {
                // aggregate field
                item[prop] = row[prop];
            }
        }
    });

    var result2 = [];
    for (var _groupId in map) {
        if (!_.has(map, _groupId)) continue;
        result2.push(map[_groupId]);
    }

    return result2;
}

function _aggregateInitValue(op) {
    var result;
    switch (op) {
        case 'min': result = Number.MAX_VALUE; break;
        case 'max': result = Number.MIN_VALUE; break;
        case 'count':
        case 'sum': result = 0; break;
        case 'avg': result = '__avg__'; break; // special mark
        default: break;
    }
    return result;
}

function _aggregateFn(fn, prev, cur) {
    var result = _.isUndefined(prev) ? _aggregateInitValue(fn) : prev;

    switch (fn) {
        case 'min':
        case 'max':
            // + operand : cast to number, avoid string concat
            result = Math[fn](+result, +cur);
            break;
        case 'sum':
            if (!cur)
                break; // ignore empty field

            result = result + (+cur);
            break;
        case 'avg':
            if (result == '__avg__') // not set before
                result = +cur;
            else
                result = (result + (+cur)) / 2;
            break;
        case 'count':
            result = result + 1;
            break;
        default:
            invariant(false, 'don\'t support the aggregate function : %s', fn);
            break;
    }
    return result;
}

function _aggregateFn2(fn, data) {
    if (!_.isArray(data)) return data;
    var i = data.length,
        result;
    while (i--) {
        result = _aggregateFn(fn, result, data[i]);
    }
    return result;
}

aggregateFields.applyAggregate = _aggregateFn2;

module.exports = aggregateFields;