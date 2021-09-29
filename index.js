const translate = require('./google_translate')
const Koa = require('koa');
const path = require('path');
const concern_char = ";";
const concern_char_p = new RegExp(/[;；]/);
const say_p = new RegExp(/[;；]s/);
const say_num_p = new RegExp(/[;；]s(\d)/);
const param_p = new RegExp(/-(\w+)\s+?/);
let global_words ;
let global_latest_query ="";
let global_latest_single={
    key:"",
    value:""
}
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
    if(query == global_latest_single.key)
        return global_latest_single.value;
    let result = await translate(query, opts)
    let items = [];
    items.push({title:result[0][0][0]+" "+result[0][1][2],subtitle:result[0][0][1]+" "+result[0][1][3],sort_key:1,autocomplete:result[0][0][0],text:{copy:result[0][0][0]}});
    let meaning = result[1];
    if(meaning){
        meaning.forEach(function(type) {
            let type_name = type[0];
            type[2].forEach(function(word){
                items.push({
                    title:word[0],
                    subtitle:type_name+": "+word[1].join(","),
                    sort_key:word[3],
                    text:{copy:word[0]},
                    autocomplete:word[0]+concern_char,
                })
            })
        }, this);
        items = items.sort((a,b)=>{return b.sort_key-a.sort_key}).slice(0,10);
    }
    global_latest_single={key:query,value:{items:items}};
    return ({items:items})
}

function handle_error(e){
    return ({items:[{
        title:e.toString(),
        valid:false,
        subtitle:e.stack||''
    }]})
}
function typing(query,isTyping,no_rerun){
    if(isTyping)
        global_latest_query = query;  
    return ({rerun:no_rerun?undefined:0.1,
        items:[{
        title:query,
        subtitle:query,
        valid:false,
        autocomplete: query + concern_char
    }]})
}
async function say(query,real_qeury,opts){
    opts = JSON.parse(JSON.stringify(opts));
    let say_num = query.match(say_num_p);
    say_num = say_num&&say_num[1];
    let value = global_latest_single.value;
    if(value){
        value = JSON.parse(JSON.stringify(value))
        value["items"][(say_num||1)-1]["icon"]= {
            "type": "png",
            "path": path.resolve(__dirname,"volume.png")
        };
        if(say_num){
            real_qeury=value["items"][say_num-1]["autocomplete"];
        }else{
            opts.to = opts.from;
        }
    }
    return  speak(real_qeury,opts,value);
}

async function speak(text,opts,value){
    opts = opts||{};
    opts.to = opts.to||find_language(text)
    await translate.speak(text,opts);
    return value|| typing("speak: "+text,null,true);
}
async function main(total_query,variables){
    let {opts,query} = get_param(total_query);
    let real_qeury = get_real_qeury(query);
    if(!real_qeury){
        return typing("inputing...",true,true)
    }
    let words = variables.words?global_words:"";
    opts.from = opts.from ||find_language(query);
    opts.to = opts.to|| (opts.from=="zh-CN"?"en":"zh-CN");
    if(say_p.test(query)){
        return  say(query,real_qeury,opts)
    }
    if (concern_char_p.test(query)) {
        return single_translate(real_qeury,opts).catch(handle_error)
    }
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
function get_real_qeury(query){
    let index = query.search(concern_char_p);
    if(index==-1)
        return query;
    return query.substr(0,index);
}
function get_param(query){
    let match = query.match(param_p);
    let opts = {};
    if(match){
        opts = {to:match[1]}
    }
    return {query:query.replace(param_p,""),opts:opts}
}
function find_language(text){
   if(/.*[\u4e00-\u9fa5]+.*$/.test(text)){
       return "zh-CN";
   } else if(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)){
       return "ja"
   }else return "en";
}


const koa = new Koa();

koa.use(require('koa-body')())
koa.use(async function(ctx,next){
    let query = ctx.request.body;
    ctx.body = await main(query.query,query);
    ctx.body = ctx.body||typing(query.query);
    console.log(ctx.request.body,ctx.body)
})
koa.listen(6532);





