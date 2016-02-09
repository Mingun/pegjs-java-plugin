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
package org.pegjs.java.exceptions;

/**
 * Данное исключение выкидывается, если правило разбора, указанное в {@link IParser#parse
 * семействе методов parse} не найдено разбор с данного правила не может быть начат
 * (что с концептуаьной точки зрения является эквивалентом отсутствия правила, т.к.
 * правила, используемые внутри парсера, являются его внутренней реализацией).
 * 
 * @author Mingun
 */
public class NoSuchRuleException extends PEGException {
    private static final long serialVersionUID = -2199775879685087797L;

    public NoSuchRuleException() { super(); }
    public NoSuchRuleException(String message) { super(message); }
    public NoSuchRuleException(Throwable cause) { super(cause); }
    public NoSuchRuleException(String message, Throwable cause) { super(message, cause); }
}
