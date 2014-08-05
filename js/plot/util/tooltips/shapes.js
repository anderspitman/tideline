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

var _ = require('../../../lib/')._;

// when adding a shape from an image supplied by designer
// viewBox attribute should be copied exactly from svg image
var shapeutil = require('../shapeutil');

var shapes = {
  cbg: {
    fixed: true,
    els: [
      {
        el: 'path',
        attrs: {
          d: 'M4.529,4.199C2.75,5.978,1.725,8.215,1.43,10.529l-0.396,12.61l12.611-0.395c2.314-0.297,4.553-1.32,6.332-3.098c4.264-4.266,4.264-11.182-0.002-15.449C15.711-0.066,8.793-0.066,4.529,4.199z',
          fill: '#FFFFFF'
        }
      },
      {
        el: 'path',
        attrs: {
          d: 'M12.252,1c2.794,0,5.589,1.066,7.722,3.198c4.266,4.267,4.266,11.183,0.002,15.449c-1.779,1.777-4.018,2.801-6.332,3.098L1.033,23.139l0.396-12.61c0.295-2.314,1.32-4.552,3.099-6.33C6.662,2.066,9.457,1,12.252,1M12.252,0C9.067,0,6.073,1.24,3.822,3.492c-1.876,1.875-3.046,4.265-3.384,6.911L0.432,10.45L0.43,10.498l-0.396,12.61L0,24.172l1.064-0.034l12.611-0.395l0.049-0.001l0.047-0.006c2.646-0.34,5.037-1.51,6.912-3.383c4.648-4.649,4.646-12.214-0.002-16.863C18.43,1.24,15.438,0,12.252,0L12.252,0z',
          'class': 'tooltip-outline'
        }
      }
    ],
    id: 'cbgTooltip',
    mainClass: 'svg-tooltip-cbg',
    viewBox: '0 0 24.169 24.172',
    orientations: {
      normal: function(group) {
        group.classed('svg-tooltip-right-and-up', true);
        return shapeutil.translationFromViewBox(group, {vertical: 'up'});
      },
      leftAndDown: function(group) {
        group.classed('svg-tooltip-left-and-down', true);
        shapeutil.translationFromViewBox(group, {vertical: 'down'})
          .call(shapeutil.pathMirrorY)
          .call(shapeutil.pathMirrorX);
      },
      leftAndUp: function(group) {
        group.classed('svg-tooltip-left-and-up', true);
        shapeutil.translationFromViewBox(group, {vertical: 'up'})
          .call(shapeutil.pathMirrorY);
      },
      rightAndDown: function(group) {
        group.classed('svg-tooltip-right-and-down', true);
        shapeutil.translationFromViewBox(group, {vertical: 'down'})
          .call(shapeutil.pathMirrorX);
      }
    },
    addText: function(selection, opts) {
      var used = selection.select('use');
      var boundingBox = used[0][0].getBBox();
      var usedTransform = used.attr('transform').split(' ');
      selection.append('text')
        .attr({
          x: boundingBox.width/2 - (_.contains(usedTransform, 'scale(-1,1)') ? boundingBox.width : 0),
          y: -boundingBox.height/2 + (_.contains(usedTransform, 'scale(1,-1)') ? boundingBox.height : 0),
          'class': 'd3-tooltip-text'
        })
        .text(opts.datum.value);
    }
  },
  basal: {
    fixed: false,
    els: [
      {
        el: 'polygon',
        attrs: {
          points: function(opts) {
            var pointHalfHeight = 10;
            var pointWidth = 15;
            return shapeutil.pointString(0,0) +
              shapeutil.pointString(opts.w, 0) +
              shapeutil.pointString(opts.w, opts.h/2 - pointHalfHeight) +
              shapeutil.pointString(opts.w + pointWidth, opts.h/2) +
              shapeutil.pointString(opts.w, opts.h/2 + pointHalfHeight) +
              shapeutil.pointString(opts.w, opts.h) +
              shapeutil.pointString(0, opts.h) +
              shapeutil.pointString(0, opts.h/2 + pointHalfHeight) +
              shapeutil.pointString(-pointWidth, opts.h/2) +
              shapeutil.pointString(0, opts.h/2 - pointHalfHeight) +
              shapeutil.pointString(0,0);
          }
        }
      }
    ],
    mainClass: 'svg-tooltip-basal',
    orientations: {
      normal: function(group) {
        return group;
      }
    },
    addForeignObject: function(selection, opts) {
      return selection.append('foreignObject')
        .attr({
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          visibility: 'hidden',
          'class': 'svg-tooltip-fo'
        })
        .append('xhtml:div')
        .attr({
          'class': 'tooltip-div'
        });
    },
    extensions: {
      left: 15,
      right: 15
    }
  }
};

module.exports = shapes;