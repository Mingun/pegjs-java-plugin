
package org.pegjs.java.exceptions;

import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import org.pegjs.java.Expected;
import org.pegjs.java.Location;

/**
 * Кидается при обнаружении синтаксических ошибок в разбираемой последовательности.
 * Содержит отсортированное множество ожидаемых элементов грамматики, позицию, в которой
 * обнаружена ошибка, и символ из разбираемой последовательности, который вызвал ошибку.
 *
 * @author Mingun
 */
public class SyntaxError extends PEGException {
    private static final long serialVersionUID = -752047789955231813L;

    /** Множество ожидаемых элементов грамматики в позиции возникновения ошибки. Немодифицируемое множество. */
    public final SortedSet<Expected> candidates;
    /** Позиция, в которой обнаружена ошибка. */
    public final Location location;
    /** Встретившийся символ или {@code null}, в случае достижения конца данных. */
    public final Character found;

    /**
     * 
     * @param message Сообщение об ошибке. Если равно {@code NULL}, то будет сформировано автоматически
     *        на основе списка кандидатов.
     * @param candidates Список ожидаемых символов или имен правил.
     * @param location Позиция в разбираемой строке, в которой возникло исключение.
     * @param found Текущий символ или {@code null} в случае {@code EOF}.
     */
    public SyntaxError(String message, List<Expected> candidates, Location location, Character found) {
        this(message, candidates == null ? null : new TreeSet(candidates), location, found);
    }
    /**
     * 
     * @param message Сообщение об ошибке. Если равно {@code NULL}, то будет сформировано автоматически
     *        на основе списка кандидатов.
     * @param candidates Отсортированный и избавленный от дубликатов список ожидаемых
     *        символов или имен правил.
     * @param location Позиция в разбираемой строке, в которой возникло исключение.
     * @param found Текущий символ или {@code null} в случае {@code EOF}.
     */
    public SyntaxError(String message, SortedSet<Expected> candidates, Location location, Character found) {
        super(message != null ? message : buildMessage(candidates, location, found));
        this.candidates = Collections.unmodifiableSortedSet(candidates);
        this.found      = found;
        this.location   = location;
    }
    private static String buildMessage(SortedSet<Expected> candidates, Location location, Character found) {
        final StringBuilder sb = new StringBuilder();
        sb.append("Line ").append(location.start().line()).append(", column ").append(location.start().column());
        sb.append(": Expected ");

        int last = candidates.size()-1;
        if (last > 0) {
            final Iterator<Expected> it = candidates.iterator();
            while (last > 0) {
                sb.append(it.next().description).append(", ");
                --last;
            }
            sb.append("or ");
        }
        sb.append(candidates.last().description);

        sb.append(" but ");
        if (found != null) {
            sb.append('"').append(stringEscape(found)).append('"');
        } else {
            sb.append("end of input");
        }
        sb.append(" found.");
        return sb.toString();
    }
    /**
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a string
     * literal except for the closing quote character, backslash, carriage
     * return, line separator, paragraph separator, and line feed. Any character
     * may appear in the form of an escape sequence.
     *
     * For portability, we also escape all control and non-ASCII characters.
     * Note that "\0" and "\v" escape sequences are not used because JSHint does
     * not like the first and IE the second.
     */
    private static Character stringEscape(Character s) {
        return s;
        /*function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

        return s
          .replace(/\\/g,   '\\\\')
          .replace(/"/g,    '\\"')
          .replace(/\x08/g, '\\b')
          .replace(/\t/g,   '\\t')
          .replace(/\n/g,   '\\n')
          .replace(/\f/g,   '\\f')
          .replace(/\r/g,   '\\r')
          .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
          .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
          .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });*/
    }
}
