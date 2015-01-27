/**
 * @providesModule TableObject
 */
var _ = require('underscore');
var invariant = require('../utils/invariant');

function TableObject(/*array*/records, /*string*/tableName) {
    invariant(_.isArray(records));
    invariant(tableName && _.isString(tableName));

    this._data = records || [];
    this.groupKey = [];
    this.name = tableName;
    this._desc = this._tableDesc(records[0]);
}

var TableFieldType = {
    NUMBER: 'number',
    STRING: 'string'
};

TableObject.prototype = {
    _tableDesc: function(row) /*object*/ {
        var ret = {};
        if (!row)  return ret;

        for (var prop in row) {
            if (!_.has(row, prop)) continue;
            var val = row[prop];

            if (val - parseFloat( val ) >= 0) {
                ret[prop] = TableFieldType.NUMBER;
            } else {
                ret[prop] = TableFieldType.STRING;
            }
        }
        return ret;
    },

    data: function () /*array*/ {
        return this._data;
    },
    update: function (data) /*this*/ {
        invariant(_.isArray(data));

        if (data.length) {
            // update table fields desc
            this._desc = this._tableDesc(data[0]);
        }
        return (this._data = data), this;
    },
    internalGroupIdKey: '___gid',
    insertGroupKey: function (field) /*this*/ {
        var fields = Array.prototype.slice.call(arguments, 0);
        var allFields = this.getAllFields();

        invariant(_.intersection(allFields, fields).length, 'no field name in the table : %s', field);

        Array.prototype.push.apply(this.groupKey, fields);

        return this;
    },
    fieldsNeedAggregate: function (field) /*array*/ {
        var fields = Array.prototype.slice.call(argument, 0);
        return _.without(fields, this.groupKey);
    },
    getAllFields: function () /*array*/ {
        var row = this._data[0] || {};
        var props = [];
        for (var prop in row) {
            if (!_.has(row, prop)) continue;
            props.push(prop);
        }
        return props;
    },
    hasField: function (field) /*boolean*/ {
        return _.has(this._desc, field);
    },
    isAggregateField: function (field) {
        return _.intersection(this.groupKey, [field]).length > 0;
    }
};

module.exports = TableObject;