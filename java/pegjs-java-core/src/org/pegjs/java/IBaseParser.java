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

import java.nio.ByteBuffer;
import org.pegjs.java.exceptions.SyntaxError;

/**
 * Интерфейс парсера, позволяющий разбирать входную последовательность заранее определенным
 * правилом разбора.
 *
 * @author Mingun
 * @param <R> Тип результата разбора.
 */
public interface IBaseParser<R> {
    /** Специальный singleton-объект, сигнализирующий о неуспешности разбора правила. */
    public final Object FAILED = new Object() {
        @Override
        public String toString() {
            return "<FAILED>";
        }
    };

    /**
     * Пытается разобрать указанную входную последовательность по правилам грамматики
     * парсера. В случае успеха возвращает результат правила, при неуспехе выкидывает
     * исключение {@linkplain SyntaxError}, содержащее подробную информацию о ожидаемых
     * данных и фактическом символе.
     * <p>
     * При разборе парсер стремится поглотить максимум данных, поэтому ошибка будет
     * сообщена в самой дальней позиции, до которой сумел дойти парсер.
     * 
     * @param input Разбираемая последовательность. Для успешного разбора она должна
     *        полностью соответствовать грамматике, т.е. если после отработки парсера
     *        остались неразобранные данные, разбор считается неудачным.
     * @return Результат разбора стартового правила грамматики.
     * @throws SyntaxError Кидается в случае, если разбираемая последовательность не 
     *         соответствует грамматике парсера. Содержит информацию об ожидаемых элементах
     *         и фактически обнаруженном символе.
     */
    public R parse(CharSequence input) throws SyntaxError;
    /**
     * Пытается разобрать указанную входную последовательность по правилам грамматики
     * парсера. В случае успеха возвращает результат правила, при неуспехе выкидывает
     * исключение {@linkplain SyntaxError}, содержащее подробную информацию о ожидаемых
     * данных и фактическом символе.
     * <p>
     * При разборе парсер стремится поглотить максимум данных, поэтому ошибка будет
     * сообщена в самой дальней позиции, до которой сумел дойти парсер.
     * 
     * @param input Разбираемая последовательность. Для успешного разбора она должна
     *        полностью соответствовать грамматике, т.е. если после отработки парсера
     *        остались неразобранные данные, разбор считается неудачным.
     * @return Результат разбора стартового правила грамматики.
     * @throws SyntaxError Кидается в случае, если разбираемая последовательность не 
     *         соответствует грамматике парсера. Содержит информацию об ожидаемых элементах
     *         и фактически обнаруженном символе.
     */
    public R parse(ByteBuffer input) throws SyntaxError;
    /**
     * Пытается разобрать указанную входную последовательность по правилам грамматики
     * парсера. В случае успеха возвращает результат правила, при неуспехе выкидывает
     * исключение {@linkplain SyntaxError}, содержащее подробную информацию о ожидаемых
     * данных и фактическом символе.
     * <p>
     * При разборе парсер стремится поглотить максимум данных, поэтому ошибка будет
     * сообщена в самой дальней позиции, до которой сумел дойти парсер.
     * 
     * @param input Разбираемая последовательность. Для успешного разбора она должна
     *        полностью соответствовать грамматике, т.е. если после отработки парсера
     *        остались неразобранные данные, разбор считается неудачным.
     * @return Результат разбора стартового правила грамматики.
     * @throws SyntaxError Кидается в случае, если разбираемая последовательность не 
     *         соответствует грамматике парсера. Содержит информацию об ожидаемых элементах
     *         и фактически обнаруженном символе.
     */
    public R parse(byte[] input) throws SyntaxError;
}
