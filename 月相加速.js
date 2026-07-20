(function () {
    'use strict';

    var _percentage = 1.0;
    var _intervalIds = {};
    var _timeoutIds = {};
    var _autoUniqueId = 1;
    var _lastDatetime = Date.now();
    var _lastMDatetime = Date.now();
    var _hooksInstalled = false;
    var _origSetTimeout = window.setTimeout;
    var _origClearTimeout = window.clearTimeout;
    var _origSetInterval = window.setInterval;
    var _origClearInterval = window.clearInterval;
    var _origDate = window.Date;

    function genUniqueId() {
        return _autoUniqueId++;
    }

    function notifyExec(uniqueId) {
        if (!uniqueId) return;
        var keys = Object.keys(_timeoutIds);
        for (var i = 0; i < keys.length; i++) {
            var info = _timeoutIds[keys[i]];
            if (info.uniqueId === uniqueId) {
                _origClearTimeout.call(window, info.nowId);
                delete _timeoutIds[info.originId];
            }
        }
    }

    function hookedSetTimeout() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];
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
        var resultId = _origSetTimeout.apply(window, arguments);
        _timeoutIds[resultId] = {
            args: arguments, originMS: originMS, originId: resultId,
            nowId: resultId, uniqueId: uniqueId, oldPercentage: _percentage,
            exceptNextFireTime: Date.now() + (originMS || 0)
        };
        return resultId;
    }

    function hookedSetInterval() {
        var uniqueId = genUniqueId();
        var callback = arguments[0];
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
        var resultId = _origSetInterval.apply(window, arguments);
        _intervalIds[resultId] = {
            args: arguments, originMS: originMS, originId: resultId,
            nowId: resultId, uniqueId: uniqueId, oldPercentage: _percentage,
            exceptNextFireTime: Date.now() + (originMS || 0)
        };
        return resultId;
    }

    function hookedClearTimeout() {
        var id = arguments[0];
        if (_timeoutIds[id]) {
            arguments[0] = _timeoutIds[id].nowId;
            delete _timeoutIds[id];
        }
        return _origClearTimeout.apply(window, arguments);
    }

    function hookedClearInterval() {
        var id = arguments[0];
        if (_intervalIds[id]) {
            arguments[0] = _intervalIds[id].nowId;
            delete _intervalIds[id];
        }
        return _origClearInterval.apply(window, arguments);
    }

    function percentageChangeHandler(newPercentage) {
        var intKeys = Object.keys(_intervalIds);
        for (var i = 0; i < intKeys.length; i++) {
            var idObj = _intervalIds[intKeys[i]];
            idObj.args[1] = Math.floor((idObj.originMS || 1) * newPercentage);
            _origClearInterval.call(window, idObj.nowId);
            idObj.nowId = _origSetInterval.apply(window, idObj.args);
        }
        var toutKeys = Object.keys(_timeoutIds);
        for (var j = 0; j < toutKeys.length; j++) {
            var idObj2 = _timeoutIds[toutKeys[j]];
            var now = Date.now();
            var exceptTime = idObj2.exceptNextFireTime;
            var oldPercentage = idObj2.oldPercentage;
            var time = exceptTime - now;
            if (time < 0) time = 0;
            var changedTime = Math.floor(newPercentage / oldPercentage * time);
            idObj2.args[1] = changedTime;
            idObj2.exceptNextFireTime = now + changedTime;
            idObj2.oldPercentage = newPercentage;
            _origClearTimeout.call(window, idObj2.nowId);
            idObj2.nowId = _origSetTimeout.apply(window, idObj2.args);
        }
    }

    function installHooks() {
        if (_hooksInstalled) return;
        _hooksInstalled = true;
        window.setTimeout = hookedSetTimeout;
        window.setInterval = hookedSetInterval;
        window.clearTimeout = hookedClearTimeout;
        window.clearInterval = hookedClearInterval;
    }

    function removeHooks() {
        if (!_hooksInstalled) return;
        _hooksInstalled = false;
        window.setTimeout = _origSetTimeout;
        window.setInterval = _origSetInterval;
        window.clearTimeout = _origClearTimeout;
        window.clearInterval = _origClearInterval;
        _intervalIds = {};
        _timeoutIds = {};
    }

    function _applySpeed(speed) {
        if (speed === 1) {
            _percentage = 1.0;
            removeHooks();
            return;
        }
        installHooks();
        var newPercentage = 1 / speed;
        _lastMDatetime = Date.now();
        _lastDatetime = Date.now();
        percentageChangeHandler(newPercentage);
        _percentage = newPercentage;
    }

    window.$hookTimer = {
        setSpeed: function (speed) {
            if (typeof speed !== 'number' || speed <= 0) return;
            _applySpeed(speed);
        },
        getSpeed: function () { return 1 / _percentage; },
        getPercentage: function () { return _percentage; }
    };

    // ===================== UI（参考悬浮球水波纹动画和呼吸效果.txt，不阻塞页面）====================
    var _jsq_value = 1;
    var _isPersistent = false;
    var MOON = '\\01F319';

    var _cssText = [
        '.moon-open-button{position:fixed;top:25px;left:15px;z-index:2147483647;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#1e3c72,#2a5298);border:2px solid rgba(255,255,255,0.25);box-shadow:0 4px 14px rgba(30,60,114,0.6),inset 0 0 10px rgba(0,0,0,0.2);cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:center;overflow:visible;touch-action:none;transform:translateZ(0);will-change:transform,box-shadow;background;animation:moonBreath 3s infinite}',
        '.moon-open-button::before{content:"' + MOON + '";font-size:32px;position:absolute;z-index:1;opacity:0.9;transform:translateY(-1px)}',
        '.moon-open-button span{font-size:20px;font-weight:900;color:#fff;position:absolute;z-index:2;text-shadow:0 2px 4px rgba(0,0,0,0.5);margin-top:4px}',
        '.moon-open-button::after{content:"";position:absolute;width:70px;height:70px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);top:-6px;left:-6px;pointer-events:none}',
        '@keyframes moonBreath{0%,100%{box-shadow:0 4px 14px rgba(30,60,114,0.6)}50%{box-shadow:0 4px 28px rgba(30,60,114,1)}}',
        '.moon-open-button:active{transform:scale(0.88) translateZ(0);box-shadow:0 2px 8px rgba(0,0,0,0.3)}',
        '.moon-view{display:none;position:fixed;top:95px;left:15px;z-index:2147483647;width:280px;max-height:80vh;overflow-y:auto;background:linear-gradient(180deg,#0f0c29,#302b63,#24243e);border-radius:16px;border:1px solid rgba(255,255,255,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.5);user-select:none;transition:opacity 0.2s,transform 0.2s;opacity:0;transform:translateY(10px);transform:translateZ(0)}',
        '.moon-view .moon-title{width:100%;height:48px;background:linear-gradient(90deg,#1e3c72,#2a5298);color:#fff;font-size:16px;font-weight:800;line-height:48px;text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.1);position:sticky;top:0;z-index:10}',
        '.moon-view .moon-title::before{content:"' + MOON + '";position:absolute;left:12px;font-size:18px;opacity:0.8}',
        '.moon-view .current-value{font-size:13px;color:#a8b2d1;margin:12px;padding:8px 0;text-align:center;font-weight:500;background:rgba(0,0,0,0.2);border-radius:8px}',
        '.moon-view .current-value span{display:block;color:#fff;font-weight:900;font-size:36px;margin-top:4px;text-shadow:0 0 15px rgba(168,178,209,0.6);font-family:"Courier New",monospace}',
        '.moon-view .js-note{font-size:11px;color:#707080;text-align:center;margin:0 12px 8px;line-height:1.4}',
        '.moon-view .speed-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;margin:0 auto}',
        '.moon-view .speed-btn{height:36px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#d0d8ff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0 2px;user-select:none;transition:none}',
        '.moon-view .speed-btn:active{background:rgba(168,178,209,0.2);border-color:rgba(168,178,209,0.4);transform:scale(0.96)}',
        '.moon-view .reset-btn{margin:4px 12px 12px;height:40px;background:linear-gradient(90deg,#2193b0,#6dd5ed);border:none;color:#fff;font-size:14px;font-weight:800;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;letter-spacing:0.5px;box-shadow:0 3px 10px rgba(33,147,176,0.4);user-select:none}',
        '.moon-view .reset-btn:active{filter:brightness(0.85);transform:scale(0.98)}',
        '.moon-view .close-btn{margin:0 12px 14px;height:42px;background:linear-gradient(90deg,#ff6b6b,#c44569);border:none;color:#fff;font-size:14px;font-weight:800;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;letter-spacing:0.5px;box-shadow:0 3px 10px rgba(196,69,105,0.4);user-select:none}',
        '.moon-view .close-btn:active{filter:brightness(0.85);transform:scale(0.98)}',
        '.moon-view .persist-toggle{display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 12px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;font-size:11px;color:#a8b2d1}',
        '.moon-view .persist-toggle input[type=checkbox]{width:16px;height:16px;accent-color:#667eea}',
        '.moon-status-indicator{position:fixed;top:90px;left:15px;z-index:2147483646;background:rgba(30,60,114,0.9);color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:bold;display:none;border:1px solid rgba(255,255,255,0.2);pointer-events:none}',
        '.moon-error-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(220,53,69,0.95);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:bold;z-index:2147483647;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-align:center;max-width:80%}'
    ];

    var _styleNode = document.createElement('style');
    _styleNode.textContent = _cssText.join('');

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
        var sv = _speedValues[_i];
        var sl = sv < 1 ? sv.toFixed(1) : sv;
        _gridHtml += '<button class="speed-btn" data-speed="' + sv + '">' + sl + 'x</button>';
    }

    var _panel = document.createElement('div');
    _panel.className = 'moon-view';
    _panel.id = 'moonPanel';
    _panel.innerHTML = [
        '<div class="moon-title">浅蓝色的月</div>',
        '<div class="current-value">当前月相速度<span id="moonValue">1.0x</span></div>',
        '<div class="js-note">点击调整时间流逝（0.1x - 200x）</div>',
        '<div class="speed-grid">', _gridHtml, '</div>',
        '<div class="persist-toggle"><label><input type="checkbox" id="moonPersist">下次启动时保持此速度</label></div>',
        '<div class="reset-btn" id="moonResetBtn">重置为 1x</div>',
        '<div class="close-btn" id="moonCloseBtn">X 关闭</div>'
    ].join('');

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

        function _openPanel() {
            _panel.style.display = 'block';
            requestAnimationFrame(function () {
                _panel.style.opacity = '1';
                _panel.style.transform = 'translateY(0)';
            });
        }

        function _closePanel() {
            _panel.style.opacity = '0';
            _panel.style.transform = 'translateY(10px)';
            setTimeout(function () { _panel.style.display = 'none'; }, 200);
        }

        function _showStatus(speed) {
            _statusIndicator.textContent = speed !== 1 ? '加速已启用: ' + speed + 'x' : '速度已重置';
            _statusIndicator.style.display = 'block';
            setTimeout(function () { _statusIndicator.style.display = 'none'; }, speed !== 1 ? 2000 : 1000);
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
                _applySpeed(v);
                _showStatus(v);
            } catch (error) {
                _showError('加速失败: ' + error.message);
            }

            if (_isPersistent) {
                try { localStorage.setItem('gameSpeed', v); } catch (e) { }
            }
        }

        function _togglePersist() {
            _isPersistent = _moonPersist.checked;
            try {
                if (_isPersistent) {
                    localStorage.setItem('gameSpeed', _jsq_value);
                    localStorage.setItem('speedPersistent', 'true');
                } else {
                    localStorage.removeItem('gameSpeed');
                    localStorage.removeItem('speedPersistent');
                }
            } catch (e) { }
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
                    if (e.ctrlKey) _setSpeedUI(Math.min(200, currentSpeed + 2));
                    else if (e.altKey) _setSpeedUI(Math.min(200, currentSpeed * 2));
                    break;
                case 189:
                case 188:
                    if (e.ctrlKey) _setSpeedUI(Math.max(0.1, currentSpeed - 2));
                    else if (e.altKey) _setSpeedUI(Math.max(0.1, currentSpeed / 2));
                    break;
                case 48:
                    if (e.ctrlKey || e.altKey) _setSpeedUI(1);
                    break;
            }
        });
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        _mountUI();
    } else {
        document.addEventListener('readystatechange', function () {
            if ((document.readyState === 'interactive' || document.readyState === 'complete') && !window.__moonRendered) {
                _mountUI();
            }
        });
    }
})();
