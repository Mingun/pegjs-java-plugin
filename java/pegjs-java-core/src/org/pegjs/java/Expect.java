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
import java.util.ArrayList;
import java.util.List;

class Expect implements Serializable {
    private static final long serialVersionUID = 5192938999614921064L;

    /**
     * Позиция, в которой ожидается появление элементов грамматики,
     * перечисленных в {@link #candidates}.
     */
    protected Position pos = new Position();
    /**
     * Если равно 0, то ожидаемый элемент добавляется в список кандидатов, в противном
     * случае игнорируется.
     */
    protected int silent = 0;
    /**
     * Список имен правил подстрок или классов символов, которые могут
     * ожидаться при разборе правила в позиции {@link pos}. Храним в виде
     * списка а не множества, потому как добавление в список быстрее, а он
     * нам может и не понадобиться. Поэтому сортируется он только тогда,
     * когда это действительно нужно.
     */
    protected final List<Expected> candidates = new ArrayList<>();

    protected void add(Position currentPos, Expected expected) {
        // Если запоминание кандитатов отключено или ошибка возникла ранее, чем нам удавалось
        // продвинуться, то не запоминаем ее. Таким обраом, ошибки рапортуются в позиции, дальше
        // которой провести разбор не удалось ни одним образом.
        if (silent > 0 || currentPos.compareTo(pos) < 0) return;
        // Если ошибка произошла позднее, то значит, мы уже продвинулись вперед,
        // следовательно, ошибка ранее не произошла (мы бы ее не миновали),
        // следовательно, старые данные нужно почистить.
        if (currentPos.compareTo(pos) > 0) {
            pos = currentPos.clone();
            candidates.clear();
        }
        candidates.add(expected);
    }
}