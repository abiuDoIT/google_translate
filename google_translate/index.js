const querystring = require('querystring');
const got = require('got');
const token = require('./get_token');
const Player = require('player');
const Speaker = require('speaker')
const languages = require('./languages');
const single_url = 'https://translate.google.cn/translate_a/single';
const batch_url = 'https://translate.google.cn/translate_a/t';
const speak_url = "https://translate.google.cn/translate_tts";
const complete_url = "https://clients1.google.cn/complete/search";

async function translate(text, opts) {
    opts = opts || {};
    let e;
    [opts.from, opts.to].forEach(function (lang) {
        if (lang && !languages.isSupported(lang)) {
            throw 'The language \'' + lang + '\' is not supported';
        }
    });
    opts.from = opts.from || 'auto';
    opts.to = opts.to || 'en';
    opts.from = languages.getCode(opts.from);
    opts.to = languages.getCode(opts.to);
    let token_text = text;
    let multi = false;
    if (Array.isArray(text)) {
        token_text = text.join('')
        multi = true;
    }
    let ttk = await token.get(token_text);
    let url = multi ? batch_url : single_url;
    let data = {
        client: 't',
        sl: opts.from,
        tl: opts.to,
        hl: opts.to,
        dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
        ie: 'UTF-8',
        oe: 'UTF-8',
        otf: 1,
        ssel: 0,
        tsel: 0,
        kc: 7,
        q: text
    };
    data[ttk.name] = ttk.value;
    return got(url + '?' + querystring.stringify(data)).then(function (res) {
        return JSON.parse(res.body);
    })
}
function complete(text, opts) {
    opts = opts || {};
    if (opts.from == 'zh-CN')
        opts.from = 'zh';
    opts.from = opts.from || 'auto';
    opts.to = opts.to || 'en';
    let data = {
        client: 'translate-web',
        ds: 'translate',
        hl: opts.from,
        ie: 'UTF-8',
        oe: 'UTF-8',
        requiredfields: 'tl:' + opts.to,
        callback: '_callbacks____1j6afgmq7',
        q: text
    }
    return got(complete_url+ "?" + querystring.stringify(data)).then((res) => {
        let words = JSON.parse(res.body.match(/\((\[.*\])\)/)[1]);
        words = words[1].map((w) => w[0])
        return words;
    })
}

Speaker.prototype.close = function (flush) {
    this._closed = true;
    this.emit('close');
  };
async function speak(text, opts) {
    if (!text) {
        return;
    }
    opts = opts || {};
    opts.to = opts.to || 'auto';
    let ttk = await token.get(text);
    let data = {
        client: 't',
        tl: opts.to,
        hl: opts.to,
        dt: ['at', 'bd', 'ex', 'ld', 'md', 'qca', 'rw', 'rm', 'ss', 't'],
        ie: 'UTF-8',
        oe: 'UTF-8',
        prev: 'input',
        ttsspeed: opts.sp||"0.48",
        q: text,
        textlen: text.length
    };
    data[ttk.name] = ttk.value;
    let player = new Player();
    player.on("error", function (e) {
        // console.error(e)
    })
     
    player.add(speak_url + "?" + querystring.stringify(data));
    player.play(function (err, end) { conosle.log(err, end) })
    return player;
}
module.exports = translate;
module.exports.languages = languages;
module.exports.complete = complete;
module.exports.speak = speak;
let s ;
async function run(){
    s=await  speak("卧槽长江后浪推前浪，前浪死在沙滩上",{to:"zh-CN"});
    await timeout(1000)
    s = await speak("啊啊啊啊啊",{to:"zh-CN"})
    s = await speak("卧槽",{to:"zh-CN"})
    await timeout(1000)
    s = await speak("我的天尼玛哟",{to:"zh-CN"})
}
// run().catch(console.error)
function timeout(n){
    return new Promise((res,rej)=>{
        setTimeout(res,n)
    })
}
// setInterval(run,5000)