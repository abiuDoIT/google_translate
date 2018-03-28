
let a = "wd a  s;s sd "
console.log(a.substr(0,a.search(/[;；]s/)))
let re = new RegExp(/-(\w+)\s+?/g)
console.log(re.exec(" -ja -ha  "))
console.log((" -ja -ha  ").replace(re,"h"))