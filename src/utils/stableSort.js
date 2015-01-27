/**
 * @providesModule stableSort
 */

function stableSort(arr, comparer) {
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

module.exports = stableSort;