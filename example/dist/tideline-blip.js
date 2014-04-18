!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),(n.tideline||(n.tideline={})).blip=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
var scales = tideline.plot.util.scales;

// Create a 'One Day' chart object that is a wrapper around Tideline components
function chartDailyFactory(el, options) {
  var log = bows('Daily Factory');
  options = options || {};

  var emitter = new EventEmitter();
  var chart = tideline.oneDay(emitter);
  chart.emitter = emitter;

  var poolMessages, poolBG, poolBolus, poolBasal, poolStats;

  var SMBG_SIZE = 16;

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
    }

    d3.select(el).call(chart);

    return chart;
  };

  chart.setupPools = function() {
    // messages pool
    poolMessages = chart.newPool()
      .id('poolMessages', chart.poolGroup())
      .label('')
      .index(chart.pools().indexOf(poolMessages))
      .weight(0.5);

    // blood glucose data pool
    poolBG = chart.newPool()
      .id('poolBG', chart.poolGroup())
      .label('Blood Glucose')
      .index(chart.pools().indexOf(poolBG))
      .weight(1.5);

    // carbs and boluses data pool
    poolBolus = chart.newPool()
      .id('poolBolus', chart.poolGroup())
      .label('Bolus & Carbohydrates')
      .index(chart.pools().indexOf(poolBolus))
      .weight(1.5);

    // basal data pool
    poolBasal = chart.newPool()
      .id('poolBasal', chart.poolGroup())
      .label('Basal Rates')
      .index(chart.pools().indexOf(poolBasal))
      .weight(1.0);

    // stats data pool
    poolStats = chart.newPool()
      .id('poolStats', chart.poolGroup())
      .index(chart.pools().indexOf(poolStats))
      .weight(1.0);

    chart.arrangePools();

    chart.setAnnotation().setTooltip();

    // add annotations
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'carbs');
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'bolus');
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolBasal.id()), 'basal-rate-segment');
    chart.annotations().addGroup(d3.select('#' + chart.id()).select('#' + poolStats.id()), 'stats');

    // add tooltips
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBG.id()), 'cbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBG.id()), 'smbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'carbs');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBolus.id()), 'bolus');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBasal.id()), 'basal');

    return chart;
  };

  chart.load = function(tidelineData, datetime) {
    var data = tidelineData.data;
    chart.tidelineData = tidelineData;

    var basalUtil = tidelineData.basalUtil;
    var bolusUtil = tidelineData.bolusUtil;
    var cbgUtil = tidelineData.cbgUtil;

    chart.stopListening();
    // initialize chart with data
    chart.data(tidelineData).setAxes().setNav().setScrollNav();

    // BG pool
    var allBG = _.filter(data, function(d) {
      if ((d.type === 'cbg') || (d.type === 'smbg')) {
        return d;
      }
    });
    var scaleBG = scales.bgLog(allBG, poolBG, SMBG_SIZE/2);
    // set up y-axis
    poolBG.yAxis(d3.svg.axis()
      .scale(scaleBG)
      .orient('left')
      .outerTickSize(0)
      .tickValues(scales.bgTicks(allBG))
      .tickFormat(d3.format('g')));
    // add background fill rectangles to BG pool
    poolBG.addPlotType('fill', fill(poolBG, {endpoints: chart.endpoints}), false, true);

    // add CBG data to BG pool
    poolBG.addPlotType('cbg', tideline.plot.cbg(poolBG, {yScale: scaleBG}), true, true);

    // add SMBG data to BG pool
    poolBG.addPlotType('smbg', tideline.plot.smbg(poolBG, {yScale: scaleBG}), true, true);

    // bolus & carbs pool
    var scaleBolus = scales.bolus(tidelineData.grouped.bolus, poolBolus);
    var scaleCarbs = scales.carbs(tidelineData.grouped.carbs, poolBolus);
    // set up y-axis for bolus
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleBolus)
      .orient('left')
      .outerTickSize(0)
      .ticks(3));
    // set up y-axis for carbs
    poolBolus.yAxis(d3.svg.axis()
      .scale(scaleCarbs)
      .orient('left')
      .outerTickSize(0)
      .ticks(3));
    // add background fill rectangles to bolus pool
    poolBolus.addPlotType('fill', fill(poolBolus, {endpoints: chart.endpoints}), false, true);

    // add carbs data to bolus pool
    poolBolus.addPlotType('carbs', tideline.plot.carbs(poolBolus, {
      yScale: scaleCarbs,
      emitter: emitter,
      data: tidelineData.grouped.carbs
    }), true, true);

    // add bolus data to bolus pool
    poolBolus.addPlotType('bolus', tideline.plot.bolus(poolBolus, {
      yScale: scaleBolus,
      emitter: emitter,
      data: tidelineData.grouped.bolus
    }), true, true);

    // basal pool
    var scaleBasal = scales.basal(tidelineData.grouped['basal-rate-segment'], poolBasal);
    // set up y-axis
    poolBasal.yAxis(d3.svg.axis()
      .scale(scaleBasal)
      .orient('left')
      .outerTickSize(0)
      .ticks(4));
    // add background fill rectangles to basal pool
    poolBasal.addPlotType('fill', fill(poolBasal, {endpoints: chart.endpoints}), false, true);

    // add basal data to basal pool
    poolBasal.addPlotType('basal-rate-segment', tideline.plot.basal(poolBasal, {
      yScale: scaleBasal,
      data: tidelineData.grouped['basal-rate-segment']
    }), true, true);

    // messages pool
    // add background fill rectangles to messages pool
    poolMessages.addPlotType('fill', fill(poolMessages, {endpoints: chart.endpoints}), false, true);

    // add message images to messages pool
    poolMessages.addPlotType('message', tideline.plot.message(poolMessages, {
      size: 30,
      emitter: emitter
    }), true, true);

    // stats pool
    poolStats.addPlotType('stats', tideline.plot.stats.widget(poolStats, {
      cbg: cbgUtil,
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: chart.axisGutter(),
      yPosition: 0,
      emitter: emitter,
      oneDay: true
    }), false, false);

    return chart;
  };

  // locate the chart around a certain datetime
  // if called without an argument, locates the chart at the most recent 24 hours of data
  chart.locate = function(datetime) {

    var start, end, atMostRecent = false;

    var mostRecent = function() {
      start = chart.initialEndpoints[0];
      end = chart.initialEndpoints[1];
    };

    if (!arguments.length) {
      atMostRecent = true;
      mostRecent();
    }
    else {
      // translate the desired center-of-view datetime into an edgepoint for tideline
      start = new Date(datetime);
      chart.currentCenter(start);
      var plusHalf = new Date(start);
      plusHalf.setUTCHours(plusHalf.getUTCHours() + 12);
      var minusHalf = new Date(start);
      minusHalf.setUTCHours(minusHalf.getUTCHours() - 12);
      if ((start.valueOf() < chart.endpoints[0]) || (start.valueOf() > chart.endpoints[1])) {
        log('Please don\'t ask tideline to locate at a date that\'s outside of your data!');
        log('Rendering most recent data instead.');
        mostRecent();
      }
      else if (plusHalf.valueOf() > chart.endpoints[1]) {
        mostRecent();
      }
      else if (minusHalf.valueOf() < chart.endpoints[0]) {
        start = chart.endpoints[0];
        var firstEnd = new Date(start);
        firstEnd.setUTCDate(firstEnd.getUTCDate() + 1);
        end = firstEnd;
      }
      else {
        end = new Date(start);
        start.setUTCHours(start.getUTCHours() - 12);
        end.setUTCHours(end.getUTCHours() + 12);
      }
    }

    chart.renderedData([start, end]);

    chart.setAtDate(start, atMostRecent);

    // render pools
    _.each(chart.pools(), function(pool) {
      pool.render(chart.poolGroup(), chart.renderedData());
      pool.pan({'translate': [chart.currentTranslation(), 0]});
    });

    chart.navString([start, end]);

    return chart;
  };

  chart.getCurrentDay = function() {
    return chart.getCurrentDomain().center;
  };

  chart.createMessage = function(message) {
    log('New message created:', message);
    chart.tidelineData = chart.tidelineData.addDatum(message);
    chart.data(chart.tidelineData);
    chart.emitter.emit('messageCreated', message);
  };

  chart.closeMessage = function() {
    d3.selectAll('.d3-rect-message').classed('hidden', true);
  };

  chart.type = 'daily';

  return create(el, options);
}

