'use strict';

var objects = require('pegjs/lib/utils/objects');
var visitor = require('pegjs/lib/compiler/visitor');
var asts    = require('pegjs/lib/compiler/asts');

var Imports         = require('../utils/Imports');
var makeRuleBuilder = require('../utils/RuleBuilder');
var CodeBuilder     = require('../utils/CodeBuilder');
var ucb             = require('../utils/UserCodeBuilder');

/// @type String: Строка с именем типа для генерируемых констант
/// @prefix String: Строка с префиксом переменных для генерируемых констант
/// @stringify Function: Опциональная функция для преобразования добавляемых через метод add
///            объектов в строки, которыми инициализируются константы.
function makeConstantBuilder(type, prefix, stringify) {
  function n1(i) { return prefix + i; }
  function n2(v, i) { return 'private static final ' + type + ' ' + n1(i) + ' = ' + v + ';'; }

  var storage = [];
  return {
    add: function() {
      var value = stringify ? stringify.apply(null, arguments) : arguments[0];
      var index = storage.indexOf(value);

      return n1(index < 0 ? storage.push(value) - 1 : index);
    },
    defines: function() { return storage.map(n2); },
  };
}

function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
function escape(s) {
  return s
    .replace(/\\/g,   '\\\\')   // backslash
    .replace(/"/g,    '\\"')    // closing double quote
    .replace(/\x08/g, '\\b')    // backspace
    .replace(/\t/g,   '\\t')    // horizontal tab
    .replace(/\n/g,   '\\n')    // line feed
    .replace(/\f/g,   '\\f')    // form feed
    .replace(/\r/g,   '\\r')    // carriage return
    .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\u000' + hex(ch); })
    .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\u00'  + hex(ch); })
    .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0'   + hex(ch); })
    .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'    + hex(ch); });
}
function regexEscape(s) {
  return s
    .replace(/\\/g, '\\\\')  // backslash
    .replace(/\[/g, '\\[')   // opening bracket
    .replace(/\]/g, '\\]')   // closing bracket
    .replace(/\^/g, '\\^')   // caret
    .replace(/-/g,  '\\-')   // dash
    ;
}

function toUpperSnakeCase(s) {
  return s.replace(/\.?([A-Z]+)/g, x => '_' + x.toLowerCase()).replace(/^_/, '').toUpperCase();
}
function makeRegexString(node) {
  return [
    '[',
    node.inverted ? '^' : '',
    node.parts.map(function(part) {
      return part instanceof Array
        ? regexEscape(part[0]) + '-' + regexEscape(part[1])
        : regexEscape(part);
    }).join(''),
    ']'
  ].join('');
}
function generateJavaCode(ast, options) {
  var java = options.java || {};
  objects.defaults(java, {
    package: 'org.pegjs.parser.generated',
    className: 'Parser',
    useFullNames: false,
  });

  var imports = new Imports(
    java.useFullNames,
    'java.lang.Object',
    'java.lang.Override',
    'java.lang.Number',
    'java.lang.String',
    'java.lang.reflect.InvocationTargetException',
    'java.lang.reflect.Method',
    'java.nio.ByteBuffer',
    'java.util.List',
    'java.util.regex.Pattern',
    'org.pegjs.java.IBaseParser',
    'org.pegjs.java.IParser',
    'org.pegjs.java.Expected',
    'org.pegjs.java.Position',
    'org.pegjs.java.State',
    'org.pegjs.java.annotations.Rule',
    'org.pegjs.java.annotations.Grammar',
    'org.pegjs.java.exceptions.NoSuchRuleException'
  );

  var prefix = 'parse$';
  /// Возвращает имя функции для разбора правила с указанным именем
  function r(name) { return prefix + name; }
  function _(localName) { return imports.resolve(localName); }

  function generateSimplePredicate(expression, negative, builder) {
    // Ошибки в предикатах нет нужды сообщать, т.к. мы только делаем проверку.
    // По этой же причине запоминаем текущую позицию, потому что потом нам надо будет вернуться.
    builder.push(
      builder.locPush(),
      '++super.silent'
    );
    // Предикаты создают собственную область видимости переменных
    generate(expression, builder.child(builder.sp, objects.clone(builder.env), null));

    builder.push(
      '--super.silent',
      builder.locPop()
    );
    // Для положительных предикатов, достаточно просто откатить позицию, т.к. если он сопоставился,
    // разбор можно продолжить (и при этом иметь доступ к тому, что сопоставилось), а если нет, то
    // предикат оставит после себя FAILED на стеке.
    // Для негативных предикатов необходимо инвертировать его значение, заменив успешный результат
    // на FAILED и наоборот. Однако, т.к. в случае провала сопоставления результат получить нельзя,
    // то в качестве метки успешного завершения мы кладем на стек null.
    if (negative) {
      builder.indent('if (' + builder.resultStack.pop() + ' != FAILED) {');
      builder.push(builder.resultStack.push('FAILED'));
      builder.dedent();
      builder.indent('} else {');
      builder.push(builder.resultStack.replace('null'));
      builder.dedent('}');
    }
  }
  function generateSemanticPredicate(node, negative, builder) {
    var params = objects.keys(builder.env);
    var args = builder.resultStack.args(builder.env);
    builder.indent(
      'if (' + (negative ? '!' : '') + 'uc.' + ucb.addPredicate(node, params, args) + ') {'
    );
    builder.push(builder.resultStack.push('null'));
    builder.dedent();
    builder.indent('} else {');
    builder.push(builder.resultStack.replace('FAILED'));
    builder.dedent('}');
  }
  function generateRange(expression, builder, min, max) {
    function v(boundary) {
      return boundary.constant
        ? boundary.value
        : '(('+_('Number')+')' + builder.local(boundary.value) + ').intValue()';
    }
    // Если задан минимум, то, в том случае, если он больше 1, после разбора нескольких
    // элементов может понадобиться откатиться в начало правила, если количество элементов
    // окажется недостаточным.
    // В случае нуля элементов отката никогда не будет, а в случае одного откат требуется,
    // только если первый же элемент не будет сопоставлен. Но в таком случае позиция не
    // изменится, поэтому нет нужды ее запоминать.
    var saveLoc = !min.constant || min.value > 1;
    if (saveLoc) {
      builder.push(builder.locPush());
    }
    builder.push(builder.resultStack.push('newArray()'));

    var arr = '((' + _('List') + ')' + builder.resultStack.top() + ')';

    builder.indent('do {/*range*/');
    // Если задан максимум, генерируем проверку максимума
    if (max && max.value) {
      builder.push('if (' + arr + '.size() >= ' + v(max)+ ') { break; }');
    }
    // Один элемент в стеке занят под массив с результатом.
    generate(expression, builder.child(builder.sp + 1, objects.clone(builder.env), null));
    builder.push(
      'if (' + builder.resultStack.top() + ' == FAILED) { break; }',
      arr + '.add(' + builder.resultStack.pop() + ');'
    );
    builder.dedent('} while (true);/*range*/');

    // Если задан минимум, генерируем его проверку. Если минимум задан в 0 элементов, то он
    // фактически отсутствует, поэтому проверка не нужна.
    if (!min.constant || min.value > 0) {
      builder.indent('if (' + arr + '.size() < ' + v(min) + ') {');
      if (saveLoc) {
        builder.push(builder.locPop());
      }
      builder.push(builder.resultStack.replace('FAILED'));
      builder.dedent('}');
    }
  }

  var patterns = makeConstantBuilder(_('Pattern'),  'p', function(value, ignoreCase) {
    var p = _('Pattern');
    return [
      p,
      '.compile("',
      escape(value),
      '", ',
      ignoreCase ? p + '.CASE_INSENSITIVE | ' : '',
      p + '.DOTALL | ',
      p + '.UNICODE_CASE',
      ')',
    ].join('');
  });
  var expected = makeConstantBuilder(_('Expected'), 'e', function(type, value, description) {
    var e = _('Expected');
    return 'new ' + e + '(' + e + '.Type.' + type
        + ', ' + (value       ? '"' + escape(value)       + '"' : 'null')
        + ', ' + (description ? '"' + escape(description) + '"' : 'null')
        + ')';
  });

  var generate = visitor.build({
    grammar: function(node) {
      node.initializers.forEach(generate);

      var defaultRule = asts.findRule(ast, options.allowedStartRules[0]);
      var userCodeClass = java.className + 'UserCode';

      var b = new CodeBuilder([]);
      if (java.package) {
        b.push(
          'package '+ java.package + ';',
          ''
        );
      }
      if (!java.useFullNames) {
        b.pushAll(imports.declares());
        b.push('');
      }

      // Генерируем код правил и списки констант
      var rules = node.rules.map(generate);

      b.indent('final class ' + userCodeClass + ' {');
      b.push(
        'private final ' + java.className + ' parser;',
        userCodeClass + '(' + java.className + ' parser) { this.parser = parser; }',
        ''
      );
      ucb.defines(b, null);
      b.dedent('}');

      b.indent(
        '',
        '@' + _('Grammar'),
        'public class ' + java.className
          + ' extends ' + (java.baseClass ? java.baseClass : _('State'))
          + ' implements ' + _('IParser') + '<' + _('Object') + '>'
          + ' {'
      );

      b.push('/*~~~~~~~~~~~~~~~~~~~~~~~ PATTERNS ~~~~~~~~~~~~~~~~~~~~~~~*/');
      b.pushAll(patterns.defines());
      b.push('/*~~~~~~~~~~~~~~~~~ EXPECTED DEFINITIONS ~~~~~~~~~~~~~~~~~*/');
      b.pushAll(expected.defines());

      b.push('/*~~~~~~~~~~~~~~~~~ ALLOWED START RULES ~~~~~~~~~~~~~~~~~~*/');
      options.allowedStartRules.forEach(function(name) {
        var rule = asts.findRule(ast, name);
        var type = _('Object');
        b.indent('public static final '
          + _('IBaseParser')+'<' + type + '> '
          + toUpperSnakeCase(rule.name)
          + ' = new '+_('IBaseParser')+'<'+type+'>() {'
        );
        b.push(
          '@'+_('Override'),
          'public '+type+' parse('+_('CharSequence')+' input) {',
          '  final ' + java.className + ' p = new ' + java.className + '();',
          '  p.init(input);',
          '  return ('+type+')p.finalize(p.' + r(name) + '());',
          '}',
          '@'+_('Override'),
          'public '+type+' parse('+_('ByteBuffer')+' input) {',
          '  final ' + java.className + ' p = new ' + java.className + '();',
          '  p.init(input);',
          '  return ('+type+')p.finalize(p.' + r(name) + '());',
          '}',
          '@'+_('Override'),
          'public '+type+' parse(byte[] input) {',
          '  final ' + java.className + ' p = new ' + java.className + '();',
          '  p.init(input);',
          '  return ('+type+')p.finalize(p.' + r(name) + '());',
          '}'
        );
        b.dedent('};');
      });

      b.push(
        'private final ' + userCodeClass + ' uc = new ' + userCodeClass + '(this);',
        '',
        '//<editor-fold defaultstate="collapsed" desc="API">',
        '@' + _('Override'),
        'public ' + _('Object') + ' parse(' + _('CharSequence') + ' input) {',
        '    super.init(input);',
        '    return super.finalize(' + r(defaultRule.name) + '());',
        '}',
        '@' + _('Override'),
        'public Object parse(' + _('CharSequence') + ' input, ' + _('String') + ' startRule) {',
        '    super.init(input);',
        '    return super.finalize(parseRule(startRule));',
        '}',
        '',
        '@' + _('Override'),
        'public ' + _('Object') + ' parse(' + _('ByteBuffer') + ' input) {',
        '    super.init(input);',
        '    return super.finalize(' + r(defaultRule.name) + '());',
        '}',
        '@' + _('Override'),
        'public Object parse(' + _('ByteBuffer') + ' input, ' + _('String') + ' startRule) {',
        '    super.init(input);',
        '    return super.finalize(parseRule(startRule));',
        '}',
        '',
        '@' + _('Override'),
        'public ' + _('Object') + ' parse(byte[] input) {',
        '    super.init(input);',
        '    return super.finalize(' + r(defaultRule.name) + '());',
        '}',
        '@' + _('Override'),
        'public Object parse(byte[] input, ' + _('String') + ' startRule) {',
        '    super.init(input);',
        '    return super.finalize(parseRule(startRule));',
        '}',
        '//</editor-fold>',
        '',
        '//<editor-fold defaultstate="collapsed" desc="Вспомогательные функции">',
        'private '+_('Object')+' parseRule('+_('String')+' ruleName) {',
        '    try {',
        '        final '+_('Method')+' m = getClass().getDeclaredMethod("'+prefix+'"+ruleName);',
        '        final '+_('Rule')+' a = m.getAnnotation('+_('Rule')+'.class);',
        '        if (a == null) {',
        '            throw new '+_('NoSuchRuleException')+'("\\"" + ruleName + "\\" is not a rule name");',
        '        }',
        '        if (!a.isStart()) {',
        '            throw new '+_('NoSuchRuleException')+'("Can\'t start parsing from rule \\"" + ruleName + "\\".");',
        '        }',
        '        return m.invoke(this);',
        '    } catch ('+_('IllegalAccessException'),
        '            |'+_('IllegalArgumentException'),
        '            |'+_('InvocationTargetException'),
        '            |'+_('NoSuchMethodException'),
        '            |'+_('SecurityException')+' ex) {',
        '        throw new '+_('NoSuchRuleException')+'(ex);',
        '    }',
        '}',
        '//</editor-fold>',
        '',
        '//<editor-fold defaultstate="collapsed" desc="Функции разбора правил">'
      );
      rules.forEach(b.pushAll, b);
      b.push('//</editor-fold>');

      b.dedent('}');

      return b.code.join('\n');
    },

    // annotation:   visitNop,
    initializer: function(node) {
      ucb.addInitializer(node.namespace, node.code);

      node.annotations.forEach(generate);
    },

    rule: function(node) {
      var code = [];
      var builder = makeRuleBuilder(_('Object'), _('Position'), code);
      var isStart = options.allowedStartRules.indexOf(node.name) > 0;
      builder.indent(
        '@' + _('Rule') + '(name="' + node.name + '", isStart=' + isStart + ')',
        // Возвращаем Object, а не тип узла, т.к. может вернуться FAILED, а он имеет свой тип.
        'private ' + _('Object') + ' ' + r(node.name) + '() {'
      );
      builder.push(
        null,// зарезервировано для переменных из стека результатов
        null,// зарезервировано для переменных из стека позиций
        ''
      );
      generate(node.expression, builder);
      builder.push(
        '',
        'return ' + builder.result() + ';'
      );
      builder.dedent('}');

      code[2] += builder.resultStack.defines();
      code[3] += builder.locationStack.defines();

      return code;
    },

    named: function(node, builder) {
      var e = expected.add('RULE', null, node.name);

      builder.push(
        '++super.silent;',
        ''
      );
      generate(node.expression, builder),
      builder.indent(
        '',
        '--super.silent;',
        'if (' + builder.resultStack.top() + ' == FAILED) {'
      );
      builder.push(builder.resultStack.push('super.fail(' + e + ')'));
      builder.dedent('}');
    },

    choice: function(node, builder) {
      builder.indent('do {/*choice*/');
      node.alternatives.forEach(function(n, i, a) {
        builder.push('/*alternative ' + (i+1) + '*/');
        // Для каждой альтернативы набор переменных свой
        generate(n, builder.child(builder.sp, objects.clone(builder.env), null));
        // Если элемент не последний в массиве, то генерируем проверку
        if (i+1 < a.length) {
          builder.push(
            'if (' + builder.resultStack.pop() + ' != FAILED) { break; }',
            ''
          );
        }
      });
      builder.dedent('} while (false);/*choice*/');
    },

    sequence: function(node, builder) {
      // Если какой-то элемент последовательности не сматчится, то вся последовательность
      // откатывается, поэтому сохраняем позицию перед разбором. Однако в случае пустой последовательности
      // это можно не делать -- отката все равно не будет, так что можно не беспокоиться. Но в том случае,
      // если задано действие, позиция нам понадобиться для маркировки, поэтому в этом случае сохраняем ее.
      if (node.elements.length > 0 || builder.action) {
        builder.push(builder.locPush());
      }
      if (node.elements.length > 0) {
        builder.indent('do {/*sequence*/');
        var first;
        node.elements.forEach(function(n, i) {
          builder.push('/*element ' + (i+1) + '*/');
          // Для всех элементов последовательности набор переменных одинаковый.
          // Для элемента с индексом i в стеке уже лежат i результатов разбора предыдущих элементов,
          // поэтому увеличиваем начальную позицию на это число.
          generate(n, builder.child(builder.sp + i, builder.env, null));
          // Результат разбора всей последовательсности в конце-концов окажется в переменной, в которую
          // сохранился результат разбора первого элемента. Запоминаем его, он пригодится при генерации
          // кода провалов сопоставления последующих элементов.
          if (i === 0) {
            first = builder.resultStack.top();
          }
          // Если разбор очередного элемента не удался, восстанавливаем позицию
          // и прекращаем анализ прочих элементов последовательности.
          builder.indent(
            'if (' + builder.resultStack.top() + ' == FAILED) {'
          );
          // Делаем проверку на первый элемент последовательсности, чтобы не генерировать бесполезное
          // присвоение FAILED в переменную, которая только что была проверена на FAILED.
          // Позиция при провале разбора первого элемента также не изменилась, поэтому возвращать ее
          // нет надобности.
          if (i != 0) {
            builder.push(
              builder.locPop(),
              first + ' = FAILED;'
            );
            // Выше мы преждевременно выкинули из стека позицию (ради кода обратного присвоения),
            // засовываем ее обратно, но код для этого не генерируем.
            builder.locPush();
          }
          builder.push('break;');
          builder.dedent(
            '}',
            ''
          );
        });
      }

      // Если без проишествий прошли через все элементы последовательности, то
      // упаковываем все элементы последовательности в список или вызываем действие.

      // Формируем список элементов, которые нужны при вызове действия. Важно сделать это до того,
      // как выплюнем их из стека следующей строкой.
      var args  = builder.resultStack.args(builder.env);
      var elems = builder.resultStack.pop(node.elements.length);
      if (builder.action) {
        builder.push(
          builder.locMark(),
          builder.resultStack.push('uc.' + ucb.addAction(
            builder.action,
            objects.keys(builder.env),
            args
          ))
        );
      } else {
        builder.push(builder.resultStack.push('newArray(' + elems.join(', ') + ')'));
        if (node.elements.length > 0) {
          builder.locationStack.pop();
        }
      }

      if (node.elements.length > 0) {
        builder.dedent('} while (false);/*sequence*/');
      }
    },

    labeled: function(node, builder) {
      // Для того, чтобы разбираемое выражение не имело доступа к себе же посредством метки,
      // сначала клонируем окружение, а затем добавляем в исходное новую метку.
      var env = objects.clone(builder.env);
      // После вычисления выражения его результат попадет в следующую переменную, поэтому увеличиваем
      // номер переменной на 1.
      builder.env[node.label] = builder.sp + 1;

      // В выражении мы все еще можем переиспользовать переменные, поэтому тут увеличение не требуется.
      return generate(node.expression, builder.child(builder.sp, env, null));
    },

    text: function(node, builder) {
      builder.push(builder.locPush());
      // Внутри узла новая область видимости переменных, поэтому клонируем окружение.
      generate(node.expression, builder.child(builder.sp, objects.clone(builder.env), null));
      builder.indent('if (' + builder.resultStack.pop() + ' != FAILED) {');
      builder.push(builder.resultStack.push('super.toText(' + builder.locationStack.pop() + ')'));
      builder.dedent('}');
    },

    optional: function(node, builder) {
      // Внутри узла новая область видимости переменных, поэтому клонируем окружение.
      generate(node.expression, builder.child(builder.sp, objects.clone(builder.env), null));
      builder.push(
        'if (' + builder.resultStack.pop() + ' == FAILED) { ' + builder.resultStack.push('null') + ' }'
      );
    },

    zero_or_more: function(node, builder) {
      generateRange(node.expression, builder, { constant: true, value: 0 }, null, null);
    },

    one_or_more: function(node, builder) {
      generateRange(node.expression, builder, { constant: true, value: 1 }, null, null);
    },

    range: function(node, builder) {
      generateRange(node.expression, builder, node.min, node.max, node.delimiter);
    },

    simple_and: function(node, builder) {
      return generateSimplePredicate(node.expression, false, builder);
    },

    simple_not: function(node, builder) {
      return generateSimplePredicate(node.expression, true, builder);
    },

    semantic_and: function(node, builder) {
      return generateSemanticPredicate(node, false, builder);
    },

    semantic_not: function(node, builder) {
      return generateSemanticPredicate(node, true, builder);
    },

    action: function(node, builder) {
      // Создаем новое окружение, но копируем в него те метки, что уже есть. Таким образом, реализуется
      // перекрытие меток в случае совпадения имен.
      var env = objects.clone(builder.env);
      // Для того, чтобы не генерировать лишний вызов wrap у последовательности элементов, вызов
      // функции генерируется прямо в последовательности, ВМЕСТО wrap. А это значит, что здесь его
      // генерировать не надо.
      var emitCall = node.expression.type !== "sequence";

      // Если вызов генерируется, нужно сохранить позицию перед выполнением пользовательского кода,
      // чтобы он имел к ней доступ.
      if (emitCall) {
        builder.push(
          builder.locPush(),
          ''
        );
      }
      // Генерируем код и заполняем окружение метками
      generate(node.expression, builder.child(builder.sp, env, node));
      if (emitCall) {
        // Получаем названия меток -- это имена формальных параметров действия
        var params = objects.keys(env);
        // Получаем массив с именами и типами реальных аргументов
        var args = builder.resultStack.args(env);
        builder.indent(
          '',
          'if (' + builder.resultStack.top() + ' != FAILED) {'
        );
        builder.push(
          builder.locMark(),
          builder.resultStack.replace('uc.' + ucb.addAction(node, params, args))
        );
        builder.dedent('}');
      }
    },

    rule_ref: function(node, builder) {
      // Помещаем результат разбора правила на вершину стека результатов.
      builder.push(builder.resultStack.push(r(node.name) + '()'));
    },

    literal: function(node, builder) {
      var e = expected.add(
        'LITERAL',
        node.ignoreCase ? node.value.toLowerCase() : node.value,
        '"' + escape(node.value) + '"'
      );
      // Помещаем результат разбора класса символов на вершину стека результатов.
      builder.push(builder.resultStack.push(
        'super.parseLiteral("' + escape(node.value) + '", ' + e + ', ' + (node.ignoreCase ? 'true' : 'false') + ')'
      ));
    },

    "class": function(node, builder) {
      var value = makeRegexString(node);
      var v = patterns.add(value, node.ignoreCase);
      var e = expected.add('PATTERN', value, node.rawText);
      // Помещаем результат разбора класса символов на вершину стека результатов.
      builder.push(builder.resultStack.push(
        'super.parsePattern(' + v + ', ' + e + ', ' + (node.inverted ? 'true' : 'false') + ')'
      ));
    },

    any: function(node, builder) {
      // Помещаем результат разбора any на вершину стека результатов.
      builder.push(builder.resultStack.push('super.parseAny()'));
    }
  });

  ast.code = generate(ast);
  return ast.code;
};

module.exports = generateJavaCode;