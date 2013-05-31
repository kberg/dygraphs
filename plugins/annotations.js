/**
 * @license
 * Copyright 2012 Dan Vanderkam (danvdk@gmail.com)
 * MIT-licensed (http://opensource.org/licenses/MIT)
 */

/*global Dygraph:false */

Dygraph.Plugins.Annotations = (function() {

"use strict";

/**
Current bits of jankiness:
- Uses dygraph.layout_ to get the parsed annotations.
- Uses dygraph.plotter_.area

It would be nice if the plugin didn't require so much special support inside
the core dygraphs classes, but annotations involve quite a bit of parsing and
layout.

TODO(danvk): cache DOM elements.

*/

var annotations = function() {
  this.annotations_ = [];
};

annotations.prototype.toString = function() {
  return "Annotations Plugin";
};

annotations.prototype.activate = function(g) {
  return {
    clearChart: this.clearChart,
    didDrawChart: this.didDrawChart
  };
};

annotations.prototype.detachLabels = function() {
  for (var i = 0; i < this.annotations_.length; i++) {
    var a = this.annotations_[i];
    if (a.parentNode) a.parentNode.removeChild(a);
    this.annotations_[i] = null;
  }
  this.annotations_ = [];
};

annotations.prototype.clearChart = function(e) {
  this.detachLabels();
};

annotations.prototype.didDrawChart = function(e) {
  var g = e.dygraph;

  // Early out in the (common) case of zero annotations.
  var annotatedPoints = g.layout_.annotated_points;
  if (annotatedPoints.length === 0) {
    return;
  }

  var containerDiv = e.canvas.parentNode;
  var annotationStyle = {
    "position": "absolute",
    "fontSize": g.getOption('axisLabelFontSize') + "px",
    "zIndex": 10,
    "overflow": "hidden"
  };

  var bindEvt = function(eventName, classEventName, pt) {
    return function(annotation_event) {
      var a = pt.annotation;
      if (a.hasOwnProperty(eventName)) {
        a[eventName](a, pt, g, annotation_event);
      } else if (g.getOption(classEventName)) {
        g.getOption(classEventName)(a, pt, g, annotation_event );
      }
    };
  };

  // Add the annotations one-by-one.
  var area = e.dygraph.plotter_.area;

  // x-coord to sum of previous annotation's heights (used for stacking).
  var xToUsedHeight = {};

  var points = g.layout_.points;

  for (var i = 0; i < annotatedPoints.length; i++) {
    var pointRef = annotatedPoints[i];
    var setIdx = pointRef.setIdx;
    var pointIdx = pointRef.pointIdx;
    var canvasx = points[setIdx].canvasxs[pointIdx];
    var canvasy = points[setIdx].canvasys[pointIdx];
    if (canvasx < area.x || canvasx > area.x + area.w ||
        canvasy < area.y || canvasy > area.y + area.h) {
      continue;
    }

    var a = points[setIdx].annotations[pointIdx];
    var tick_height = 6;
    if (a.hasOwnProperty("tickHeight")) {
      tick_height = a.tickHeight;
    }

    var div = document.createElement("div");
    for (var name in annotationStyle) {
      if (annotationStyle.hasOwnProperty(name)) {
        div.style[name] = annotationStyle[name];
      }
    }
    if (!a.hasOwnProperty('icon')) {
      div.className = "dygraphDefaultAnnotation";
    }
    if (a.hasOwnProperty('cssClass')) {
      div.className += " " + a.cssClass;
    }

    var width = a.hasOwnProperty('width') ? a.width : 16;
    var height = a.hasOwnProperty('height') ? a.height : 16;
    if (a.hasOwnProperty('icon')) {
      var img = document.createElement("img");
      img.src = a.icon;
      img.width = width;
      img.height = height;
      div.appendChild(img);
    } else if (a.hasOwnProperty('shortText')) {
      div.appendChild(document.createTextNode(a.shortText));
    }
    var left = canvasx - width / 2;
    div.style.left = left + "px";
    var divTop = 0;
    if (a.attachAtBottom) {
      var y = (area.y + area.h - height - tick_height);
      if (xToUsedHeight[left]) {
        y -= xToUsedHeight[left];
      } else {
        xToUsedHeight[left] = 0;
      }
      xToUsedHeight[left] += (tick_height + height);
      divTop = y;
    } else {
      divTop = canvasy - height - tick_height;
    }
    div.style.top = divTop + "px";
    div.style.width = width + "px";
    div.style.height = height + "px";
    div.title = a.text;
    var setName = points[setIdx].names[pointIdx];
    div.style.color = g.colorsMap_[setName];
    div.style.borderColor = g.colorsMap_[setName];
    a.div = div;

    var p = points[setIdx].toObject(pointIdx);
    g.addEvent(div, 'click',
        bindEvt('clickHandler', 'annotationClickHandler', p, this));
    g.addEvent(div, 'mouseover',
        bindEvt('mouseOverHandler', 'annotationMouseOverHandler', p, this));
    g.addEvent(div, 'mouseout',
        bindEvt('mouseOutHandler', 'annotationMouseOutHandler', p, this));
    g.addEvent(div, 'dblclick',
        bindEvt('dblClickHandler', 'annotationDblClickHandler', p, this));

    containerDiv.appendChild(div);
    this.annotations_.push(div);

    var ctx = e.drawingContext;
    ctx.save();
    ctx.strokeStyle = g.colorsMap_[p.name];
    ctx.beginPath();
    if (!a.attachAtBottom) {
      ctx.moveTo(canvasx, canvasy);
      ctx.lineTo(canvasx, canvasy - 2 - tick_height);
    } else {
      var y = divTop + height;
      ctx.moveTo(canvasx, y);
      ctx.lineTo(canvasx, y + tick_height);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
};

annotations.prototype.destroy = function() {
  this.detachLabels();
};

return annotations;

})();
