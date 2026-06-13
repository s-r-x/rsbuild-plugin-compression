import "./style.css";
// @ts-expect-error
import webpImage from "./image.webp";
// @ts-expect-error
import svgImage from "./nvim.svg";

console.log(webpImage);
console.log(svgImage);
(async function loadPreact() {
  const module = await import(/* webpackChunkName: "preact" */ "./preact");
  console.log(module);
})();
(async function loadLibWithCss() {
  await import(/* webpackChunkName: "bootstrap" */ "./bootsrap");
})();
(async function loadNanoid() {
  const module = await import(/* webpackChunkName: "nanoid" */ "./nanoid");
  console.log(module);
})();
(async function loadRadash() {
  const module = await import(/* webpackChunkName: "radash" */ "./radash");
  console.log(module);
})();
(async function loadJson() {
  {
    const jsonUrl = new URL("./data.json", import.meta.url).href;
    const response = await fetch(jsonUrl);
    const json = await response.json();
    console.log(json);
  }
  {
    const jsonUrl = new URL("./data-2.json", import.meta.url).href;
    const response = await fetch(jsonUrl);
    const json = await response.json();
    console.log(json);
  }
})();
