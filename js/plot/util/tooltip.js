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

var d3 = require('../../lib/').d3;
var moment = require('moment-timezone');

var log = require('../../lib/').bows('Tooltip');

module.exports = function(container, tooltipsGroup) {

  var id, timestampHeight = 20;

  function tooltip(selection,
    d,
    tooltipXPos,
    path,
    makeTimestamp,
    image,
    tooltipWidth,
    tooltipHeight,
    imageX, imageY,
    textX, textY,
    customText, tspan) {
    var tooltipGroup = selection.append('g')
      .attr('class', 'd3-tooltip')
      .attr('id', 'tooltip_' + d.id);

    var imagesBaseUrl = container.imagesBaseUrl();

    var currentTranslation = container.currentTranslation();

    var locationInWindow = currentTranslation + tooltipXPos;

    var translation = 0;

    var newBasalPosition;

    // moving basal tooltips at edges of display
    if (path === 'basal') {
      if (locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) {
        newBasalPosition = -currentTranslation + container.width() - tooltipWidth;
        if (newBasalPosition < imageX) {
          translation = newBasalPosition - imageX;
          imageX = newBasalPosition;
        }
      }
      else if (locationInWindow < (((container.width() - container.axisGutter()) / 24) * 3)) {
        newBasalPosition = -currentTranslation + container.axisGutter();
        if (newBasalPosition > imageX) {
          translation = newBasalPosition - imageX;
          imageX = newBasalPosition;
        }
      }
    }
    // and bolus, carbs, cbg, smbg
    if ((path === 'bolus') || (path === 'carbs') || (path === 'cbg') || (path === 'smbg')) {
      if (locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) {
        translation = -tooltipWidth;
      }
    }

    // for now (unless I can persude Sara and Alix otherwise), high cbg values are a special case
    if (image.indexOf('cbg_tooltip_high') !== -1) {
      if (locationInWindow < (((container.width() - container.axisGutter()) / 24) * 3)) {
        tooltipGroup.append('image')
          .attr({
            'xlink:href': imagesBaseUrl + '/' + path + '/' + image,
            'x': imageX,
            'y': imageY,
            'width': tooltipWidth,
            'height': tooltipHeight,
            'class': 'd3-tooltip-image'
          });

        tooltipGroup.append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            return d.value;
          });
      }
      else {
        tooltipGroup.append('image')
          .attr({
            'xlink:href': function() {
              var str =  imagesBaseUrl + '/' + path + '/' + image;
              return str.replace('.svg', '_left.svg');
            },
            'x': imageX - tooltipWidth,
            'y': imageY,
            'width': tooltipWidth,
            'height': tooltipHeight,
            'class': 'd3-tooltip-image'
          });

        tooltipGroup.append('text')
          .attr({
            'x': textX - tooltipWidth,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            return d.value;
          });
      }
    }
    // if the data point is three hours from the end of the data in view or less, use a left tooltip
    else if ((locationInWindow > container.width() - (((container.width() - container.axisGutter()) / 24) * 3)) &&
      (path !== 'basal')) {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': function() {
            var str =  imagesBaseUrl + '/' + path + '/' + image;
            return str.replace('.svg', '_left.svg');
          },
          'x': imageX - tooltipWidth,
          'y': imageY,
          'width': tooltipWidth,
          'height': tooltipHeight,
          'class': 'd3-tooltip-image'
        });

      if (tspan) {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
        tooltipGroup.select('.d3-tooltip-text-group').select('text')
          .append('tspan')
          .text(' ' + tspan);
      }
      else {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
      }

      // adjust the values needed for the timestamp
      imageX = imageX - tooltipWidth;
      textX = textX - tooltipWidth;
    }
    else {
      tooltipGroup.append('image')
        .attr({
          'xlink:href': imagesBaseUrl + '/' + path + '/' + image,
          'x': imageX,
          'y': imageY,
          'width': tooltipWidth,
          'height': tooltipHeight,
          'class': 'd3-tooltip-image'
        });

      if (tspan) {
        tooltipGroup.append('g')
        .attr({
          'class': 'd3-tooltip-text-group',
          'transform': 'translate(' + translation + ',0)'
        })
        .append('text')
        .attr({
          'x': textX,
          'y': textY,
          'class': 'd3-tooltip-text d3-' + path
        })
        .text(function() {
          if (customText) {
            return customText;
          }
          else {
            return d.value;
          }
        });
        tooltipGroup.select('.d3-tooltip-text-group').select('text')
          .append('tspan')
          .text(' ' + tspan);
      }
      else {
        tooltipGroup.append('g')
          .attr({
            'class': 'd3-tooltip-text-group',
            'transform': 'translate(' + translation + ',0)'
          })
          .append('text')
          .attr({
            'x': textX,
            'y': textY,
            'class': 'd3-tooltip-text d3-' + path
          })
          .text(function() {
            if (customText) {
              return customText;
            }
            else {
              return d.value;
            }
          });
      }

    }

    if (makeTimestamp) {
      tooltip.timestamp(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight, selection);
    }
  }

  tooltip.timestamp = function(d, tooltipGroup, imageX, imageY, textX, textY, tooltipWidth, tooltipHeight, selection) {
    var magic = timestampHeight * 1.2;
    var timestampY = imageY() - timestampHeight;
    var timestampTextY = timestampY + magic / 2;

    var formatTime = d3.time.format.utc('%-I:%M %p');
    var tooltipCategory = selection.attr('id');
    var t;
    if (tooltipCategory.search('utc') !== -1) {
      t = formatTime(new Date(d.normalTime));
    }
    else if (tooltipCategory.search('pac' !== -1)) {
      t = moment(d.deviceTime).tz('US/Pacific').format("h:mm a");
    }
    else {
      t = formatTime(new Date(d.normalTime));
    }
    tooltipGroup.append('rect')
      .attr({
        'x': imageX,
        'y': timestampY,
        'width': tooltipWidth,
        'height': timestampHeight,
        'class': 'd3-tooltip-rect'
      });
    tooltipGroup.append('text')
      .attr({
        'x': textX,
        'y': timestampTextY,
        'baseline-shift': (magic - timestampHeight) / 2,
        'class': 'd3-tooltip-text d3-tooltip-timestamp'
      })
      .text('at ' + t);
  };

  tooltip.addGroup = function(pool, type) {
    tooltipsGroup.append('g')
      .attr('id', tooltip.id() + '_' + type)
      .attr('transform', pool.attr('transform'));
  };

  // getters & setters
  tooltip.id = function(x) {
    if (!arguments.length) return id;
    id = tooltipsGroup.attr('id');
    return tooltip;
  };

  return tooltip;
};