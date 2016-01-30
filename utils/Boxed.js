'use strict';

/// @_ Функция для получения разрешения имени java типа в полный или краткий вариант,
///    в зависимости от настроек генератора.
function makeBoxed(_) {
  // Отображение примитивных типов на их boxed-классы.
  var primitives = {
    'boolean': _('Boolean'),
    'char':    _('Character'),
    'void':    _('Void'),

    'byte':    _('Byte'),
    'short':   _('Short'),
    'int':     _('Integer'),
    'long':    _('Long'),

    'float':   _('Float'),
    'double':  _('Double'),
  };
  return function(type) {
    var boxed = primitives[type];
    return boxed ? boxed : type;
  }
}
module.exports = makeBoxed;