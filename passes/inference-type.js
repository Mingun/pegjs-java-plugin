'use strict';

var asts    = require('pegjs/lib/compiler/asts');
var visitor = require('pegjs/lib/compiler/visitor');

/* Выводит типы всех узлов грамматики на основе типов action-узлов, размеченных аннотациями. */
function inferenceTypes(ast, options) {
  var emitError = options.collector.emitError;
  var emitInfo  = options.collector.emitInfo;
  var types     = options.inferenceTypes;

  function none(node)     { return node.returnType = types.none; }
  function unit(node)     { return node.returnType = types.unit; }
  function range(node)    { return node.returnType = types.range; }
  function list(node)     { return node.returnType = types.list(inference(node.expression)); }
  function delegate(node) { return node.returnType = inference(node.expression); }

  var initTypes = visitor.build({
    action: function(node) {
      initTypes(node.expression);

      var a = asts.findAnnotation(node, 'Return');
      if (a && a.params.length > 0) {
        node.returnType = a.params[0];
        emitInfo('Use type for action from @Return annotation: ' + a.params[0], node.location);
      } else
      if (types.def) {
        node.returnType = types.def;
        emitInfo('Use default type for action: ' + types.def, node.location);
      } else {
        emitError("Cann't inference type for action result: missing default return type", node.location);
      }
    }
  });

  var changed = false;
  function inferenceRule(node) {
    var type = inference(node.expression);
    if (node.returnType !== type) {
      changed = true;
      node.returnType = type;
    }
  }

  var inference = visitor.build({
    rule:         function(node) {
      if (!node.returnType) {
        // Так как тип правила может оказаться рекурсивным, то мы вначале присваеваем ему
        // фантомный тип, а затем выводим тип правила, который может оказаться зависим сам от себя
        node.returnType = types.self(node);
        inferenceRule(node);
      }
      return node.returnType;
    },
    named:        delegate,
    choice:       function(node) {
      return node.returnType = types.enum(node.alternatives.map(function(n) { return inference(n); }));
    },
    action:       function(node) {
      inference(node.expression);
      if (node.returnType) {
        return node.returnType;
      }
      emitError('Action result type not defined', node.location);
    },
    sequence:     function(node) {
      return node.returnType = types.tuple(node.elements.map(function(n) { return inference(n); }));
    },
    labeled:      delegate,
    text:         range,
    simple_and:   none,
    simple_not:   none,
    optional:     function(node) { return node.returnType = types.option(inference(node.expression)); },
    zero_or_more: list,
    one_or_more:  list,
    range:        list,
    semantic_and: none,
    semantic_not: none,
    rule_ref:     function(node) { return node.returnType = inference(asts.findRule(ast, node.name)); },
    literal:      range,
    "class":      unit,
    any:          unit,
  });

  initTypes(ast);
  inference(ast);

  while (changed) {
    changed = false;
    ast.rules.forEach(inferenceRule);
  }
}

module.exports = inferenceTypes;
