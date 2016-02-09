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
public final class Location implements Cloneable, Serializable {
    private static final long serialVersionUID = -8097211791330238764L;

    private final Position start;
    private final Position end;

    Location(Position start, Position end) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("|start| and |end| must be not null");
        }
        this.start = start;
        this.end   = end;
    }
    //<editor-fold defaultstate="collapsed" desc="Публичный интерфейс">
    public Position start() { return start; }
    public Position end()   { return end;   }
    public CharSequence region(CharSequence input) {
        return input.subSequence(start.offset(), end.offset());
    }

    @Override
    public Location clone() {
        return new Location(start, end);
    }
    //</editor-fold>
}