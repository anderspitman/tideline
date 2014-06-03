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

var d3 = require('../lib/').d3;
var _ = require('../lib/')._;

var log = require('../lib/').bows('SMBG');
var scales = require('./util/scales');
var bgBoundaryClass = require('./util/bgBoundaryClass');

module.exports = function(pool, opts) {

  opts = opts || {};

  var defaults = {
    classes: {
      'very-low': {'boundary': 60},
      'low': {'boundary': 80, 'tooltip': 'smbg_tooltip_low.svg'},
      'target': {'boundary': 180, 'tooltip': 'smbg_tooltip_target.svg'},
      'high': {'boundary': 200, 'tooltip': 'smbg_tooltip_high.svg'},
      'very-high': {'boundary': 300}
    },
    size: 16,
    imagesBaseUrl: pool.imagesBaseUrl(),
    tooltipWidth: 70,
    tooltipHeight: 24
  };

  _.defaults(opts, defaults);

  var getBgBoundaryClass = bgBoundaryClass(opts);

  function smbg(selection) {
    opts.xScale = pool.xScale().copy();
    selection.each(function(currentData) {
      var circles = d3.select(this)
        .selectAll('image')
        .data(currentData, function(d) {
          return d.id;
        });
      circles.enter()
        .append('circle')
        .attr({
          cx: function(d) {
            return opts.xScale(Date.parse(d.offsetTime));
          },
          cy: function(d) {
            return opts.yScale(d.value);
          },
          r: 7,
          id: function(d) {
            return 'smbg_' + d.id;
          },
          class: getBgBoundaryClass
        })
        .classed({'d3-smbg': true, 'd3-circle-smbg': true});
      circles.exit().remove();

      // tooltips
      selection.selectAll('.d3-circle-smbg').on('mouseover', function() {
        if (d3.select(this).classed('d3-bg-low')) {
          smbg.addTooltip(d3.select(this).datum(), 'low');
        }
        else if (d3.select(this).classed('d3-bg-target')) {
          smbg.addTooltip(d3.select(this).datum(), 'target');
        }
        else {
          smbg.addTooltip(d3.select(this).datum(), 'high');
        }
      });
      selection.selectAll('.d3-circle-smbg').on('mouseout', function() {
        var id = d3.select(this).attr('id').replace('smbg_', 'tooltip_');
        d3.select('#' + id).remove();
      });
    });
  }

  smbg.addTooltip = function(d, category) {
    d3.select('#' + 'tidelineTooltips_smbg_utc')
      .call(pool.tooltips(),
        d,
        // tooltipXPos
        opts.xScale(Date.parse(d.offsetTime)),
        'smbg',
        // timestamp
        true,
        opts.classes[category].tooltip,
        opts.tooltipWidth,
        opts.tooltipHeight,
        // imageX
        opts.xScale(Date.parse(d.offsetTime)),
        // imageY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipHeight;
          }
          else {
            return opts.yScale(d.value);
          }
        },
        // textX
        opts.xScale(Date.parse(d.offsetTime)) + opts.tooltipWidth / 2,
        // textY
        function() {
          if ((category === 'low') || (category === 'target')) {
            return opts.yScale(d.value) - opts.tooltipHeight / 2;
          }
          else {
            return opts.yScale(d.value) + opts.tooltipHeight / 2;
          }
        });
  };

  return smbg;
};
