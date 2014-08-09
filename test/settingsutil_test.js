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

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var _ = require('lodash');

var watson = require('../plugins/data/watson');
var preprocess = require('../plugins/data/preprocess');
var datetime = require('../js/data/util/datetime');
var data = require('../example/data/device-data.json');
var unshapedSettings = preprocess.runWatson(_.where(data, {type: 'settings'}));
var settingsData = preprocess.sortBasalSchedules(unshapedSettings);
var SegmentUtil = require('../js/data/segmentutil');
var SettingsUtil = require('../js/data/settingsutil');
var TidelineData = require('../js/tidelinedata');

describe('settings utilities', function() {

  var basalSegments = new SegmentUtil(_.where(data, {'type': 'basal-rate-segment'})).timeline;
  data = _.reject(data, function(d) {
    return d.type === 'basal-rate-segment';
  });
  data = data.concat(basalSegments);
  data = watson.normalizeAll(data);
  var td = new TidelineData(data);
  var diabetesEndpoints = [td.diabetesData[0].normalTime, td.diabetesData[td.diabetesData.length - 1].normalTime];
  var settings = new SettingsUtil(settingsData, diabetesEndpoints);

  describe('settingsUtil', function() {
    it('should return an object if empty array for settings data', function() {
      var blank = new SettingsUtil([], diabetesEndpoints);
      assert.isObject(blank);
    });
  });

  describe('settingsUtil.intervals', function() {
    it('should have length two when one settings event in middle of data', function() {
      var settingsUtil = new SettingsUtil(settingsData.slice(0,1), diabetesEndpoints);
      expect(settingsUtil.intervals.length).to.equal(2);
      expect(settingsUtil.intervals[0].settings.confidence).to.equal('uncertain');
      expect(settingsUtil.intervals[1].settings.confidence).not.to.exist;
    });

    it('should have length one when one settings event at end of data', function() {
      var thisSettingsData = settingsData.slice(1,2);
      thisSettingsData[0].normalTime = diabetesEndpoints[1];
      var settingsUtil = new SettingsUtil(thisSettingsData, diabetesEndpoints);
      expect(settingsUtil.intervals.length).to.equal(1);
      expect(settingsUtil.intervals[0].settings.confidence).to.equal('uncertain');
    });

    it('should have length three when two settings events, neither at endpoints', function() {
      expect(settings.intervals.length).to.equal(3);
      expect(settings.intervals[0].settings.confidence).to.equal('uncertain');
      expect(settings.intervals[1].settings.confidence).not.to.exist;
      expect(settings.intervals[2].settings.confidence).not.to.exist;
    });

    it('should be contiguous', function() {
      for (var i = 0; i < settings.intervals.length; ++i) {
        if (i !== settings.intervals.length - 1) {
          expect(settings.intervals[i].end).to.equal(settings.intervals[i + 1].start);
        }
      }
    });
  });

  describe('annotateBasalSettings', function() {
    // TODO: create a data generator for settings and test against that
    // including adding more tests for what the actual result should be
    var segmentsBySchedule = settings.getAllSchedules(settings.endpoints[0], settings.endpoints[1]);
    var keys = Object.keys(segmentsBySchedule);
    var basalUtil = td.basalUtil;

    it('should be a function', function() {
      assert.isFunction(settings.annotateBasalSettings);
    });

    it('should return an object with same keys as original segmentsBySchedule', function() {
      var obj = settings.annotateBasalSettings(basalUtil.actual);
      expect(Object.keys(obj)).to.eql(keys);
    });
  });

  describe('getAllSchedules', function() {
    it('should be a function', function() {
      assert.isFunction(settings.getAllSchedules);
    });

    it('should return an empty array when given an invalid date range', function() {
      var res = settings.getAllSchedules('','');
      expect(Array.isArray(res)).to.be.true;
      expect(res.length).to.equal(0);
    });

    it('should return a non-empty array for each pattern when given a valid date range', function() {
      var res = settings.getAllSchedules(td.diabetesData[0].normalTime, td.diabetesData[0].normalTime);
      expect(typeof res).to.equal('object');
      for (var key in res) {
        var sched = res[key];
        expect(Array.isArray(sched)).to.be.true;
        expect(sched.length).to.be.above(0);
      }
    });

    it('should return arrays for each schedule continuously spanning diabetes data endpoints when given these endpoints', function() {
      var res = settings.getAllSchedules(diabetesEndpoints[0], diabetesEndpoints[1]);
      for (var key in res) {
        var data = res[key];
        expect(data[0].normalTime).to.equal(diabetesEndpoints[0]);
        expect(data[data.length - 1].normalEnd).to.equal(diabetesEndpoints[1]);
        for (var j = 0; j < data.length; ++j) {
          if (j !== data.length - 1) {
            expect(data[j].normalEnd).to.equal(data[j + 1].normalTime);
          }
        }
      }
    });

    it('should return arrays for each schedule where all items have distinct normalTime and normalEnd', function() {
      var res = settings.getAllSchedules(diabetesEndpoints[0], diabetesEndpoints[1]);
      for (var key in res) {
        var data = res[key];
        expect(data[0].normalTime).to.equal(diabetesEndpoints[0]);
        expect(data[data.length - 1].normalEnd).to.equal(diabetesEndpoints[1]);
        for (var j = 0; j < data.length; ++j) {
          expect(data[j].normalTime).to.not.equal(data[j].normalEnd);
        }
      }
    });
  });

  describe('getIntervals', function() {
    it('should return undefined when given an invalid date range', function() {
      expect(settings.getIntervals('2014-01-01T00:00:00.000Z', '2014-01-01T00:00:00.000Z')).to.be.undefined;
    });

    it('should return a settings object when given a valid date range', function() {
      expect(settings.getIntervals(diabetesEndpoints[1], diabetesEndpoints[1])).to.exist;
    });

    it('should return a settings object with uncertain confidence when given a valid date range at beginning of data', function() {
      var currentSettings = settings.getIntervals(diabetesEndpoints[0], diabetesEndpoints[0]);
      expect(currentSettings).to.exist;
      expect(currentSettings[0].settings.confidence).to.equal('uncertain');
    });

    it('should return a settings object with no confidence property when given a valid date range at end of data', function() {
      var currentSettings = settings.getIntervals(diabetesEndpoints[1], diabetesEndpoints[1]);
      expect(currentSettings).to.exist;
      expect(currentSettings[0].settings.confidence).not.to.exist;
    });

    it('should return an array of settings objects when given a date range that crosses a settings deviceTime', function() {
      var before = datetime.getMidnight(settingsData[0].normalTime);
      var after = datetime.getMidnight(settingsData[0].normalTime, true);
      var currentSettings = settings.getIntervals(before, after);
      expect(currentSettings.length).to.equal(2);
    });

    it('should return an array of settings objects continuously spanning diabetes endpoints when given diabetes endpoints', function() {
      var currentSettings = settings.getIntervals(diabetesEndpoints[0], diabetesEndpoints[1]);
      expect(currentSettings.length).to.equal(3);
      for (var i = 0; i < currentSettings.length; ++i) {
        if (i !== currentSettings.length - 1) {
          expect(currentSettings[i].end).to.equal(currentSettings[i + 1].start);
        }
      }
    });

    it('should return an array of settings objects, each with distinct start and end', function() {
      var currentSettings = settings.getIntervals(diabetesEndpoints[0], diabetesEndpoints[1]);
      expect(currentSettings.length).to.equal(3);
      for (var i = 0; i < currentSettings.length; ++i) {
        expect(currentSettings[i].start).to.not.equal(currentSettings[i].end);
      }
    });
  });
});
