'use strict';

var util = require('util');

module.exports = MWApiError;

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