module.exports = chartDailyFactory;

},{"events":5}],2:[function(require,module,exports){
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
      bolus: bolusUtil,
      basal: basalUtil,
      xPosition: 0,
      yPosition: chart.poolStats.height() / 10,
      emitter: emitter,
      oneDay: false
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

},{"events":5}],3:[function(require,module,exports){
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

module.exports = {
  oneday: require('./chartdailyfactory'),
  twoweek: require('./chartweeklyfactory'),
  settings: require('./settingsfactory')
};
},{"./chartdailyfactory":1,"./chartweeklyfactory":2,"./settingsfactory":4}],4:[function(require,module,exports){
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

function settingsFactory(el, options) {
  var log = bows('Settings Factory');
  options = options || {};

  var emitter = new EventEmitter();
  var page = tideline.settings(emitter);
  page.emitter = emitter;

  var create = function(el, options) {
    if (!el) {
      throw new Error('Sorry, you must provide a DOM element! :(');
    }

    d3.select(el).call(page);

    return page;
  };

  page.load = function(data) {
    page.data(data).render();

    return page;
  };

  page.type = 'settings';

  return create(el, options);
}

module.exports = settingsFactory;
},{"events":5}],5:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[3])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0ZGFpbHlmYWN0b3J5LmpzIiwiL1ZvbHVtZXMvVGlkZXBvb2wvdGlkZWxpbmUvcGx1Z2lucy9ibGlwL2NoYXJ0d2Vla2x5ZmFjdG9yeS5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9pbmRleC5qcyIsIi9Wb2x1bWVzL1RpZGVwb29sL3RpZGVsaW5lL3BsdWdpbnMvYmxpcC9zZXR0aW5nc2ZhY3RvcnkuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LnV0aWwuZmlsbDtcbnZhciBzY2FsZXMgPSB0aWRlbGluZS5wbG90LnV0aWwuc2NhbGVzO1xuXG4vLyBDcmVhdGUgYSAnT25lIERheScgY2hhcnQgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCBUaWRlbGluZSBjb21wb25lbnRzXG5mdW5jdGlvbiBjaGFydERhaWx5RmFjdG9yeShlbCwgb3B0aW9ucykge1xuICB2YXIgbG9nID0gYm93cygnRGFpbHkgRmFjdG9yeScpO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgdmFyIGNoYXJ0ID0gdGlkZWxpbmUub25lRGF5KGVtaXR0ZXIpO1xuICBjaGFydC5lbWl0dGVyID0gZW1pdHRlcjtcblxuICB2YXIgcG9vbE1lc3NhZ2VzLCBwb29sQkcsIHBvb2xCb2x1cywgcG9vbEJhc2FsLCBwb29sU3RhdHM7XG5cbiAgdmFyIFNNQkdfU0laRSA9IDE2O1xuXG4gIHZhciBjcmVhdGUgPSBmdW5jdGlvbihlbCwgb3B0aW9ucykge1xuXG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIHZhciB3aWR0aCA9IGVsLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHQ7XG4gICAgaWYgKCEod2lkdGggJiYgaGVpZ2h0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGFydCBlbGVtZW50IG11c3QgaGF2ZSBhIHNldCB3aWR0aCBhbmQgaGVpZ2h0ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICcoZ290OiAnICsgd2lkdGggKyAnLCAnICsgaGVpZ2h0ICsgJyknKTtcbiAgICB9XG5cbiAgICAvLyBiYXNpYyBjaGFydCBzZXQgdXBcbiAgICBjaGFydC53aWR0aCh3aWR0aCkuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICBpZiAob3B0aW9ucy5pbWFnZXNCYXNlVXJsKSB7XG4gICAgICBjaGFydC5pbWFnZXNCYXNlVXJsKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCk7XG4gICAgfVxuXG4gICAgZDMuc2VsZWN0KGVsKS5jYWxsKGNoYXJ0KTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICBjaGFydC5zZXR1cFBvb2xzID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sTWVzc2FnZXMnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbCgnJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbE1lc3NhZ2VzKSlcbiAgICAgIC53ZWlnaHQoMC41KTtcblxuICAgIC8vIGJsb29kIGdsdWNvc2UgZGF0YSBwb29sXG4gICAgcG9vbEJHID0gY2hhcnQubmV3UG9vbCgpXG4gICAgICAuaWQoJ3Bvb2xCRycsIGNoYXJ0LnBvb2xHcm91cCgpKVxuICAgICAgLmxhYmVsKCdCbG9vZCBHbHVjb3NlJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJHKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcblxuICAgIC8vIGNhcmJzIGFuZCBib2x1c2VzIGRhdGEgcG9vbFxuICAgIHBvb2xCb2x1cyA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQm9sdXMnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbCgnQm9sdXMgJiBDYXJib2h5ZHJhdGVzJylcbiAgICAgIC5pbmRleChjaGFydC5wb29scygpLmluZGV4T2YocG9vbEJvbHVzKSlcbiAgICAgIC53ZWlnaHQoMS41KTtcblxuICAgIC8vIGJhc2FsIGRhdGEgcG9vbFxuICAgIHBvb2xCYXNhbCA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgLmlkKCdwb29sQmFzYWwnLCBjaGFydC5wb29sR3JvdXAoKSlcbiAgICAgIC5sYWJlbCgnQmFzYWwgUmF0ZXMnKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sQmFzYWwpKVxuICAgICAgLndlaWdodCgxLjApO1xuXG4gICAgLy8gc3RhdHMgZGF0YSBwb29sXG4gICAgcG9vbFN0YXRzID0gY2hhcnQubmV3UG9vbCgpXG4gICAgICAuaWQoJ3Bvb2xTdGF0cycsIGNoYXJ0LnBvb2xHcm91cCgpKVxuICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihwb29sU3RhdHMpKVxuICAgICAgLndlaWdodCgxLjApO1xuXG4gICAgY2hhcnQuYXJyYW5nZVBvb2xzKCk7XG5cbiAgICBjaGFydC5zZXRBbm5vdGF0aW9uKCkuc2V0VG9vbHRpcCgpO1xuXG4gICAgLy8gYWRkIGFubm90YXRpb25zXG4gICAgY2hhcnQuYW5ub3RhdGlvbnMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2NhcmJzJyk7XG4gICAgY2hhcnQuYW5ub3RhdGlvbnMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2JvbHVzJyk7XG4gICAgY2hhcnQuYW5ub3RhdGlvbnMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCYXNhbC5pZCgpKSwgJ2Jhc2FsLXJhdGUtc2VnbWVudCcpO1xuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sU3RhdHMuaWQoKSksICdzdGF0cycpO1xuXG4gICAgLy8gYWRkIHRvb2x0aXBzXG4gICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCRy5pZCgpKSwgJ2NiZycpO1xuICAgIGNoYXJ0LnRvb2x0aXBzKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBwb29sQkcuaWQoKSksICdzbWJnJyk7XG4gICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2NhcmJzJyk7XG4gICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCb2x1cy5pZCgpKSwgJ2JvbHVzJyk7XG4gICAgY2hhcnQudG9vbHRpcHMoKS5hZGRHcm91cChkMy5zZWxlY3QoJyMnICsgY2hhcnQuaWQoKSkuc2VsZWN0KCcjJyArIHBvb2xCYXNhbC5pZCgpKSwgJ2Jhc2FsJyk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubG9hZCA9IGZ1bmN0aW9uKHRpZGVsaW5lRGF0YSwgZGF0ZXRpbWUpIHtcbiAgICB2YXIgZGF0YSA9IHRpZGVsaW5lRGF0YS5kYXRhO1xuICAgIGNoYXJ0LnRpZGVsaW5lRGF0YSA9IHRpZGVsaW5lRGF0YTtcblxuICAgIHZhciBiYXNhbFV0aWwgPSB0aWRlbGluZURhdGEuYmFzYWxVdGlsO1xuICAgIHZhciBib2x1c1V0aWwgPSB0aWRlbGluZURhdGEuYm9sdXNVdGlsO1xuICAgIHZhciBjYmdVdGlsID0gdGlkZWxpbmVEYXRhLmNiZ1V0aWw7XG5cbiAgICBjaGFydC5zdG9wTGlzdGVuaW5nKCk7XG4gICAgLy8gaW5pdGlhbGl6ZSBjaGFydCB3aXRoIGRhdGFcbiAgICBjaGFydC5kYXRhKHRpZGVsaW5lRGF0YSkuc2V0QXhlcygpLnNldE5hdigpLnNldFNjcm9sbE5hdigpO1xuXG4gICAgLy8gQkcgcG9vbFxuICAgIHZhciBhbGxCRyA9IF8uZmlsdGVyKGRhdGEsIGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmICgoZC50eXBlID09PSAnY2JnJykgfHwgKGQudHlwZSA9PT0gJ3NtYmcnKSkge1xuICAgICAgICByZXR1cm4gZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgc2NhbGVCRyA9IHNjYWxlcy5iZ0xvZyhhbGxCRywgcG9vbEJHLCBTTUJHX1NJWkUvMik7XG4gICAgLy8gc2V0IHVwIHktYXhpc1xuICAgIHBvb2xCRy55QXhpcyhkMy5zdmcuYXhpcygpXG4gICAgICAuc2NhbGUoc2NhbGVCRylcbiAgICAgIC5vcmllbnQoJ2xlZnQnKVxuICAgICAgLm91dGVyVGlja1NpemUoMClcbiAgICAgIC50aWNrVmFsdWVzKHNjYWxlcy5iZ1RpY2tzKGFsbEJHKSlcbiAgICAgIC50aWNrRm9ybWF0KGQzLmZvcm1hdCgnZycpKSk7XG4gICAgLy8gYWRkIGJhY2tncm91bmQgZmlsbCByZWN0YW5nbGVzIHRvIEJHIHBvb2xcbiAgICBwb29sQkcuYWRkUGxvdFR5cGUoJ2ZpbGwnLCBmaWxsKHBvb2xCRywge2VuZHBvaW50czogY2hhcnQuZW5kcG9pbnRzfSksIGZhbHNlLCB0cnVlKTtcblxuICAgIC8vIGFkZCBDQkcgZGF0YSB0byBCRyBwb29sXG4gICAgcG9vbEJHLmFkZFBsb3RUeXBlKCdjYmcnLCB0aWRlbGluZS5wbG90LmNiZyhwb29sQkcsIHt5U2NhbGU6IHNjYWxlQkd9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBhZGQgU01CRyBkYXRhIHRvIEJHIHBvb2xcbiAgICBwb29sQkcuYWRkUGxvdFR5cGUoJ3NtYmcnLCB0aWRlbGluZS5wbG90LnNtYmcocG9vbEJHLCB7eVNjYWxlOiBzY2FsZUJHfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gYm9sdXMgJiBjYXJicyBwb29sXG4gICAgdmFyIHNjYWxlQm9sdXMgPSBzY2FsZXMuYm9sdXModGlkZWxpbmVEYXRhLmdyb3VwZWQuYm9sdXMsIHBvb2xCb2x1cyk7XG4gICAgdmFyIHNjYWxlQ2FyYnMgPSBzY2FsZXMuY2FyYnModGlkZWxpbmVEYXRhLmdyb3VwZWQuY2FyYnMsIHBvb2xCb2x1cyk7XG4gICAgLy8gc2V0IHVwIHktYXhpcyBmb3IgYm9sdXNcbiAgICBwb29sQm9sdXMueUF4aXMoZDMuc3ZnLmF4aXMoKVxuICAgICAgLnNjYWxlKHNjYWxlQm9sdXMpXG4gICAgICAub3JpZW50KCdsZWZ0JylcbiAgICAgIC5vdXRlclRpY2tTaXplKDApXG4gICAgICAudGlja3MoMykpO1xuICAgIC8vIHNldCB1cCB5LWF4aXMgZm9yIGNhcmJzXG4gICAgcG9vbEJvbHVzLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUNhcmJzKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tzKDMpKTtcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gYm9sdXMgcG9vbFxuICAgIHBvb2xCb2x1cy5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbEJvbHVzLCB7ZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHN9KSwgZmFsc2UsIHRydWUpO1xuXG4gICAgLy8gYWRkIGNhcmJzIGRhdGEgdG8gYm9sdXMgcG9vbFxuICAgIHBvb2xCb2x1cy5hZGRQbG90VHlwZSgnY2FyYnMnLCB0aWRlbGluZS5wbG90LmNhcmJzKHBvb2xCb2x1cywge1xuICAgICAgeVNjYWxlOiBzY2FsZUNhcmJzLFxuICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgIGRhdGE6IHRpZGVsaW5lRGF0YS5ncm91cGVkLmNhcmJzXG4gICAgfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gYWRkIGJvbHVzIGRhdGEgdG8gYm9sdXMgcG9vbFxuICAgIHBvb2xCb2x1cy5hZGRQbG90VHlwZSgnYm9sdXMnLCB0aWRlbGluZS5wbG90LmJvbHVzKHBvb2xCb2x1cywge1xuICAgICAgeVNjYWxlOiBzY2FsZUJvbHVzLFxuICAgICAgZW1pdHRlcjogZW1pdHRlcixcbiAgICAgIGRhdGE6IHRpZGVsaW5lRGF0YS5ncm91cGVkLmJvbHVzXG4gICAgfSksIHRydWUsIHRydWUpO1xuXG4gICAgLy8gYmFzYWwgcG9vbFxuICAgIHZhciBzY2FsZUJhc2FsID0gc2NhbGVzLmJhc2FsKHRpZGVsaW5lRGF0YS5ncm91cGVkWydiYXNhbC1yYXRlLXNlZ21lbnQnXSwgcG9vbEJhc2FsKTtcbiAgICAvLyBzZXQgdXAgeS1heGlzXG4gICAgcG9vbEJhc2FsLnlBeGlzKGQzLnN2Zy5heGlzKClcbiAgICAgIC5zY2FsZShzY2FsZUJhc2FsKVxuICAgICAgLm9yaWVudCgnbGVmdCcpXG4gICAgICAub3V0ZXJUaWNrU2l6ZSgwKVxuICAgICAgLnRpY2tzKDQpKTtcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gYmFzYWwgcG9vbFxuICAgIHBvb2xCYXNhbC5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbEJhc2FsLCB7ZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHN9KSwgZmFsc2UsIHRydWUpO1xuXG4gICAgLy8gYWRkIGJhc2FsIGRhdGEgdG8gYmFzYWwgcG9vbFxuICAgIHBvb2xCYXNhbC5hZGRQbG90VHlwZSgnYmFzYWwtcmF0ZS1zZWdtZW50JywgdGlkZWxpbmUucGxvdC5iYXNhbChwb29sQmFzYWwsIHtcbiAgICAgIHlTY2FsZTogc2NhbGVCYXNhbCxcbiAgICAgIGRhdGE6IHRpZGVsaW5lRGF0YS5ncm91cGVkWydiYXNhbC1yYXRlLXNlZ21lbnQnXVxuICAgIH0pLCB0cnVlLCB0cnVlKTtcblxuICAgIC8vIG1lc3NhZ2VzIHBvb2xcbiAgICAvLyBhZGQgYmFja2dyb3VuZCBmaWxsIHJlY3RhbmdsZXMgdG8gbWVzc2FnZXMgcG9vbFxuICAgIHBvb2xNZXNzYWdlcy5hZGRQbG90VHlwZSgnZmlsbCcsIGZpbGwocG9vbE1lc3NhZ2VzLCB7ZW5kcG9pbnRzOiBjaGFydC5lbmRwb2ludHN9KSwgZmFsc2UsIHRydWUpO1xuXG4gICAgLy8gYWRkIG1lc3NhZ2UgaW1hZ2VzIHRvIG1lc3NhZ2VzIHBvb2xcbiAgICBwb29sTWVzc2FnZXMuYWRkUGxvdFR5cGUoJ21lc3NhZ2UnLCB0aWRlbGluZS5wbG90Lm1lc3NhZ2UocG9vbE1lc3NhZ2VzLCB7XG4gICAgICBzaXplOiAzMCxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXJcbiAgICB9KSwgdHJ1ZSwgdHJ1ZSk7XG5cbiAgICAvLyBzdGF0cyBwb29sXG4gICAgcG9vbFN0YXRzLmFkZFBsb3RUeXBlKCdzdGF0cycsIHRpZGVsaW5lLnBsb3Quc3RhdHMud2lkZ2V0KHBvb2xTdGF0cywge1xuICAgICAgY2JnOiBjYmdVdGlsLFxuICAgICAgYm9sdXM6IGJvbHVzVXRpbCxcbiAgICAgIGJhc2FsOiBiYXNhbFV0aWwsXG4gICAgICB4UG9zaXRpb246IGNoYXJ0LmF4aXNHdXR0ZXIoKSxcbiAgICAgIHlQb3NpdGlvbjogMCxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBvbmVEYXk6IHRydWVcbiAgICB9KSwgZmFsc2UsIGZhbHNlKTtcblxuICAgIHJldHVybiBjaGFydDtcbiAgfTtcblxuICAvLyBsb2NhdGUgdGhlIGNoYXJ0IGFyb3VuZCBhIGNlcnRhaW4gZGF0ZXRpbWVcbiAgLy8gaWYgY2FsbGVkIHdpdGhvdXQgYW4gYXJndW1lbnQsIGxvY2F0ZXMgdGhlIGNoYXJ0IGF0IHRoZSBtb3N0IHJlY2VudCAyNCBob3VycyBvZiBkYXRhXG4gIGNoYXJ0LmxvY2F0ZSA9IGZ1bmN0aW9uKGRhdGV0aW1lKSB7XG5cbiAgICB2YXIgc3RhcnQsIGVuZCwgYXRNb3N0UmVjZW50ID0gZmFsc2U7XG5cbiAgICB2YXIgbW9zdFJlY2VudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgc3RhcnQgPSBjaGFydC5pbml0aWFsRW5kcG9pbnRzWzBdO1xuICAgICAgZW5kID0gY2hhcnQuaW5pdGlhbEVuZHBvaW50c1sxXTtcbiAgICB9O1xuXG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBhdE1vc3RSZWNlbnQgPSB0cnVlO1xuICAgICAgbW9zdFJlY2VudCgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIHRyYW5zbGF0ZSB0aGUgZGVzaXJlZCBjZW50ZXItb2YtdmlldyBkYXRldGltZSBpbnRvIGFuIGVkZ2Vwb2ludCBmb3IgdGlkZWxpbmVcbiAgICAgIHN0YXJ0ID0gbmV3IERhdGUoZGF0ZXRpbWUpO1xuICAgICAgY2hhcnQuY3VycmVudENlbnRlcihzdGFydCk7XG4gICAgICB2YXIgcGx1c0hhbGYgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICBwbHVzSGFsZi5zZXRVVENIb3VycyhwbHVzSGFsZi5nZXRVVENIb3VycygpICsgMTIpO1xuICAgICAgdmFyIG1pbnVzSGFsZiA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgIG1pbnVzSGFsZi5zZXRVVENIb3VycyhtaW51c0hhbGYuZ2V0VVRDSG91cnMoKSAtIDEyKTtcbiAgICAgIGlmICgoc3RhcnQudmFsdWVPZigpIDwgY2hhcnQuZW5kcG9pbnRzWzBdKSB8fCAoc3RhcnQudmFsdWVPZigpID4gY2hhcnQuZW5kcG9pbnRzWzFdKSkge1xuICAgICAgICBsb2coJ1BsZWFzZSBkb25cXCd0IGFzayB0aWRlbGluZSB0byBsb2NhdGUgYXQgYSBkYXRlIHRoYXRcXCdzIG91dHNpZGUgb2YgeW91ciBkYXRhIScpO1xuICAgICAgICBsb2coJ1JlbmRlcmluZyBtb3N0IHJlY2VudCBkYXRhIGluc3RlYWQuJyk7XG4gICAgICAgIG1vc3RSZWNlbnQoKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHBsdXNIYWxmLnZhbHVlT2YoKSA+IGNoYXJ0LmVuZHBvaW50c1sxXSkge1xuICAgICAgICBtb3N0UmVjZW50KCk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChtaW51c0hhbGYudmFsdWVPZigpIDwgY2hhcnQuZW5kcG9pbnRzWzBdKSB7XG4gICAgICAgIHN0YXJ0ID0gY2hhcnQuZW5kcG9pbnRzWzBdO1xuICAgICAgICB2YXIgZmlyc3RFbmQgPSBuZXcgRGF0ZShzdGFydCk7XG4gICAgICAgIGZpcnN0RW5kLnNldFVUQ0RhdGUoZmlyc3RFbmQuZ2V0VVRDRGF0ZSgpICsgMSk7XG4gICAgICAgIGVuZCA9IGZpcnN0RW5kO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGVuZCA9IG5ldyBEYXRlKHN0YXJ0KTtcbiAgICAgICAgc3RhcnQuc2V0VVRDSG91cnMoc3RhcnQuZ2V0VVRDSG91cnMoKSAtIDEyKTtcbiAgICAgICAgZW5kLnNldFVUQ0hvdXJzKGVuZC5nZXRVVENIb3VycygpICsgMTIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNoYXJ0LnJlbmRlcmVkRGF0YShbc3RhcnQsIGVuZF0pO1xuXG4gICAgY2hhcnQuc2V0QXREYXRlKHN0YXJ0LCBhdE1vc3RSZWNlbnQpO1xuXG4gICAgLy8gcmVuZGVyIHBvb2xzXG4gICAgXy5lYWNoKGNoYXJ0LnBvb2xzKCksIGZ1bmN0aW9uKHBvb2wpIHtcbiAgICAgIHBvb2wucmVuZGVyKGNoYXJ0LnBvb2xHcm91cCgpLCBjaGFydC5yZW5kZXJlZERhdGEoKSk7XG4gICAgICBwb29sLnBhbih7J3RyYW5zbGF0ZSc6IFtjaGFydC5jdXJyZW50VHJhbnNsYXRpb24oKSwgMF19KTtcbiAgICB9KTtcblxuICAgIGNoYXJ0Lm5hdlN0cmluZyhbc3RhcnQsIGVuZF0pO1xuXG4gICAgcmV0dXJuIGNoYXJ0O1xuICB9O1xuXG4gIGNoYXJ0LmdldEN1cnJlbnREYXkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hhcnQuZ2V0Q3VycmVudERvbWFpbigpLmNlbnRlcjtcbiAgfTtcblxuICBjaGFydC5jcmVhdGVNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICAgIGxvZygnTmV3IG1lc3NhZ2UgY3JlYXRlZDonLCBtZXNzYWdlKTtcbiAgICBjaGFydC50aWRlbGluZURhdGEgPSBjaGFydC50aWRlbGluZURhdGEuYWRkRGF0dW0obWVzc2FnZSk7XG4gICAgY2hhcnQuZGF0YShjaGFydC50aWRlbGluZURhdGEpO1xuICAgIGNoYXJ0LmVtaXR0ZXIuZW1pdCgnbWVzc2FnZUNyZWF0ZWQnLCBtZXNzYWdlKTtcbiAgfTtcblxuICBjaGFydC5jbG9zZU1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBkMy5zZWxlY3RBbGwoJy5kMy1yZWN0LW1lc3NhZ2UnKS5jbGFzc2VkKCdoaWRkZW4nLCB0cnVlKTtcbiAgfTtcblxuICBjaGFydC50eXBlID0gJ2RhaWx5JztcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGFydERhaWx5RmFjdG9yeTtcbiIsIi8qXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xudmFyIGZpbGwgPSB0aWRlbGluZS5wbG90LnV0aWwuZmlsbDtcblxuLy8gQ3JlYXRlIGEgJ1R3byBXZWVrcycgY2hhcnQgb2JqZWN0IHRoYXQgaXMgYSB3cmFwcGVyIGFyb3VuZCBUaWRlbGluZSBjb21wb25lbnRzXG5mdW5jdGlvbiBjaGFydFdlZWtseUZhY3RvcnkoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIGxvZyA9IGJvd3MoJ1dlZWtseSBGYWN0b3J5Jyk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICB2YXIgY2hhcnQgPSB0aWRlbGluZS50d29XZWVrKGVtaXR0ZXIpO1xuICBjaGFydC5lbWl0dGVyID0gZW1pdHRlcjtcblxuICB2YXIgcG9vbHMgPSBbXTtcblxuICB2YXIgc21iZ1RpbWU7XG5cbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIHZhciB3aWR0aCA9IGVsLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgPSBlbC5vZmZzZXRIZWlnaHQ7XG4gICAgaWYgKCEod2lkdGggJiYgaGVpZ2h0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaGFydCBlbGVtZW50IG11c3QgaGF2ZSBhIHNldCB3aWR0aCBhbmQgaGVpZ2h0ICcgK1xuICAgICAgICAgICAgICAgICAgICAgICcoZ290OiAnICsgd2lkdGggKyAnLCAnICsgaGVpZ2h0ICsgJyknKTtcbiAgICB9XG5cbiAgICAvLyBiYXNpYyBjaGFydCBzZXQgdXBcbiAgICBjaGFydC53aWR0aCh3aWR0aCkuaGVpZ2h0KGhlaWdodCk7XG5cbiAgICBpZiAob3B0aW9ucy5pbWFnZXNCYXNlVXJsKSB7XG4gICAgICBjaGFydC5pbWFnZXNCYXNlVXJsKG9wdGlvbnMuaW1hZ2VzQmFzZVVybCk7XG4gICAgICBjaGFydC5kYXRhR3V0dGVyKDgpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChjaGFydCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQubG9hZCA9IGZ1bmN0aW9uKHRpZGVsaW5lRGF0YSwgZGF0ZXRpbWUpIHtcbiAgICB2YXIgYmFzYWxVdGlsID0gdGlkZWxpbmVEYXRhLmJhc2FsVXRpbDtcbiAgICB2YXIgYm9sdXNVdGlsID0gdGlkZWxpbmVEYXRhLmJvbHVzVXRpbDtcbiAgICB2YXIgY2JnVXRpbCA9IHRpZGVsaW5lRGF0YS5jYmdVdGlsO1xuXG4gICAgdmFyIHNtYmdEYXRhID0gdGlkZWxpbmVEYXRhLmdyb3VwZWQuc21iZyB8fCBbXTtcblxuICAgIGlmICghZGF0ZXRpbWUpIHtcbiAgICAgIGNoYXJ0LmRhdGEoc21iZ0RhdGEpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGlmIChzbWJnRGF0YS5sZW5ndGggJiZcbiAgICAgICAgICBkYXRldGltZS52YWx1ZU9mKCkgPiBEYXRlLnBhcnNlKHNtYmdEYXRhW3NtYmdEYXRhLmxlbmd0aCAtIDFdLm5vcm1hbFRpbWUpKSB7XG4gICAgICAgIGRhdGV0aW1lID0gc21iZ0RhdGFbc21iZ0RhdGEubGVuZ3RoIC0gMV0ubm9ybWFsVGltZTtcbiAgICAgIH1cbiAgICAgIGNoYXJ0LmRhdGEoc21iZ0RhdGEsIGRhdGV0aW1lKTtcbiAgICB9XG5cbiAgICBjaGFydC5zZXR1cCgpO1xuXG4gICAgdmFyIGRheXMgPSBjaGFydC5kYXlzO1xuXG4gICAgLy8gbWFrZSBwb29scyBmb3IgZWFjaCBkYXlcbiAgICBkYXlzLmZvckVhY2goZnVuY3Rpb24oZGF5LCBpKSB7XG4gICAgICB2YXIgbmV3UG9vbCA9IGNoYXJ0Lm5ld1Bvb2woKVxuICAgICAgICAuaWQoJ3Bvb2xCR18nICsgZGF5LCBjaGFydC5kYXlzR3JvdXAoKSlcbiAgICAgICAgLmluZGV4KGNoYXJ0LnBvb2xzKCkuaW5kZXhPZihuZXdQb29sKSlcbiAgICAgICAgLndlaWdodCgxLjApO1xuICAgIH0pO1xuXG4gICAgY2hhcnQuYXJyYW5nZVBvb2xzKCk7XG4gICAgY2hhcnQuc2V0VG9vbHRpcCgpLnNldEFubm90YXRpb24oKTtcblxuICAgIGNoYXJ0LnNldEF4ZXMoKS5zZXROYXYoKS5zZXRTY3JvbGxOYXYoKTtcblxuICAgIHZhciBmaWxsRW5kcG9pbnRzID0gW25ldyBEYXRlKCcyMDE0LTAxLTAxVDAwOjAwOjAwWicpLCBuZXcgRGF0ZSgnMjAxNC0wMS0wMlQwMDowMDowMFonKV07XG4gICAgdmFyIGZpbGxTY2FsZSA9IGQzLnRpbWUuc2NhbGUudXRjKClcbiAgICAgIC5kb21haW4oZmlsbEVuZHBvaW50cylcbiAgICAgIC5yYW5nZShbY2hhcnQuYXhpc0d1dHRlcigpICsgY2hhcnQuZGF0YUd1dHRlcigpLCBjaGFydC53aWR0aCgpIC0gY2hhcnQubmF2R3V0dGVyKCkgLSBjaGFydC5kYXRhR3V0dGVyKCldKTtcblxuICAgIHNtYmdUaW1lID0gbmV3IHRpZGVsaW5lLnBsb3QuU01CR1RpbWUoe2VtaXR0ZXI6IGVtaXR0ZXJ9KTtcblxuICAgIGNoYXJ0LnBvb2xzKCkuZm9yRWFjaChmdW5jdGlvbihwb29sLCBpKSB7XG4gICAgICB2YXIgZ3V0dGVyO1xuICAgICAgdmFyIGQgPSBuZXcgRGF0ZShwb29sLmlkKCkucmVwbGFjZSgncG9vbEJHXycsICcnKSk7XG4gICAgICB2YXIgZGF5T2ZUaGVXZWVrID0gZC5nZXRVVENEYXkoKTtcbiAgICAgIGlmICgoZGF5T2ZUaGVXZWVrID09PSAwKSB8fCAoZGF5T2ZUaGVXZWVrID09PSA2KSkge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDEuNSwgJ2JvdHRvbSc6IDEuNX07XG4gICAgICB9XG4gICAgICAvLyBvbiBNb25kYXlzIHRoZSBib3R0b20gZ3V0dGVyIHNob3VsZCBiZSBhIHdlZWtlbmQgZ3V0dGVyXG4gICAgICBlbHNlIGlmIChkYXlPZlRoZVdlZWsgPT09IDEpIHtcbiAgICAgICAgZ3V0dGVyID0geyd0b3AnOiAwLjUsICdib3R0b20nOiAxLjV9O1xuICAgICAgfVxuICAgICAgLy8gb24gRnJpZGF5cyB0aGUgdG9wIGd1dHRlciBzaG91bGQgYmUgYSB3ZWVrZW5kIGd1dHRlclxuICAgICAgZWxzZSBpZiAoZGF5T2ZUaGVXZWVrID09PSA1KSB7XG4gICAgICAgIGd1dHRlciA9IHsndG9wJzogMS41LCAnYm90dG9tJzogMC41fTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBndXR0ZXIgPSB7J3RvcCc6IDAuNSwgJ2JvdHRvbSc6IDAuNX07XG4gICAgICB9XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdmaWxsJywgZmlsbChwb29sLCB7XG4gICAgICAgIGVuZHBvaW50czogZmlsbEVuZHBvaW50cyxcbiAgICAgICAgeFNjYWxlOiBmaWxsU2NhbGUsXG4gICAgICAgIGd1dHRlcjogZ3V0dGVyLFxuICAgICAgICBkYXRhR3V0dGVyOiBjaGFydC5kYXRhR3V0dGVyKClcbiAgICAgIH0pLCBmYWxzZSk7XG4gICAgICBwb29sLmFkZFBsb3RUeXBlKCdzbWJnJywgc21iZ1RpbWUuZHJhdyhwb29sKSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICBjaGFydC50b29sdGlwcygpLmFkZEdyb3VwKGQzLnNlbGVjdCgnIycgKyBjaGFydC5pZCgpKS5zZWxlY3QoJyMnICsgcG9vbC5pZCgpKSwgcG9vbC5pZCgpKTtcbiAgICAgIHBvb2wucmVuZGVyKGNoYXJ0LmRheXNHcm91cCgpLCBjaGFydC5kYXRhUGVyRGF5W2ldKTtcbiAgICB9KTtcblxuICAgIGNoYXJ0LnBvb2xTdGF0cy5hZGRQbG90VHlwZSgnc3RhdHMnLCB0aWRlbGluZS5wbG90LnN0YXRzLndpZGdldChjaGFydC5wb29sU3RhdHMsIHtcbiAgICAgIGNiZzogY2JnVXRpbCxcbiAgICAgIGJvbHVzOiBib2x1c1V0aWwsXG4gICAgICBiYXNhbDogYmFzYWxVdGlsLFxuICAgICAgeFBvc2l0aW9uOiAwLFxuICAgICAgeVBvc2l0aW9uOiBjaGFydC5wb29sU3RhdHMuaGVpZ2h0KCkgLyAxMCxcbiAgICAgIGVtaXR0ZXI6IGVtaXR0ZXIsXG4gICAgICBvbmVEYXk6IGZhbHNlXG4gICAgfSksIGZhbHNlLCBmYWxzZSk7XG5cbiAgICBjaGFydC5wb29sU3RhdHMucmVuZGVyKGNoYXJ0LnBvb2xHcm91cCgpKTtcblxuICAgIGNoYXJ0LmFubm90YXRpb25zKCkuYWRkR3JvdXAoZDMuc2VsZWN0KCcjJyArIGNoYXJ0LmlkKCkpLnNlbGVjdCgnIycgKyBjaGFydC5wb29sU3RhdHMuaWQoKSksICdzdGF0cycpO1xuXG4gICAgY2hhcnQubmF2U3RyaW5nKCk7XG5cbiAgICByZXR1cm4gY2hhcnQ7XG4gIH07XG5cbiAgY2hhcnQuc2hvd1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgIHNtYmdUaW1lLnNob3dWYWx1ZXMoKTtcbiAgfTtcblxuICBjaGFydC5oaWRlVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgc21iZ1RpbWUuaGlkZVZhbHVlcygpO1xuICB9O1xuXG4gIGNoYXJ0LnR5cGUgPSAnd2Vla2x5JztcblxuICByZXR1cm4gY3JlYXRlKGVsLCBvcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjaGFydFdlZWtseUZhY3Rvcnk7XG4iLCIvKiBcbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBUaWRlcG9vbCBQcm9qZWN0XG4gKiBcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0IHVuZGVyXG4gKiB0aGUgdGVybXMgb2YgdGhlIGFzc29jaWF0ZWQgTGljZW5zZSwgd2hpY2ggaXMgaWRlbnRpY2FsIHRvIHRoZSBCU0QgMi1DbGF1c2VcbiAqIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5IHRoZSBPcGVuIFNvdXJjZSBJbml0aWF0aXZlIGF0IG9wZW5zb3VyY2Uub3JnLlxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCwgYnV0IFdJVEhPVVRcbiAqIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuIFNlZSB0aGUgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICogXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtOyBpZlxuICogbm90LCB5b3UgY2FuIG9idGFpbiBvbmUgZnJvbSBUaWRlcG9vbCBQcm9qZWN0IGF0IHRpZGVwb29sLm9yZy5cbiAqID09IEJTRDIgTElDRU5TRSA9PVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBvbmVkYXk6IHJlcXVpcmUoJy4vY2hhcnRkYWlseWZhY3RvcnknKSxcbiAgdHdvd2VlazogcmVxdWlyZSgnLi9jaGFydHdlZWtseWZhY3RvcnknKSxcbiAgc2V0dGluZ3M6IHJlcXVpcmUoJy4vc2V0dGluZ3NmYWN0b3J5Jylcbn07IiwiLyogXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqIENvcHlyaWdodCAoYykgMjAxNCwgVGlkZXBvb2wgUHJvamVjdFxuICogXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTsgeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeSBpdCB1bmRlclxuICogdGhlIHRlcm1zIG9mIHRoZSBhc3NvY2lhdGVkIExpY2Vuc2UsIHdoaWNoIGlzIGlkZW50aWNhbCB0byB0aGUgQlNEIDItQ2xhdXNlXG4gKiBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieSB0aGUgT3BlbiBTb3VyY2UgSW5pdGlhdGl2ZSBhdCBvcGVuc291cmNlLm9yZy5cbiAqIFxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsIGJ1dCBXSVRIT1VUXG4gKiBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiBTZWUgdGhlIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqIFxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbTsgaWZcbiAqIG5vdCwgeW91IGNhbiBvYnRhaW4gb25lIGZyb20gVGlkZXBvb2wgUHJvamVjdCBhdCB0aWRlcG9vbC5vcmcuXG4gKiA9PSBCU0QyIExJQ0VOU0UgPT1cbiAqL1xuXG52YXIgXyA9IHdpbmRvdy5fO1xudmFyIGJvd3MgPSB3aW5kb3cuYm93cztcbnZhciBkMyA9IHdpbmRvdy5kMztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxudmFyIHRpZGVsaW5lID0gd2luZG93LnRpZGVsaW5lO1xuXG5mdW5jdGlvbiBzZXR0aW5nc0ZhY3RvcnkoZWwsIG9wdGlvbnMpIHtcbiAgdmFyIGxvZyA9IGJvd3MoJ1NldHRpbmdzIEZhY3RvcnknKTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGVtaXR0ZXIgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIHZhciBwYWdlID0gdGlkZWxpbmUuc2V0dGluZ3MoZW1pdHRlcik7XG4gIHBhZ2UuZW1pdHRlciA9IGVtaXR0ZXI7XG5cbiAgdmFyIGNyZWF0ZSA9IGZ1bmN0aW9uKGVsLCBvcHRpb25zKSB7XG4gICAgaWYgKCFlbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTb3JyeSwgeW91IG11c3QgcHJvdmlkZSBhIERPTSBlbGVtZW50ISA6KCcpO1xuICAgIH1cblxuICAgIGQzLnNlbGVjdChlbCkuY2FsbChwYWdlKTtcblxuICAgIHJldHVybiBwYWdlO1xuICB9O1xuXG4gIHBhZ2UubG9hZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBwYWdlLmRhdGEoZGF0YSkucmVuZGVyKCk7XG5cbiAgICByZXR1cm4gcGFnZTtcbiAgfTtcblxuICBwYWdlLnR5cGUgPSAnc2V0dGluZ3MnO1xuXG4gIHJldHVybiBjcmVhdGUoZWwsIG9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHRpbmdzRmFjdG9yeTsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
(3)
});