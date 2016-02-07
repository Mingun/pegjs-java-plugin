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

public final class Expected implements Comparable<Expected> {
    public enum Type {
        /** Ожидается любой символ, однако был обнаружен конец данных. */
        ANY,
        /** Ожидается класс символов, соответствующий некоторому шаблону. */
        PATTERN,
        /** Ожидается некоторая непрерывная последовательность символов. */
        LITERAL,
        /** Ожидается именованное правило разбора. */
        RULE,
        /** Ожидается конец разбираемых данных, однако имеются еще неразобранные данные. */
        EOF,
        /**
         * Ожидается нечто, что было определено автором грамматики, через функцию
         * {@link State#error} или {@link State#expected}.
         */
        CUSTOM;
    }
    /** Вид ожидаемых данных. */
    public final Type type;
    /** Строковое представление того, что ожидается. */
    public final String value;
    /** Человекочитаемое описание ожидаемых данных. */
    public final String description;

    public Expected(Type type, String value, String description) {
        this.type = type;
        this.value = value;
        this.description = description;
    }
    @Override
    public int compareTo(Expected other) {
        return description.compareTo(other.description);
    }

    @Override
    public String toString() {
        return "Expected(type="+type.name()+", value="+value+", description="+description+")";
    }
}
