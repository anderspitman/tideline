/** @jsx React.DOM */
var _ = require('lodash');
var bows = require('bows');
var React = require('react');
var d3 = require('d3');

var Daily = require('./components/daily');
var Weekly = require('./components/weekly');
var Settings = require('./components/settings');
// tideline dependencies & plugins
var preprocess = require('../plugins/data/preprocess/');

require('../css/tideline.less');
require('./less/example.less');

var example = {
  log: bows('Example')
};

var Example = React.createClass({
  log: bows('Example'),
  propTypes: {
    chartData: React.PropTypes.object.isRequired
  },
  getInitialState: function() {
    return {
      chartPrefs: {
        bgUnits: 'mg/dL',
        hiddenPools: {
          basalSettings: true
        }
      },
      datetimeLocation: null,
      initialDatetimeLocation: null,
      chartType: 'daily'
    };
  },
  render: function() {
    var chart = this.renderChart();
    /* jshint ignore:start */
    return (
      <div>
        <div className="vSpace"></div>
          {chart}
        <div className="vSpace"></div>
      </div>
    );
    /* jshint ignore:end */
  },
  renderChart: function() {
    window.tidelineData = this.props.chartData;
    switch (this.state.chartType) {
      case 'daily':
        /* jshint ignore:start */
        return (
          <Daily
            chartPrefs={this.state.chartPrefs}
            initialDatetimeLocation={this.state.initialDatetimeLocation}
            patientData={this.props.chartData}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly}
            updateChartPrefs={this.updateChartPrefs}
            updateDatetimeLocation={this.updateDatetimeLocation} />
          );
        /* jshint ignore:end */
      case 'weekly':
        /* jshint ignore:start */
        return (
          <Weekly
            chartPrefs={this.state.chartPrefs}
            initialDatetimeLocation={this.state.initialDatetimeLocation}
            patientData={this.props.chartData}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly}
            updateChartPrefs={this.updateChartPrefs}
            updateDatetimeLocation={this.updateDatetimeLocation} />
          );
        /* jshint ignore:end */
      case 'settings':
        /* jshint ignore:start */
        return (
          <Settings
            chartPrefs={this.state.chartPrefs}
            patientData={this.props.chartData}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly} />
          );
        /* jshint ignore:end */
    }
  },
  // handlers
  handleSwitchToDaily: function(datetime) {
    this.setState({
      chartType: 'daily',
      initialDatetimeLocation: datetime || this.state.datetimeLocation
    });
  },
  handleSwitchToSettings: function() {
    this.setState({
      chartType: 'settings'
    });
  },
  handleSwitchToWeekly: function(datetime) {
    this.setState({
      chartType: 'weekly',
      initialDatetimeLocation: datetime || this.state.datetimeLocation
    });
  },
  updateChartPrefs: function(newChartPrefs) {
    var currentPrefs = _.clone(this.state.chartPrefs);
    _.assign(currentPrefs, newChartPrefs);
    this.setState({
      chartPrefs: currentPrefs
    }, function() {
      // this.log('Global example state changed:', JSON.stringify(this.state));
    });
  },
  updateDatetimeLocation: function(datetime) {
    this.setState({
      datetimeLocation: datetime
    }, function() {
      // this.log('Global example state changed:', JSON.stringify(this.state));
    });
  }
});


var dataUrl = process.env.DATA;
if (_.isEmpty(dataUrl)) {
  dataUrl = 'device-data.json';
}
dataUrl = 'data/' + dataUrl;

d3.json(dataUrl, function(err, data) {
  if (err) {
    throw new Error('Could not fetch data file at ' + dataUrl);
  }
  var chartData = preprocess.processData(data);

  React.renderComponent(
    /* jshint ignore:start */
    <Example chartData={chartData}/>,
    /* jshint ignore:end */
    document.body
  );
});
