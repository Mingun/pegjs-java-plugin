'use strict';

function range(begin, end, mapper) {
  return Array.from({ length: end - begin }, (v, k) => mapper(begin + k));
}

/// Стек свободных переменных указанного типа
function VarStack(type, varName) {
  function s(i) {
    if (i < 0) {
      throw new Error("Var stack '" + varName + "' underflow: attempt to use var at index " + i);
    }
    return varName + i;
  }

  var sp    = -1;///< Номер последней занятой переменной в стеке.
  var maxSp = -1;///< Максимальное количество одновременно используемых переменных стека.

  /// Сохраняет результат вычисления выражения в первую свободную переменную стека.
  this.push = function(exprCode) {
    var code = s(++sp) + ' = ' + exprCode + ';';

    if (sp > maxSp) { maxSp = sp; }

    return code;
  }
  /// Выкидывает из стека @n элементов на вершине. Если @n не задано, выкидывает 1 элемент.
  /// Возвращает название переменной или массив с названиями переменных.
  this.pop = function(n) {
    if (arguments.length === 0) {
      return s(sp--);
    } else {
      var end = sp + 1;

      sp -= n;

      return range(sp + 1, end, s);
    }
  }
  /// Заменяет значение переменной на вершине стека указанным выражением.
  this.replace = function(exprCode) {
    this.pop();
    return this.push(exprCode);
  }

  /// Возвращает имя первой свободной переменной.
  this.top = function() { return s(sp); }
  /// Возвращает значение @i-ой с вершины стека переменной.
  this.index = function(i) { return s(sp - i); }
  /// Возвращает строку со списком определений всех переменных этого стека.
  this.defines = function() {
    if (maxSp < 0) {
      return '';
    }
    return type + ' ' + range(0, maxSp + 1, s).join(', ') + ';';
  }
  /// Возвращает список имен переменных от указанного индекса до последней свободной
  this.range = function(fromSp) {
    if (fromSp < 0) throw new Error('`fromSp < 0`: (fromSp, this.sp) == [' + fromSp + '; ' + sp + ']');
    return range(fromSp, sp + 1, s);
  }
  /// Возвращает массив с именами переменных для вызова функции
  /// @env Отображение имен меток результатов на позицию в стеке, где он хранится.
  /// @return Список имен и типов переменных этого стека (в формате {name :..., type: ...}).
  this.args = function(env) {
    var r = [];
    for (var k in env) if (env.hasOwnProperty(k)) {
      r.push({
        name: s(env[k]),
        type: type,
      });
    }
    return r;
  }

  /// Возвращает имя локальной переменной с указанным индексом.
  this.local = s;
  /// Возвращает имя переменной с результатом.
  this.result = function() { return s(0); }

  this.toString = function() { return 'sp='+sp+'; maxSp='+maxSp+'; vars='+s(0)+'...'+(maxSp>=0 ? s(maxSp) : 'undefined'); }
}
module.exports = VarStack;