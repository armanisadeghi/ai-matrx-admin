// The inline script components/dev/HeldRunHmrGuard.tsx renders for a held test run (why: see there).
// A plain string module with no imports, so its forcing test runs under plain Node:
//   node --test components/dev/heldRunHmrScript.test.mjs
export const HELD_RUN_HMR_SCRIPT = `(function(){try{
var W=window.WebSocket;if(!W||W.__matrxHeldRun)return;
var HMR=/\\/_next\\/(hmr|webpack-hmr)/;
function Quiet(url){var s=this;s.url=String(url);s.readyState=0;s.binaryType="blob";s.protocol="";s.extensions="";s.bufferedAmount=0;s.onopen=null;s.onmessage=null;s.onerror=null;s.onclose=null;s._l={};
setTimeout(function(){s.readyState=1;var e=new Event("open");if(s.onopen)s.onopen(e);(s._l.open||[]).forEach(function(f){f(e)});},0);}
Quiet.prototype.send=function(){};
Quiet.prototype.close=function(){this.readyState=3;};
Quiet.prototype.addEventListener=function(t,f){(this._l[t]||(this._l[t]=[])).push(f);};
Quiet.prototype.removeEventListener=function(t,f){var a=this._l[t]||[],i=a.indexOf(f);if(i>=0)a.splice(i,1);};
Quiet.prototype.dispatchEvent=function(){return true;};
Quiet.prototype.CONNECTING=0;Quiet.prototype.OPEN=1;Quiet.prototype.CLOSING=2;Quiet.prototype.CLOSED=3;
function Guarded(url,protocols){if(HMR.test(String(url))){console.info("[held-run] hot reload is off for this test run: other sessions' edits arrive on the next navigation, never as a reload mid-step (pnpm preview:release ends the hold)");return new Quiet(url);}return protocols===undefined?new W(url):new W(url,protocols);}
Guarded.prototype=W.prototype;Guarded.CONNECTING=0;Guarded.OPEN=1;Guarded.CLOSING=2;Guarded.CLOSED=3;Guarded.__matrxHeldRun=true;
window.WebSocket=Guarded;document.documentElement.setAttribute("data-matrx-held-run","");
}catch(e){}})();`;
