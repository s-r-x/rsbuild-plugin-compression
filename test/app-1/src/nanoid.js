/**
 * Bundled by jsDelivr using Rollup v2.79.2 and Terser v5.39.0.
 * Original file: /npm/nanoid@5.1.6/index.browser.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
const t="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";const e=t=>crypto.getRandomValues(new Uint8Array(t)),r=(t,e,r)=>{const l=(2<<Math.log2(t.length-1))-1,n=-~(1.6*l*e/t.length);return(o=e)=>{let a="";for(;;){let e=r(n),u=0|n;for(;u--;)if(a+=t[e[u]&l]||"",a.length>=o)return a}}},l=(t,l=21)=>r(t,0|l,e),n=(e=21)=>{let r="",l=crypto.getRandomValues(new Uint8Array(e|=0));for(;e--;)r+=t[63&l[e]];return r};export{l as customAlphabet,r as customRandom,n as nanoid,e as random,t as urlAlphabet};export default null;
//# sourceMappingURL=/sm/a648cfbade6cb10ecc3a8359c46270c9eab46dddb57c122b7e2b4cbc2e59f4a9.map