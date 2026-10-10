// Theme preference: "light" (Wayfinding), "dark" (Night terminal), or "system" (follow the phone).
// The resolved theme lives on <html data-theme="light|dark">; globals.css reads it.

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ck-theme";

// Browser status-bar colour per theme; matches --bg in globals.css.
export const THEME_COLORS = { light: "#f4f2ed", dark: "#0f1318" } as const;

// Runs before first paint (inlined in layout.tsx) so a dark phone never flashes light.
// Also exposes window.__ckApplyTheme for ThemeToggle, and follows the phone while on "system".
export const themeScript = `(function(){
var K=${JSON.stringify(THEME_STORAGE_KEY)},C=${JSON.stringify(THEME_COLORS)};
var m=window.matchMedia("(prefers-color-scheme: dark)");
function pref(){try{var p=localStorage.getItem(K);return p==="light"||p==="dark"?p:"system"}catch(e){return "system"}}
function apply(p){var t=p==="system"?(m.matches?"dark":"light"):p;var d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("data-theme-pref",p);
var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++){ms[i].setAttribute("content",C[t])}}
window.__ckApplyTheme=function(p){try{if(p==="system")localStorage.removeItem(K);else localStorage.setItem(K,p)}catch(e){}apply(p)};
apply(pref());
var on=function(){if(pref()==="system")apply("system")};
if(m.addEventListener)m.addEventListener("change",on);else if(m.addListener)m.addListener(on);
document.addEventListener("DOMContentLoaded",function(){apply(pref())});
})();`;
