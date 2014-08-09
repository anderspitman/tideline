/** @jsx React.DOM */
var bows = require('bows');
var React = require('react');
var cx = require('react/lib/cx');

var tideline = {
  log: bows('Footer')
};

var TidelineFooter = React.createClass({
  propTypes: {
    chartType: React.PropTypes.string.isRequired,
    onClickValues: React.PropTypes.func,
    showingValues: React.PropTypes.bool
  },
  render: function() {
    var valuesLinkClass = cx({
      'tidelineNavLabel': true,
      'tidelineNavRightLabel': true
    });

    function getValuesLinkText(props) {
      if (props.chartType === 'weekly') {
        if (props.showingValues) {
          return 'Hide Values';
        }
        else {
          return 'Show Values';
        }
      }
      else {
        return '';
      }
    }

    var valuesLinkText = getValuesLinkText(this.props);

    /* jshint ignore:start */
    var showValues = (
      <a className={valuesLinkClass} onClick={this.props.onClickValues}>{valuesLinkText}</a>
      );
    /* jshint ignore:end */

    /* jshint ignore:start */
    return (
      <div className="tidelineNav grid">
        <div className="grid-item one-half">
        </div>
        <div className="grid-item one-half">{showValues}</div>
      </div>
      );
    /* jshint ignore:end */
  }
});

module.exports = TidelineFooter;
