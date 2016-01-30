'use strict';

/// @code Array: Массив со строками исходного кода. По умолчанию пустой массив.
/// @indentSequence String: Строка, которой будет осуществляться отступ в коде. По умолчанию 2 пробела.
function CodeBuilder(code, indentSequence) {
  code = code || [];
  indentSequence = indentSequence || '  ';
  var _indent = [];
  var _indentCache = _indent.join('');

  var self = this;

  /// Помещает все аргументы-строки в список строк генерируемого кода.
  /// Автоматически делает отступ строк в зависимости от текущего уровня отступа.
  /// @return int: Текущую величину отступа
  function push() {
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      if (arg !== null) {
        // Генерируем отступы только для непустых строк
        code.push(arg.length > 0 ? _indentCache + arg : arg);
      } else {
        // Пустой аргумент служит знакоместом, туда данные вставятся позже и они должны быть с отступом
        code.push(_indentCache);
      }
    }
    return _indent.length;
  }
  /// Помещает все аргументы-строки в список строк генерируемого кода, затем увеличивает отступ.
  /// Автоматически делает отступ строк в зависимости от текущего уровня отступа.
  /// @return int: Новую величину отступа
  function indent() {
    // Перед отступом можно опционально добавить какой-то код
    push.apply(self, arguments);
    _indent.push(indentSequence);
    _indentCache = _indent.join('');
    return _indent.length;
  }
  /// Уменьшает отступ, затем помещает все аргументы-строки в список строк генерируемого кода.
  /// Автоматически делает отступ строк в зависимости от текущего уровня отступа.
  /// @return int: Новую величину отступа
  function dedent() {
    _indent.pop();
    _indentCache = _indent.join('');
    // После отступа можно опционально добавить какой-то код
    push.apply(self, arguments);
    return _indent.length;
  }

  this.code = code;
  this.push = push;
  /// Помещает в данный массив все строки, делая отступ всем непустым строкам.
  this.pushAll = function(arr) { return push.apply(self, arr); };
  this.indent = indent;
  this.dedent = dedent;
}

module.exports = CodeBuilder;