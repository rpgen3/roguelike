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
    ].map(v => `'https://rpgen3.github.io/midi/mjs/${v}.mjs`));
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
                const s = make(i);
                if(!i) s += ' c:0,' + [...arr.keys()].map(v => `i${v}:${v},`).join('') + '\n';
                s += v;
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
        toI(i){
            const {k} = this;
            return rpgen3.toXY(k, i);
        }
        toXY(x, y){
            const {k} = this;
            return rpgen3.toI(k, x, y);
        }
        _Z(){
            const {k, toI, toXY} = this,
                  a = [];
            for(const i of Array(k ** 2).keys()) {
                const [x, y] = toXY(k, i);
                a.push(y % 2 ? i : toI(k - x, y));
            }
            return a;
        }
        _vortex(){
            const {k, toXY} = this,
                  a = [0],
                  set = new Set(a);
            let way = 0, _x = 0, _y = 0;
            while(a.length < k ** 2) {
                const i = this._sw(way, _x, _y),
                      [x, y] = toXY(i);
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
        _sw(way, x, y){
            const {toI} = this;
            switch(way) {
                case 0: return toI(x + 1, y);
                case 1: return toI(x, y - 1);
                case 2: return toI(x - 1, y);
                case 3: return toI(x, y + 1);
            }
        }
    };
    const toWay = (x, y) => {
        if(x === 1) return 0;
        else if(y === 1) return 1;
        else if(x === -1) return 2;
        else if(y === -1) return 3;
        else return -1;
    };
    const sw = (way, x, y, w, h) => {
        const [_w, _h] = [w, h].map(v => v >> 1);
        switch(way) {
            case 0: return [x, y + _h];
            case 1: return [x + _w, y];
            case 2: return [x + w , y + _h];
            case 3: return [x + _w, y + h];
        }
    };
    rpgen3.addBtn(main, 'make', () => {
        sel.init();
        const result = [];
        const {k, toXY} = config,
              [w, h] = config.wh.map(v => v()),
              [_w, _h] = [w, h].map(v => v - 3 >> 1),
              yukaW = w * 9,
              yukaH = h * 9,
              yuka = [...Array(yukaH * yukaW).fill('')],
              mono = yuka.slice();
        let _x = 0, _y = 0;
        for(const [i, v] of config.how().entries()) {
            const [x, y] = toXY(i),
                  way = toWay(x - _x, y - _y),
                  events = [];
            for(const i of Array(w * h).keys()) {
                const [x0, y0] = rpgen3.toXY(yukaW, i),
                      _i = rpgen3.toI(yukaW, x + x0, y + y0);
                yuka[_i] = '31343';
                if(
                    y0 === 0 ||
                    y0 === h - 1 ||
                    x0 === 0 ||
                    x0 === w - 1
                ) mono[_i] = '31346';
            }
            events.push(`#MV_CA\ntx:7,ty:5,t:500,s:1,tw:7,\n#ED`);
            for(const i of Array(_w * _h).keys()) {
                const [x0, y0] = rpgen3.toXY(_w, i),
                      [x1, y1] = [x0, y0].map(v => (v << 1) + 3),
                      a = [];
                a.push([1, 0]);
                a.push([-1, 0]);
                a.push([0, 1]);
                if(!y0) a.push([0, -1]);
                events.push(sel.make(a.map(([x2, y2]) => `#CH_SP\nn:31346,tx:${x + x1 + x2},ty:${y + y1 + y2},l:3,`)));
            }
            events.push(`#MV_CF\nt:500,s:1,tw:7,\n#ED`);
            events.push(`#RM_EV\n#ED`);
            result.push(new rpgen.FullEvent(1).make(events, ...(
                way === -1 ? [0, 0] : (() => {
                    const [_x, _y] = sw(way, x, y, w, h);
                    mono[rpgen3.toI(yukaW, _x, _y)] = '';
                    return [_x, _y];
                })()
            )));
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
        + `#MAP\n${f(yuka)}#END`
        + '\n\n';
        rpgen3.addInputStr(foot.empty(), {
            value: rpgen.set(d + result.join('\n\n')),
            copy: true
        });
    });
    const mapData = await(await fetch('data/map.txt')).text();
})();
