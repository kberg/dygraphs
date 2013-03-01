Dygraph.url = function(url, parser) {
  parser = parser || Dygraph.csvParser();
  return {
    start : function(g, callback) {
      var req = new XMLHttpRequest();
      var caller = this;
      req.onreadystatechange = function () {
        if (req.readyState == 4) {
          if (req.status === 200 ||  // Normal http
              req.status === 0) {    // Chrome w/ --allow-file-access-from-files
            callback(parser(g, req.responseText));
          }
        } else {
          // TODO(konigsberg): Deliver the bad news. How?
          // callback.failure(xyzzy?);
        }
      }
      req.open("GET", data, true);
      req.send(null);
     }
  };
}

Dygraph.text = function(text, parser) {
  parser = parser || Dygraph.csvParser();
  return {
    start : function(g, callback) {
      callback(parser(g, text));
    }
  };
}

Dygraph.csvParser = function(opts) {
  return function(g, data) {
    opts = opts || {};
	  var rowTransformer = opts.rowTransformer || function(x) { return x; };
	  var fieldTransformer = opts.fieldTransformer || function(x) { return x; };

    var ret = [];
    var line_delimiter = Dygraph.detectLineDelimiter(data);
    var lines = data.split(line_delimiter || "\n");
    var vals, j;

    // Use the default delimiter or fall back to a tab if that makes sense.
    var delim = g.getOption('delimiter');
    if (lines[0].indexOf(delim) == -1 && lines[0].indexOf('\t') >= 0) {
      delim = '\t';
    }

    var start = 0;
    if (!g.getOption('labels')) {
      // User hasn't explicitly set labels, so they're (presumably) in the CSV.
      start = 1;
      // TODO(konigsberg): Yuck.
      g.attrs_.labels = lines[0].split(delim);  // NOTE: _not_ user_attrs_.
      g.attributes_.reparseSeries();
    }
    var line_no = 0;

    var xParser;
    var defaultParserSet = false;  // attempt to auto-detect x value type
    var expectedCols = g.getOption('labels').length;
    var outOfOrder = false;
    for (var i = start; i < lines.length; i++) {
      var line = lines[i];
      line_no = i;
      if (line.length === 0) continue;  // skip blank lines
      if (line[0] == '#') continue;    // skip comment lines
      var inFields = line.split(delim);
      if (fieldTransformer) { inFields = fieldTransformer(inFields); }
      if (!inFields || inFields.length < 2) continue;

      var fields = [];
      if (!defaultParserSet) {
  	    // TODO(konigsberg): yuck
        g.detectTypeFromString_(inFields[0]);
        xParser = g.getOption("xValueParser");
        defaultParserSet = true;
      }
      fields[0] = xParser(inFields[0], g);

      // If fractions are expected, parse the numbers as "A/B"
      if (g.fractions_) {
        for (j = 1; j < inFields.length; j++) {
          // TODO(danvk): figure out an appropriate way to flag parse errors.
          vals = inFields[j].split("/");
          if (vals.length != 2) {
            g.error('Expected fractional "num/den" values in CSV data ' +
                    "but found a value '" + inFields[j] + "' on line " +
                    (1 + i) + " ('" + line + "') which is not of this form.");
            fields[j] = [0, 0];
          } else {
            fields[j] = [g.parseFloat_(vals[0], i, line),
                         g.parseFloat_(vals[1], i, line)];
          }
        }
      } else if (g.getOption("errorBars")) {
        // If there are error bars, values are (value, stddev) pairs
        if (inFields.length % 2 != 1) {
          g.error('Expected alternating (value, stdev.) pairs in CSV data ' +
                   'but line ' + (1 + i) + ' has an odd number of values (' +
                   (inFields.length - 1) + "): '" + line + "'");
        }
        for (j = 1; j < inFields.length; j += 2) {
          fields[(j + 1) / 2] = [g.parseFloat_(inFields[j], i, line),
                                 g.parseFloat_(inFields[j + 1], i, line)];
        }
      } else if (g.getOption("customBars")) {
        // Bars are a low;center;high tuple
        for (j = 1; j < inFields.length; j++) {
          var val = inFields[j];
          if (/^ *$/.test(val)) {
            fields[j] = [null, null, null];
          } else {
            vals = val.split(";");
            if (vals.length == 3) {
              fields[j] = [ g.parseFloat_(vals[0], i, line),
                            g.parseFloat_(vals[1], i, line),
                            g.parseFloat_(vals[2], i, line) ];
            } else {
              g.warn('When using customBars, values must be either blank ' +
                     'or "low;center;high" tuples (got "' + val +
                     '" on line ' + (1+i));
            }
          }
        }
      } else {
        // Values are just numbers
        for (j = 1; j < inFields.length; j++) {
          fields[j] = g.parseFloat_(inFields[j], i, line);
        }
      }
      if (ret.length > 0 && fields[0] < ret[ret.length - 1][0]) {
        outOfOrder = true;
      }

      if (fields.length != expectedCols) {
        g.error("Number of columns in line " + i + " (" + fields.length +
                   ") does not agree with number of labels (" + expectedCols +
                   ") " + line);
      }

      // If the user specified the 'labels' option and none of the cells of the
      // first row parsed correctly, then they probably double-specified the
      // labels. We go with the values set in the option, discard this row and
      // log a warning to the JS console.
      if (i === 0 && g.getOption('labels')) {
        var all_null = true;
        for (j = 0; all_null && j < fields.length; j++) {
          if (fields[j]) all_null = false;
        }
        if (all_null) {
          g.warn("The dygraphs 'labels' option is set, but the first row of " +
                 "CSV data ('" + line + "') appears to also contain labels. " +
                 "Will drop the CSV labels and use the option labels.");
          continue;
        }
      }
      fields = rowTransformer ? rowTransformer(fields) : fields;
      if (fields) {
        ret.push(fields);
      }
    }

    if (outOfOrder) {
      g.warn("CSV is out of order; order it correctly to speed loading.");
      ret.sort(function(a,b) { return a[0] - b[0]; });
    }

    return ret;
  };
}

//  # Usage:
//  
//  g = new Dygraph(div, new Dygraph.Async(url));
//  ... which is the same as 
//  g = new Dygraph(div, url);
//  ... and is the same as
//  g = new Dygraph(div, new Dygraph.Async(url, Dygraph.Data.csvParser()));
//  
//  But then you can do stuff like
//  g = new Dygraph(div,
//      new Dygraph.Async(url,
//  	Dygraph.Data.csvParser({ rowTransformer : rt, fieldTransformer : ft })));
//  
//  where rowTransformer might look like this:
//  
//  var rowTransformer = function(row) {
//    return null; // skip this row
//  }
//  
//  var rowTransformer = function(row) {
//    return [row[0], row[1], row[0] + row[1]]; // Add A and B.
//  }
//  
