const querystring = require('querystring');

const got = require('got');
const token = require('./get_token');

const languages = require('./languages');
const single_url = 'https://translate.google.cn/translate_a/single';
const batch_url = 'https://translate.google.cn/translate_a/t';
function translate(text, opts) {
    opts = opts || {};

    let e;
    [opts.from, opts.to].forEach(function (lang) {
        if (lang && !languages.isSupported(lang)) {
            e = new Error();
            e.code = 400;
            e.message = 'The language \'' + lang + '\' is not supported';
        }
    });
    if (e) {
        return new Promise(function (resolve, reject) {
            reject(e);
        });
    }

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
    return token.get(token_text).then(function (token) {
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
        data[token.name] = token.value;
        return url + '?' + querystring.stringify(data);
    }).then(function (url) {
        return got(url).then(function (res) {
            return JSON.parse(res.body);
        }).catch(function (err) {
            let e;
            e = new Error();
            if (err.statusCode !== undefined && err.statusCode !== 200) {
                e.code = 'BAD_REQUEST';
            } else {
                e.code = 'BAD_NETWORK';
            }
            throw e;
        });
    });
}
function complete(text, opts) {
    let url = "https://clients1.google.cn/complete/search";
    opts = opts || {};
    if(opts.from =='zh-CN')
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
    url = url + "?" + querystring.stringify(data);
    return got(url).then((res) => {
        let words = JSON.parse(res.body.match(/\((\[.*\])\)/)[1]);
        words = words[1].map((w) => w[0])
        return words;
    })
}
module.exports = translate;
module.exports.languages = languages;
module.exports.complete = complete;
