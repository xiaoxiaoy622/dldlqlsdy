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
        if (arguments.length === 1) {
            Object.defineProperty(this, '_innerDate', {
                configurable: false, enumerable: false, writable: false,
                value: new _Date(arguments[0])
            });
            return;
        }
        if (arguments.length > 1) {
            Object.defineProperty(this, '_innerDate', {
                configurable: false, enumerable: false, writable: false,
                value: new _Date(arguments[0], arguments[1], arguments[2] || 1, arguments[3] || 0, arguments[4] || 0, arguments[5] || 0, arguments[6] || 0)
            });
            return;
        }
        var now = _Date.now();
        var passTime = now - _lastDatetime;
        var hookPassTime = passTime * (1 / _percentage);
        Object.defineProperty(this, '_innerDate', {
            configurable: false, enumerable: false, writable: false,
            value: new _Date(_lastMDatetime + hookPassTime)
        });
    }

    HookedDate.prototype = Object.create(_Date.prototype);
    HookedDate.prototype.constructor = HookedDate;

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

    HookedDate.now = function () {
        return new HookedDate().getTime();
    };

    HookedDate.parse = _Date.parse;
    HookedDate.UTC = _Date.UTC;

    // ===================== 速率变更处理 =====================
    function percentageChangeHandler(newPercentage) {
        var intKeys = Object.keys(_intervalIds);
        for (var i = 0; i < intKeys.length; i++) {
            var idObj = _intervalIds[intKeys[i]];
            idObj.args[1] = Math.floor((idObj.originMS || 1) * newPercentage);
            _clearInterval.call(window, idObj.nowId);
            idObj.nowId = _setInterval.apply(window, idObj.args);
        }

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

    // ===================== 全局 notifyExec 暴露 =====================
    window.__hookTimerNotifyExec = notifyExec;

    // ===================== 安装劫持 =====================
    window.setTimeout = hookedSetTimeout;
    window.setInterval = hookedSetInterval;
    window.clearTimeout = hookedClearTimeout;
    window.clearInterval = hookedClearInterval;
    window.Date = HookedDate;

    // ===================== 暴露 $hookTimer 接口 =====================
    window.$hookTimer = {
        setSpeed: function (speed) {
            if (typeof speed !== 'number' || speed <= 0) {
                console.error('[月相加速] 无效的速率:', speed);
                return;
            }

            var newPercentage = 1 / speed;

            _lastMDatetime = new HookedDate().getTime();
            _lastDatetime = _Date.now();

            percentageChangeHandler(newPercentage);
            _percentage = newPercentage;

            changeVideoSpeed(speed);
            sendChangesToIframe(newPercentage);

            console.log('[月相加速] 速率已设为', speed + 'x', '(percentage=' + newPercentage + ')');
        },

        getSpeed: function () {
            return 1 / _percentage;
        },

        getPercentage: function () {
            return _percentage;
        }
    };

    // ===================== 监听 iframe 消息 =====================
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

    console.log('[月相加速] Timer Hook 已安装, $hookTimer.setSpeed(speed) 可用');

    // ===================== UI（参考 月相.html，对齐 d3j4a5s8d3.js 的 readystatechange 机制）=====================
    var _jsq_value = 1;
    var _isPersistent = false;

    var _style = document.createElement('style');
    _style.textContent = '\
        .moon-open-button {\
            position: fixed; top: 25px; left: 15px; z-index: 2147483647;\
            width: 60px; height: 60px; border-radius: 50%;\
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);\
            border: 2px solid rgba(255,255,255,0.25);\
            box-shadow: 0 4px 14px rgba(30,60,114,0.6), inset 0 0 10px rgba(0,0,0,0.2);\
            cursor: pointer; user-select: none;\
            display: flex; align-items: center; justify-content: center;\
            overflow: visible; touch-action: none;\
        }\
        .moon-open-button::before {\
            content: "\uD83C\uDF19"; font-size: 32px; position: absolute; z-index: 1;\
            opacity: 0.9; transform: translateY(-1px);\
        }\
        .moon-open-button span {\
            font-size: 20px; font-weight: 900; color: #fff; position: absolute;\
            z-index: 2; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-top: 4px;\
        }\
        .moon-open-button::after {\
            content: ""; position: absolute; width: 70px; height: 70px;\
            border-radius: 50%; border: 1px solid rgba(255,255,255,0.15);\
            top: -6px; left: -6px; pointer-events: none;\
        }\
        .moon-view {\
            display: none; position: fixed; top: 95px; left: 15px; z-index: 2147483647;\
            width: 280px; max-height: 80vh; overflow-y: auto;\
            background: linear-gradient(180deg, #0f0c29 0%, #302b63 50%, #24243e 100%);\
            border-radius: 16px; border: 1px solid rgba(255,255,255,0.15);\
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;\
            box-shadow: 0 8px 24px rgba(0,0,0,0.5); user-select: none;\
        }\
        .moon-view .moon-title {\
            width: 100%; height: 48px;\
            background: linear-gradient(90deg, #1e3c72, #2a5298);\
            color: #fff; font-size: 16px; font-weight: 800;\
            line-height: 48px; text-align: center; letter-spacing: 1px;\
            border-bottom: 1px solid rgba(255,255,255,0.1);\
            position: sticky; top: 0; z-index: 10;\
        }\
        .moon-view .moon-title::before {\
            content: "\uD83C\uDF19"; position: absolute; left: 12px; font-size: 18px; opacity: 0.8;\
        }\
        .moon-view .current-value {\
            font-size: 13px; color: #a8b2d1; margin: 12px; padding: 8px 0;\
            text-align: center; font-weight: 500;\
            background: rgba(0,0,0,0.2); border-radius: 8px;\
        }\
        .moon-view .current-value span {\
            display: block; color: #fff; font-weight: 900; font-size: 36px;\
            margin-top: 4px; text-shadow: 0 0 15px rgba(168,178,209,0.6);\
            font-family: "Courier New", monospace;\
        }\
        .moon-view .js-note {\
            font-size: 11px; color: #707080; text-align: center;\
            margin: 0 12px 8px; line-height: 1.4;\
        }\
        .moon-view .speed-grid {\
            display: grid; grid-template-columns: repeat(4, 1fr);\
            gap: 8px; padding: 12px; margin: 0 auto;\
        }\
        .moon-view .speed-btn {\
            height: 36px; border-radius: 6px;\
            background: rgba(255,255,255,0.06);\
            border: 1px solid rgba(255,255,255,0.12);\
            color: #d0d8ff; font-weight: 700; font-size: 12px;\
            display: flex; align-items: center; justify-content: center;\
            cursor: pointer; padding: 0 2px; user-select: none;\
        }\
        .moon-view .speed-btn:active {\
            background: rgba(168,178,209,0.2);\
            border-color: rgba(168,178,209,0.4); transform: scale(0.96);\
        }\
        .moon-view .reset-btn {\
            margin: 4px 12px 12px; height: 40px;\
            background: linear-gradient(90deg, #2193b0, #6dd5ed);\
            border: none; color: #fff; font-size: 14px; font-weight: 800;\
            border-radius: 8px; display: flex; align-items: center;\
            justify-content: center; cursor: pointer; letter-spacing: 0.5px;\
            box-shadow: 0 3px 10px rgba(33,147,176,0.4); user-select: none;\
        }\
        .moon-view .reset-btn:active {\
            filter: brightness(0.85); transform: scale(0.98);\
        }\
        .moon-view .close-btn {\
            margin: 0 12px 14px; height: 42px;\
            background: linear-gradient(90deg, #ff6b6b, #c44569);\
            border: none; color: #fff; font-size: 14px; font-weight: 800;\
            border-radius: 8px; display: flex; align-items: center;\
            justify-content: center; cursor: pointer; letter-spacing: 0.5px;\
            box-shadow: 0 3px 10px rgba(196,69,105,0.4); user-select: none;\
        }\
        .moon-view .close-btn:active {\
            filter: brightness(0.85); transform: scale(0.98);\
        }\
        .moon-view .persist-toggle {\
            display: flex; align-items: center; justify-content: center;\
            gap: 8px; margin: 8px 12px; padding: 8px;\
            background: rgba(0,0,0,0.2); border-radius: 8px;\
            font-size: 11px; color: #a8b2d1;\
        }\
        .moon-view .persist-toggle input[type=checkbox] {\
            width: 16px; height: 16px; accent-color: #667eea;\
        }\
        .moon-status-indicator {\
            position: fixed; top: 90px; left: 15px; z-index: 2147483646;\
            background: rgba(30,60,114,0.9); color: #fff;\
            padding: 6px 12px; border-radius: 20px; font-size: 11px;\
            font-weight: bold; display: none;\
            border: 1px solid rgba(255,255,255,0.2); pointer-events: none;\
        }\
        .moon-error-toast {\
            position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);\
            background: rgba(220,53,69,0.95); color: #fff;\
            padding: 12px 20px; border-radius: 8px; font-size: 13px;\
            font-weight: bold; z-index: 2147483647; display: none;\
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); text-align: center;\
            max-width: 80%;\
        }';

    // ===================== 创建 DOM 元素（预创建，等待就绪后插入）=====================
    var _styleNode = _style;
    var _ball = document.createElement('div');
    _ball.className = 'moon-open-button';
    _ball.innerHTML = '<span id="moonSpeedDisplay">1</span>';

    var _statusIndicator = document.createElement('div');
    _statusIndicator.className = 'moon-status-indicator';

    var _errorToast = document.createElement('div');
    _errorToast.className = 'moon-error-toast';

    var _speedValues = [0.1, 0.2, 0.5, 0.8, 1, 1.5, 2, 3, 5, 10, 20, 30, 50, 80, 100, 200];
    var _gridHtml = '';
    for (var _i = 0; _i < _speedValues.length; _i++) {
        var v = _speedValues[_i];
        var label = v < 1 ? v.toFixed(1) : v;
        _gridHtml += '<button class="speed-btn" data-speed="' + v + '">' + label + 'x</button>';
    }

    var _panel = document.createElement('div');
    _panel.className = 'moon-view';
    _panel.id = 'moonPanel';
    _panel.innerHTML = '\
        <div class="moon-title">浅蓝色的月</div>\
        <div class="current-value">\
            当前月相速度\
            <span id="moonValue">1.0x</span>\
        </div>\
        <div class="js-note">点击调整时间流逝（0.1x - 200x）</div>\
        <div class="speed-grid">' + _gridHtml + '</div>\
        <div class="persist-toggle">\
            <label>\
                <input type="checkbox" id="moonPersist">\
                下次启动时保持此速度\
            </label>\
        </div>\
        <div class="reset-btn" id="moonResetBtn">↻ 重置为 1x</div>\
        <div class="close-btn" id="moonCloseBtn">✕ 关闭</div>';

    // 对齐 d3j4a5s8d3.js: 在 DOM 就绪后才插入节点（readystatechange 监听）
    function _mountUI() {
        if (window.__moonRendered) return;
        window.__moonRendered = true;
        document.head.appendChild(_styleNode);
        document.body.appendChild(_ball);
        document.body.appendChild(_statusIndicator);
        document.body.appendChild(_errorToast);
        document.body.appendChild(_panel);

        var _moonValue = document.getElementById('moonValue');
        var _moonSpeedDisplay = document.getElementById('moonSpeedDisplay');
        var _moonPersist = document.getElementById('moonPersist');
        var _speedBtns = _panel.querySelectorAll('.speed-btn');

        function _showError(msg) {
            _errorToast.textContent = msg;
            _errorToast.style.display = 'block';
            setTimeout(function () { _errorToast.style.display = 'none'; }, 2000);
        }

        function _openPanel() { _panel.style.display = 'block'; }
        function _closePanel() { _panel.style.display = 'none'; }

        function _showStatus(speed) {
            if (speed !== 1) {
                _statusIndicator.textContent = '加速已启用: ' + speed + 'x';
                _statusIndicator.style.display = 'block';
                setTimeout(function () { _statusIndicator.style.display = 'none'; }, 2000);
            } else {
                _statusIndicator.textContent = '速度已重置';
                _statusIndicator.style.display = 'block';
                setTimeout(function () { _statusIndicator.style.display = 'none'; }, 1000);
            }
        }

        function _setSpeedUI(v) {
            _jsq_value = v;
            var label = v >= 1 ? v : (Math.round(v * 10) / 10);
            _moonValue.textContent = label + 'x';
            _moonSpeedDisplay.textContent = label;

            for (var _j = 0; _j < _speedBtns.length; _j++) {
                var btn = _speedBtns[_j];
                var btnVal = parseFloat(btn.getAttribute('data-speed'));
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.borderColor = 'rgba(255,255,255,0.12)';
                btn.style.color = '#d0d8ff';
                btn.style.boxShadow = 'none';
                if (Math.abs(btnVal - v) < 0.05) {
                    btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    btn.style.borderColor = '#a8b2d1';
                    btn.style.color = '#fff';
                    btn.style.boxShadow = '0 0 12px rgba(168,178,209,0.5)';
                }
            }

            try {
                if (window.$hookTimer && typeof window.$hookTimer.setSpeed === 'function') {
                    window.$hookTimer.setSpeed(v);
                    _showStatus(v);
                } else {
                    if (v !== 1) _showError('未找到 $hookTimer，加速可能无效');
                    _showStatus(v);
                }
            } catch (error) {
                console.error('加速调用失败:', error);
                _showError('加速失败: ' + error.message);
            }

            if (_isPersistent) {
                try { localStorage.setItem('gameSpeed', v); } catch (e) { }
            }
        }

        function _togglePersist() {
            _isPersistent = _moonPersist.checked;
            if (_isPersistent) {
                try {
                    localStorage.setItem('gameSpeed', _jsq_value);
                    localStorage.setItem('speedPersistent', 'true');
                } catch (e) { }
            } else {
                try {
                    localStorage.removeItem('gameSpeed');
                    localStorage.removeItem('speedPersistent');
                } catch (e) { }
            }
        }

        document.getElementById('moonCloseBtn').addEventListener('click', _closePanel);

        for (var _k = 0; _k < _speedBtns.length; _k++) {
            _speedBtns[_k].addEventListener('click', function () {
                _setSpeedUI(parseFloat(this.getAttribute('data-speed')));
            });
        }

        document.getElementById('moonResetBtn').addEventListener('click', function () {
            _setSpeedUI(1);
        });

        _moonPersist.addEventListener('change', _togglePersist);

        document.addEventListener('mousedown', function (e) {
            if (_panel.style.display !== 'none' && !_panel.contains(e.target) && e.target !== _ball) _closePanel();
        });

        // 拖动
        (function (el) {
            var _sx = null, _sy = null, _isDrag = false;

            function _start(e) {
                var t = e.touches ? e.touches[0] : e;
                _sx = t.clientX;
                _sy = t.clientY;
                _isDrag = false;
            }

            function _move(e) {
                if (_sx === null) return;
                var t = e.touches ? e.touches[0] : e;
                var dx = t.clientX - _sx;
                var dy = t.clientY - _sy;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                    _isDrag = true;
                    var cl = parseInt(el.style.left || 15);
                    var ct = parseInt(el.style.top || 25);
                    el.style.left = (cl + dx) + 'px';
                    el.style.top = (ct + dy) + 'px';
                    _sx = t.clientX;
                    _sy = t.clientY;
                    e.preventDefault();
                }
            }

            function _end(e) {
                if (_isDrag) { e.preventDefault(); e.stopPropagation(); }
                _sx = null;
                _isDrag = false;
            }

            el.addEventListener('touchstart', _start, { passive: false });
            el.addEventListener('touchmove', _move, { passive: false });
            el.addEventListener('touchend', _end, { passive: false });
            el.addEventListener('mousedown', _start);
            document.addEventListener('mousemove', _move);
            document.addEventListener('mouseup', _end);
            el.addEventListener('mouseleave', _end);

            el.addEventListener('click', function (e) {
                if (_isDrag) { e.stopPropagation(); return; }
                if (_panel.style.display === 'none' || _panel.style.display === '') _openPanel();
                else _closePanel();
            }, false);
        })(_ball);

        // 恢复持久化速度
        try {
            var _persistent = localStorage.getItem('speedPersistent');
            var _saved = localStorage.getItem('gameSpeed');
            if (_persistent === 'true' && _saved) {
                var _spd = parseFloat(_saved);
                if (!isNaN(_spd) && _spd !== 1) {
                    _moonPersist.checked = true;
                    _isPersistent = true;
                    setTimeout(function () { _setSpeedUI(_spd); }, 800);
                }
            }
        } catch (e) { }

        // 键盘快捷键（从 d3j4a5s8d3 移植）
        window.addEventListener('keydown', function (e) {
            var currentSpeed = 1 / _percentage;
            switch (e.keyCode) {
                case 57:
                    if (e.ctrlKey || e.altKey) {
                        var t = prompt('输入欲改变的倍率（当前：' + currentSpeed.toFixed(2) + '）');
                        if (t == null) return;
                        if (isNaN(parseFloat(t))) { alert('请输入正确的数字'); return; }
                        if (parseFloat(t) <= 0) { alert('倍率不能小于等于0'); return; }
                        _setSpeedUI(parseFloat(t));
                    }
                    break;
                case 187:
                case 190:
                    if (e.ctrlKey) {
                        _setSpeedUI(Math.min(200, currentSpeed + 2));
                    } else if (e.altKey) {
                        _setSpeedUI(Math.min(200, currentSpeed * 2));
                    }
                    break;
                case 189:
                case 188:
                    if (e.ctrlKey) {
                        _setSpeedUI(Math.max(0.1, currentSpeed - 2));
                    } else if (e.altKey) {
                        _setSpeedUI(Math.max(0.1, currentSpeed / 2));
                    }
                    break;
                case 48:
                    if (e.ctrlKey || e.altKey) {
                        _setSpeedUI(1);
                    }
                    break;
            }
        });

        console.log('[月相加速] 快捷键: Ctrl+=加速 Ctrl+-减速 Ctrl+0重置 Ctrl+9自定义');
    }

    // 对齐 d3j4a5s8d3.js: readystatechange 等待 DOM 就绪
    if (document.readyState === "interactive" || document.readyState === "complete") {
        _mountUI();
    } else {
        document.addEventListener('readystatechange', function () {
            if ((document.readyState === "interactive" || document.readyState === "complete") && !window.__moonRendered) {
                _mountUI();
            }
        });
    }

})();
