/**
 * @providesModule orderByClause
 */
/*jshint -W083 */

var invariant = require('../utils/invariant');
var stableSort = require('../utils/stableSort');

function orderBy(traverseTreeFn, tableObj, column1 /*, column2, column3 ... */) {
    var table = tableObj.data();

    var columns = Array.prototype.slice.call(arguments, 2);
    var i = columns.length,
        column;

    var result = table, // @todo: should clone ?
        field;

    while (i--) {
        column = columns[i];

        field = column.value.value;

        if (!tableObj.hasField(field)) {
            invariant(false, 'no such field in order by : %s', field);
            continue;
        }

        // order by ASC or DESC
        var useDESC = /\W*desc\W*$/ig.test(column.direction);

        stableSort(result, function(obj1, obj2) {
            if (!useDESC) {
                return obj1[field] > obj2[field];
            } else {
                return obj1[field] < obj2[field];
            }
        });
    }

    return tableObj.update(result);
}

module.exports = orderBy;