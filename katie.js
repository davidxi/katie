
var parser = this.SQLParser;

function Katie() {}

Katie.prototype.parse = function(stmt) {
	invariant(stmt && typeof stmt === 'string');

	var tree = parser.parse(stmt);
	var tableObj = this.walk(tree);

	return tableObj.data();
};

Katie.prototype.walk = function(tree, result) /*tableObj*/ {
	invariant(this.compareNodeType(tree, 'select'), 'expect select node being root');

	var node,
		result = result || [];

	// FROM clause
	node = tree['source'];
	result = this.from(node);

	// JOIN clause
	node = tree['joins']; // array of [Join]
	// TODO : only process the first table in join clause
	if ((node = node[0]) && this.compareNodeType(node, 'join')) {
		(function() {
			result = this._join(result, node);
		}.bind(this))();
	}

	// WHERE clause
	node = tree['where'];
	if (this.compareNodeType(node, 'where')) {
		result = this._where(result, node['conditions']);
	}

	// GROUP BY clause
	node = tree['group'];
	if (this.compareNodeType(node, 'group')) {
		(function() {
			result = this._groupBy.apply(this, [result].concat(node['fields']));
		}.bind(this))();
	}

	// SELECT clause
	node = tree['fields']; // array of [Field]
	if ((node.length >>> 0) && this.compareNodeType(node[0], 'field')) {
		(function() {

			// TODO check if exist non-aggregate fields not in aggregate function

			result = this._select.apply(this, [result].concat(node));
		}.bind(this))();
	}

	// ORDER BY clause
	node = tree['order'];
	if (this.compareNodeType(node, 'order')) {
		(function() {
			result = this._orderBy.apply(this, [result].concat(node['orderings']));
		}.bind(this))();
	}

	// LIMIT clause
	node = tree['limit'];
	if (node && this.compareNodeType(node, 'limit')) {
		(function() {
			result = this._limit.apply(this, [result].concat(node));
		}.bind(this))();
	}

	return result;
};

// from
Katie.prototype.from = function(node) {
	if (this.compareNodeType(node, 'table')) {
		return this._fromTable(node);
	} else if (this.compareNodeType(node, 'subSelect')) {
		var selectNode = node['select'];
		var tableName = node['name'].value;
		var tableObj = this.walk(selectNode);
		tableObj.name = tableName;
		return tableObj;
	} else {
		invariant(false, 'table or sub-select required');
	}
};
Katie.prototype._fromTable = function(tableNode) /* TableObj */ {
	invariant(this.compareNodeType(tableNode, 'table'));

	var source = tableNode['name'],
		tableName = source['value'];

	var data = eval(tableName);
	invariant(data && Array.isArray(data));

	return new TableObj(Array.prototype.slice.call(data, 0), tableName);
};
// ./ from

// join
Katie.prototype._join = function(tableObj, joinNode) {
	var table1 = tableObj.data(),
		table2;
	/* {condition: Op, right: Table||SubSelect, side: string} */

	var tableToJoin,
		tableNode = joinNode['right'];
	if (!this.compareNodeType(tableNode, 'table') && !this.compareNodeType(tableNode, 'subSelect')) {
		invariant(false, 'expect table node in join claus');
	}

	tableToJoin = this.from(tableNode);
	table2 = tableToJoin.data();

	var joinMethod = joinNode['side'] || '',
		joinCondition = joinNode['conditions'];

	var result = [];
	var tableName1 = tableObj.name,
		tableName2 = tableToJoin.name;

	joinMethod = joinMethod.toLowerCase();

	switch (joinMethod) {
		case 'left':
			result = this._mergeTable(1, table1, table2, tableName1, tableName2, joinCondition);
			break;
		case 'right':
			result = this._mergeTable(1, table2, table1, tableName2, tableName1, joinCondition);
			break;
		default:
			result = this._mergeTable(0, table1, table2, tableName1, tableName2, joinCondition);
			break;
	}

	return tableObj.update(result);
};
// ./ join

