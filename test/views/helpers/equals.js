'use strict';

const equals = function equals (val0, val1, options) {
  if (val0 === val1) {
    return options.fn(this);
  }

  return options.inverse(this);
};

module.exports = equals;
