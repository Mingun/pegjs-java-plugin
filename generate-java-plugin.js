'use strict';

module.exports.use = function(config, options) {
  config.passes.generate = [
    require('./passes/generate-java'),
  ];
}