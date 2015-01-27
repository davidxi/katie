/**
 * @providesModule limitClause
 */
var invariant = require('../utils/invariant');

function limit(traverseTreeFn, tableObj, node) {
    var limitNum = node.value.value;
    // avoid negative ingeter being used by array.slice()
    if (limitNum <= 0) {
        invariant(false, 'the number of limit shoudn\'t be non-positive.');
        return tableObj;
    }

    var dataArr = tableObj.data();
    var result = Array.prototype.slice.call(dataArr, 0, limitNum);
    return tableObj.update(result);
}

module.exports = limit;