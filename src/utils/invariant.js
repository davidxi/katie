/**
 * @providesModule invariant
 */
var _ = require('underscore');

function printf(format/*, param1, param2, ... */) {
    var args = Array.prototype.slice.call(arguments, 0);
    var params = args.map(function(s) {
        if (_.isUndefined(s) || s === null) {
            return String(s);
        }
        return typeof s === 'object' ? Object.toJSON(s) : String(s);
    });
    var k = 0;
    return format.replace(/%s/g, function() {
        return params[++k];
    });
}

function invariant(condition, format, a, b, c, d, e, f) {
    if (condition) return;
    var message = 'Invariant Violation';
    if (_.isString(format)) {
        message = printf(message + ': ' + format, a, b, c, d, e, f);
    }
    var error = new Error(message);
    error.framesToPop = 1;
    throw error;
}

module.exports = invariant;