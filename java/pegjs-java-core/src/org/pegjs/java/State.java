/*
 * The MIT License
 *
 * Copyright 2016 Mingun.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
package org.pegjs.java;

import java.io.Serializable;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.SortedSet;
import java.util.regex.Pattern;
import org.pegjs.java.exceptions.SyntaxError;

/**
 * Класс для хранения информации о текущей позиции в разбираемых данных.
 * Используется генерируемым кодом парсера для хранения информации о текущем
 * месте разбора. Также содержит методы для разбора листовых правил - литералов
 * и шаблонов, а также любого символа.
 *
 * @autor Mingun
 */
public class State extends Expect implements Serializable {
    //<editor-fold defaultstate="collapsed" desc="Поля и константы">
    private static final Expected ANY = new Expected(Expected.Type.ANY, null, "any character");
    private static final Expected EOF = new Expected(Expected.Type.EOF, null, "end of input");

    /** Разбираемая последовательность. */
    private CharSequence input;
    /** Текущее положение в разбираемой последовательности. */
    protected Position current;
    /**
     * Позиция в разбираемой последовательности перед началом разбора правила,
     * на которое навешено действие или предикат.
     */
    protected Position mark;
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="Внутренние классы и интерфейсы">
    /**
     * Представляет массив байт как последовательность символов. Каждый байт массива
     * рассматривается как один символ.
     */
    private static final class ByteArrayAsCharSequence implements CharSequence, Cloneable {
        private final byte[] content;
        private final int offset;
        private final int length;
        
        public ByteArrayAsCharSequence(byte[] content) {this(content, 0, content.length);}
        public ByteArrayAsCharSequence(byte[] content, int offset, int length) {
            if (length < 0) {
                throw new IllegalArgumentException("'length' must be > 0: "+length);
            }
            if (offset < 0 || offset > content.length - length) {
                throw new IndexOutOfBoundsException("Bounds: [0; "+(content.length - length)+"], offset="+offset);
            }
            this.content = content;
            this.offset = offset;
            this.length = length;
        }
        @Override
        public int length() { return length; }
        @Override
        public char charAt(int index) { return (char)content[offset + index]; }
        @Override
        public CharSequence subSequence(int start, int end) {
            return new ByteArrayAsCharSequence(content, offset + start, end - start);
        }
        @Override
        public ByteArrayAsCharSequence clone() {
            return new ByteArrayAsCharSequence(Arrays.copyOfRange(content, offset, offset + length));
        }
    }
    /**
     * Представляет буфер байт как последовательность символов. Каждый байт буфера
     * рассматривается как один символ.
     */
    private static final class ByteBufferAsCharSequence implements CharSequence {
        private final ByteBuffer content;
        
