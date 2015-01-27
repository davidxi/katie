/**
 * @providesModule groupByClause
 */
/*jshint -W083 */

var _ = require('underscore');
var invariant = require('../utils/invariant');

// tag internal group id

function groupBy(traverseTreeFn, tableObj, column1 /*, column2 ..*/) {

    var internalGroupIdKey = tableObj.internalGroupIdKey;

    var table = tableObj.data();

    var columns = Array.prototype.slice.call(arguments, 2);

    var bucket = [];
    bucket[0] = table;

    _.each(columns, function(columnNode) {
        var column = columnNode.value;

        var mapping,
            slot,
            bucketNew = [];

        while ((slot = bucket.shift()), slot) {
            mapping = {};

            _.each(slot, function(row) {
                var mappedKey = row[column];
                mapping[mappedKey] = mapping[mappedKey] || [];
                mapping[mappedKey].push(row);
            });

            for (var mappedKey in mapping) {
                if (!_.has(mapping, mappedKey)) continue;
                bucketNew.push(mapping[mappedKey]);
            }
        }

        bucket = bucketNew;
        tableObj.insertGroupKey(column);
    });

    var result = [],
        _guid = 0;

    bucket.forEach(function(slot) {

        // need use function invoking to pass the '_guid'
        (function(guid) {
            slot.forEach(function(row) {
                row[internalGroupIdKey] = guid;
                result.push(row);
            }.bind(this));
        })(_guid);

        _guid++;
    }.bind(this));

    return tableObj.update(result);
}

module.exports = groupBy;