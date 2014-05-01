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

var _ = window._;
var bows = window.bows;
var d3 = window.d3;

var EventEmitter = require('events').EventEmitter;

var tideline = window.tideline;
var fill = tideline.plot.util.fill;

// Create a 'Two Weeks' chart object that is a wrapper around Tideline components
function chartWeeklyFactory(el, options) {
  var log = bows('Weekly Factory');
  options = options || {};

  var emitter = new EventEmitter();
  var chart = tideline.twoWeek(emitter);
  chart.emitter = emitter;

  var pools = [];

  var smbgTime;

  var create = function(el, options) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    var width = el.offsetWidth;
    var height = el.offsetHeight;
    if (!(width && height)) {
      throw new Error('Chart element must have a set width and height ' +
                      '(got: ' + width + ', ' + height + ')');
    }

    // basic chart set up
    chart.width(width).height(height);

    if (options.imagesBaseUrl) {
      chart.imagesBaseUrl(options.imagesBaseUrl);
      chart.dataGutter(8);
    }

    d3.select(el).call(chart);

    return chart;
  };

  chart.load = function(tidelineData, datetime) {
    var basalUtil = tidelineData.basalUtil;
    var bolusUtil = tidelineData.bolusUtil;
    var cbgUtil = tidelineData.cbgUtil;
    var smbgUtil = tidelineData.smbgUtil;

    var smbgData = tidelineData.grouped.smbg || [];

    if (!datetime) {
      chart.data(smbgData);
    }
    else {
      if (smbgData.length &&
          datetime.valueOf() > Date.parse(smbgData[smbgData.length - 1].normalTime)) {
        datetime = smbgData[smbgData.length - 1].normalTime;
      }
      chart.data(smbgData, datetime);
    }

    chart.setup();

    var days = chart.days;

    // make pools for each day
    days.forEach(function(day, i) {
      var newPool = chart.newPool()
        .id('poolBG_' + day, chart.daysGroup())
        .index(chart.pools().indexOf(newPool))
        .weight(1.0);
    });

    chart.arrangePools();
    chart.setTooltip().setAnnotation();

    chart.setAxes().setNav().setScrollNav();

    var fillEndpoints = [new Date('2014-01-01T00:00:00Z'), new Date('2014-01-02T00:00:00Z')];
    var fillScale = d3.time.scale.utc()
      .domain(fillEndpoints)
      .range([chart.axisGutter() + chart.dataGutter(), chart.width() - chart.navGutter() - chart.dataGutter()]);

    smbgTime = new tideline.plot.SMBGTime({emitter: emitter});

    chart.pools().forEach(function(pool, i) {
      var gutter;
      var d = new Date(pool.id().replace('poolBG_', ''));
      var dayOfTheWeek = d.getUTCDay();
      if ((dayOfTheWeek === 0) || (dayOfTheWeek === 6)) {
        gutter = {'top': 1.5, 'bottom': 1.5};
      }
      // on Mondays the bottom gutter should be a weekend gutter
      else if (dayOfTheWeek === 1) {
        gutter = {'top': 0.5, 'bottom': 1.5};
      }
      // on Fridays the top gutter should be a weekend gutter
      else if (dayOfTheWeek === 5) {
        gutter = {'top': 1.5, 'bottom': 0.5};
      }
      else {
        gutter = {'top': 0.5, 'bottom': 0.5};
      }
      pool.addPlotType('fill', fill(pool, {
        endpoints: fillEndpoints,
        xScale: fillScale,
        gutter: gutter,
        dataGutter: chart.dataGutter()
      }), false);
      pool.addPlotType('smbg', smbgTime.draw(pool), true, true);
      chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + pool.id()), pool.id());
      pool.render(chart.daysGroup(), chart.dataPerDay[i]);
    });

    chart.poolStats.addPlotType('stats', tideline.plot.stats.widget(chart.poolStats, {
      cbg: cbgUtil,
      smbg: smbgUtil,
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: 0,
      yPosition: chart.poolStats.height() / 10,
      emitter: emitter,
      puddleWeights : {
        ratio: 1.1,
        range: 1.2,
        average: 1.0
      }
    }), false, false);

    chart.poolStats.render(chart.poolGroup());

    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + chart.poolStats.id()), 'stats');

    chart.navString();

    return chart;
  };

  chart.showValues = function() {
    smbgTime.showValues();
  };

  chart.hideValues = function() {
    smbgTime.hideValues();
  };

  chart.type = 'weekly';

  return create(el, options);
}

module.exports = chartWeeklyFactory;