        public ByteBufferAsCharSequence(ByteBuffer content) {
            this.content = content.duplicate();
        }
        @Override
        public int length() { return content.remaining(); }
        @Override
        public char charAt(int index) { return (char)content.get(index); }
        @Override
        public CharSequence subSequence(int start, int end) {
            content.position(start);
            return new ByteBufferAsCharSequence((ByteBuffer)content.slice().limit(end));
        }
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="Пользовательское API">
    /** Возвращает ссылку на текущую разбираемую последовательность. */
    public CharSequence input() {
        return input;
    }
    /**
     * Возвращает ссылку на объект, представляющий границы текущего разбираемого элемента грамматики.
     * При вызове из предикатов начало и конец всегда совпадают и являются текущей позицией в разборе.
     * При вызове из действий представляет регион разбираемой последовательности, для которого в
     * грамматике задано выполняемое действие.
     *
     * @return Объект, описывающий диапазон разбираемой последовательности.
     */
    public Location location() {
        return new Location(mark, current.clone());
    }
    /**
     * Возвращает подпоследовательность, представляющую текущий разбираемый элемент грамматики.
     * При вызове из предикатов это всегда пустая подпоследовательность.
     * При вызове из действий представляет подпоследовательность, соответствующей {@link location()
     * текущему региону} разбираемой последовательности, для которого в грамматике задано выполняемое
     * действие.
     *
     * @return Подпоследовательность {@link input() разбираемой последовательности}, соответствующей
     *         текущей {@link location() позиции} в разбираемых данных.
     */
    public CharSequence text() {
        return location().region(input());
    }
    /**
     * Прерывает разбор после завершения действия или предиката, формируя синтаксическую ошибку в
     * указанной позиции разбора.
     * @param value Значение, которое будет являться описанием и ожидаемым значением в указанной
     *        позиции. Данное значение будет частью стандартного сообщения об ошибке.
     * @param location Позиция, в которой будет сообщено об ошибке разбора.
     */
    public void expected(String value, Location location) {
        throw new SyntaxError(
            null,
            Arrays.asList(new Expected(Expected.Type.CUSTOM, value, value)),
            location,
            found(location)
        );
    }
    /**
     * Немедленно прерывает разбор, формируя синтаксическую ошибку в {@link location() текущей}
     * позиции разбора.
     * @param value Значение, которое будет являться описанием и ожидаемым значением в текущей
     *        позиции. Данное значение будет частью стандартного сообщения об ошибке.
     */
    public void expected(String value) {
        expected(value, location());
    }
    /**
     * Немедленно прерывает разбор, формируя синтаксическую ошибку в указанной позиции разбора.
     * @param message Сообщение об ошибке, как оно будет возвращено пользователю.
     * @param location Позиция, в которой будет сообщено об ошибке разбора.
     */
    public void error(String message, Location location) {
        throw new SyntaxError(message, (SortedSet<Expected>)null, location, found(location));
    }
    /**
     * Немедленно прерывает разбор, формируя синтаксическую ошибку в {@link location() текущей}
     * позиции разбора.
     * @param message Сообщение об ошибке, как оно будет возвращено пользователю.
     */
    public void error(String message) {
        error(message, location());
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="Функции разбора базовых элементов грамматики">
    /**
     * @return Character с сопоставившемся символом или константу {@link IParser.FAILED}
     *         в случае неудачи сопоставления (конца разбираемых данных).
     */
    protected final Object parseAny() {
        if (current.offset < input.length()) {
            final char ch = input.charAt(current.offset);
            current.next(ch);
            return ch;
        }
        return fail(ANY);
    }
    /**
     * @return Character с сопоставившемся символом или константу {@link IParser.FAILED}
     *         в случае неудачи сопоставления.
     */
    protected final Object parsePattern(Pattern pattern, Expected expected, boolean inverse) {
        if (current.offset < input.length()) {
            final char ch = input.charAt(current.offset);
            if (pattern.matcher(String.valueOf(ch)).matches() ^ inverse) {
                current.next(ch);
                return ch;
            }
        }
        return fail(expected);
    }
    /**
     * @param literal Строка, на соответствие с которой проверяется текст в текущей позиции.
     * @param expected Описание ошибки, которое будет использоваться, если текст в текущей
     *        позиции не соответствует тексту проверяемой строки.
     * @param ignoreCase Если `true`, сопоставление литерала с текстом в текущей позиции
     *        будет производится без учета регистра символов.
     * @return CharSequence с сопоставившейся подпоследовательностью или константу {@link IParser.FAILED}
     *         в случае неудачи сопоставления.
     */
    protected final Object parseLiteral(String literal, Expected expected, boolean ignoreCase) {
        final int end = current.offset + literal.length();
        if (end <= input.length()) {
            final CharSequence result = input.subSequence(current.offset, end);
            if (ignoreCase) {
                if (result.toString().equalsIgnoreCase(literal)) {
                    current.next(input, end);
                    return result;
                }
            } else {
                if (result.toString().contentEquals(literal)) {
                    current.next(input, end);
                    return result;
                }
            }
        }
        return fail(expected);
    }
    //</editor-fold>

    //<editor-fold defaultstate="collapsed" desc="Внутреннее API для генерируемых парсеров">
    protected final void init(CharSequence input) {
        this.input = input;
        this.current = new Position();
    }
    protected final void init(ByteBuffer input) {
        init(new ByteBufferAsCharSequence(input));
    }
    protected final void init(byte[] input) {
        init(new ByteArrayAsCharSequence(input));
    }
    /**
     * Извлекает из разбираемой последовательности подпоследовательнось, начиная с указанной
     * позиции до текущей позиции разбора.
     * @param from Позиция, с которой начать извлечение текста.
     * @return Результат вызова {@linkplain CharSequence#subSequence} на текущей разбираемой
     *         последовательности с границами от `from` до `location().end()`.
     */
    protected final CharSequence toText(Position from) {
        return input.subSequence(from.offset, current.offset);
    }
    protected final Object fail(Expected e) {
        add(current, e);
        return IParser.FAILED;
    }
    protected final Object finalize(Object result) {
        if (result != IParser.FAILED) {
            // Если результат сопоставления успешен и поглощен весь вход, то разбор успешен.
            if (current.offset == input.length()) {
                return result;
            }
            // Если после сопоставления остались неразобранные данные, то сообщаем,
            // что ожидается конец разбираемых данных, а затем сформируем исключение.
            if (current.offset < input.length()) {
                fail(EOF);
            }
        }
        final Location location = new Location(pos, pos);
        throw new SyntaxError(null, candidates, location, found(location));
    }
    protected List<?> newArray(Object... elements) {
        return new ArrayList<>(Arrays.asList(elements));
    }
    //</editor-fold>

    private Character found(Location location) {
        final int offset = location.start().offset();
        return offset < input.length() ? input.charAt(offset) : null;
    }
}