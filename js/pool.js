module.exports = function(container) {

  // TMP: colors, etc. for demo-ing
  var colors = d3.scale.category20(),
    grays = ['#636363', '#969696', '#bdbdbd', '#d9d9d9', '#d9d9d9', '#bdbdbd', '#969696', '#636363'];

  var allData = [],
    id, label,
    index, weight, yPosition,
    height, minHeight, maxHeight,
    group,
    mainSVG = d3.select(container.id()),
    xScale = container.xScale().copy(),
    plotTypes = [];

  var defaults = {
    minHeight: 40,
    maxHeight: 300
  };

  function pool(selection, poolData) {
    pool.allData(poolData);
    // select the pool group if it already exists
    group = selection.selectAll('#' + id).data([allData]);
    // otherwise create a new pool group
    group.enter().append('g').attr({
      'id': id,
      'transform': 'translate(0,' + yPosition + ')'
    });
    plotTypes.forEach(function(plotType) {
      if (allData.length) {
        plotType.data = _.where(allData, {'type': plotType.type});
        dataGroup = group.selectAll('#' + id + '_' + plotType.type).data([plotType.data]);
        dataGroup.enter().append('g').attr('id', id + '_' + plotType.type);
        dataGroup.call(plotType.plot);
      }
      else {
        pool.noDataFill(plotType);
      }
    });
    pool.drawAxis();
    pool.drawLabel();
  }

  // chainable methods
  pool.defaults = function(obj) {
    if (!arguments.length) {
      properties = defaults;
    }
    else {
      properties = obj;
    }
    this.minHeight(properties.minHeight).maxHeight(properties.maxHeight);

    return pool;
  };

  pool.pan = function(e) {
    container.latestTranslation(e.translate[0]);
    d3.selectAll('.d3-circle').attr('transform', 'translate(' + e.translate[0] + ',0)');
    d3.selectAll('.d3-rect-fill').attr('transform', 'translate(' + e.translate[0] + ',0)');
  };

  // only once methods
  pool.drawLabel = _.once(function() {
    var labelGroup = d3.select('#tidelineLabels');
    labelGroup.append('text')
      .attr({
        'id': 'pool_' + id + '_label',
        'class': 'd3-pool-label',
        'transform': 'translate(' + container.axisGutter() + ',' + yPosition + ')'
      })
      .text(label);
    return pool
  });

  pool.drawAxis = _.once(function() {
    var axisGroup = d3.select('#tidelineYAxes');
    axisGroup.append('g')
      .attr('class', 'y axis')
      .attr('id', 'pool_' + id + '_yAxis')
      .attr('transform', 'translate(' + container.axisGutter() + ',' + yPosition + ')')
      .call(pool.yAxis);
    return pool;
  });

  pool.noDataFill = _.once(function(plotType) {
    d3.select('#' + id).append('g').attr('id', id + '_' + plotType.type).call(plotType.plot);
    return pool;
  });

  // getters & setters
  pool.allData = function(x) {
    if (!arguments.length) return allData;
    allData = allData.concat(x);
    var currentDomain = container.xScale().domain();
    // TODO: parametrize what the buffer is with a buffer variable that sets number of days for minus and plus
    var plusTwo = new Date(currentDomain[1]);
    plusTwo.setDate(plusTwo.getDate() + 2);
    var minusTwo = new Date(currentDomain[0]);
    minusTwo.setDate(minusTwo.getDate() - 2);
    if (currentDomain[0] < minusTwo) {
      container.beginningOfData(minusTwo); 
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.time);
        if (t > minusTwo) {
          return t;
        }
      });
    }
    if (plusTwo > currentDomain[1]) {
      container.endOfData(plusTwo);
      allData = _.filter(allData, function(datapoint) {
        var t = Date.parse(datapoint.time);
        if (t < plusTwo) {
          return t;
        }
      });
    }
    allData = _.sortBy(allData, 'time');
    return pool;
  };

  pool.id = function(x) {
    if (!arguments.length) return id;
    id = x;
    return pool;
  };

  pool.label = function(x) {
    if (!arguments.length) return label;
    label = x;
    return pool;
  };

  pool.index = function(x) {
    if (!arguments.length) return index;
    index = x;
    return pool;
  };

  pool.weight = function(x) {
    if (!arguments.length) return weight;
    weight = x;
    return pool;
  };

  pool.yPosition = function(x) {
    if (!arguments.length) return yPosition;
    yPosition = x;
    return pool;
  };

  pool.minHeight = function(x) {
    if (!arguments.length) return minHeight;
    minHeight = x;
    return pool;
  };

  pool.maxHeight = function(x) {
    if (!arguments.length) return maxHeight;
    maxHeight = x;
    return pool;
  };

  pool.height = function(x) {
    if (!arguments.length) return height;
    x = x * pool.weight();
    if (x <= maxHeight) {
      if (x >= minHeight) {
        height = x;
      }
      else {
        height = minHeight;
      }
    }
    else {
      height = maxHeight;
    }
    return pool;
  };

  pool.mainSVG = function(x) {
    if (!arguments.length) return mainSVG;
    mainSVG = x;
    return pool;
  };

  pool.xScale = function(f) {
    if (!arguments.length) return xScale;
    xScale = f;
    return pool;
  };

  // TODO: replace
  pool.yAxis = function(f) {
    if (!arguments.length) return pool.yAxis;
    pool.yAxis = f;
    return pool;
  };

  pool.addPlotType = function (dataType, plotFunction) {
    plotTypes.push({
      type: dataType,
      plot: plotFunction
    });
    return pool;
  };

  return pool;
};