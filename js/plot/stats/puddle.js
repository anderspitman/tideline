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

var _ = require('lodash');

var log = require('bows')('Puddle');

module.exports = function(opts) {

  opts = opts || {};

  var defaults = {
    headSize: 16,
    leadSize: 14,
    displaySize: 24
  };

  _.defaults(opts, defaults);

  var height, xPosition;

  function puddle(selection, txt) {
    selection.call(puddle.addHead);
    selection.call(puddle.addLead);
  }

  puddle.dataDisplay = function(selection, display) {
    selection.selectAll('text.d3-stats-display').remove();
    var displayGroup = selection.append('text')
      .attr({
        'x': opts.xOffset,
        'y': opts.height,
        'class': 'd3-stats-display'
      });

    display.forEach(function(txt) {
      displayGroup.append('tspan')
        .attr('class', txt['class'])
        .text(txt.text);
    });
  };

  puddle.addHead = _.once(function(selection) {
    selection.append('text')
      .attr({
        'x': opts.xOffset,
        'y': 0,
        'class': 'd3-stats-head'
      })
      .text(opts.head);
  });

  puddle.addLead = _.once(function(selection) {
    selection.append('text')
      .attr({
        'x': opts.xOffset,
        'y': opts.height * 0.45,
        'class': 'd3-stats-lead'
      })
      .text(opts.lead);
  });

  puddle.xPosition = function(x) {
    if (!arguments.length) return xPosition;
    xPosition = x;
    return puddle;
  };

  puddle.width = function(x) {
    if (!arguments.length) return opts.width;
    opts.width = x;
    return puddle;
  };

  puddle.height = function(x) {
    if (!arguments.length) return height;
    height = x;
    return puddle;
  };

  puddle.id = opts.id;

  puddle.weight = opts.weight;

  puddle.pie = opts.pie;

  return puddle;
};