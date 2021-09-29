const querystring = require('querystring');
const got = require('got');
const token = require('./get_token');
const Player = require('player');
const languages = require('./languages');
const {https} = require('follow-redirects')
var HttpsProxyAgent = require('https-proxy-agent');
const urlM = require('url')
const single_url = 'https://translate.google.cn/translate_a/single';
const batch_url = 'https://translate.google.cn/translate_a/t';
const speak_url = "https://translate.google.com/translate_tts";
const complete_url = "https://clients1.google.cn/complete/search";
const origGet = https.get.bind(https);

https.get = function(link,callback){
    const option = urlM.parse(link);
    option.headers =  {
        'Accept':'*/*',
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
    };
    if(link.indexOf('google.com')){
        option.agent = new HttpsProxyAgent('http://127.0.0.1:8001')
    }
    return origGet(option,callback)
}
// Player.download = function(src, callback) {
//     var self = this
//     var called = false
//     var option = {};


//     request
//       .get(query,option, responseHandler)
//       .once('error', errorHandler)

//     function responseHandler(res) {
//       called = true

//       var isOk = (res.statusCode === 200)
//       var isAudio = (res.headers['content-type'].indexOf('audio/mpeg') > -1)
//       var isSave = self.options.cache
//       var isStream = self.options.stream

//       if (!isOk)
//         return callback(new Error('Resource invalid'))
//       if (isStream)
//         return callback(null, res)
//       if (!isAudio)
//         return callback(new Error('Resource type is unsupported'))

//       // Create a pool
//       var pool = new PoolStream()
//       // Pipe into memory
//       res.pipe(pool)

//       // Check if we're going to save this stream
//       if (!isSave)
//         return callback(null, pool)

//       // Save this stream as file in download directory
//       var file = path.join(
//         self.options.downloads,
//         fetchName(src)
//       )

//       self.emit('downloading', src)
//       pool.pipe(fs.createWriteStream(file))

//       // Callback the pool
//       callback(null, pool)
//     }

//     function errorHandler(err) {
//       if (!called)
//         callback(err)
//     }
//   }

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
        console.error(e)
    })
    console.log(speak_url + "?" + querystring.stringify(data));
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
run().catch(console.error)
function timeout(n){
    return new Promise((res,rej)=>{
        setTimeout(res,n)
    })
}
// setInterval(run,5000)