// select
Katie.prototype._select = function(tableObj, column /*, ?column, ?column ... */) {
	var table = tableObj.data();

	var result = [],
		columns;

	columns = Array.prototype.slice.call(arguments, 1);

	table = this._aggregate.call(this, tableObj);

	table.forEach(function(row) {
		var item = {};
		var displayName,
			value,
			columnObj, // Field
			i = columns.length;
		while (i--) {
			columnObj = columns[i];
			displayName = this._getSelectFieldDisplayName(columnObj);
			value = this._walkSelectField(row, columnObj['field']);
			item[displayName] = value;
		}

		result.push(item);
	}.bind(this));

	return tableObj.update(result);
};
Katie.prototype._getSelectFieldDisplayName = function(columnObj) {
	if (columnObj['name'])
		return columnObj['name'].value;
	else
		return columnObj['field'].value;
};
Katie.prototype._walkSelectField = function(row, columnNode) {
	if (this.compareNodeType(columnNode, 'function')) {
		var fnArgs = columnNode['arguments'];
		var fnName = columnNode['name'];
		// TODO : only deal first argument
		return this._aggregateFn2(fnName, this._walkSelectField(row, fnArgs[0]));
	} else if (this.compareNodeType(columnNode, 'literal')) {
		var values = columnNode.values; // array
		if (values.length == 1) {
			return row[values[0]];
		} else {
			// column has joined table name
			return row[values[0] + '.' + values[1]];
		}
	} else if (this.compareNodeType(columnNode, 'number')) {
		return columnNode.value;
	} else if (this.compareNodeType(columnNode, 'op')) {
		var left  = this._walkSelectField(row, columnNode['left']);
		var op    = columnNode['operation'];
		var right = this._walkSelectField(row, columnNode['right']);
		return this._operand(left, op, right);
	} else {
		invariant(false, 'unsupport select field : %s', columnNode);
	}
};
Katie.prototype._operand = function(op1, op, op2) {
	var result = op1;
	var op2 = op2;
	if (Array.isArray(op2)) {
		invariant(false, "operand 2 can't be an array : %s", op2);
		op2 = op2[0];
	}
	if (Array.isArray(result)) {
		return result.map(function(item) {
			return this._operand(item, op, op2);
		}.bind(this));
	}
	switch (op) {
		case '+': result = (+result) + (+op2); break;
		case '-': result = result - op2; break;
		case '*': result = result * op2; break;
		case '/': result = result / op2; break;
		default: invariant(false, 'unsupport operand : %s', op2); break;
	}
	return result;
};
// ./ select

// orderby
Katie.prototype._orderBy = function(tableObj, column /*, ?column, ?column ... */) {
	var table = tableObj.data();

	var columns = Array.prototype.slice.call(arguments, 1);
	var i = columns.length,
		column;

	var result = table, // @todo: should clone ?
		field;

	while (i--) {
		column = columns[i];

		field = column['value'].value;

		if (!tableObj.hasField(field)) {
			invariant(false, 'no such field in order by : %s', field);
			continue;
		}

		// order by ASC or DESC
		var useDESC = /\W*desc\W*$/ig.test(column['direction']);

		_sort(result, function(obj1, obj2) {
			if (!useDESC)
				return obj1[field] > obj2[field];
			else
				return obj1[field] < obj2[field];
		});
	}

	return tableObj.update(result);
};
// ./ orderby

// limit
Katie.prototype._limit = function(tableObj, node) {
	var limitNum = node['value'].value;
	// avoid negative ingeter being used by array.slice()
	if (limitNum <= 0) {
		invariant(false, 'the number of limit shoudn\'t be non-positive.');
		return tableObj;
	}

	var table = tableObj.data();
	var result = table.slice(0, limitNum);
	return tableObj.update(result);
};
// ./ limit

