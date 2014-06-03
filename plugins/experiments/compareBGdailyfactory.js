/*
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
  var defaults = {
    'bgUnits': 'mg/dL'
  };
  _.defaults(options, defaults);

  var emitter = new EventEmitter();
  var chart = tideline.oneDay(emitter);
  chart.emitter = emitter;
  chart.options = options;

  var poolBGUTC, poolBGPacific, poolBGRaw;

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

    // blood glucose data pool #0
    poolBGUTC = chart.newPool()
      .id('poolBG_utc', chart.poolGroup())
      .label([{
        'main': 'Blood Glucose',
        'light': ' (UTC, Timezone-corrected == THE TRUTH)'
      }])
      .legend(['bg'])
      .index(chart.pools().indexOf(poolBGUTC))
      .weight(1.5);

    // blood glucose data pool #1
    poolBGPacific = chart.newPool()
      .id('poolBG_pacific', chart.poolGroup())
      .label([{
        'main': 'Blood Glucose',
        'light': ' (UTC from current timezone, shown as Pacific)'
      }])
      .index(chart.pools().indexOf(poolBGPacific))
      .weight(1.5);

    // blood glucose data pool #2
    poolBGRaw = chart.newPool()
      .id('poolBG_raw', chart.poolGroup())
      .label([{
        'main': 'Blood Glucose',
        'light': ' (Raw Device Time)'
      }])
      .index(chart.pools().indexOf(poolBGRaw))
      .weight(1.5);

    chart.arrangePools();

    chart.setAnnotation().setTooltip();

    // add tooltips
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGUTC.id()), 'cbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGUTC.id()), 'smbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGPacific.id()), 'cbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGPacific.id()), 'smbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGRaw.id()), 'cbg');
    chart.tooltips().addGroup(d3.select('#' + chart.id()).select('#' + poolBGRaw.id()), 'smbg');

    return chart;
  };

  chart.load = function(tidelineData, datetime) {
    var data = tidelineData.data;
    chart.tidelineData = tidelineData;

    chart.stopListening();
    // initialize chart with data
    chart.data(tidelineData).setAxes().setNav().setScrollNav();

    // BG pool
    var allBG = _.filter(data, function(d) {
      if ((d.type === 'cbg') || (d.type === 'smbg')) {
        return d;
      }
    });

    var scaleBGUTC = scales.bgLog(allBG, poolBGUTC, SMBG_SIZE/2);
    // set up y-axis
    poolBGUTC.yAxis(d3.svg.axis()
      .scale(scaleBGUTC)
      .orient('left')
      .outerTickSize(0)
      .tickValues(scales.bgTicks(allBG))
      .tickFormat(d3.format('g')));

    // add CBG data to BG pool
    poolBGUTC.addPlotType('cbg', tideline.plot.cbgutc(poolBGUTC, {yScale: scaleBGUTC}), true, true);

    // add SMBG data to BG pool
    poolBGUTC.addPlotType('smbg', tideline.plot.smbgutc(poolBGUTC, {yScale: scaleBGUTC}), true, true);

    var scaleBGPacific = scales.bgLog(allBG, poolBGPacific, SMBG_SIZE/2);
    // set up y-axis
    poolBGPacific.yAxis(d3.svg.axis()
      .scale(scaleBGPacific)
      .orient('left')
      .outerTickSize(0)
      .tickValues(scales.bgTicks(allBG))
      .tickFormat(d3.format('g')));
    // add background fill rectangles to BG pool
    poolBGPacific.addPlotType('fill', fill(poolBGPacific, {
      endpoints: chart.endpoints,
      guidelines: [
        {
          'class': 'd3-line-bg-threshold',
          'height': 80
        },
        {
          'class': 'd3-line-bg-threshold',
          'height': 180
        }
      ],
      yScale: scaleBGPacific
    }), false, true);

    // add CBG data to BG pool
    poolBGPacific.addPlotType('cbg', tideline.plot.cbgpac(poolBGPacific, {yScale: scaleBGPacific}), true, true);

    // add SMBG data to BG pool
    poolBGPacific.addPlotType('smbg', tideline.plot.smbgpac(poolBGPacific, {yScale: scaleBGPacific}), true, true);

    var scaleBGRaw = scales.bgLog(allBG, poolBGRaw, SMBG_SIZE/2);
    // set up y-axis
    poolBGRaw.yAxis(d3.svg.axis()
      .scale(scaleBGRaw)
      .orient('left')
      .outerTickSize(0)
      .tickValues(scales.bgTicks(allBG))
      .tickFormat(d3.format('g')));
    // add background fill rectangles to BG pool
    poolBGRaw.addPlotType('fill', fill(poolBGRaw, {
      endpoints: chart.endpoints,
      guidelines: [
        {
          'class': 'd3-line-bg-threshold',
          'height': 80
        },
        {
          'class': 'd3-line-bg-threshold',
          'height': 180
        }
      ],
      yScale: scaleBGRaw
    }), false, true);

    // add CBG data to BG pool
    poolBGRaw.addPlotType('cbg', tideline.plot.cbgpac(poolBGRaw, {yScale: scaleBGRaw}), true, true);

    // add SMBG data to BG pool
    poolBGRaw.addPlotType('smbg', tideline.plot.smbgpac(poolBGRaw, {yScale: scaleBGRaw}), true, true);

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

    // render pools
    _.each(chart.pools(), function(pool) {
      pool.render(chart.poolGroup(), chart.renderedData());
    });

    chart.setAtDate(start, atMostRecent);

    chart.navString([start, end]);

    return chart;
  };

  return create(el, options);
}

module.exports = chartDailyFactory;
