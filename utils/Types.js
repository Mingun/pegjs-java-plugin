'use strict';

var makeBoxed = require('./Boxed');

/// @_ Функция для получения разрешения имени java типа в полный или краткий вариант,
///    в зависимости от настроек генератора.
function makeTypes(_) {
  // Отображение примитивных типов на их boxed-классы.
  var boxed = makeBoxed(_);

  return {
    /// Тип для возвращаемого значения из семантических предикатов
    none: _('Object'),
    /// Тип одиночного символа входного потока
    unit: 'char',
    /// Тип диапазона символов входного потока
    range: _('CharSequence'),

    /// Тип-объединение всех переданных типов
    enum: function(types) {
      return types.reduce((t1, t2) => t1 === t2 ? t1 : _('Object'));
    },
    /// Тип для массива возвращаемых значений указанного типа
    list: function(type) { return _('List') + '<' + boxed(type) + '>'; },
    /// Тип для множества возвращаемых типов, упакованных в один
    tuple: function(types) { return this.list(this.enum(types)); },
    /// Тип для представления опционального значения
    option: function(type) { return boxed(type); },
    /// Уникальный фантомный тип для узла. Используется для возможности описания
    /// рекурсивных типов. На вход передается узел описания правила (type='rule')
    self: function(node) { return '?' + node.name; },
    /// Тип по умолчанию для узлов действий, если он не указан явно.
    def: _('Object'),
  };
}

module.exports = makeTypes;