// where
Katie.prototype._where = function(tableObj, whereNode) {
	var table = tableObj.data();

	var result = [];
	table.forEach(function(row) {
		var eligible = this._whereEvalWalkTree(row, whereNode);
		if (eligible) {
			result.push(row);
		}
	}.bind(this));

	return tableObj.update(result);
};
Katie.prototype._whereEvalWalkTree = function(row, node) /*boolean*/{
	if (!node) 	return true;

	/* column, op, val */
	var op = node['operation'],
		column,
		val;

	op = op.trim().toLowerCase();

	switch (op) {
		case 'and':
			return this._whereEvalWalkTree(row, node.left) && this._whereEvalWalkTree(row, node.right);
		case 'or':
			return this._whereEvalWalkTree(row, node.left) || this._whereEvalWalkTree(row, node.right);
		default:
			break;
	};

	column = node.left['value'];
	val = node.right['value'];

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
				if (!Array.isArray(val)) {
					invariant(false, 'should be an array in IN clause');
					return row[column] == val;
				}

				// expect StingValue || NumberValue
				val = val.pluck('value');

				return val.intersect([row[column]]).length > 0;
			})();
		case 'is':
			if (val == null)
				return row[column] === null;
		case 'is not':
			if (val == null)
				return row[column] !== null;
		default:
			invariant(false, "unsupported operand : %s %s %s", column, op, val);
	};
};
// ./ where

// tag internal group id
Katie.prototype._groupBy = function(tableObj, columns) {

	var internalGroupIdKey = tableObj.internalGroupIdKey;

	var table = tableObj.data();

	var columns = Array.prototype.slice.call(arguments, 1);

	var bucket = [];
	bucket[0] = table;

	columns.forEach(function(columnNode) {
		var column = columnNode.value;

		var mapping,
			slot,
			bucketNew = [];

		while (slot = bucket.shift()) {
			mapping = {};

			slot.forEach(function(row) {
				var mappedKey = row[column];
				mapping[mappedKey] = mapping[mappedKey] || [];
				mapping[mappedKey].push(row);
			}.bind(this));

			for (var mappedKey in mapping) {
				if (!Object.prototype.hasOwnProperty.call(mapping, mappedKey)) continue;
				bucketNew.push(mapping[mappedKey]);
			}
		}

		bucket = bucketNew;
		tableObj.insertGroupKey(column);
	}.bind(this));

	var result = [],
		_guid = 0;

	bucket.forEach(function(slot) {

		// need use function invoking to pass the '_guid'
		(function(guid) {
			slot.forEach(function(row) {
				row[internalGroupIdKey] = guid;
				result.push(row);
			}.bind(this));
		}.bind(this))(_guid);

		_guid++;
	}.bind(this));

	return tableObj.update(result);
};
Katie.prototype._aggregate = function(tableObj, fields) /*array*/ {
	var table = tableObj.data();
	var internalGroupIdKey = tableObj.internalGroupIdKey;

	if (!tableObj.groupKey.length) {
		return table;
	}

	/**
	 * alternative 1: each row with internal group id

	var map = {};

	var fields = Array.prototype.slice.call(arguments, 1);
	table.forEach(function(row) {
		var _groupId = row[internalGroupIdKey];

		if (typeof _groupId === 'undefined') {
			// no group-by proceed on this table obj
			throw $break;
		}

		map[_groupId] = map[_groupId] || (Object.clone(row));

		fields.forEach(function(fieldNode) {
			var fn = fieldNode['aggregate'];
			var field = fieldNode['originalColumn'];

			fn = fn.toLowerCase();
			map[_groupId][field] = this._aggregateFn(fn, map[_groupId][field], row[field]);

		}.bind(this)); // ./ fields.forEach()

	}.bind(this)); // ./ table.forEach()

	var result = [];
	for (var _groupId in map) {
		if (!Object.prototype.hasOwnProperty.call(map, _groupId)) continue;
		result.push(map[_groupId]);
	}

	return result;  */  /* ./ alternative 1 */

	// alternative 2: each row for each group id, with bucket (array) of aggregated fields

	var map = {};

	table.forEach(function(row) {
		var _groupId = row[internalGroupIdKey];
		map[_groupId] = map[_groupId] || {};
		var item = map[_groupId];

		for (var prop in row) {
			if (!Object.prototype.hasOwnProperty.call(row, prop)) continue;

			if (!tableObj.isAggregateField(prop)) {
				// non-aggregate fied
				item[prop] = item[prop] || [];
				item[prop].push(row[prop]);
			} else {
				// aggregate field
				item[prop] = row[prop];
			}
		}
	}.bind(this));

	var result2 = [];
	for (var _groupId in map) {
		if (!Object.prototype.hasOwnProperty.call(map, _groupId)) continue;
		result2.push(map[_groupId]);
	}

	return result2;
};
Katie.prototype._aggregateInitValue = function(op) {
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
},
Katie.prototype._aggregateFn = function(fn, prev, cur) {
	var result = typeof prev === 'undefined' ? this._aggregateInitValue(fn) : prev;

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
};
Katie.prototype._aggregateFn2 = function(fn, data) {
	if (!Array.isArray(data)) return data;
	var i = data.length,
		result;
	while (i--) {
		result = this._aggregateFn(fn, result, data[i]);
	}
	return result;
};
// ./ group by


