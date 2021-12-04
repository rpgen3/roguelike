(async () => {
    const {importAll, getScript, importAllSettled} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await getScript('https://code.jquery.com/jquery-3.3.1.min.js');
    const {$} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('roguelike');
    const rpgen3 = await importAll([
        'random',
        'input',
        'css',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    [
        'container',
        'btn'
    ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`).map(rpgen3.addCSS);
    const rpgen = await importAll([
        'FullEvent',
        'rpgen'
    ].map(v => `https://rpgen3.github.io/midi/mjs/${v}.mjs`));
    const sel = new class {
        constructor(){
            this.index = 0;
        }
        init(){
            this.index = 0;
        }
        make(arr){
            const a = [];
            let i = 0;
            const make = i => `#SEL${this.index}-${i}`;
            for(const [i, v] of arr.entries()) {
                let s = make(i);
                if(!i) s += ' c:0,' + [...arr.keys()].map(v => `i${v}:${v},`).join('');
                s += '\n' + v;
                a.push(s);
            }
            a.push(`#SELEND${this.index++}`);
            return a.join('\n');
        }
    };
    const {toTransposed} = await import('https://rpgen3.github.io/spatialFilter/mjs/kernel.mjs');
    const config = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h2>').appendTo(html).text('各種パラメータ');
            const input = $('<dl>').appendTo(html);
            this.k = 9; // 区間の個数
            const wh = [];
            for(const v of ['幅', '高さ']) wh.push(rpgen3.addInputNum(input, {
                label: `1区間の${v}`,
                save: true,
                step: 2,
                min: 11,
                max: 31
            }));
            this.wh = wh;
            this.how = rpgen3.addSelect(input, {
                label: '周り方',
                list: {
                    'Z': this._Z(),
                    'N': toTransposed(this._Z()),
                    '時計回り': this._vortex(),
                    '反時計回り': toTransposed(this._vortex())
                }
            });
        }
        toXY(i){
            const {k} = this;
            return rpgen3.toXY(k, i);
        }
        toI(x, y){
            const {k} = this;
            return rpgen3.toI(k, x, y);
        }
        _Z(){
            const {k} = this,
                  a = [];
            for(const i of Array(k ** 2).keys()) {
                const [x, y] = this.toXY(i);
                a.push(y % 2 ? this.toI(k - x - 1, y) : i);
            }
            return a;
        }
        _vortex(){
            const {k} = this,
                  a = [0],
                  set = new Set(a);
            let way = 0, _x = 0, _y = 0;
            while(a.length < k ** 2) {
                const [c, d] = [
                    [1, 0],
                    [0, -1],
                    [-1, 0],
                    [0, 1]
                ][way];
                const [x, y] = [_x + c, _y + d],
                      i = this.toI(x, y);
                if(0 <= x && x < k && 0 <= y && y < k && !set.has(i)) {
                    _x = x;
                    _y = y;
                    set.add(i);
                    a.push(i);
                }
                else way = (way + 1) % 4;
            }
            return a;
        }
    };
    const toWay = (x, y) => {
        if(x === 1) return 0;
        else if(y === 1) return 1;
        else if(x === -1) return 2;
        else if(y === -1) return 3;
        else return -1;
    };
    rpgen3.addBtn(main, 'make', () => {
        const result = [];
        const {k} = config,
              [w, h] = config.wh.map(v => v()),
              [_w, _h] = [w, h].map(v => v >> 1),
              [__w, __h] = [_w, _h].map(v => v - 1),
              yukaW = w * 9,
              yukaH = h * 9,
              yuka = [...Array(yukaH * yukaW).fill('')],
              mono = yuka.slice();
        let _x = 0, _y = 0;
        for(const [i, v] of config.how().entries()) {
            const [x, y] = config.toXY(v),
                  way = toWay(x - _x, y - _y),
                  xw = x * w,
                  yh = y * h,
                  events = [];
            console.log(x, y, way)
            for(const i of Array(w * h).keys()) {
                const [x0, y0] = rpgen3.toXY(w, i),
                      _i = rpgen3.toI(yukaW, xw + x0, yh + y0);
                yuka[_i] = '31343';
                if(
                    y0 === 0 ||
                    y0 === h - 1 ||
                    x0 === 0 ||
                    x0 === w - 1 ||
                    (x0 % 2 === 0 && y0 % 2 === 0)
                ) mono[_i] = '31346C';
            }
            events.push(`#MV_CA\ntx:${xw + _w},ty:${yh + _h},t:500,s:1,tw:7,\n#ED`);
            sel.init();
            for(const i of Array(__w * __h).keys()) {
                const [x, y] = rpgen3.toXY(__w, i),
                      [_x, _y] = [x, y].map(v => (v << 1) + 2),
                      a = [];
                a.push([1, 0]);
                a.push([-1, 0]);
                a.push([0, 1]);
                if(!y) a.push([0, -1]);
                events.push(sel.make(a.map(([x2, y2]) => `#CH_SP\nn:31346,tx:${xw + _x + x2},ty:${yh + _y + y2},l:3,\n#ED`)));
            }
            events.push(`#MV_CF\nt:500,s:1,tw:7,\n#ED`);
            events.push(`#RM_EV\n#ED`);
            const [__x, __y] = way === -1 ? [0, 0] : (() => {
                const [a, b] = [
                    [-1, 0],
                    [0, -1],
                    [1, 0],
                    [0, 1]
                ][way];
                const [x, y] = [xw + _w, yh + _h];
                const [_x, _y] = [
                    x + a * _w,
                    y + b * _h
                ];
                mono[rpgen3.toI(yukaW, _x, _y)] = '';
                mono[rpgen3.toI(yukaW, _x + a, _y + b)] = '';
                return [_x, _y];
            })();
            result.push(new rpgen.FullEvent(1).make(events, {
                x: __x,
                y: __y,
                ed: false
            }));
            _x = x;
            _y = y;
        }
        const f = arr => {
            let s = '';
            for(const y of Array(yukaH).keys()) {
                const i = rpgen3.toI(yukaW, 0, y);
                s += arr.slice(i, i + yukaW).join(' ') + '\n';
            }
            return s;
        };
        const d = mapData
        + `#FLOOR\n${f(yuka)}#END`
        + '\n\n'
        + `#MAP\n${f(mono)}#END`
        + '\n\n';
        rpgen3.addInputStr(foot.empty(), {
            value: rpgen.set(d + result.join('\n\n')),
            copy: true
        });
    });
    const mapData = await(await fetch('data/map.txt')).text();
})();
