'use strict';

var Promise = require('bluebird');
var preq = require('preq');
var util = require('util');
var _ = require('underscore');

/**
 * Creates a formatted error info
 * @param message
 * @returns {MWApiError}
 * @constructor
 */
function MWApiError(message) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = arguments.length < 2 ? (message || 'unknown') : util.format.apply(null, arguments);
}

util.inherits(MWApiError, Error);

MWApiError.prototype.metrics = function(metrics) {
    this.metrics = metrics;
    return this;
};


function MWApi(userAgent, apiUrl) {
    this.userAgent = userAgent;
    this.apiUrl = apiUrl;
}

MWApi.prototype.execute = function execute(request, options) {
    var self = this,
        requestOpts = {
            uri: this.apiUrl,
            headers: {'User-Agent': this.userAgent}
        };

    // Convert arrays to pipe-separated strings:  ['a','b'] ==> 'a|b'
    for (var key in request) {
        if (request.hasOwnProperty(key) && _.isArray(request[key])) {
            request[key] = request[key].join('|');
        }
    }

    request = _.extend( { 'format': 'json', 'formatversion': 2 }, request );
    requestOpts[(options && options.post) ? 'data' : 'query'] = request;

    return preq(requestOpts).then(function (apiRes) {
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
 * Execute query and notify caller via callback
 * @param request
 * @param options
 * @param callback should return true to continue iteration, false to stop, or a promise of such value
 * @returns {Promise} resolves when done
 */
MWApi.prototype.query = function query(request, options, callback) {
    var self = this,
        originalRequest;

    function run(request) {
        return self.execute(request, options).then(function (apiRes) {
            return Promise.resolve(callback(apiRes)).then(function (cbRes) {
                if (cbRes && 'continue' in apiRes) {
                    return run(_.extend(originalRequest, apiRes.continue));
                }
            });
        });
    }

    return Promise.try(function() {
        ['rawcontinue', 'formatversion'].forEach(function (str) {
            if (str in request) {
                throw new MWApiError(str + ' is not supported with query() function, use execute()')
            }
        });
        originalRequest = _.extend({
            'action': 'query',
            'continue': ''
        }, request);

        return run(originalRequest);
    });
};

module.exports = MWApi;
module.exports.MWApiError = MWApiError;
