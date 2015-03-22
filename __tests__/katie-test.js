jest.dontMock('../katie');
jest.dontMock('./data/test-data-50');

var parser = require('sql-parser');
var _ = require('underscore');
var katie = require('../katie');

describe('hello world', function() {

    it('select', function() {
        var reviews = getTestData();
        var results = katie.parse('SELECT * FROM reviews', {reviews: reviews});
        expect(reviews.length).toBe(51);
        expect(results.length).toBe(reviews.length);
        reviews.sort();
        results.sort();
        for (var i = 0, len = reviews.length; i < len; i++) {
            expect(reviews[i]).toEqual(results[i]);
        }

        reviews = getTestData();
        results = katie.parse('SELECT productId, score FROM reviews', {reviews: reviews});
        results.forEach(function(row) {
            for (var k in row) {
                if (!_.has(row, k)) continue;
                expect(['productId', 'score'].indexOf(k) > -1).toBeTruthy();
            }
        });

        reviews = getTestData();
        results = katie.parse('SELECT productId, (score + 100) as score FROM reviews', {reviews: reviews});
        reviews.forEach(function(row) {
            var score = parseFloat(row.score);
            expect(score >= 0 && score <= 5).toBeTruthy();
        });
        results.forEach(function(row) {
            var score = parseFloat(row.score);
            expect(score >= 100 && score <= 105).toBeTruthy();
        });
    });

    it('order by', function() {
        var reviews = getTestData();
        var results = katie.parse('SELECT * FROM reviews ORDER BY time', {reviews: reviews});

        expect(results.length).toBe(reviews.length);
        for (var i = 1, len = results.length; i < len; i++) {
            expect(results[i].time >= results[i - 1].time).toBeTruthy();
        }

        reviews = getTestData();
        results = katie.parse('SELECT * FROM reviews ORDER BY time DESC', {reviews: reviews});
        expect(results.length).toBe(reviews.length);
        for (var i = 1, len = results.length; i < len; i++) {
            expect(results[i].time <= results[i - 1].time).toBeTruthy();
        }

        expect(function() {
            katie.parse('SELECT * FROM reviews ORDER BY nonExisitedColumn', {reviews: reviews});
        }).toThrow();
    });

    it('limit', function() {
        var reviews = getTestData();
        var results = katie.parse('SELECT * FROM reviews LIMIT 10', {reviews: reviews});
        expect(results.length).toBe(10);

        reviews = getTestData();
        results = katie.parse('SELECT * FROM reviews LIMIT 10000', {reviews: reviews});
        expect(results.length).toBe(reviews.length);

        expect(function() {
            katie.parse('SELECT * FROM reviews LIMIT 0', {reviews: reviews});
        }).toThrow();
    });

    it('where', function() {
        var reviews = getTestData();
        var results = katie.parse('SELECT * FROM reviews WHERE score < 4.5 AND summary LIKE \'good\'', {reviews: reviews});
        results.forEach(function(row) {
            var matched = /good/i.test(row.summary) &&
                            parseFloat(row.score) < 4.5;
            expect(matched).toBeTruthy();
        });
        var complements = getComplement(reviews, results);
        complements.forEach(function(row) {
            var matched = /good/i.test(row.summary) &&
                            parseFloat(row.score) < 4.5;
            expect(matched).toBeFalsy();
        });

        reviews = getTestData();
        results = katie.parse('SELECT * FROM reviews WHERE score < 4.5 OR summary LIKE \'good\'', {reviews: reviews});
        results.forEach(function(row) {
            var matched = /good/i.test(row.summary) ||
                            parseFloat(row.score) < 4.5;
            expect(matched).toBeTruthy();
        });
        var complements = getComplement(reviews, results);
        complements.forEach(function(row) {
            var matched = /good/i.test(row.summary) ||
                            parseFloat(row.score) < 4.5;
            expect(matched).toBeFalsy();
        });

    });
});

/**
 * helper methods
 */
function getTestData() {
    return require('./data/test-data-50').slice(0);
}

function getComplement(arrAll, arrSelf) {
    var complement = [];
    for (var i = 0; i < arrAll.length; i++) {
        var found = undefined;
        for (var j = 0; j < arrSelf.length; j++) {
            if (_.isEqual(arrAll[i], arrSelf[j])) {
                found = arrSelf[j];
                break;
            }
        }
        found && complement.push(found);
    }
    return complement;
}