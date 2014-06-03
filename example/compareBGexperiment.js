/*
 * == BSD2 LICENSE ==
 */

var $ = window.$;
var d3 = window.d3;
var _ = window._;

// tideline dependencies & plugins
var tideline = window.tideline;
var preprocess = window.tideline.preprocess;
var experiment = window.tideline.experiments;
var chartDailyFactory = experiment.oneday;

var log = window.bows('Dual BG Experiment');

var el = document.getElementById('tidelineContainer');
var imagesBaseUrl = '../img';

var oneDay = chartDailyFactory(el, {imagesBaseUrl: imagesBaseUrl}).setupPools();

// things common to one-day and two-week views
oneDay.emitter.on('navigated', function(navString) {
  var d = new Date(navString[0]);
  var formatDate = d3.time.format.utc('%A, %B %-d');
  $('#tidelineNavString').html(formatDate(d));
});

oneDay.emitter.on('mostRecent', function(mostRecent) {
  if (mostRecent) {
    $('#mostRecent').parent().addClass('active');
  }
  else {
    $('#mostRecent').parent().removeClass('active');
  }
});

// load data and draw charts
d3.json('data/UTC-data.json', function(data) {
  log('Data loaded.');
  console.log(data.length);
  data = preprocess.processData(data);

  log('Initial one-day view.');
  oneDay.load(data).locate('2014-05-26T00:00:00');
  // attach click handlers to set up programmatic pan
  $('#tidelineNavForward').on('click', oneDay.panForward);
  $('#tidelineNavBack').on('click', oneDay.panBack);

  $('#mostRecent').on('click', function() {
    log('Navigated to most recent data.');
    oneDay.clear().show().locate();
    $('#mostRecent').parent().addClass('active');
  });
});