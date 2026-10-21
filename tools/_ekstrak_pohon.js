// Evaluasi data pohon dari index.html dengan stub DOM, lalu keluarkan struktur ke JSON.
const fs=require('fs'), vm=require('vm');
const file=process.argv[2], out=process.argv[3];
const html=fs.readFileSync(file,'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function mk(){const f=function(){};const p=new Proxy(f,{get(t,k){if(k===Symbol.toPrimitive)return()=>0;if(k==='length')return 0;if(k==='then')return undefined;if(k===Symbol.iterator)return function*(){};return p},apply(){return p},construct(){return p},set(){return true},has(){return true}});return p}
const P=mk();
const ctx={document:P,window:P,navigator:P,location:P,localStorage:P,fetch:()=>Promise.resolve(P),setTimeout:()=>0,clearTimeout:()=>0,setInterval:()=>0,requestAnimationFrame:()=>0,MutationObserver:function(){return P},DOMParser:function(){return P},DOMMatrix:function(){return P},console:{log(){},warn(){},error(){}},Math,JSON,Object,Array,String,Number,RegExp,Set,Map,Date,Promise,Symbol,parseFloat,parseInt};
vm.createContext(ctx);
const errs=[];
scripts.forEach((code,i)=>{try{vm.runInContext(code,ctx,{filename:'script'+i})}catch(e){errs.push('script'+i+': '+e.message)}});
const names=['treeData','descChildren','tokohIslamChildren','tokohDuniaChildren'];
const roots={};
names.forEach(n=>{try{roots[n]=vm.runInContext(n,ctx)}catch(e){errs.push('akses '+n+': '+e.message)}});
function slim(n){ if(!n||typeof n!=='object')return null;
  const o={name:n.name||n.titleLines&&n.titleLines.map(t=>t.text).join(' ')||'',infoNote:n.infoNote||null};
  if(n.infoName)o.infoName=n.infoName; o.periode=!!(n.titleLines&&n.titleAutoHeight); o.chainList=!!n.chainList;
  o.children=(n.children||[]).map(slim).filter(Boolean); return o}
const res={errs,roots:{}};
for(const n of names){ if(roots[n]) res.roots[n]= Array.isArray(roots[n])?roots[n].map(slim):slim(roots[n]); }
fs.writeFileSync(out,JSON.stringify(res));
console.log('errors:',errs);
for(const n of names) console.log(n, roots[n]?'ok':'MISSING');