Katie.prototype.compareNodeType = function(node/*Object*/, type/*String*/) /* bool */{
	if (!node)	{
		//invariant(node, 'node is empty');
		return false;
	}

	invariant(typeof node === 'object');
	invariant(type && typeof type === 'string');

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
};

Object.keys(Katie.prototype).forEach(function(key) {
    Katie[key] = function() {
        var instance = (this instanceof Katie) ? this : Katie;
        return Katie.prototype[key].apply(instance, arguments);
    };
});
Katie.call(Katie);

/**
 * table obj
 */
function TableObj(/*array*/records, /*string*/tableName) {
	invariant(Array.isArray(records));
	invariant(tableName && typeof tableName === 'string')

	this._data = records || [];
	this.groupKey = [];
	this.name = tableName;
	this._desc = this._tableDesc(records[0]);
};
var TableFieldType = {
	NUMBER: 'number',
	STRING: 'string'
};
TableObj.prototype = {
	_tableDesc: function(row) /*object*/ {
		var ret = {};
		if (!row)  return ret;

		for (var prop in row) {
			if (!Object.prototype.hasOwnProperty.call(row, prop)) continue;
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
    	invariant(Array.isArray(data));

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

        invariant(allFields.intersect(fields).length, 'no field name in the table : %s', field)

        Array.prototype.push.apply(this.groupKey, fields);

        return this;
    },
    fieldsNeedAggregate: function (field) /*array*/ {
        var fields = Array.prototype.slice.call(argument, 0);
        return fields.without(this.groupKey);
    },
    getAllFields: function () /*array*/ {
        var row = this._data[0] || {};
        var props = [];
        for (var prop in row) {
            if (!Object.prototype.hasOwnProperty.call(row, prop)) continue;
            props.push(prop);
        }
        return props;
    },
    hasField: function (field) /*boolean*/ {
        return Object.prototype.hasOwnProperty.call(this._desc, field);
    },
    isAggregateField: function (field) {
        return this.groupKey.intersect([field]).length > 0;
    }
};

/**
 * helpers
 */
function invariant(condition, format, a, b, c, d, e, f) {
    if (format === undefined && !condition) {
        throw new Error('Invariant Violation');
    }

    if (!condition) {
        var args = [a, b, c, d, e, f];
        var argIndex = 0;
        throw new Error(
            'Invariant Violation: ' +
            format.replace(/%s/g, function() {
                return args[argIndex++];
            })
        );
    }
}

// stable sort
function _sort(arr, comparer) {
	//var arr = arr.clone();
	var i = arr.length, j, temp;

	while (i--) {
		for (j = 0; j < i; j++) {
			if (!comparer(arr[j], arr[j+1])) continue;
			temp = arr[j];
			arr[j] = arr[j+1];
			arr[j+1] = temp;
		}
	}
	return arr;
}