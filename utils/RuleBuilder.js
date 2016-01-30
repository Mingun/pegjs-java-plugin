'use strict';

var CodeBuilder = require('./CodeBuilder');
var VarStack    = require('./VarStack');

function makeRuleBuilder(resultType, locationType, code, indentSequence) {
  /// Список переменных, в которые сохраняются результаты разбора правил.
  var resultStack   = new VarStack(resultType,   'r');
  /// Список переменных, в которые сохраняются позиции в разбираемом входе для возможного отката.
  var locationStack = new VarStack(locationType, 'l');

  var builder = new CodeBuilder(code, indentSequence);

  function locPush() {
    return locationStack.push('super.current.clone()');
  }
  function locPop() {
    return 'super.current = ' + locationStack.pop() + ';';
  }
  function locMark() {
    return 'super.mark = ' + locationStack.pop() + ';';
  }

  function make(sp, env, action) {
    return {
      sp:     sp,    ///< Номер первой переменной для этого контекста.
      env:    env,   ///< Отображение имен меток на позиции в стеке результатов (resultStack)
      action: action,///< AST узел действия, передаваемый action-узлом своим потомкам

      resultStack:   resultStack,
      locationStack: locationStack,

      push:   builder.push,
      indent: builder.indent,
      dedent: builder.dedent,

      child: make,

      locPush: locPush,
      locPop:  locPop,
      locMark: locMark,

      local: function(label) { return resultStack.local(env[label]); },
      result: resultStack.result,
    };
  }
  return make(-1, {}, null);
}

module.exports = makeRuleBuilder;