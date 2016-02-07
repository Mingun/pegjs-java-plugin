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

/**
 * Класс для хранения информации о текущей позиции в разбираемых данных.
 * Используется генерируемым кодом парсера для хранения информации о текущем
 * месте разбора. Также содержит методы для разбора листовых правил - литералов
 * и шаблонов, а также любого символа.
 *
 * @autor Mingun
 */
public final class Position implements Cloneable, Comparable<Position>, Serializable {
    /** Смещение в символах от начала разбираемых данных (нумерация с 0). */
    int offset = 0;
    private int line = 1;
    private int column = 1;
    private boolean seenCR = false;

    //<editor-fold defaultstate="collapsed" desc="Публичный интерфейс">
    /**
     * Возвращает текущее смещение в символах (отсчет с 1) от начала разбираемого
     * входа.
     */
    public int offset() { return offset; }
    /**
     * Возвращает текущий номер строки (отсчет с 1) в разбираемом входе.
     * Номер строки увеличивается каждый раз при встрече последовательности
     * символов или одного символа {@literal '\\r\\n'}, {@literal '\\r'} или
     * {@literal '\\n'}.
     */
    public int line() { return line; }
    /**
     * Возвращает текущий номер столбца (отсчет с 1) в разбираемом входе.
     * Номер столбца увеличивается с каждым символом и сбрасывается на 1 при
     * встрече последовательности символов или одного символа {@literal '\\r\\n'},
     * {@literal '\\r'} или {@literal '\\n'}.
     */
    public int column() { return column; }
    //</editor-fold>

    protected void next(char ch) {
        ++offset;
        if (ch == '\n') {
            // Так как предыдущий символ был '\\r', на котором мы уже увеличили
            // номер строки, опять его увеличивать не нужно.
            if (!seenCR) {
                ++line;
            }
            column = 1;
            seenCR = false;
        } else
        if (ch == '\r' || ch == Character.LINE_SEPARATOR || ch == Character.PARAGRAPH_SEPARATOR) {
            ++line;
            column = 1;
            seenCR = true;
        } else {
            ++column;
            seenCR = false;
        }
    }
    protected void next(CharSequence input, int to) {
        for (int i = offset; i < to; ++i) {
            char ch = input.charAt(i);
            next(ch);
        }
    }

    @Override
    public int compareTo(Position o) {
        // Объект всегда больше, чем null.
        return o == null ? 1 : Integer.compare(offset, o.offset);
    }

    @Override
    public Position clone() {
        try {
            return (Position)super.clone();
        } catch (CloneNotSupportedException ex) {
            throw (InternalError)new InternalError("Must be unreacheble").initCause(ex);
        }
    }

    @Override
    public String toString() {
        return "Position(offset="+offset+"; line="+line+"; column="+column+")";
    }
}