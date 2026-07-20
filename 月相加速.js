/**
 * 月相加速器 - 独立JS版本
 * 参考 50pk.js 的 Timer Hook 核心逻辑，剥离 webpack/eHook 依赖
 *
 * 原理：
 *   - 劫持 setTimeout/setInterval，将延迟乘以 _percentage (=1/speed)
 *   - 劫持 Date 构造函数和 Date.now()，缩放时间流逝
 *   - 劫持 clearTimeout/clearInterval，重定向到实际 timer ID
 *   - 速率改变时，重建所有已有定时器
 *   - 同步调整 video 元素播放速率
 *
 * 暴露接口：window.$hookTimer.setSpeed(speed)
 *   speed=2 表示 2倍速（时间流逝加快2倍）
 */

(function () {
    'use strict';

    // ===================== 保存原始方法 =====================
    var _setTimeout = window.setTimeout;
    var _clearTimeout = window.clearTimeout;
    var _setInterval = window.setInterval;
    var _clearInterval = window.clearInterval;
    var _Date = window.Date;

    // ===================== 内部状态 =====================
    var _percentage = 1.0;          // _percentage = 1/speed，speed=2 则 _percentage=0.5
    var _intervalIds = {};          // 存储被劫持的 setInterval 的信息
    var _timeoutIds = {};           // 存储被劫持的 setTimeout 的信息
    var _autoUniqueId = 1;          // 唯一ID生成器
    var _lastDatetime = _Date.now();    // 上次速率变化时的真实时间戳
    var _lastMDatetime = _Date.now();   // 上次速率变化时的模拟时间戳

    function genUniqueId() {
        return _autoUniqueId++;
    }

    // ===================== notifyExec: setTimeout执行后清除记录 =====================
    function notifyExec(uniqueId) {
        if (!uniqueId) return;
        var keys = Object.keys(_timeoutIds);
        for (var i = 0; i < keys.length; i++) {
            var info = _timeoutIds[keys[i]];
            if (info.uniqueId === uniqueId) {
                _clearTimeout.call(window, info.nowId);
                delete _timeoutIds[info.originId];
            }
        }
    }

    // ===================== 劫持 setTimeout =====================
    function hookedSetTimeout() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];

        // 包装回调，使其执行后通知
        if (typeof callback === 'string') {
            callback += ';__hookTimerNotifyExec(' + uniqueId + ')';
            arguments[0] = callback;
        }
        if (typeof callback === 'function') {
            var _cb = callback;
            arguments[0] = function () {
                var ret = _cb.apply(this, arguments);
                notifyExec(uniqueId);
                return ret;
            };
        }

        // 保存原始延迟，计算变速延迟
        var originMS = arguments[1];
        arguments[1] = (originMS || 0) * _percentage;

        var resultId = _setTimeout.apply(window, arguments);

        _timeoutIds[resultId] = {
            args: arguments,
            originMS: originMS,
            originId: resultId,
            nowId: resultId,
            uniqueId: uniqueId,
            oldPercentage: _percentage,
            exceptNextFireTime: _Date.now() + (originMS || 0)
        };

        return resultId;
    }

    // ===================== 劫持 setInterval =====================
    function hookedSetInterval() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];

        if (typeof callback === 'string') {
            callback += ';__hookTimerNotifyExec(' + uniqueId + ')';
            arguments[0] = callback;
        }
        if (typeof callback === 'function') {
            var _cb = callback;
            arguments[0] = function () {
                var ret = _cb.apply(this, arguments);
                notifyExec(uniqueId);
                return ret;
            };
        }

        var originMS = arguments[1];
        arguments[1] = (originMS || 0) * _percentage;

        var resultId = _setInterval.apply(window, arguments);

        _intervalIds[resultId] = {
            args: arguments,
            originMS: originMS,
            originId: resultId,
            nowId: resultId,
            uniqueId: uniqueId,
            oldPercentage: _percentage,
            exceptNextFireTime: _Date.now() + (originMS || 0)
        };

        return resultId;
    }

    // ===================== 劫持 clearTimeout / clearInterval =====================
    function hookedClearTimeout() {
        var id = arguments[0];
        if (_timeoutIds[id]) {
            arguments[0] = _timeoutIds[id].nowId;
            delete _timeoutIds[id];
        }
        return _clearTimeout.apply(window, arguments);
    }

    function hookedClearInterval() {
        var id = arguments[0];
        if (_intervalIds[id]) {
            arguments[0] = _intervalIds[id].nowId;
            delete _intervalIds[id];
        }
        return _clearInterval.apply(window, arguments);
    }

    // ===================== 劫持 Date 构造函数 =====================
    function HookedDate() {
        // 单参数：时间戳
        if (arguments.length === 1) {
            Object.defineProperty(this, '_innerDate', {
                configurable: false, enumerable: false, writable: false,
                value: new _Date(arguments[0])
            });
            return;
        }
        // 多参数：年月日时分秒毫秒
        if (arguments.length > 1) {
            Object.defineProperty(this, '_innerDate', {
                configurable: false, enumerable: false, writable: false,
                value: new _Date(arguments[0], arguments[1], arguments[2] || 1, arguments[3] || 0, arguments[4] || 0, arguments[5] || 0, arguments[6] || 0)
            });
            return;
        }
        // 无参数：返回缩放后的时间
        var now = _Date.now();
        var passTime = now - _lastDatetime;
        var hookPassTime = passTime * (1 / _percentage);
        Object.defineProperty(this, '_innerDate', {
            configurable: false, enumerable: false, writable: false,
            value: new _Date(_lastMDatetime + hookPassTime)
        });
    }

    // 继承 Date 原型方法
    HookedDate.prototype = Object.create(_Date.prototype);
    HookedDate.prototype.constructor = HookedDate;

    // 代理所有 Date 实例方法
    var dateMethods = ['getTime', 'getFullYear', 'getMonth', 'getDate', 'getDay',
        'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
        'getUTCFullYear', 'getUTCMonth', 'getUTCDate', 'getUTCDay',
        'getUTCHours', 'getUTCMinutes', 'getUTCSeconds', 'getUTCMilliseconds',
        'setTime', 'setFullYear', 'setMonth', 'setDate',
        'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds',
        'setUTCFullYear', 'setUTCMonth', 'setUTCDate',
        'setUTCHours', 'setUTCMinutes', 'setUTCSeconds', 'setUTCMilliseconds',
        'toISOString', 'toJSON', 'toString', 'toLocaleString',
        'toLocaleDateString', 'toLocaleTimeString', 'valueOf'];

    dateMethods.forEach(function (method) {
        if (_Date.prototype[method]) {
            HookedDate.prototype[method] = function () {
                return this._innerDate[method].apply(this._innerDate, arguments);
            };
        }
    });

    // Date.now() 静态方法
    HookedDate.now = function () {
        return new HookedDate().getTime();
    };

    // Date.parse 静态方法
    HookedDate.parse = _Date.parse;

    // Date.UTC 静态方法
    HookedDate.UTC = _Date.UTC;

    // ===================== 速率变更处理 =====================
    function percentageChangeHandler(newPercentage) {
        // 重建所有 setInterval
        var intKeys = Object.keys(_intervalIds);
        for (var i = 0; i < intKeys.length; i++) {
            var idObj = _intervalIds[intKeys[i]];
            idObj.args[1] = Math.floor((idObj.originMS || 1) * newPercentage);
            _clearInterval.call(window, idObj.nowId);
            idObj.nowId = _setInterval.apply(window, idObj.args);
        }

        // 重建所有 setTimeout
        var toutKeys = Object.keys(_timeoutIds);
        for (var j = 0; j < toutKeys.length; j++) {
            var idObj2 = _timeoutIds[toutKeys[j]];
            var now = _Date.now();
            var exceptTime = idObj2.exceptNextFireTime;
            var oldPercentage = idObj2.oldPercentage;
            var time = exceptTime - now;
            if (time < 0) time = 0;
            var changedTime = Math.floor(newPercentage / oldPercentage * time);
            idObj2.args[1] = changedTime;
            idObj2.exceptNextFireTime = now + changedTime;
            idObj2.oldPercentage = newPercentage;
            _clearTimeout.call(window, idObj2.nowId);
            idObj2.nowId = _setTimeout.apply(window, idObj2.args);
        }
    }

    // ===================== 视频速率调整 =====================
    function changeVideoSpeed(speed) {
        var rate = speed;
        if (rate > 16) rate = 16;
        if (rate < 0.065) rate = 0.065;

        var videos = document.querySelectorAll('video') || [];
        for (var i = 0; i < videos.length; i++) {
            try {
                delete videos[i].playbackRate;
                videos[i].playbackRate = rate;
                // 阻止外部重设 playbackRate
                if (rate !== 1) {
                    Object.defineProperty(videos[i], 'playbackRate', {
                        configurable: true,
                        get: function () { return 1; },
                        set: function () { }
                    });
                }
            } catch (e) { }
        }
    }

    // ===================== iframe 速率同步 =====================
    function sendChangesToIframe(percentage) {
        var iframes = document.querySelectorAll('iframe') || [];
        var frames = document.querySelectorAll('frame') || [];
        for (var i = 0; i < iframes.length; i++) {
            try {
                iframes[i].contentWindow.postMessage(
                    { type: 'changePercentage', percentage: percentage }, '*');
            } catch (e) { }
        }
        for (var j = 0; j < frames.length; j++) {
            try {
                frames[j].contentWindow.postMessage(
                    { type: 'changePercentage', percentage: percentage }, '*');
            } catch (e) { }
        }
    }

    // ===================== Object.prototype.toString 修复 =====================
    var _origToString = Object.prototype.toString;
    Object.prototype.toString = function toString() {
        'use strict';
        if (this instanceof HookedDate) {
            return '[object Date]';
        }
        return _origToString.call(this);
    };

    // ===================== 全局 notifyExec 暴露（供字符串回调使用）=====================
    window.__hookTimerNotifyExec = notifyExec;

    // ===================== 安装劫持 =====================
    window.setTimeout = hookedSetTimeout;
    window.setInterval = hookedSetInterval;
    window.clearTimeout = hookedClearTimeout;
    window.clearInterval = hookedClearInterval;
    window.Date = HookedDate;

    // ===================== 暴露 $hookTimer 接口 =====================
    window.$hookTimer = {
        /**
         * 设置加速倍率
         * @param {number} speed - 显示倍率，如 2 表示2倍速
         */
        setSpeed: function (speed) {
            if (typeof speed !== 'number' || speed <= 0) {
                console.error('[月相加速] 无效的速率:', speed);
                return;
            }

            var newPercentage = 1 / speed;

            // 更新时间基准
            _lastMDatetime = new HookedDate().getTime();
            _lastDatetime = _Date.now();

            // 触发速率变更回调
            percentageChangeHandler(newPercentage);
            _percentage = newPercentage;

            // 调整视频速率
            changeVideoSpeed(speed);

            // 同步 iframe
            sendChangesToIframe(newPercentage);

            console.log('[月相加速] 速率已设为', speed + 'x', '(percentage=' + newPercentage + ')');
        },

        /**
         * 获取当前速率
         */
        getSpeed: function () {
            return 1 / _percentage;
        },

        /**
         * 获取当前 percentage
         */
        getPercentage: function () {
            return _percentage;
        }
    };

    // ===================== 监听 iframe 消息（子窗口）=====================
    window.addEventListener('message', function (e) {
        var data = e.data;
        if (data && data.type === 'changePercentage') {
            var percentage = data.percentage || 0;
            if (percentage > 0) {
                _lastMDatetime = new HookedDate().getTime();
                _lastDatetime = _Date.now();
                percentageChangeHandler(percentage);
                _percentage = percentage;
                changeVideoSpeed(1 / percentage);
            }
        }
    });

    // ===================== 键盘快捷键（从 d3j4a5s8d3 移植）=====================
    window.addEventListener('keydown', function (e) {
        var currentSpeed = 1 / _percentage;
        switch (e.keyCode) {
            case 57: // 9
                if (e.ctrlKey || e.altKey) {
                    var t = prompt('输入欲改变的倍率（当前：' + currentSpeed.toFixed(2) + '）');
                    if (t == null) return;
                    if (isNaN(parseFloat(t))) { alert('请输入正确的数字'); return; }
                    if (parseFloat(t) <= 0) { alert('倍率不能小于等于0'); return; }
                    $hookTimer.setSpeed(parseFloat(t));
                }
                break;
            case 187: // =
            case 190: // .
                if (e.ctrlKey) {
                    var newSpeed = Math.min(200, currentSpeed + 2);
                    $hookTimer.setSpeed(newSpeed);
                } else if (e.altKey) {
                    $hookTimer.setSpeed(Math.min(200, currentSpeed * 2));
                }
                break;
            case 189: // -
            case 188: // ,
                if (e.ctrlKey) {
                    $hookTimer.setSpeed(Math.max(0.1, currentSpeed - 2));
                } else if (e.altKey) {
                    $hookTimer.setSpeed(Math.max(0.1, currentSpeed / 2));
                }
                break;
            case 48: // 0
                if (e.ctrlKey || e.altKey) {
                    $hookTimer.setSpeed(1);
                }
                break;
        }
    });

    console.log('[月相加速] Timer Hook 已安装, $hookTimer.setSpeed(speed) 可用');
    console.log('[月相加速] 快捷键: Ctrl+=加速 Ctrl+-减速 Ctrl+0重置 Ctrl+9自定义');

})();
