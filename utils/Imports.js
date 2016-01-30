'use strict';

function Imports(useFullNames) {
  var _imports = {};

  for (var i = 1; i < arguments.length; ++i) {
    var fullName = arguments[i];
    var j = fullName.lastIndexOf('.');
    var name = fullName.substring(j+1);
    if (name !== '*') {
      _imports[name] = fullName;
    }
  }

  this.resolve = function(localName) {
    var name = useFullNames ? _imports[localName] : localName;
    if (!name) {
      throw new Error('Unknown import class with local name "' + localName + '"');
    }
    return name;
  }

  this.declares = function() {
    var result = [];
    for (var k in _imports) if (_imports.hasOwnProperty(k)) {
      var i = _imports[k];
      result.push('import ' + i + ';');
    }
    return result;
  }
}

module.exports = Imports;