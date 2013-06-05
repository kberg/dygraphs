/*
 * Values Points holds:
 *   x: the what?
 *   y: the what?
 *   xval: the numeric value of the point (as specified in the data.)
 *   yval: the numeric value of the point (as specified in the data.)
 *   name: the set name for the point. (Let's find a way to get rid of this.)
 *   idx: some index. (i+boundaryStart, whatever that means.)
 *
 * These values are stored when there are bars (error bars, custom bars.)
 *   y_top: the what?
 *   y_bottom: the what?
 *   yval_minus: the lower value (???)
 *   yval_plus: the higher value (???)
 *
 * Annotations:
 *   annotations: the set of annotations associated with this point.
 *
 * Set by dygraph-canvas.js:
 *   canvasx:
 *   canvasy:
 *
 * Set when values are stacked:
 *   yStacked:
 *   yvalStacked:
 *
 * Internal:
 *   objects_: could be null, but if not, it's a list of points as objects.
 *     Point objects are lazily created.
 */

DygraphPoints = function(size) {
  this.length = size;
  this.offset = 0; // The next idex to store data in.

  this.xs = new Array(size);
  this.ys = new Array(size);
  this.xvals = new Array(size);
  this.yvals = new Array(size);
  this.names = new Array(size);
  this.idxs = new Array(size);
  this.yTops = new Array(size);
  this.yBottoms = new Array(size);
  this.yvalPluss = new Array(size);
  this.yvalMinuss = new Array(size);
  this.canvasxs = new Array(size);
  this.canvasys = new Array(size);
  this.annotations = new Array(size);
  this.yStackeds = new Array(size);
  this.yvalStackeds = new Array(size);

  this.objects_ = null;
};

DygraphPoints.prototype.next = function() {
  this.offset++;
}

DygraphPoints.prototype.setBasicData = function(x, y, xval, yval, name, idx) {
  this.xs[this.offset] = x;
  this.ys[this.offset] = y;
  this.xvals[this.offset] = xval;
  this.yvals[this.offset] = yval;
  this.names[this.offset] = name;
  this.idxs[this.offset] = idx;
}

DygraphPoints.prototype.setBars = function(yvalMinus, yvalPlus) {
  this.yvalMinuss[this.offset] = yvalMinus;
  this.yvalPluss[this.offset] = yvalPlus;
  this.yTops[this.offset] = NaN;
  this.yBottoms[this.offset] = NaN;
}

DygraphPoints.prototype.toObject = function(idx) {
  if (!this.objects_) {
    this.objects_ = new Array(this.length);
  }
  var object = this.objects_[idx];
  if (!object) {
    object = {
      x: this.xs[idx],
      y: this.ys[idx],
      xval: this.xvals[idx],
      yval: this.yvals[idx],
      name: this.names[idx],
      idx: this.idxs[idx],
      yTop: this.yTops[idx],
      yBottom: this.yBottoms[idx],
      yvalPlus: this.yvalPluss[idx],
      yvalMinus: this.yvalMinuss[idx],
      canvasx: this.canvasxs[idx],
      canvasy: this.canvasys[idx],
      annotation: this.annotations[idx],
      y_stacked: this.yStackeds[idx],
      yval_stacked: this.yvalStackeds[idx]
    };
    this.objects_[idx] = object;
  }
  return object;
}
