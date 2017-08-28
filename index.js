const translate = require('./google_translate')
const Koa = require('koa');
const concern_char = ";";
const concern_char_p = new RegExp(concern_char);

let global_words ;
let global_latest_id = 0;
let global_latest_query ="";
async function complete(query,opts){
    let complete_words = await translate.complete(query, opts);
    if(!complete_words||!complete_words.length)
        complete_words = [query];
    global_words = complete_words;
    let items = complete_words.map((word, index) => {
        return {
            title: word,
            valid: false,
            autocomplete: word + concern_char
        }
    })
    return ({ rerun:0.1,variables:{words:1},items: items })
    
}
async function batch_translate(complete_words, opts) {
    let translated_words = await translate(complete_words, opts);
    translated_words = translated_words[0].map((arr, index) => {
        return arr[0][0][0];
    })

    let items = complete_words.map((word, index) => {
        return {
            title: word,
            subtitle: translated_words[index],
            valid: false,
            autocomplete: word + concern_char
        }
    })
    return ({ items: items })

}
async function single_translate(query, opts) {
    let result = await translate(query.trim(), opts)
    let items = [];
    items.push({title:result[0][0][0]+" "+result[0][1][2],subtitle:result[0][0][1]+" "+result[0][1][3],sort_key:1,text:{copy:result[0][0][0]}});
    let meaning = result[1];
    if(meaning){
        meaning.forEach(function(type) {
            let type_name = type[0];
            type[2].forEach(function(word){
                items.push({
                    title:word[0],
                    subtitle:type_name+": "+word[1].join(","),
                    sort_key:word[3],
                    text:{copy:word[0]}
                })
            })
        }, this);
        items = items.sort((a,b)=>{return b.sort_key-a.sort_key}).slice(0,10);
    }
    return ({items:items})
}

function handle_error(e){
    return ({items:[{
        title:e.toString(),
        valid:false,
        subtitle:e.stack||''
    }]})
}
function typing(query,isTyping){
    if(isTyping)
        global_latest_query = query;  
    return ({rerun:0.1,
        items:[{
        title:query,
        subtitle:query,
        valid:false,
        autocomplete: query + concern_char
    }]})
}
async function main(query,variables){
    let typedid = variables.typedid;
    let words = variables.words?global_words:"";
    let opts = { from: "en", to: "zh-CN" };
    
    if(/.*[\u4e00-\u9fa5]+.*$/.test(query)){
        opts = { from: "zh-CN", to: "en" };
    }
    if (concern_char_p.test(query)) 
           return single_translate(query.replace('/t',''),opts).catch(handle_error)
    if(query!=global_latest_query)
        return typing(query,true);
    
    if(!words) 
        return complete(query,opts)
    if(words.length>1)
        return batch_translate(words,opts)
    return single_translate(words[0]||query,opts).catch(handle_error)
}
function timeout(n){
    return new Promise((res,rej)=>{
        setTimeout(res,n)
    })
}

const koa = new Koa();
koa.use(require('koa-body')())
koa.use(async function(ctx,next){
    let query = ctx.request.body;
    ctx.body = await main(query.query,query);
    ctx.body = ctx.body||typing(query.query);
    // console.log(ctx.request.body,ctx.body)
    
})
koa.listen(6532);
process.on('SIGINT',function(){
    // console.log('child sigint');
});




