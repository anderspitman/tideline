/* 
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 * 
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

/*jshint expr: true */
/*global describe, it */

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var _ = require('lodash');

var watson = require('../example/watson');
var data = watson.normalize(require('../example/data/device-data.json'));

var CBGUtil = require('../js/data/cbgutil');

describe('cbg utilities', function() {
  var cbg = new CBGUtil(_.where(data, {'type': 'cbg'}));
  describe('filter', function() {
    it('should be a function', function() {
      assert.isFunction(cbg.filter);
    });
    var passEmpty = function() {
      cbg.filter('', '');
    };
    it('should throw RangeError when passed empty string instead of date', function() {
      assert.throws(passEmpty, RangeError);
    });
    var passInvalid = function() {
      cbg.filter('2014-03-06x12:00:00', '2014-03-07T12:00:00Z');
    };
    it('should throw RangeError when passed invalid date string', function() {
      assert.throws(passInvalid, RangeError);
    });
    var passNonUTC = function() {
      cbg.filter('2014-03-06T12:00:00', '2014-03-07T12:00:00Z');
    };
    it('should return an array', function() {
      assert.typeOf(cbg.filter('', ''), 'array');
    });
  });
  describe('rangeBreakdown', function() {
    it('should be a function', function() {
      assert.isFunction(cbg.rangeBreakdown);
    });
  });
  describe('average', function() {
    it('should be a function', function() {
      assert.isFunction(cbg.average);
    });
  });
});