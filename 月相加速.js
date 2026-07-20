(function () {
    'use strict';

    var _origSetTimeout = window.setTimeout;
    var _origClearTimeout = window.clearTimeout;
    var _origSetInterval = window.setInterval;
    var _origClearInterval = window.clearInterval;
    var _origDate = window.Date;
    var _origDateNow = _origDate.now.bind ? _origDate.now.bind(_origDate) : function () { return _origDate.now(); };
    var _origDateParse = _origDate.parse;
    var _origDateUTC = _origDate.UTC;

    var _percentage = 1.0;
    var _invPercentage = 1.0;
    var _timeoutIds = {};
    var _intervalIds = {};
    var _autoUniqueId = 1;
    var _hooksInstalled = false;

    var _lastRealTime = _origDateNow();
    var _lastVirtualTime = _origDateNow();

    function genUniqueId() { return _autoUniqueId++; }

    function notifyExec(uniqueId) {
        if (!uniqueId) return;
        for (var id in _timeoutIds) {
            var info = _timeoutIds[id];
            if (info.uniqueId === uniqueId) {
                _origClearTimeout.call(window, info.nowId);
                delete _timeoutIds[info.originId];
                break;
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
            exceptNextFireTime: _origDateNow() + (originMS || 0)
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
            exceptNextFireTime: _origDateNow() + (originMS || 0)
        };
        return resultId;
    }

    function hookedClearTimeout() {
        var id = arguments[0];
        if (_timeoutIds[id]) { arguments[0] = _timeoutIds[id].nowId; delete _timeoutIds[id]; }
        return _origClearTimeout.apply(window, arguments);
    }

    function hookedClearInterval() {
        var id = arguments[0];
        if (_intervalIds[id]) { arguments[0] = _intervalIds[id].nowId; delete _intervalIds[id]; }
        return _origClearInterval.apply(window, arguments);
    }

    function percentageChangeHandler(newPercentage) {
        var now = _origDateNow();
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

    function _HookedDate() {
        var n = arguments.length;
        if (n === 0) return new _origDate(Date.now());
        if (n === 1) return new _origDate(arguments[0]);
        if (n === 2) return new _origDate(arguments[0], arguments[1]);
        if (n === 3) return new _origDate(arguments[0], arguments[1], arguments[2]);
        if (n === 4) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3]);
        if (n === 5) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
        if (n === 6) return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
        return new _origDate(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]);
    }

    function _hookedDateNow() {
        var realNow = _origDateNow();
        return _lastVirtualTime + (realNow - _lastRealTime) * _invPercentage;
    }

    function installHooks() {
        if (_hooksInstalled) return;
        _hooksInstalled = true;
        window.setTimeout = hookedSetTimeout;
        window.setInterval = hookedSetInterval;
        window.clearTimeout = hookedClearTimeout;
        window.clearInterval = hookedClearInterval;
        window.Date = _HookedDate;
        _HookedDate.now = _hookedDateNow;
        _HookedDate.parse = _origDateParse;
        _HookedDate.UTC = _origDateUTC;
    }

    function removeHooks() {
        if (!_hooksInstalled) return;
        _hooksInstalled = false;
        window.setTimeout = _origSetTimeout;
        window.setInterval = _origSetInterval;
        window.clearTimeout = _origClearTimeout;
        window.clearInterval = _origClearInterval;
        window.Date = _origDate;
        _intervalIds = {};
        _timeoutIds = {};
    }

    function _applySpeed(speed) {
        if (speed === 1) {
            var realNow = _origDateNow();
            _lastVirtualTime = realNow;
            _lastRealTime = realNow;
            _percentage = 1.0;
            _invPercentage = 1.0;
            removeHooks();
            return;
        }
        installHooks();
        var realNow = _origDateNow();
        _lastVirtualTime = _lastVirtualTime + (realNow - _lastRealTime) * _invPercentage;
        _lastRealTime = realNow;
        var newPercentage = 1 / speed;
        percentageChangeHandler(newPercentage);
        _percentage = newPercentage;
        _invPercentage = speed;
    }

    window.$hookTimer = {
        setSpeed: function (speed) {
            if (typeof speed !== 'number' || speed <= 0) return;
            _applySpeed(speed);
        },
        getSpeed: function () { return 1 / _percentage; },
        getPercentage: function () { return _percentage; }
    };

    // ===================== UI =====================
    var _jsq_value = 1;
    var _isPersistent = false;
    var MOON = '\\01F319';
    var _ballOffX = 0, _ballOffY = 0;

    var _cssText = [
        '.moon-open-button{position:fixed;top:25px;left:15px;z-index:2147483647;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#1e3c72,#2a5298);border:2px solid rgba(255,255,255,0.25);box-shadow:0 4px 14px rgba(30,60,114,0.6),inset 0 0 10px rgba(0,0,0,0.2);cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:center;overflow:visible;touch-action:none;will-change:transform;transform:translateZ(0);animation:moonBreath 3s infinite}',
        '.moon-open-button::before{content:"' + MOON + '";font-size:32px;position:absolute;z-index:1;opacity:0.9;transform:translateY(-1px)}',
        '.moon-open-button span{font-size:20px;font-weight:900;color:#fff;position:absolute;z-index:2;text-shadow:0 2px 4px rgba(0,0,0,0.5);margin-top:4px}',
        '.moon-open-button::after{content:"";position:absolute;width:70px;height:70px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);top:-6px;left:-6px;pointer-events:none}',
        '@keyframes moonBreath{0%,100%{filter:drop-shadow(0 4px 14px rgba(30,60,114,0.6))}50%{filter:drop-shadow(0 4px 28px rgba(30,60,114,1))}}',
        '.moon-open-button:active{transform:scale(0.88) translateZ(0);box-shadow:0 2px 8px rgba(0,0,0,0.3)}',
        '.moon-view{display:none;position:fixed;z-index:2147483647;width:280px;max-width:calc(100vw - 30px);max-height:80vh;overflow-y:auto;background:rgba(15,12,41,0.95);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:16px;border:1px solid rgba(255,255,255,0.15);font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.5);user-select:none;transition:opacity 0.2s,transform 0.2s;opacity:0;transform:translateY(10px) translateZ(0);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.2) transparent}',
        '.moon-view::-webkit-scrollbar{width:4px}',
        '.moon-view::-webkit-scrollbar-track{background:transparent}',
        '.moon-view::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:2px}',
        '.moon-view .moon-title{width:100%;height:48px;background:linear-gradient(90deg,#1e3c72,#2a5298);color:#fff;font-size:16px;font-weight:800;line-height:48px;text-align:center;letter-spacing:1px;border-bottom:1px solid rgba(255,255,255,0.1);position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:center}',
        '.moon-view .moon-title::before{content:"' + MOON + '";margin-right:6px;font-size:18px;opacity:0.8}',
        '.moon-view .moon-close-x{position:absolute;right:12px;height:48px;line-height:48px;font-size:18px;cursor:pointer;opacity:0.6;transition:opacity 0.15s;padding:0 4px}',
        '.moon-view .moon-close-x:hover{opacity:1}',
        '.moon-view .current-value{font-size:13px;color:#a8b2d1;margin:12px;padding:8px 0;text-align:center;font-weight:500;background:rgba(0,0,0,0.2);border-radius:8px}',
        '.moon-view .current-value span{display:block;color:#fff;font-weight:900;font-size:36px;margin-top:4px;text-shadow:0 0 15px rgba(168,178,209,0.6);font-family:"Courier New",monospace}',
        '.moon-view .js-note{font-size:11px;color:#707080;text-align:center;margin:0 12px 8px;line-height:1.4}',
        '.moon-view .speed-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;margin:0 auto}',
        '.moon-view .speed-separator{grid-column:1/-1;height:1px;background:rgba(255,255,255,0.08);margin:2px 0}',
        '.moon-view .speed-btn{height:36px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#d0d8ff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0 2px;user-select:none;transition:background 0.15s,border-color 0.15s,color 0.15s,box-shadow 0.15s;outline:none}',
        '.moon-view .speed-btn:hover{background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25)}',
        '.moon-view .speed-btn:focus-visible{box-shadow:0 0 0 2px #667eea}',
        '.moon-view .speed-btn:active{background:rgba(168,178,209,0.2);border-color:rgba(168,178,209,0.4);transform:scale(0.96)}',
        '.moon-view .speed-btn.active{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-color:#a8b2d1;color:#fff;box-shadow:0 0 12px rgba(168,178,209,0.5)}',
        '.moon-view .reset-btn{margin:4px 12px 12px;height:40px;background:linear-gradient(90deg,#2193b0,#6dd5ed);border:none;color:#fff;font-size:14px;font-weight:800;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;letter-spacing:0.5px;box-shadow:0 3px 10px rgba(33,147,176,0.4);user-select:none;transition:filter 0.15s,transform 0.15s}',
        '.moon-view .reset-btn:active{filter:brightness(0.85);transform:scale(0.98)}',
        '.moon-view .persist-toggle{display:flex;align-items:center;justify-content:center;gap:8px;margin:0 12px 12px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;font-size:11px;color:#a8b2d1}',
        '.moon-view .persist-toggle input[type=checkbox]{width:16px;height:16px;accent-color:#667eea}',
        '.moon-status-indicator{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateZ(0);z-index:2147483646;background:rgba(30,60,114,0.95);color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:bold;border:1px solid rgba(255,255,255,0.2);pointer-events:none;opacity:0;transition:opacity 0.3s}',
        '.moon-status-indicator.visible{opacity:1}',
        '.moon-error-toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(220,53,69,0.95);color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:bold;z-index:2147483647;opacity:0;pointer-events:none;transition:opacity 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-align:center;max-width:80%}',
        '.moon-error-toast.visible{opacity:1}',
        '.moon-open-button:focus-visible{box-shadow:0 0 0 3px #667eea,0 4px 14px rgba(30,60,114,0.6)}',
        '.moon-open-button span.small{font-size:15px}',
        '@media(min-width:768px){.moon-view .speed-btn{height:44px}}',
        '@media(max-width:767px){.moon-view .speed-grid{gap:5px}.moon-view{width:260px}}',
        '@media(prefers-reduced-motion:reduce){.moon-open-button{animation:none}.moon-view{transition:none}.moon-status-indicator,.moon-error-toast{transition:none}}'
    ];

    var _styleNode = document.createElement('style');
    _styleNode.textContent = _cssText.join('');

    var _ball = document.createElement('div');
    _ball.className = 'moon-open-button';
    _ball.setAttribute('role', 'button');
    _ball.setAttribute('aria-label', '\u6e38\u620f\u52a0\u901f\u5668');
    _ball.setAttribute('tabindex', '0');
    _ball.innerHTML = '<span id="moonSpeedDisplay">1</span>';

    var _statusIndicator = document.createElement('div');
    _statusIndicator.className = 'moon-status-indicator';
    _statusIndicator.setAttribute('aria-live', 'polite');

    var _errorToast = document.createElement('div');
    _errorToast.className = 'moon-error-toast';

    var _speedValues = [0.1, 0.2, 0.5, 0.8, 1, 1.5, 2, 3, 5, 10, 20, 30, 50, 80, 100, 200];
    var _gridHtml = '';
    for (var _i = 0; _i < _speedValues.length; _i++) {
        if (_i === 4 || _i === 8 || _i === 12) {
            _gridHtml += '<div class="speed-separator" aria-hidden="true"></div>';
        }
        var sv = _speedValues[_i];
        var sl = sv < 1 ? sv.toFixed(1) : sv;
        _gridHtml += '<button class="speed-btn" data-speed="' + sv + '" tabindex="0">' + sl + 'x</button>';
    }

    var _panel = document.createElement('div');
    _panel.className = 'moon-view';
    _panel.id = 'moonPanel';
    _panel.setAttribute('role', 'dialog');
    _panel.setAttribute('aria-label', '\u52a0\u901f\u63a7\u5236\u9762\u677f');
    _panel.setAttribute('tabindex', '-1');
    _panel.innerHTML = [
        '<div class="moon-title"><span>\u6d45\u84dd\u8272\u7684\u6708</span><span class="moon-close-x" id="moonCloseX" role="button" aria-label="\u5173\u95ed" tabindex="0">\u2715</span></div>',
        '<div class="current-value">\u5f53\u524d\u6708\u76f8\u901f\u5ea6<span id="moonValue">1.0x</span></div>',
        '<div class="js-note">\u70b9\u51fb\u8c03\u6574\u65f6\u95f4\u6d41\u901f\uff080.1x - 200x\uff09</div>',
        '<div class="speed-grid">', _gridHtml, '</div>',
        '<div class="persist-toggle"><label><input type="checkbox" id="moonPersist">\u4e0b\u6b21\u542f\u52a8\u65f6\u4fdd\u6301\u6b64\u901f\u5ea6</label></div>',
        '<div class="reset-btn" id="moonResetBtn">\u91cd\u7f6e\u4e3a 1x</div>'
    ].join('');

    function _mountUI() {
        if (window.__moonRendered) return;
        window.__moonRendered = true;

        document.head.appendChild(_styleNode);
        var _frag = document.createDocumentFragment();
        _frag.appendChild(_ball);
        _frag.appendChild(_statusIndicator);
        _frag.appendChild(_errorToast);
        _frag.appendChild(_panel);
        document.body.appendChild(_frag);

        var _moonValue = document.getElementById('moonValue');
        var _moonSpeedDisplay = document.getElementById('moonSpeedDisplay');
        var _moonPersist = document.getElementById('moonPersist');
        var _speedBtns = _panel.querySelectorAll('.speed-btn');

        function _showError(msg) {
            _errorToast.textContent = msg;
            _errorToast.classList.add('visible');
            _origSetTimeout.call(window, function () { _errorToast.classList.remove('visible'); }, 2000);
        }

        var _panelRafId = 0;
        var _closeTimerId = 0;

        function _openPanel() {
            if (_closeTimerId) { _origClearTimeout.call(window, _closeTimerId); _closeTimerId = 0; }
            if (_panelRafId) { cancelAnimationFrame(_panelRafId); _panelRafId = 0; }
            var ballX = 15 + _ballOffX;
            var ballY = 25 + _ballOffY;
            var vpW = window.innerWidth;
            var vpH = window.innerHeight;
            var pLeft = ballX;
            if (pLeft + 280 > vpW - 10) pLeft = vpW - 290;
            if (pLeft < 10) pLeft = 10;
            var pTop = ballY + 70;
            _panel.style.left = pLeft + 'px';
            _panel.style.top = pTop + 'px';
            _panel.style.display = 'block';
            var panelH = _panel.offsetHeight;
            if (pTop + panelH > vpH - 10) pTop = vpH - panelH - 10;
            if (pTop < 10) pTop = 10;
            _panel.style.top = pTop + 'px';
            _panelRafId = requestAnimationFrame(function () {
                _panelRafId = 0;
                _panel.style.opacity = '1';
                _panel.style.transform = 'translateY(0) translateZ(0)';
            });
            _origSetTimeout.call(window, function () {
                var firstBtn = _panel.querySelector('.speed-btn');
                if (firstBtn) firstBtn.focus();
            }, 50);
        }

        function _closePanel() {
            if (_panelRafId) { cancelAnimationFrame(_panelRafId); _panelRafId = 0; }
            _panel.style.opacity = '0';
            _panel.style.transform = 'translateY(10px) translateZ(0)';
            _closeTimerId = _origSetTimeout.call(window, function () {
                _closeTimerId = 0;
                _panel.style.display = 'none';
                _ball.focus();
            }, 200);
        }

        function _showStatus(speed) {
            _statusIndicator.textContent = speed !== 1 ? '\u52a0\u901f\u5df2\u542f\u7528: ' + speed + 'x' : '\u901f\u5ea6\u5df2\u91cd\u7f6e';
            _statusIndicator.classList.add('visible');
            _origSetTimeout.call(window, function () { _statusIndicator.classList.remove('visible'); }, speed !== 1 ? 2000 : 1000);
        }

        function _setSpeedUI(v) {
            _jsq_value = v;
            var label = v >= 1 ? v : (Math.round(v * 10) / 10);
            _moonValue.textContent = label + 'x';
            _moonSpeedDisplay.textContent = label;
            var labelStr = String(label);
            if (labelStr.length >= 3) _moonSpeedDisplay.classList.add('small');
            else _moonSpeedDisplay.classList.remove('small');

            for (var _j = 0; _j < _speedBtns.length; _j++) {
                var btn = _speedBtns[_j];
                var btnVal = parseFloat(btn.getAttribute('data-speed'));
                if (Math.abs(btnVal - v) < 0.05) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }

            try {
                _applySpeed(v);
                _showStatus(v);
            } catch (error) {
                _showError('\u52a0\u901f\u5931\u8d25: ' + error.message);
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

        document.getElementById('moonCloseX').addEventListener('click', _closePanel);
        document.getElementById('moonCloseX').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _closePanel(); }
        });

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
            if (_panel.style.display !== 'none' && !_panel.contains(e.target) && !_ball.contains(e.target)) _closePanel();
        });

        _ball.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (_panel.style.display === 'none' || _panel.style.display === '') _openPanel();
                else _closePanel();
            }
        });

        (function (el) {
            var _sx = null, _sy = null, _isDrag = false;
            var _rafId = 0;
            var _pendingX = 0, _pendingY = 0;

            function _applyTransform() {
                el.style.transform = 'translate(' + _pendingX + 'px,' + _pendingY + 'px) translateZ(0)';
                _rafId = 0;
            }

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
                    _ballOffX += dx;
                    _ballOffY += dy;
                    _pendingX = _ballOffX;
                    _pendingY = _ballOffY;
                    if (!_rafId) {
                        _rafId = requestAnimationFrame(_applyTransform);
                    }
                    _sx = t.clientX;
                    _sy = t.clientY;
                    e.preventDefault();
                }
            }

            function _end(e) {
                document.removeEventListener('mousemove', _move);
                document.removeEventListener('mouseup', _end);
                if (_isDrag) {
                    e.preventDefault(); e.stopPropagation();
                    var vpW = window.innerWidth;
                    var vpH = window.innerHeight;
                    var ballW = 60;
                    var snapX = _ballOffX + ballW / 2 < vpW / 2 ? 0 : vpW - ballW;
                    if (Math.abs(_ballOffX - snapX) > 5) _ballOffX = snapX;
                    if (_ballOffY < 0) _ballOffY = 0;
                    if (_ballOffY > vpH - ballW - 20) _ballOffY = vpH - ballW - 20;
                    _pendingX = _ballOffX;
                    _pendingY = _ballOffY;
                    _applyTransform();
                }
                _sx = null;
                _isDrag = false;
            }

            el.addEventListener('touchstart', _start, { passive: false });
            el.addEventListener('touchmove', _move, { passive: false });
            el.addEventListener('touchend', _end, { passive: false });
            el.addEventListener('mousedown', function (e) {
                _start(e);
                document.addEventListener('mousemove', _move, { passive: true });
                document.addEventListener('mouseup', _end);
            });
            el.addEventListener('mouseleave', function (e) {
                if (!_isDrag) _end(e);
            });

            var _clickTimer2 = 0;
            el.addEventListener('click', function (e) {
                if (_isDrag) { e.stopPropagation(); return; }
                e.preventDefault();
                if (_clickTimer2) {
                    _origClearTimeout.call(window, _clickTimer2);
                    _clickTimer2 = 0;
                    _setSpeedUI(1);
                    return;
                }
                _clickTimer2 = _origSetTimeout.call(window, function () {
                    _clickTimer2 = 0;
                    if (_panel.style.display === 'none' || _panel.style.display === '') _openPanel();
                    else _closePanel();
                }, 250);
            }, false);
        })(_ball);

        _panel.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { _closePanel(); return; }
            if (e.key !== 'Tab') return;
            var focusable = _panel.querySelectorAll('.speed-btn, #moonCloseX, #moonPersist, #moonResetBtn');
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });

        try {
            var _persistent = localStorage.getItem('speedPersistent');
            var _saved = localStorage.getItem('gameSpeed');
            if (_persistent === 'true' && _saved) {
                var _spd = parseFloat(_saved);
                if (!isNaN(_spd) && _spd !== 1) {
                    _moonPersist.checked = true;
                    _isPersistent = true;
                    _origSetTimeout.call(window, function () { _setSpeedUI(_spd); }, 800);
                }
            }
        } catch (e) { }

        window.addEventListener('keydown', function (e) {
            var currentSpeed = _invPercentage;
            if (e.key === '9' && (e.ctrlKey || e.altKey)) {
                var t = prompt('\u8f93\u5165\u6b32\u6539\u53d8\u7684\u500d\u7387\uff08\u5f53\u524d\uff1a' + currentSpeed.toFixed(2) + '\uff09');
                if (t == null) return;
                if (isNaN(parseFloat(t))) return;
                if (parseFloat(t) <= 0) return;
                _setSpeedUI(parseFloat(t));
            } else if ((e.key === '=' || e.key === '.') && e.ctrlKey) {
                _setSpeedUI(Math.min(200, currentSpeed + 2));
            } else if ((e.key === '=' || e.key === '.') && e.altKey) {
                _setSpeedUI(Math.min(200, currentSpeed * 2));
            } else if ((e.key === '-' || e.key === ',') && e.ctrlKey) {
                _setSpeedUI(Math.max(0.1, currentSpeed - 2));
            } else if ((e.key === '-' || e.key === ',') && e.altKey) {
                _setSpeedUI(Math.max(0.1, currentSpeed / 2));
            } else if (e.key === '0' && (e.ctrlKey || e.altKey)) {
                _setSpeedUI(1);
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
