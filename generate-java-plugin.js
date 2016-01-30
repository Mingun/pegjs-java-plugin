'use strict';

var makeTypes = require('./utils/Types');

module.exports.use = function(config, options) {
  config.passes.transform.push(
    require('./passes/inference-type')
  );
  config.passes.generate = [
    require('./passes/generate-java'),
  ];

  if (!options.inferenceTypes) {
    options.inferenceTypes = makeTypes(function(t) { return t; });
  }
}