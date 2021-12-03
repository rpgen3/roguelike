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
            const {k, toI} = this;
            switch(way) {
                case 0: return toI(x + 1, y);
                case 1: return toI(x, y - 1);
                case 2: return toI(x - 1, y);
                case 3: return toI(x, y + 1);
            }
        }
    };
    rpgen3.addBtn(main, 'make', () => {
        sel.init();
        const {k, toXY} = config,
              [w, h] = config.wh.map(v => v());
        for(const [i, v] of config.how().entries()) {
            const [x, y] = toXY(i);
            new rpgen.FullEvent(1).make(events, x, y);
        }
    });
})();
