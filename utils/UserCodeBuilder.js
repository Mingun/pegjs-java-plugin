'use strict';

/// Пространства имен для действий в грамматике. Содержит отображение
/// имени пространства имен на его инициализатор.
var namespaces = {};

/// @varName Префикс имен функций, генерируемых данной функцией.
function makeFunctionBuilder(varName) {
  function n1(i, args) {
    return varName + i
      + '('
      + args.map(a => '(' + a.type + ')' + a.name).join(', ')
      + ')';
  }
  function n2(f, i) {
    return f.type + ' '
      + varName + i
      + '('
      + f.params.map(p => p.type + ' ' + p.name).join(', ')
      + ')';
  }
  function declare(f, i) { return n2(f, i) + ';'; }
  function define(f, i) { return n2(f, i) + ' {' + f.body + '}'; }

  function zip(params, args) {
    return params.map(function(p, i) {
      return { name: p, type: args[i].type, };
    });
  }
  /// Сравнивает два параметра на равенство между собой по типам и именам.
  function eq(p1, p2) {
    return p1.name === p2.name && p1.type === p2.type;
  }
  /// Сравнивает два списка параметров на равенство.
  function equals(params1, params2) {
    if (params1.length != params2.length) return false;

    for (var i = 0; i < params1.length; ++i) {
      if (!eq(params1[i], params2[i])) {
        return false;
      }
    }
    return true;
  }

  var storage = [];
  return {
    /// @namespace String: Пространство имен, для которого добавляется функция. Для каждого
    ///            файла грамматики создается свое пространство имен.
    /// @code String: Содержимое функции.
    /// @type String: Возвращаемый тип действия.
    /// @params Array: Массив строк с именами формальных параметров действия/предиката. Это
    ///         список всех меток узлов, которые функция видит.
    /// @args Array: Массив объектов { name: ..., type: ... }, содержащих информацию об имени
    ///       и типе аргументов, передаваемых в действие/предикат.
    add: function(namespace, code, type, params, args) {
      // Преобразуем список имен в список имен с типами
      params = zip(params, args);
      var index = storage.findIndex(function(f) {
        return f.namespace === namespace
            && f.type === type
            && f.body === code
            && equals(f.params, params);
      });
      // Если функции еще нет, добавляем ее и генерируем ее вызов.
      if (index < 0) {
        index = storage.push({
          namespace: namespace,
          params: params,
          type: type,
          body: code
        }) - 1;
      }
      return n1(index, args);
    },
    /// Получает предварительные объявления всех функций в указанном пространстве имен.
    /// @return Массив с предварительными объявлениями функций.
    declares: function(ns) {
      if (arguments.length < 1) {
        return storage.map(declare);
      }
      var r = [];
      for (var i = 0; i < storage.length; ++i) {
        var v = storage[i];
        if (ns === v.namespace) {
          r.push(declare(v, i));
        }
      }
      return r;
    },

    /// Получает определения всех функций в указанном пространстве имен.
    /// @return Массив с определениями функций.
    defines: function(ns) {
      if (arguments.length < 1) {
        return storage.map(define);
      }
      var r = [];
      for (var i = 0; i < storage.length; ++i) {
        var v = storage[i];
        if (ns === v.namespace) {
          r.push(define(v, i));
        }
      }
      return r;
    },
  };
}
/// Пользовательские предикаты грамматики.
var predicates  = makeFunctionBuilder('is');
/// Пользовательские действия грамматики.
var actions     = makeFunctionBuilder('f');

module.exports = {
  addInitializer: function(namespace, code) {
    var ns = namespaces[namespace] || {};
    ns.initializer = code;
    namespaces[namespace] = ns;
  },
  addPredicate: function(node, params, args) {
    namespaces[node.namespace] = namespaces[node.namespace] || {};
    return predicates.add(node.namespace, node.code, 'boolean', params, args);
  },
  addAction: function(node, params, args) {
    namespaces[node.namespace] = namespaces[node.namespace] || {};
    return actions.add(node.namespace, node.code, node.returnType, params, args);
  },
  /// Заполняет указанный CodeBuilder кодом реализации функций для действий и предикатов
  /// для указанного пространства имен.
  /// @b CodeBuilder
  defines: function(b, ns) {
    console.log(namespaces)
    var init = namespaces[ns].initializer;
    if (init) {
      b.push('/*~~~~~~~~~~~~~~~~~~~~~ INITIALIZER ~~~~~~~~~~~~~~~~~~~~~~*/');
      b.push(init);
    }
    b.push('/*~~~~~~~~~~~~~~~~~~~~~~ PREDICATES ~~~~~~~~~~~~~~~~~~~~~~*/');
    b.pushAll(predicates.defines(ns));
    b.push('/*~~~~~~~~~~~~~~~~~~~~~~~~ ACTIONS ~~~~~~~~~~~~~~~~~~~~~~~*/');
    b.pushAll(actions.defines(ns));
  },
};