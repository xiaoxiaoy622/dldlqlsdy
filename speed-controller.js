(function () {
    'use strict';

    var isHighPerformance = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    var style = document.createElement('style');
    style.textContent = '\
        #speedController {\
            position: fixed;\
            width: 60px;\
            height: 60px;\
            background: radial-gradient(circle, #4d90fe 0%, #3a7bd5 100%);\
            border-radius: 50%;\
            display: flex;\
            align-items: center;\
            justify-content: center;\
            cursor: pointer;\
            z-index: 2147483647;\
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);\
            font-size: 22px;\
            color: #fff;\
            font-weight: bold;\
            text-align: center;\
            line-height: 60px;\
            transition: transform 0.2s cubic-bezier(0.21,1.04,0.58,1.15), box-shadow 0.2s ease, background 0.5s ease;\
            touch-action: none;\
            user-select: none;\
            transform: translateZ(0);\
            will-change: transform, box-shadow, background;\
            animation: breath 3s infinite;\
            overflow: hidden;\
        }\
        #speedController::before {\
            content: "";\
            position: absolute;\
            width: 200%;\
            height: 200%;\
            background: radial-gradient(circle at 50% 55%, rgba(240,245,255,0.9), rgba(43,130,255,0.4));\
            border-radius: 40%;\
            top: 50%;\
            left: 50%;\
            transform: translate(-50%, -30%) rotate(0deg);\
            animation: waveRise 10s linear infinite;\
            z-index: -1;\
            opacity: 0.6;\
        }\
        @keyframes waveRise {\
            50% { transform: translate(-50%, -70%) rotate(180deg); }\
            100% { transform: translate(-50%, -70%) rotate(360deg); }\
        }\
        #speedController.active .particle {\
            position: absolute;\
            width: 4px;\
            height: 4px;\
            background: white;\
            border-radius: 50%;\
            animation: particleFly 1s ease-out forwards;\
            opacity: 0;\
            z-index: -1;\
        }\
        @keyframes particleFly {\
            0% { transform: translate(0,0) scale(0); opacity: 0.8; }\
            100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }\
        }\
        @keyframes breath {\
            0%, 100% { box-shadow: 0 0 0 0 rgba(77,144,254,0.7); }\
            50% { box-shadow: 0 0 0 15px rgba(77,144,254,0); }\
        }\
        #speedController:hover {\
            animation: rotate3D 6s linear infinite, breath 3s infinite;\
            transform-style: preserve-3d;\
        }\
        @keyframes rotate3D {\
            0% { transform: rotateY(0deg) rotateX(0deg); }\
            25% { transform: rotateY(90deg) rotateX(10deg); }\
            50% { transform: rotateY(180deg) rotateX(0deg); }\
            75% { transform: rotateY(270deg) rotateX(-10deg); }\
            100% { transform: rotateY(360deg) rotateX(0deg); }\
        }\
        #speedController.dragging::after {\
            content: "";\
            position: absolute;\
            width: 100%;\
            height: 100%;\
            background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);\
            border-radius: 50%;\
            opacity: 0.3;\
            animation: particleGlow 0.5s infinite alternate;\
            z-index: -1;\
        }\
        #speedController.active {\
            background: radial-gradient(circle, #ff5e62 0%, #ff9966 100%);\
            animation: pulseScale 1.5s infinite alternate, breath 1.5s infinite;\
        }\
        #speedController.high-speed {\
            background: radial-gradient(circle, #ff5e62 0%, #f78fb3 100%);\
            transform: scale(1.1);\
        }\
        #speedController.over-speed {\
            background: radial-gradient(circle, #ff0000 0%, #ff6b6b 100%);\
            animation: shake 0.5s infinite alternate;\
        }\
        @keyframes pulseScale {\
            0% { transform: scale(1) translateZ(0); }\
            100% { transform: scale(1.08) translateZ(0); }\
        }\
        @keyframes shake {\
            0% { transform: translateX(-3px); }\
            100% { transform: translateX(3px); }\
        }\
        #speedController:active {\
            transform: scale(0.88) translateZ(0);\
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);\
        }\
        @media (max-width: 480px) {\
            #speedController { width: 50px; height: 50px; font-size: 18px; line-height: 50px; animation: none; }\
            #speedController::before { display: none; }\
            #speedController.active { animation: pulseScale 1.5s infinite alternate; }\
            #speedController.high-speed, #speedController.over-speed { animation: none; }\
        }\
        #speedPanel {\
            position: fixed;\
            width: 280px;\
            max-width: 90vw;\
            max-height: 80vh;\
            overflow: auto;\
            background-color: #fff;\
            border-radius: 12px;\
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);\
            padding: 20px;\
            display: none;\
            z-index: 2147483647;\
            box-sizing: border-box;\
            font-family: Arial, sans-serif;\
            transition: opacity 0.2s, transform 0.2s;\
            opacity: 0;\
            transform: translateY(10px);\
        }\
        .btn-ripple {\
            position: absolute;\
            border-radius: 50%;\
            background: rgba(255,255,255,0.7);\
            transform: scale(0);\
            animation: rippleAnim 0.6s linear;\
            pointer-events: none;\
        }\
        @keyframes rippleAnim {\
            to { transform: scale(4); opacity: 0; }\
        }\
        @keyframes btnClick {\
            0% { transform: scale(1); }\
            50% { transform: scale(0.95); }\
            100% { transform: scale(1); }\
        }\
    ';
    document.head.appendChild(style);

    var btn = document.createElement('div');
    btn.id = 'speedController';
    btn.textContent = '\u901F';
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'speedPanel';

    var closeBtn = document.createElement('div');
    closeBtn.textContent = '\u00D7';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;width:24px;height:24px;border:none;border-radius:50%;background:transparent;color:#999;font-weight:bold;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color 0.2s';

    var title = document.createElement('h3');
    title.textContent = '\u6E38\u620F\u52A0\u901F\u63A7\u5236';
    title.style.cssText = 'margin:0 0 15px 0;font-size:18px;color:#333;font-weight:600';

    var dispRow = document.createElement('div');
    dispRow.style.cssText = 'display:flex;align-items:center;margin-bottom:15px';

    var dispLabel = document.createElement('span');
    dispLabel.textContent = '\u5F53\u524D\u500D\u7387:';
    dispLabel.style.cssText = 'margin-right:10px;font-size:14px;color:#666';

    var speedDisp = document.createElement('div');
    speedDisp.id = 'speedDisplay';
    speedDisp.textContent = '\u5173\u95ED';
    speedDisp.style.cssText = 'font-size:16px;font-weight:bold;color:#666;padding:4px 10px;background-color:#f5f5f5;border-radius:4px';

    dispRow.appendChild(dispLabel);
    dispRow.appendChild(speedDisp);

    var sliderRow = document.createElement('div');
    sliderRow.style.cssText = 'margin-bottom:20px;padding:15px 0';

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '10';
    slider.step = '0.1';
    slider.value = '5';
    slider.style.cssText = 'width:100%';
    sliderRow.appendChild(slider);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:10px';

    var applyBtn = document.createElement('button');
    applyBtn.textContent = '\u5E94\u7528\u52A0\u901F';
    applyBtn.style.cssText = 'flex:1;min-width:120px;padding:10px;background-color:#4d90fe;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500;position:relative;overflow:hidden';

    var stopBtn = document.createElement('button');
    stopBtn.textContent = '\u505C\u6B62\u52A0\u901F';
    stopBtn.style.cssText = 'flex:1;min-width:120px;padding:10px;background-color:#ff6b6b;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500;position:relative;overflow:hidden';

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '\u91CD\u7F6E\u8BBE\u7F6E';
    resetBtn.style.cssText = 'flex:1;min-width:120px;padding:10px;background-color:#9e9e9e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:500;position:relative;overflow:hidden';

    btnRow.appendChild(applyBtn);
    btnRow.appendChild(stopBtn);
    btnRow.appendChild(resetBtn);

    panel.appendChild(closeBtn);
    panel.appendChild(title);
    panel.appendChild(dispRow);
    panel.appendChild(sliderRow);
    panel.appendChild(btnRow);
    document.body.appendChild(panel);

    function posElem(el, x, y) {
        var mx = window.innerWidth - el.offsetWidth - 10;
        var my = window.innerHeight - el.offsetHeight - 10;
        el.style.left = Math.max(10, Math.min(x, mx)) + 'px';
        el.style.top = Math.max(10, Math.min(y, my)) + 'px';
    }

    posElem(btn, 20, 20);
    posElem(panel, 20, 100);

    function showPanel() {
        var br = btn.getBoundingClientRect();
        var ph = panel.offsetHeight;
        var vh = window.innerHeight;
        if (br.bottom + ph > vh) {
            panel.style.top = Math.max(10, vh - ph - 10) + 'px';
        } else {
            panel.style.top = br.bottom + 10 + 'px';
        }
        panel.style.left = br.left + 'px';
        panel.style.display = 'block';
        requestAnimationFrame(function () {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        });
    }

    function hidePanel() {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(10px)';
        setTimeout(function () { panel.style.display = 'none'; }, 200);
    }

    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    function tapHandler(el, fn) {
        if (isMobile) {
            var sx, sy;
            el.addEventListener('touchstart', function (e) {
                sx = e.touches[0].clientX;
                sy = e.touches[0].clientY;
            }, { passive: true });
            el.addEventListener('touchend', function (e) {
                var dx = Math.abs(e.changedTouches[0].clientX - sx);
                var dy = Math.abs(e.changedTouches[0].clientY - sy);
                if (dx < 10 && dy < 10) fn.call(el, e);
                e.preventDefault();
            }, { passive: false });
        } else {
            el.addEventListener('click', fn);
        }
    }

    tapHandler(btn, function () {
        if (panel.style.display === 'none' || panel.style.display === '') {
            showPanel();
        } else {
            hidePanel();
        }
    });

    closeBtn.addEventListener('click', hidePanel);

    function drag(el, onDrag) {
        var sx, sy, sl, st, dragging = false;
        el.addEventListener('mousedown', function (e) {
            sx = e.clientX; sy = e.clientY;
            sl = parseFloat(el.style.left) || 0;
            st = parseFloat(el.style.top) || 0;
            dragging = false;
            el.style.transition = 'none';
            el.classList.add('dragging');
        });
        document.addEventListener('mousemove', function (e) {
            if (sx === undefined) return;
            if (!dragging && (Math.abs(e.clientX - sx) > 5 || Math.abs(e.clientY - sy) > 5)) {
                dragging = true;
                if (typeof onDrag === 'function') onDrag(true);
            }
            if (dragging) {
                posElem(el, sl + (e.clientX - sx), st + (e.clientY - sy));
            }
        });
        document.addEventListener('mouseup', function () {
            if (dragging) snapEdge(el);
            sx = sy = undefined;
            el.style.transition = '';
            el.classList.remove('dragging');
        });
        el.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                sx = e.touches[0].clientX; sy = e.touches[0].clientY;
                sl = parseFloat(el.style.left) || 0;
                st = parseFloat(el.style.top) || 0;
                dragging = false;
                el.style.transition = 'none';
                el.classList.add('dragging');
                e.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchmove', function (e) {
            if (e.touches.length === 1 && sx !== undefined) {
                if (!dragging && (Math.abs(e.touches[0].clientX - sx) > 5 || Math.abs(e.touches[0].clientY - sy) > 5)) {
                    dragging = true;
                    if (typeof onDrag === 'function') onDrag(true);
                }
                if (dragging) {
                    posElem(el, sl + (e.touches[0].clientX - sx), st + (e.touches[0].clientY - sy));
                }
                e.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchend', function () {
            if (dragging) snapEdge(el);
            sx = sy = undefined;
            el.style.transition = '';
            el.classList.remove('dragging');
        });
    }

    function snapEdge(el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var ww = window.innerWidth, wh = window.innerHeight;
        var dist = { l: cx, r: ww - cx, t: cy, b: wh - cy };
        var min = Math.min(dist.l, dist.r, dist.t, dist.b);
        var tx = parseFloat(el.style.left) || 0, ty = parseFloat(el.style.top) || 0;
        if (min === dist.l) tx = 10;
        else if (min === dist.r) tx = ww - r.width - 10;
        else if (min === dist.t) ty = 10;
        else ty = wh - r.height - 10;
        el.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
        posElem(el, tx, ty);
        setTimeout(function () { el.style.transition = ''; }, 300);
    }

    drag(btn, function (d) { if (d) hidePanel(); });

    function ripple(e, el) {
        var rp = document.createElement('span');
        rp.className = 'btn-ripple';
        var r = el.getBoundingClientRect();
        var s = Math.max(r.width, r.height);
        rp.style.cssText += 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
        el.appendChild(rp);
        setTimeout(function () { rp.remove(); }, 600);
    }

    [applyBtn, stopBtn, resetBtn].forEach(function (b) {
        b.addEventListener('click', function (e) {
            ripple(e, this);
            this.style.animation = 'none';
            var self = this;
            requestAnimationFrame(function () { self.style.animation = 'btnClick 0.4s forwards'; });
        });
    });

    var isAccel = false;
    var particleInterval = null;

    function createParticle(el, x, y) {
        var p = document.createElement('div');
        p.className = 'particle';
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var ang = Math.random() * Math.PI * 2;
        var d = 30 + Math.random() * 50;
        p.style.setProperty('--tx', Math.cos(ang) * d + 'px');
        p.style.setProperty('--ty', Math.sin(ang) * d + 'px');
        p.style.left = (x - cx) + 'px';
        p.style.top = (y - cy) + 'px';
        el.appendChild(p);
        setTimeout(function () { p.remove(); }, 1000);
    }

    function setAccel(active, speed) {
        isAccel = active;
        btn.classList.remove('high-speed', 'over-speed');
        if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
        if (active) {
            btn.classList.add('active');
            if (speed >= 7) btn.classList.add('over-speed');
            else if (speed >= 4) btn.classList.add('high-speed');
            if (isHighPerformance) {
                particleInterval = setInterval(function () {
                    if (!isAccel) { clearInterval(particleInterval); return; }
                    var r = btn.getBoundingClientRect();
                    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                    for (var i = 0; i < 3; i++) {
                        setTimeout(function () { createParticle(btn, cx, cy); }, i * 100);
                    }
                }, 800);
            }
        } else {
            btn.classList.remove('active');
        }
    }

    applyBtn.addEventListener('click', function () {
        var speed = parseFloat(slider.value);
        speedDisp.textContent = speed + 'x';
        speedDisp.style.color = '#4d90fe';
        speedDisp.style.backgroundColor = '#f0f7ff';
        setAccel(true, speed);
        changeTime(0, 0, false, false, speed);
    });

    stopBtn.addEventListener('click', function () {
        speedDisp.textContent = '\u5173\u95ED';
        speedDisp.style.color = '#666';
        speedDisp.style.backgroundColor = '#f5f5f5';
        setAccel(false);
        changeTime(0, 0, false, true);
    });

    resetBtn.addEventListener('click', function () {
        slider.value = '5';
        speedDisp.textContent = '\u5173\u95ED';
        speedDisp.style.color = '#666';
        speedDisp.style.backgroundColor = '#f5f5f5';
        setAccel(false);
        changeTime(0, 0, false, true);
    });

    slider.addEventListener('input', function () {
        var speed = parseFloat(slider.value);
        if (speedDisp.textContent !== '\u5173\u95ED') {
            speedDisp.textContent = speed + 'x';
            speedDisp.style.color = '#4d90fe';
            speedDisp.style.backgroundColor = '#f0f7ff';
            btn.classList.remove('high-speed', 'over-speed');
            if (speed >= 7) btn.classList.add('over-speed');
            else if (speed >= 4) btn.classList.add('high-speed');
        }
    });

    function changeTime(anum, cnum, isa, isr, isd) {
        if (isr) {
            window.timer && window.timer.change(1);
            return;
        }
        if (!window.timer) {
            return;
        }
        if (isd) {
            window.timer.change(1 / isd);
            return;
        }
        var result;
        if (!anum && !cnum) {
            var t = prompt('\u8F93\u5165\u6B32\u6539\u53D8\u8BA1\u65F6\u5668\u53D8\u5316\u500D\u7387\uFF08\u5F53\u524D\uFF1A' + (1 / window.timerContext._percentage) + '\uFF09');
            if (t == null) return;
            if (isNaN(parseFloat(t))) { alert('\u8BF7\u8F93\u5165\u6B63\u786E\u7684\u6570\u5B57'); return; }
            if (parseFloat(t) <= 0) { alert('\u500D\u7387\u4E0D\u80FD\u5C0F\u4E8E\u7B49\u4E8E0'); return; }
            result = 1 / parseFloat(t);
        } else {
            if (isa && anum) {
                if (1 / window.timerContext._percentage <= 1 && anum < 0) return;
                result = 1 / (1 / window.timerContext._percentage + anum);
            } else {
                if (cnum <= 0) cnum = 1 / -cnum;
                result = 1 / ((1 / window.timerContext._percentage) * cnum);
            }
        }
        window.timer.change(result);
    }

    window.addEventListener('beforeunload', function () {
        if (btn.parentNode) btn.parentNode.removeChild(btn);
        if (panel.parentNode) panel.parentNode.removeChild(panel);
        if (style.parentNode) style.parentNode.removeChild(style);
        if (particleInterval) clearInterval(particleInterval);
    });
})();
