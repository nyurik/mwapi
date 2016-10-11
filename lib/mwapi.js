'use strict';

var Promise = require('bluebird'),
    preq = require('preq'),
    util = require('util'),
    _ = require('underscore'),
    MWApiError = require('./mwapiError');

module.exports = MWApi;
module.exports.MWApiError = MWApiError;

/**
 * Create a new instance of the MediaWiki API object
 * @param userAgent
 * @param apiUrl
 * @constructor
 */
function MWApi(userAgent, apiUrl) {
    this.options = {
        uri: apiUrl,
        headers: {'User-Agent': userAgent}
    };
}

/**
 * Call mediawiki API. Returns promise of a result
 * @param request
 * @param options
 * @returns {Promise}
 */
MWApi.prototype.execute = function execute(request, options) {
    var self = this,
        reqObj = _.extend(this.options);

    // Convert arrays to pipe-separated strings:  ['a','b'] ==> 'a|b'
    for (var key in request) {
        if (request.hasOwnProperty(key) && _.isArray(request[key])) {
            request[key] = request[key].join('|');
        }
    }

    request = _.extend( { format: 'json', formatversion: 2 }, request );
    reqObj[(options && options.post) ? 'data' : 'query'] = request;

    return preq(reqObj).then(function (apiRes) {
        var apiResBody;

        if (self.logger) {
            self.logger.log('mwapi/trace', apiRes);
        }
        if (apiRes.status !== 200) {
            throw new Error('mwapi-status', apiRes.status);
        }
        apiResBody = apiRes.body;
        if ('error' in apiResBody) {
            var err = new Error('mwapi-error');
            err.error = apiResBody.error;
            throw err;
        }
        if ('warnings' in apiResBody && self.logger) {
            self.logger.log('mwapi/warning', apiResBody.warnings);
            // Warnings are usually safe to continue
        }
        return apiResBody;
    });
};

/**
 * Execute continuable action and notify caller via callback on each iteration. Returns a promise
 * that gets resolved when iteration is done.
 * @param request
 * @param options
 * @param callback should return true to continue iteration, false to stop, or a promise of such value
 * @returns {Promise} resolves when done
 */
MWApi.prototype.iterate = function iterate(request, options, callback) {
    var self = this,
        originalRequest;

    function runOnce(request) {
        return self.execute(request, options).then(function (apiRes) {
            return Promise.resolve(callback(apiRes)).then(function (cbRes) {
                if (cbRes && 'continue' in apiRes) {
                    return runOnce(_.extend(originalRequest, apiRes.continue));
                }
            });
        });
    }

    return Promise.try(function() {
        ['rawcontinue', 'formatversion'].forEach(function (str) {
            if (str in request) {
                throw new MWApiError(str + ' is not supported with iterate() function, use mwapi.execute()')
            }
        });
        originalRequest = _.extend({
            continue: ''
        }, request);

        return runOnce(originalRequest);
    });
};
