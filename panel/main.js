(()=>{var g="openchamber.sdk",m=1;var Be=`
:root {
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 40%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 65%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [data-oc-scrolling] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [data-oc-scrolling] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [data-oc-scrolling]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [data-oc-scrolling] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;function Xe(e){let t=e.documentElement;if(t.hasAttribute("data-oc-scrollbar-activity"))return;t.setAttribute("data-oc-scrollbar-activity","");let r=new WeakMap;e.addEventListener("scroll",(o)=>{let n=o.target===e?t:o.target;if(!(n instanceof Element))return;if(!n.hasAttribute("data-oc-scrolling"))n.setAttribute("data-oc-scrolling","");let s=r.get(n);if(s!==void 0)clearTimeout(s);r.set(n,setTimeout(()=>{r.delete(n),n.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var Br=`(${Xe.toString()})(document);`;var ze=128,Je=65536;var Ut=["file","directory","other","missing"],Ke=(e)=>Boolean(e&&"sessionId"in e),We=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var Nt=/^[0-9a-f]{7,64}$/i,qe=(e)=>Nt.test(e),be=500,xe=32000,Gt=16000,Ht=128,jt=200,$t=2000,ce=16000,Dt=80,Ft=200,Bt=16000;var Xt=2000;var Ye=20000,Ee=1024,Te=2000000;var ye=64000,ve=8000,Qe=4000;var Ze=90000;var zt=999,Jt=1e4,Se=500,Vt=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],Kt=["stopped","starting","ready","failed"],Xr=new Set(Vt),Wt=(e)=>Xr.has(e),qt=(e)=>e&&Wt(e)?e:"HOST_REJECTED",te=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(te);if(Object(e)===e)return Object.values(e).every(te);return!1},Yt=(e)=>te(e)&&JSON.stringify(e).length<=Bt,Mt=(e)=>e?.trim().slice(0,Ft)??"",re=(e)=>{let t=e.id.trim().slice(0,Ht),r=e.title.trim().slice(0,jt),o=e.url.trim().slice(0,$t),n=e.text?.trim().slice(0,ce),s=e.author?.trim().slice(0,Dt),a=e.kind==="pull"?"pull":"issue",d={providerId:e.providerId.trim(),id:t,title:r||t,url:o,kind:a};if(n)d.text=n;if(s)d.author=s;if(a==="pull"){let p=Mt(e.branches?.head),u=Mt(e.branches?.base);if(p&&u)d.branches={head:p,base:u}}if(Yt(e.data))d.data=e.data;return d},et=(e)=>{let t=re(e);if(e.projectId)t.projectId=e.projectId;if(e.navigation)t.navigation=e.navigation;if(e.worktree)t.worktree=e.worktree;return t},tt=(e)=>{let t={text:e.text.trim().slice(0,Gt)};if(e.send)t.send=!0;return t},rt=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(zt,Math.max(0,Math.round(e)))},ot=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(Jt,Math.max(0,Math.ceil(e)))};var oe=(e)=>e.length>0&&e.length<=Ee&&!e.includes("\x00")&&!e.includes("\\");var ke=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>Xt)return!1;return!e.split("/").some((r)=>r==="."||r==="..")},zr=new Set(Kt),nt=(e)=>Boolean(e&&"status"in e&&zr.has(String(e.status))&&!("body"in e)),_e=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),st=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),it=(e)=>Boolean(e&&"written"in e&&e.written===!0),at=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Jr=new Set(Ut),lt=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Jr.has(String(e.kind))&&Number.isFinite(e.size)),ct=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Vr=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),Kr=(e)=>Object(e)===e?e:null,Ve=(e)=>String(e)===e&&e.length>0,Wr=(e)=>{if(!Ve(e.id))return null;if(e.ok===!0){let t={channel:g,v:m,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)t.payload=e.payload;return t}if(e.ok===!1&&Ve(e.error))return{channel:g,v:m,type:"result",id:e.id,ok:!1,error:e.error,code:qt(Ve(e.code)?e.code:void 0)};return null},dt=(e)=>{let t=Kr(e);if(!t||t.channel!==g||t.v!==m)return null;if(t.type==="result")return Wr(t);if(!Vr.has(String(t.type))||Object(t.payload)!==t.payload)return null;return t};class f extends Error{code;constructor(e,t){super(t);this.name="HostRequestError",this.code=e}}var Qt=()=>Promise.reject(new f("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),we=()=>Promise.reject(new f("BAD_PATH",`File path must be 1 to ${Ee} characters without NUL or backslash.`)),x=(e)=>(e.value+=1,`oc-${e.value}`),pt=(e={})=>{let t=e.target??("window"in globalThis?window:null);if(!t)throw new f("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let r=e.acceptSource??((i)=>i===t.parent),o=e.requestTimeoutMs??Ye,n=new Set,s=new Set,a=new Set,d=new Set,p=new Set,u=new Set,E=new Set,_=null,D=null,A=new Map,F=new Map,V=!1,b={value:0},T=null,X=null,Lt=(i)=>{if(!i)return null;return{sessionId:i.id,phase:i.busy?"started":"completed"}},K=(i)=>{t.parent.postMessage(i,"*")},P=(i,l)=>{for(let h of i)try{h(l)}catch(S){console.error(S)}},Pt=(i)=>{if(!(i instanceof MessageEvent))return;if(!r(i.source))return;let l=dt(i.data);if(!l)return;if(l.type==="workspace"){let S=F.get(l.payload.subscriptionId);if(S)P([S],l.payload.snapshot);return}if(l.type==="ready"){if(T=l.payload,X=Lt(l.payload.session),P(n,l.payload),P(s,l.payload.directory),P(a,l.payload.session),X)P(d,X);P(p,l.payload.connection),P(u,l.payload.settings),P(E,l.payload.item);return}if(l.type==="directory"){if(T)T={...T,directory:l.payload.directory};P(s,l.payload.directory);return}if(l.type==="session"){if(T)T={...T,session:l.payload.session};if(!l.payload.session)X=null;else if(X?.sessionId!==l.payload.session.id)X=Lt(l.payload.session);P(a,l.payload.session);return}if(l.type==="session-lifecycle"){X=l.payload,P(d,l.payload);return}if(l.type==="connection"){if(T)T={...T,connection:l.payload.connection};P(p,l.payload.connection);return}if(l.type==="settings"){if(T)T={...T,settings:l.payload.settings};P(u,l.payload.settings);return}if(l.type==="item"){if(T)T={...T,item:l.payload.item};P(E,l.payload.item);return}if(l.type==="action"){let S=(O)=>{if(!V)K({channel:g,v:m,type:"action-result",id:l.id,payload:O})},H=D;if(!H){S({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>H(l.payload)).then(()=>S({ok:!0}),(O)=>{let Fe=(O instanceof Error?O.message:String(O)).trim();S({ok:!1,error:(Fe||"Action failed.").slice(0,Se)})});return}if(l.type==="resolve"){let S=(O)=>{K({channel:g,v:m,type:"resolve-result",id:l.id,payload:O})},H=_;if(!H){S({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>H(l.payload)).then((O)=>S({item:O?re(O):null}),(O)=>{let Fe=(O instanceof Error?O.message:String(O)).trim();S({error:(Fe||"Command failed.").slice(0,Se)})});return}let h=A.get(l.id);if(!h)return;if(clearTimeout(h.timer),A.delete(l.id),l.ok){h.resolve(l.payload);return}h.reject(new f(l.code,l.error))};t.addEventListener("message",Pt),K({channel:g,v:m,type:"hello"});let M=(i,l=o)=>{if(V||t.parent===t)return Promise.reject(new f("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((h,S)=>{let H=setTimeout(()=>{A.delete(i.id),S(new f("HOST_TIMEOUT","Host did not answer in time."))},l);A.set(i.id,{resolve:h,reject:S,timer:H}),K(i)})},L=(i)=>M(i).then(()=>{return}),W={channel:g,v:m},q=(i,l=1024)=>{if(!i.trim()||i.length>l)throw new f("HOST_REJECTED",`Identity must contain 1 to ${l} characters.`)},$e=async(i)=>{if(i.kind!=="projects")q(i.projectId);let l=await M({...W,type:"workspace-read",id:x(b),payload:i});if(!l||!("kind"in l)||!("state"in l)||l.kind!==i.kind)throw new f("HOST_REJECTED","Host did not return workspace data.");return l},De=async(i,l)=>{if(i.kind!=="projects")q(i.projectId);let h=x(b);F.set(h,l);try{await L({...W,type:"workspace-subscribe",id:x(b),payload:{subscriptionId:h,query:i}})}catch(S){if(F.delete(h),!V)K({...W,type:"workspace-unsubscribe",id:x(b),payload:{subscriptionId:h}});throw S}return()=>{if(!F.delete(h)||V)return;K({...W,type:"workspace-unsubscribe",id:x(b),payload:{subscriptionId:h}})}},me=async(i)=>{if("key"in i&&(i.key.length===0||i.key.length>ze))throw new f("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(i.op==="set"&&!te(i.value))throw new f("HOST_REJECTED","Storage values must be JSON.");if(i.op==="set"&&new TextEncoder().encode(JSON.stringify(i.value)).length>Je)throw new f("HOST_REJECTED","Storage value exceeds 64 KiB.");let l=await M({...W,type:"storage",id:x(b),payload:i});if(!l||!("storage"in l)||l.op!==i.op)throw new f("HOST_REJECTED","Host did not return storage data.");return l};return{onAction:(i)=>(D=i,()=>{if(D===i)D=null}),listProjects:async()=>{let i=await $e({kind:"projects"});if(i.kind!=="projects")throw new f("HOST_REJECTED","Expected projects.");return i},listWorktrees:async(i)=>{let l=await $e({kind:"worktrees",projectId:i});if(l.kind!=="worktrees")throw new f("HOST_REJECTED","Expected worktrees.");return l},listSessions:async(i)=>{let l=await $e({kind:"sessions",projectId:i});if(l.kind!=="sessions")throw new f("HOST_REJECTED","Expected sessions.");return l},onProjects:(i)=>De({kind:"projects"},(l)=>{if(l.kind==="projects")i(l)}),onWorktrees:(i,l)=>De({kind:"worktrees",projectId:i},(h)=>{if(h.kind==="worktrees")l(h)}),onSessions:(i,l)=>De({kind:"sessions",projectId:i},(h)=>{if(h.kind==="sessions")l(h)}),openSession:async(i)=>{q(i),await L({...W,type:"open-session",id:x(b),payload:{sessionId:i}})},storage:{get:async(i)=>{let l=await me({op:"get",key:i});return l.op==="get"&&l.found?l.value:void 0},set:async(i,l)=>{await me({op:"set",key:i,value:l})},delete:async(i)=>{await me({op:"delete",key:i})},keys:async()=>{let i=await me({op:"keys"});if(i.op!=="keys")throw new f("HOST_REJECTED","Expected storage keys.");return i.keys}},onReady:(i)=>{if(n.add(i),T)i(T);return()=>{n.delete(i)}},onDirectory:(i)=>{if(s.add(i),T)i(T.directory);return()=>{s.delete(i)}},onSession:(i)=>{if(a.add(i),T)i(T.session);return()=>{a.delete(i)}},onSessionLifecycle:(i)=>{if(d.add(i),X)i(X);return()=>{d.delete(i)}},onConnection:(i)=>{if(p.add(i),T)i(T.connection);return()=>{p.delete(i)}},onSettings:(i)=>{if(u.add(i),T)i(T.settings);return()=>{u.delete(i)}},onItem:(i)=>{if(E.add(i),T)i(T.item);return()=>{E.delete(i)}},onResolve:(i)=>(_=i,()=>{if(_===i)_=null}),toast:(i)=>{let l=i.message.trim();if(!l||l.length>be)return Promise.reject(new f("HOST_REJECTED",`Toast message must contain 1 to ${be} characters.`));if(i.copy&&i.copy!==!0&&(!i.copy.text.length||i.copy.text.length>xe))return Promise.reject(new f("HOST_REJECTED",`Toast copy text must contain 1 to ${xe} characters.`));return L({channel:g,v:m,type:"toast",id:x(b),payload:{...i,message:l}})},openUrl:(i)=>L({channel:g,v:m,type:"open-url",id:x(b),payload:{url:i}}),openCommit:(i)=>qe(i)?L({channel:g,v:m,type:"open-commit",id:x(b),payload:{sha:i}}):Promise.reject(new f("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(i)=>L({channel:g,v:m,type:"open-surface",id:x(b),payload:{surfaceId:i}}),writeClipboard:(i)=>L({channel:g,v:m,type:"clipboard-write",id:x(b),payload:{text:i}}),compose:(i)=>L({channel:g,v:m,type:"compose",id:x(b),payload:i}),attach:(i)=>L({channel:g,v:m,type:"attach",id:x(b),payload:re(i)}),startSession:async(i)=>{if(i.projectId!==void 0)q(i.projectId);let l=i.worktree;if(l&&l!==!0)if(l.kind==="existing")q(l.directory);else{if(l.name!==void 0)q(l.name,200);if(l.baseBranch!==void 0)q(l.baseBranch,200)}let h=await M({channel:g,v:m,type:"start-session",id:x(b),payload:et(i)},e.requestTimeoutMs??180000);if(!Ke(h))throw new f("HOST_REJECTED","Host did not return a session.");return h},prompt:(i)=>M({channel:g,v:m,type:"prompt",id:x(b),payload:tt(i)}).then((l)=>{if(!We(l))throw new f("HOST_REJECTED","Host did not return a prompt result.");return l}),sessionLink:(i)=>L({channel:g,v:m,type:"session-link",id:x(b),payload:re(i)}),close:()=>L({channel:g,v:m,type:"close",id:x(b)}),oauthStart:()=>L({channel:g,v:m,type:"oauth-start",id:x(b)}),oauthDisconnect:()=>L({channel:g,v:m,type:"oauth-disconnect",id:x(b)}),request:(i)=>(ke(i.path)?M({channel:g,v:m,type:"request",id:x(b),payload:i}):Qt()).then((l)=>{if(!_e(l))throw new f("HOST_REJECTED","Host request result was empty.");return l}),serviceRequest:(i)=>(ke(i.path)?M({channel:g,v:m,type:"service-request",id:x(b),payload:i}):Qt()).then((l)=>{if(!_e(l))throw new f("HOST_REJECTED","Host service request result was empty.");return l}),serviceStatus:()=>M({channel:g,v:m,type:"service-status",id:x(b)}).then((i)=>{if(!nt(i))throw new f("HOST_REJECTED","Host did not return service status.");return i}),readFile:(i)=>(oe(i)?M({channel:g,v:m,type:"file-read",id:x(b),payload:{path:i}}):we()).then((l)=>{if(!st(l))throw new f("HOST_REJECTED","Host did not return file content.");return l}),writeFile:(i,l)=>{if(!oe(i))return we();if(l.length>Te)return Promise.reject(new f("FILE_TOO_LARGE",`Content is over ${Te} characters.`));return M({channel:g,v:m,type:"file-write",id:x(b),payload:{path:i,content:l}}).then((h)=>{if(!it(h))throw new f("HOST_REJECTED","Host did not confirm the write.");return h})},listDir:(i)=>(oe(i)?M({channel:g,v:m,type:"file-list",id:x(b),payload:{path:i}}):we()).then((l)=>{if(!at(l))throw new f("HOST_REJECTED","Host did not return directory entries.");return l}),stat:(i)=>(oe(i)?M({channel:g,v:m,type:"file-stat",id:x(b),payload:{path:i}}):we()).then((l)=>{if(!lt(l))throw new f("HOST_REJECTED","Host did not return file status.");return l}),generate:(i)=>{let l=i.prompt.trim(),h=i.system?.trim();if(l.length===0||l.length>ye)return Promise.reject(new f("HOST_REJECTED",`Prompt must be 1 to ${ye} characters.`));if(h!==void 0&&(h.length===0||h.length>ve))return Promise.reject(new f("HOST_REJECTED",`System prompt must be 1 to ${ve} characters.`));let S=i.maxOutputTokens===void 0?void 0:Math.min(Qe,Math.max(1,Math.floor(i.maxOutputTokens)));if(S!==void 0&&!Number.isFinite(S))return Promise.reject(new f("HOST_REJECTED","maxOutputTokens must be a number."));let H={prompt:l};if(h!==void 0)H.system=h;if(S!==void 0)H.maxOutputTokens=S;return M({channel:g,v:m,type:"generate",id:x(b),payload:H},e.requestTimeoutMs??Ze).then((O)=>{if(!ct(O))throw new f("HOST_REJECTED","Host did not return generated text.");return O})},setBadge:(i)=>L({channel:g,v:m,type:"badge",id:x(b),payload:{count:rt(i)}}),setHeight:(i)=>L({channel:g,v:m,type:"resize",id:x(b),payload:{height:ot(i)}}),dispose:()=>{for(let i of F.keys())K({...W,type:"workspace-unsubscribe",id:x(b),payload:{subscriptionId:i}});F.clear(),V=!0,_=null,D=null,t.removeEventListener("message",Pt);for(let i of A.values())clearTimeout(i.timer),i.reject(new f("HOST_UNAVAILABLE","Host client was disposed."));A.clear(),n.clear(),s.clear(),a.clear(),d.clear(),p.clear(),u.clear(),E.clear()}}};var Zt=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var on=new Set(Zt);var er=["none","agent","user"];var sn=new Set(er);function tr(){let e=pt();return{serviceRequest:(t)=>e.serviceRequest({method:t.method??"GET",path:t.path,...t.query?{query:t.query}:{},...t.body!=null?{body:t.body}:{}}),readFile:(t)=>e.readFile(t),listProjects:()=>e.listProjects(),listWorktrees:(t)=>e.listWorktrees(t),startSession:(t)=>e.startSession(t),openUrl:(t)=>e.openUrl(t),onReady:(t)=>e.onReady(t),dispose:()=>e.dispose()}}var qr=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],rr=(e,t)=>{t.style.colorScheme=e.mode;for(let[r,o]of qr)t.style.setProperty(r,e.tokens[o]);t.style.setProperty("font-family",e.tokens.font),t.style.setProperty("font-size","0.875rem"),t.style.setProperty("line-height","1.45"),t.style.setProperty("color",e.tokens.foreground)},ut=(e,t)=>{if(rr(e.theme,t),t.dataset)t.dataset.ocSurface=e.surface,t.dataset.ocTheme=e.theme.mode};var or="oc-sdk-ui-style",ne=(e)=>{while(e.firstChild)e.removeChild(e.firstChild)},R=(e)=>{let t=document.getElementById(or);if(t instanceof HTMLStyleElement){if(t.textContent!==e)t.textContent=e;return}Xe(document);let r=document.createElement("style");r.id=or,r.textContent=e,document.head.appendChild(r)},v=(e,t)=>{let r=document.createElement(e);if(t)r.className=t;return r},z=(e)=>{let t=v("button",e);return t.type="button",t},U=(e,t)=>{let r=t??"";if(e.textContent!==r)e.textContent=r};var Yr={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},y=(e,t)=>`var(--${e}, var(--oc-${Yr[e]}, ${t}))`,Y=y("surface-background","transparent"),Ae=y("surface-elevated","transparent"),de=y("surface-elevated-foreground","inherit"),pe=y("surface-foreground","inherit"),k=y("surface-muted-foreground","gray"),Qr=y("surface-muted","transparent"),G=y("interactive-border","currentColor"),N=y("interactive-hover","transparent"),Q=y("interactive-active","transparent"),ft=y("interactive-selection","transparent"),ht=y("interactive-selection-foreground","inherit"),ir=y("interactive-focus-ring","currentColor"),j=y("primary","currentColor"),gt=y("primary-text","inherit"),mt=y("error-text","inherit"),Zr=y("font-sans","inherit"),bt=y("font-mono","monospace"),nr=y("radius","9px"),w=(e,t,r="transparent")=>`color-mix(in srgb, ${e} ${t}%, ${r})`,sr=`box-shadow: 0 0 0 2px ${ir};`,Re=(e)=>{let t=y(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${t}; --oc-sdk-tone-text: ${y(`${e}-text`,"inherit")}; }`},C=`
${Be}
.oc-sdk { box-sizing: border-box; color: ${pe}; font-family: ${Zr}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${sr} }
.oc-sdk-mono { font-family: ${bt}; }
.oc-sdk-muted { color: ${k}; }
${Re("success")}${Re("warning")}${Re("error")}${Re("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${j}; --oc-sdk-tone-text: ${gt}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${nr}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${gt}; background: ${w(j,10,Y)}; border-color: ${w(j,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${w(j,16,Y)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${w(j,22,Y)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${Qr}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${Q}, ${Q}); }
.oc-sdk-btn[data-variant="outline"] { background: ${Ae}; color: ${de}; border-color: ${G}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${Q}, ${Q}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${N}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${Q}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${y("status-error","red")}; color: ${mt}; background: ${w("var(--oc-sdk-tone)",7,Y)}; border-color: ${w("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${w("var(--oc-sdk-tone)",9,Y)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${w("var(--oc-sdk-tone)",11,Y)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${k}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${mt}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${nr}; background: ${Ae}; color: ${de}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${w(G,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${k}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${ir}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${y("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${y("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${bt}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${k}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${j}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${k}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${N}; color: ${pe}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${G}; border-radius: 6px; background: ${Ae}; color: ${de}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${Q}, ${Q}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${k}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${k}; }
.oc-sdk-popup { --surface-foreground: ${de}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${w(G,60)}; border-radius: 12px; background: ${Ae}; color: ${de}; box-shadow: 0 8px 24px ${w(pe,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${N}; }
.oc-sdk-option[aria-selected="true"] { background: ${ft}; color: ${ht}; }
.oc-sdk-option[data-destructive="true"] { color: ${mt}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${w(y("status-error","red"),10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${k}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${k}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${G}; border-radius: 4px; color: ${j}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${w(j,65,G)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${G}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${Y}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${j}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${sr} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${k}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${w(pe,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${k}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${pe}; }
.oc-sdk-tab[aria-selected="true"] { color: ${ht}; background: ${ft}; border-color: ${G}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${k}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${N}; color: ${k}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${w("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${N}; }
.oc-sdk-row[aria-selected="true"] { background: ${ft}; color: ${ht}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${bt}; font-size: 0.75rem; color: ${k}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${k}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${k}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${k}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${k}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${k}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${G}; border-top-color: ${j}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${w("var(--oc-sdk-tone)",40)}; border-radius: 8px; background: ${w("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${k}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${k}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${w(G,40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${k}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${G}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${j}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${gt}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${w(G,60)}; }
`;var eo=()=>{let e=document.createElement("span");return e.className="oc-sdk-spinner-ring",e.setAttribute("aria-hidden","true"),e},B=(e,t)=>{R(C);let r=t,o=z("oc-sdk oc-sdk-btn"),n=eo(),s=document.createElement("span");o.append(s),e.append(o);let a=()=>{if(o.dataset.variant=r.variant??"default",o.dataset.size=r.size??"default",o.disabled=Boolean(r.disabled)||Boolean(r.loading),o.dataset.loading=r.loading?"true":"false",o.setAttribute("aria-busy",r.loading?"true":"false"),r.loading&&n.parentNode!==o)o.prepend(n);else if(!r.loading&&n.parentNode===o)n.remove();U(s,r.label)},d=()=>{if(r.disabled||r.loading)return;r.onClick()};return o.addEventListener("click",d),a(),{update:(p)=>{r={...r,...p},a()},dispose:()=>{o.removeEventListener("click",d),o.remove()}}};var se=(e,t="vertical")=>{let[r,o]=t==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(e.key===r||e.ctrlKey&&e.key.toLowerCase()==="n")return"next";if(e.key===o||e.ctrlKey&&e.key.toLowerCase()==="p")return"previous";if(e.key==="Home")return"first";if(e.key==="End")return"last";return null},ie=(e,t,r)=>{let o=e.filter((p)=>!p.disabled);if(o.length===0)return null;let n=o[0],s=o[o.length-1];if(r==="first"||!n||!s)return n?.id??null;if(r==="last")return s.id;let a=o.findIndex((p)=>p.id===t);if(a===-1)return r==="next"?n.id:s.id;return o[Math.min(o.length-1,Math.max(0,a+(r==="next"?1:-1)))]?.id??null};var xt=(e,t)=>{R(C);let r=t,o=v("div","oc-sdk oc-sdk-tabs");o.setAttribute("role","tablist"),e.append(o);let n=()=>{ne(o),o.dataset.track=r.trackBackground?"true":"false";for(let a of r.items){let d=z("oc-sdk-tab");d.setAttribute("role","tab");let p=a.id===r.activeId;d.setAttribute("aria-selected",p?"true":"false"),d.tabIndex=p?0:-1,d.dataset.id=a.id;let u=v("span");if(u.textContent=a.label,d.append(u),a.count!==void 0){let E=v("span","oc-sdk-tab-count");E.textContent=String(a.count),d.append(E)}d.addEventListener("click",()=>{if(a.id!==r.activeId)r.onChange(a.id)}),o.append(d)}},s=(a)=>{let d=se(a,"horizontal");if(!d)return;let p=ie(r.items,r.activeId,d);if(p&&p!==r.activeId){a.preventDefault(),r.onChange(p);let u=o.querySelector(`[data-id="${CSS.escape(p)}"]`);if(u instanceof HTMLElement)u.focus()}};return o.addEventListener("keydown",s),n(),{update:(a)=>{r={...r,...a},n()},dispose:()=>{o.removeEventListener("keydown",s),o.remove()}}};var Et=(e,t)=>{R(C);let r=t,o=v("div","oc-sdk oc-sdk-empty"),n=v("h2","oc-sdk-empty-title"),s=v("p","oc-sdk-empty-body"),a=v("div","oc-sdk-empty-action");o.append(n,s,a),e.append(o);let d=null,p=()=>{if(U(n,r.title),U(s,r.body),s.hidden=!r.body,a.hidden=!r.action,!r.action){d?.dispose(),d=null;return}let u={label:r.action.label,onClick:r.action.onClick};if(d)d.update(u);else d=B(a,{...u,variant:"outline",size:"sm"})};return p(),{update:(u)=>{r={...r,...u},p()},dispose:()=>{d?.dispose(),d=null,o.remove()}}};var lr="gitlab-pipelines",ae="gitlab.com",cr=20,dr="/proxy",Tt="/config",yt="/token",pr="/git-config",Oe=20000,ur=256000,fr=5000,hr=1000;var so={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"calendar"},waiting_for_resource:{label:"Waiting for resource",tone:"neutral",glyph:"pause"},waiting_for_callback:{label:"Waiting for callback",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},gr={label:"Unknown",tone:"neutral",glyph:"dot"};function Z(e){if(!e)return gr;return so[e]??gr}function ue(e){let t=Z(e.status);if(e.status==="failed"&&e.allow_failure)return{...t,label:"Failed (allowed)",tone:"warning"};return t}var io=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],ao=new Set(io);function J(e){return e!=null&&ao.has(e)}var lo=3;function mr(e){return e<lo}var co=new Set(["success","failed","canceled","skipped"]);function br(e,t){return(e??[]).map((r)=>{let o=r.downstream_pipeline??null;if(o)return{id:r.id,name:r.name,stage:r.stage,state:"ready",status:o.status,downstream:o};let n=r.status==="failed"?"could-not-start":co.has(r.status)?"ready":"starting";return{id:r.id,name:r.name,stage:r.stage,state:n,status:r.status,downstream:null}})}function po(e){let t;try{t=new URL(e)}catch{return null}let o=/^\/?(.+?)\/-\//.exec(t.pathname)?.[1];if(!o)return null;try{return decodeURIComponent(o)}catch{return o}}function vt(e){return po(e.web_url)}function St(e,t){let r=vt(e);if(r==null)return`project #${e.project_id}`;return r===t?"child pipeline":r}function Ie(e){return(e??[]).filter((t)=>t.downstream!=null).length}function xr(e,t){if(e==="starting")return{label:"Starting",tone:"warning",glyph:"clock"};if(e==="could-not-start")return{label:"Could not start",tone:"error",glyph:"cross"};return Z(t)}function fe(e){return(e??"").slice(0,7)}function ee(e){if(e==null||e==="")return null;if(typeof e==="number")return Number.isFinite(e)?e:null;let t=Date.parse(e);return Number.isNaN(t)?null:t}function Le(e){if(e==null||!Number.isFinite(e))return"";let t=Math.max(0,Math.round(e));if(t<60)return`${t}s`;let r=Math.floor(t/60),o=t%60;if(r<60)return o?`${r}m ${String(o).padStart(2,"0")}s`:`${r}m`;let n=Math.floor(r/60),s=r%60;return`${n}h ${String(s).padStart(2,"0")}m`}function Pe(e,t){return Le((t-e)/1000)}function Me(e,t=Date.now()){let r=Math.max(0,Math.round((t-e)/1000));if(r<10)return"just now";if(r<60)return`${r}s ago`;let o=Math.floor(r/60);if(o<60)return`${o}m ago`;let n=Math.floor(o/60);if(n<24)return`${n}h ago`;let s=Math.floor(n/24);if(s<30)return`${s}d ago`;return`${Math.floor(s/30)}mo ago`}function kt(e){if(e==null||e==="")return[];return(e.endsWith(`
`)?e.slice(0,-1):e).split(`
`)}function Ue(e,t){if(t<=0)return[];return kt(e).slice(-t)}function Ne(e){return`/api/v4/projects/${encodeURIComponent(e)}`}function uo(e,t={scope:"all"}){let r={per_page:String(t.perPage??cr)};if(t.scope==="branch"){if(t.ref)r.ref=t.ref}else r.order_by="updated_at",r.sort="desc";return{path:`${Ne(e)}/pipelines`,query:r}}function fo(e,t){return{path:`${Ne(e)}/pipelines/${t}/jobs`,query:{per_page:"100"}}}function ho(e,t){return{path:`${Ne(e)}/pipelines/${t}/bridges`,query:{per_page:"100"}}}function go(e,t){return{path:`${Ne(e)}/jobs/${t}/trace`,query:{}}}var mo=new Set([301,302,303,307,308]);function bo(e){let r=/This resource has been moved permanently to\s+(\S+)/.exec(e)?.[1];if(!r)return null;try{let o=new URL(r);if(o.protocol!=="https:"&&o.protocol!=="http:")return null;return o.toString()}catch{return null}}function Er(e,t){let r;try{r=new URL(e)}catch{return null}if(r.host!==t)return null;let n=/^\/api\/v4\/projects\/([^/]+)(?:\/|$)/.exec(r.pathname)?.[1];if(!n)return null;try{return decodeURIComponent(n)}catch{return null}}function xo(e){if(e>=200&&e<300)return null;if(e===401||e===403)return{kind:"unauthorized"};if(e===404)return{kind:"not-found"};if(mo.has(e))return{kind:"redirect",target:null};return{kind:"http",status:e}}function Eo(e){if(typeof e!=="object"||e===null)return null;let t=e.code;return typeof t==="string"?t:null}function To(e){let t=Eo(e);if(t==="no-token")return{kind:"no-token"};if(t==="NO_SERVICE"||t==="SERVICE_FAILED"||t==="NOT_GRANTED")return{kind:"service"};return{kind:"network"}}async function he(e,t){let r;try{r=await e(t)}catch(n){return{ok:!1,failure:To(n)}}let o=xo(r.status);if(o){if(o.kind==="redirect")return{ok:!1,failure:{kind:"redirect",target:bo(r.body)}};return{ok:!1,failure:o}}return{ok:!0,status:r.status,body:r.body}}function Ge(e,t){try{return{ok:!0,data:JSON.parse(e)}}catch{return{ok:!1,failure:{kind:"http",status:t}}}}async function Tr(e,t,r){let o=uo(t,r),n=await he(e,{method:"GET",...o});if(!n.ok)return n;return Ge(n.body,n.status)}async function yr(e){let t=await he(e,{method:"GET",path:"/api/v4/user",query:{}});if(!t.ok)return t;return Ge(t.body,t.status)}async function vr(e,t,r){let o=fo(t,r),n=await he(e,{method:"GET",...o});if(!n.ok)return n;return Ge(n.body,n.status)}async function Sr(e,t,r){let o=ho(t,r),n=await he(e,{method:"GET",...o});if(!n.ok)return n;return Ge(n.body,n.status)}async function _t(e,t,r){let o=go(t,r),n=await he(e,{method:"GET",...o});if(!n.ok){if(n.failure.kind==="not-found")return{ok:!0,data:""};return n}return{ok:!0,data:n.body}}var yo=100,vo="Investigate the cause and fix it in this repository. If the failure is infrastructure, a flaky test, or a runner/network/registry problem, say so plainly instead of inventing a code change.";function He(e){return e.status==="failed"}function So(e){let t=["A GitLab CI job has failed.",""];if(t.push(`- Project: ${e.project}`),e.pipeline)t.push(`- Pipeline #${e.pipeline.iid} (${e.pipeline.ref||"—"} @ ${fe(e.pipeline.sha)})`);if(t.push(`- Job: ${e.job.name} (${e.job.stage})`),e.pipeline?.web_url)t.push(`- Pipeline: ${e.pipeline.web_url}`);if(e.job.web_url)t.push(`- Job log: ${e.job.web_url}`);let r=t.join(`
`),o=`

${vo}`,n=Ue(e.trace,yo).join(`
`);if(n==="")return`${r}${o}`;let s=(p)=>`${r}

Tail of the job log:

\`\`\`
${p}
\`\`\`${o}`,a=s(n);if(a.length<=ce)return a;let d=n.slice(a.length-ce);return d===""?`${r}${o}`:s(d)}function kr(e){return{providerId:e.providerId,id:`job-${e.job.id}`,title:e.job.name||`Job #${e.job.id}`,url:e.job.web_url??"",text:So(e),navigation:"open"}}function ko(e,t={}){if(!wt(e))return{active:!1,delayMs:null};let o=t.intervalMs??fr,n=t.elapsedMs??0,s=n>600000?3:n>120000?2:1;return{active:!0,delayMs:o*s}}function wt(e){for(let t of e)if(J(t))return!0;return!1}function _r(e,t={}){return ko(e,t).delayMs}function _o(e){try{return new URL(e).host}catch{return e.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function wo(e){let t=e.trim();if(!t)return null;let r="",o="";if(t.includes("://")){let s;try{s=new URL(t)}catch{return null}r=s.host,o=s.pathname}else{let s=t.indexOf(":");if(s<0)return null;r=t.slice(0,s).replace(/^[^@]*@/,""),o=t.slice(s+1),o=o.replace(/^\/+/,"")}let n=wr(o);if(!r||!n)return null;return{host:r,path:n}}function wr(e){let t=e.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(t.toLowerCase().endsWith(".git"))t=t.slice(0,-4);return t.replace(/\/+$/,"")}function Ao(e){let t=[],r=null;for(let o of e.split(/\r?\n/)){let n=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(o);if(n){r=n[1]??null;continue}if(/^\s*\[/.test(o)){r=null;continue}if(r==null)continue;let s=/^\s*url\s*=\s*(.+?)\s*$/.exec(o);if(s&&s[1])t.push({name:r,url:s[1]})}return t}function Ro(e){let t=Ao(e),r=["origin","upstream"],o=[...r.flatMap((n)=>t.filter((s)=>s.name===n)),...t.filter((n)=>!r.includes(n.name))];for(let n of o){let s=wo(n.url);if(s)return{remote:s,name:n.name}}return null}function Co(e){if(!e)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(e)?.[1]??null}function le(e,t){if(!e||!t)return!1;return e.replace(/\/+$/,"")===t.replace(/\/+$/,"")}function Rt(e){return e!=null&&/^\s*gitdir:\s*\S+/.test(e)}function Ar(e){let r=/^\s*gitdir:\s*(.+?)\s*$/m.exec(e??"")?.[1];if(!r||!r.startsWith("/"))return null;let o="/.git/worktrees/",n=r.lastIndexOf(o);if(n<=0)return null;return r.slice(0,n)}function At(e,t,r){if(e&&r){let o=r.find((n)=>le(n.directory,e));if(o?.branch)return o.branch}return Co(t)}function Rr(e){let t=_o(e.apiOrigin),r=e.projectOverride?.trim()??"";if(!e.directory&&!r)return{ok:!1,failure:"no-project"};if(r){let n=wr(r);if(!n)return{ok:!1,failure:"no-project"};return{ok:!0,host:t,project:n,ref:At(e.directory,e.head,e.worktrees),source:"override"}}let o=e.gitConfig?Ro(e.gitConfig):null;if(!o){if(Rt(e.gitFile))return{ok:!1,failure:"linked-worktree",detectedRef:At(e.directory,e.head,e.worktrees)};return{ok:!1,failure:"not-a-repo"}}if(o.remote.host!==t)return{ok:!1,failure:"host-mismatch",detectedHost:o.remote.host,detectedPath:o.remote.path};return{ok:!0,host:t,project:o.remote.path,ref:At(e.directory,e.head,e.worktrees),source:"derived"}}function Ct(e,t){return e.hasToken[t]===!0}function Cr(e){let t=e.trim();if(!t)return null;let r=t.includes("://")?t:`https://${t}`,o;try{o=new URL(r)}catch{return null}if(o.protocol!=="https:")return null;if(o.username||o.password)return null;if(o.pathname!=="/"&&o.pathname!=="")return null;if(o.search||o.hash)return null;return o.host}function Ot(e){let t;try{t=JSON.parse(e)}catch{return null}if(typeof t!=="object"||t===null)return null;let r=t.config;if(typeof r!=="object"||r===null)return null;let o=r;if(typeof o.host!=="string"||typeof o.project!=="string")return null;let n={};if(typeof o.hasToken==="object"&&o.hasToken!==null){for(let[s,a]of Object.entries(o.hasToken))if(a===!0)n[s]=!0}return{host:o.host,project:o.project,hasToken:n}}function Or(e){let t;try{t=JSON.parse(e.body)}catch{return{status:e.status,body:e.body}}if(typeof t.status==="number")return{status:t.status,body:t.body??""};if(t.error){let r=Error(t.error);if(t.code)r.code=t.code;throw r}return{status:e.status,body:e.body}}function Ir(e){let t=typeof e==="object"&&e!==null?e.code:void 0;if(t==="NO_SERVICE"||t==="SERVICE_FAILED"||t==="NOT_GRANTED")return"The Proxy service is not available. Open Settings → Extensions and allow this extension’s service, then try again.";return"The configuration could not be saved."}var Lr=new Set(["success","failed","canceled","skipped"]);function Oo(e){return Lr.has(e.status)}function Pr(e=[],t=[]){let r=[],o=new Map,n=(s)=>{let a=o.get(s);if(!a)a={jobs:[],triggers:[]},o.set(s,a),r.push(s);return a};for(let s of e)n(s.stage).jobs.push(s);for(let s of t)n(s.stage).triggers.push(s);return r.map((s)=>{let a=o.get(s)??{jobs:[],triggers:[]};return{stage:s,jobs:a.jobs,triggers:a.triggers,done:a.jobs.filter(Oo).length+a.triggers.filter((d)=>Lr.has(d.status)).length,total:a.jobs.length+a.triggers.length}})}var Io={setTimeout:(e,t)=>globalThis.setTimeout(e,t),clearTimeout:(e)=>globalThis.clearTimeout(e),setInterval:(e,t)=>globalThis.setInterval(e,t),clearInterval:(e)=>globalThis.clearInterval(e),now:()=>Date.now()},Lo=5;function I(e,t){return`${e}\x00${t}`}function ge(e,t){return`${e}\x00${t}`}var Mr={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',calendar:'<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},Po='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',Mo='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',Uo='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>',No='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"><path d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z"/></svg>';function c(e,t,r){let o=document.createElement(e);if(t)o.className=t;if(r!=null)o.textContent=r;return o}function Ur(e){while(e.firstChild)e.removeChild(e.firstChild)}class Hr{root;port;timers;directory=null;started=!1;disposed=!1;config=null;configOpen=!1;configBusy=!1;configError=null;configDraft=null;username=null;usernameHost=null;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;bridges=new Map;jobs=new Map;downstreamPath=[];openJob=null;traces=new Map;traceLoadingKey=null;handoffJobId=null;handoffError=null;updatedAt=null;lastHost=null;healed=new Map;derivedProject=null;redirectHops=0;pendingHealNotice=null;healNotice=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;drawerEl=null;drawerScrollTop=0;followTail=!0;handles=[];unsubReady=null;constructor(e,t,r){this.root=e,this.port=t,this.timers=r.timers??Io}start(){return this.unsubReady=this.port.onReady((e)=>this.handleReady(e)),this.render(),this}handleReady(e){ut(e,document.documentElement);let t=e.directory!==this.directory||!this.started;if(this.directory=e.directory,t)this.started=!0,this.bootstrap();else this.render()}async bootstrap(){this.phase="loading",this.render();let e=await this.loadConfig();if(this.disposed)return;if(!e){this.render();return}this.refresh()}async loadConfig(){let e;try{e=await this.port.serviceRequest({method:"GET",path:Tt})}catch{return this.showProblem(It()),!1}if(this.disposed)return!1;let t=e.status>=200&&e.status<300?Ot(e.body):null;if(!t)return this.showProblem(It()),!1;return this.applyConfig(t),!0}applyConfig(e){if(e.host!==this.config?.host)this.forgetHostData();this.config=e}showProblem(e){this.problem=e,this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render()}refresh(){if(this.disposed)return;if(!this.config){this.bootstrap();return}let e=++this.generation;this.runRefresh(e)}setScope(e){if(e===this.scope)return;this.scope=e,this.expandedId=null,this.downstreamPath=[],this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.disposeHandles(),Ur(this.root),this.port.dispose()}async runRefresh(e){this.error=null;let t=this.config;if(!t)return;let r=t.host;if(r!==this.lastHost)this.forgetHostData(),this.lastHost=r;let o=t.project.trim();if(!this.directory&&!o){this.showProblem(Gr({ok:!1,failure:"no-project"},r));return}if(this.pipelines.length===0)this.phase="loading";this.render();let n=await this.deriveProject(r);if(this.disposed||e!==this.generation)return;if(!n.ok){this.showProblem(Gr(n,r));return}if(this.problem=null,this.derivedProject=n.project,this.redirectHops=0,this.resolved=this.applyHealedProject(n),!Ct(t,r)){this.problem=jr(r),this.phase="problem",this.stopAllTimers(),this.render();return}if(await this.loadUsername(e,r),this.disposed||e!==this.generation)return;await this.loadPipelines(e,this.resolved,!0)}async loadUsername(e,t){if(this.usernameHost===t&&this.username!=null)return;this.usernameHost=t;let r=await yr(this.requester());if(this.disposed||e!==this.generation)return;if(this.username=r.ok?r.data.username??null:null,!r.ok)this.usernameHost=null;this.render()}forgetHostData(){this.pipelines=[],this.bridges.clear(),this.jobs.clear(),this.traces.clear(),this.openJob=null,this.expandedId=null,this.downstreamPath=[],this.updatedAt=null,this.healed.clear(),this.derivedProject=null,this.redirectHops=0,this.pendingHealNotice=null,this.healNotice=null,this.username=null,this.usernameHost=null}async deriveProject(e){let t=this.config?.project.trim()??"",r=this.directory,o=null,n=null,s=null,a=null,d=null;if(r){try{o=(await this.port.readFile(".git/config")).content}catch{o=null}if(o==null)try{n=(await this.port.readFile(".git")).content}catch{n=null}if(o==null&&Rt(n))d=Ar(n),o=await this.readWorktreeConfig(r);try{s=(await this.port.readFile(".git/HEAD")).content}catch{s=null}try{let p=d??r,E=(await this.port.listProjects()).projects.find((_)=>le(_.directory,p));if(E)a=(await this.port.listWorktrees(E.id)).worktrees}catch{a=null}}return Rr({directory:r,apiOrigin:`https://${e}`,projectOverride:t,gitConfig:o,gitFile:n,head:s,worktrees:a})}async readWorktreeConfig(e){try{let t=await this.port.serviceRequest({method:"POST",path:pr,body:JSON.stringify({directory:e})});if(t.status<200||t.status>=300)return null;let r=JSON.parse(t.body);return typeof r.config==="string"?r.config:null}catch{return null}}async loadPipelines(e,t,r=!1){let o=t.ref?this.scope:"all",n=await Tr(this.requester(),t.project,{scope:o,ref:t.ref});if(this.disposed||e!==this.generation)return;if(!n.ok){if(n.failure.kind==="redirect"&&this.healRedirect(e,t,n.failure.target))return;this.handleFailure(n.failure);return}if(this.pipelines=n.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.promoteHealNotice(),this.pruneDownstreamNode(),r){if(this.seedBridges(e,t.project),this.expandedId!=null)this.loadJobs(e,t.project,this.expandedId,!0)}this.render(),this.schedulePoll()}seedBridges(e,t){for(let r of this.pipelines){let o=I(t,r.id);if(!this.bridges.has(o))this.loadBridges(e,t,r.id,!1)}}pruneDownstreamNode(){let e=this.downstreamPath[0];if(!e)return;if(this.pipelines.some((t)=>t.id===e.ancestors[0]?.pipelineId))return;this.downstreamPath=[],this.openJob=null}handleFailure(e){if(e.kind==="no-token"||e.kind==="unauthorized"||e.kind==="not-found"||e.kind==="service"){this.problem=Xo(e,this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(e.kind==="redirect"){if(this.pendingHealNotice=null,this.derivedProject)this.healed.delete(this.derivedProject);this.problem=this.redirectProblem(e.target),this.phase="problem",this.stopAllTimers(),this.render();return}if(this.error=e.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${e.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}applyHealedProject(e){let t=this.healed.get(e.project);return t?{...e,project:t}:e}healRedirect(e,t,r){if(r==null||this.redirectHops>=Lo)return!1;let o=Er(r,this.configuredHost());if(o==null)return!1;this.redirectHops+=1;let n=this.derivedProject??t.project;return this.healed.set(n,o),this.pendingHealNotice={from:n,to:o},this.resolved={...t,project:o},this.loadPipelines(e,this.resolved,!0),!0}promoteHealNotice(){if(!this.pendingHealNotice)return;this.healNotice=this.pendingHealNotice,this.pendingHealNotice=null}redirectProblem(e){let t=this.derivedProject??this.resolved?.project??"",r=t?`${this.webOrigin()}/${t}`:null;return e?Fo(e,r):Bo(r)}webOrigin(){return this.baseUrl().replace(/\/+$/,"")}togglePipeline(e){if(this.expandedId===e){this.expandedId=null,this.downstreamPath=[],this.openJob=null,this.render();return}this.expandedId=e,this.downstreamPath=[];let t=this.resolved?.project;if(t){let r=I(t,e);if(!Array.isArray(this.jobs.get(r)))this.loadJobs(this.generation,t,e,!1);if(!Array.isArray(this.bridges.get(r)))this.loadBridges(this.generation,t,e,!1)}this.render()}async loadJobs(e,t,r,o){let n=I(t,r);if(!o||!Array.isArray(this.jobs.get(n)))this.jobs.set(n,"loading"),this.render();let s=await vr(this.requester(),t,r);if(this.disposed||e!==this.generation)return;if(s.ok)this.jobs.set(n,s.data);else if(o);else this.jobs.set(n,"error");this.render()}async loadBridges(e,t,r,o){let n=I(t,r),s=await Sr(this.requester(),t,r);if(this.disposed||e!==this.generation)return;if(s.ok)this.bridges.set(n,br(s.data,t));else if(o);else this.bridges.set(n,"error");if(this.render(),!o&&this.resolved)this.schedulePoll()}openJobDrawer(e,t,r){this.openJob={project:e,pipelineId:t,jobId:r},this.followTail=!0,this.drawerScrollTop=0;let o=ge(e,r);if(this.traces.has(o)){this.render();return}this.traceLoadingKey=o,this.render(),this.loadTrace(this.generation,e,r)}async loadTrace(e,t,r){let o=ge(t,r),n=await _t(this.requester(),t,r);if(this.disposed||e!==this.generation)return;if(this.traceLoadingKey===o)this.traceLoadingKey=null;if(!n.ok)this.traces.set(o,{state:"error",text:"",truncated:null});else this.traces.set(o,Nr(n.data??""));this.render()}refreshOpenTrace(e){let t=this.openJob;if(!t)return;if(this.traceLoadingKey===ge(t.project,t.jobId))return;let r=this.jobById(t.project,t.pipelineId,t.jobId);if(!r||!J(r.status))return;this.loadTrace(e,t.project,t.jobId)}jobById(e,t,r){let o=this.jobs.get(I(e,t));if(!Array.isArray(o))return;return o.find((n)=>n.id===r)}closeDrawer(){this.openJob=null,this.followTail=!0,this.drawerScrollTop=0,this.render()}canHandoff(){return this.directory!=null&&this.resolved!=null}canHandoffJob(e){return this.resolved!=null&&le(e,this.resolved.project)}startHandoff(e,t,r){if(!this.canHandoff()||!this.canHandoffJob(e)||this.handoffJobId!=null)return;let o=this.jobById(e,t,r);if(!o||!He(o))return;let n=this.pipelineFor(e,t);this.handoffJobId=r,this.handoffError=null,this.render(),this.runHandoff(e,n,o)}pipelineFor(e,t){let r=this.pipelines.find((n)=>n.id===t);if(r&&le(e,this.resolved?.project??""))return r;let o=this.triggerFor(e,t)?.downstream;if(o)return{...o,started_at:null,finished_at:null,duration:null};return r??null}triggerFor(e,t){for(let[r,o]of this.bridges){if(!Array.isArray(o))continue;if(r.split("\x00")[0]!==e)continue;let n=o.find((s)=>s.downstream?.id===t);if(n)return n}return}async runHandoff(e,t,r){let o=await this.traceFor(e,r);if(this.disposed)return;if(o==null){this.finishHandoff("Could not read the job log to hand off. The session was not started.");return}let n;try{n=(await this.port.startSession(kr({providerId:lr,project:e,pipeline:t,job:r,trace:o}))).sent}catch{this.finishHandoff("Could not start a session for this job.");return}if(this.disposed)return;this.finishHandoff(n==="sent"?null:$o(n))}async traceFor(e,t){let r=ge(e,t.id),o=this.traces.get(r);if(o?.state==="ready")return o.text;let n=await _t(this.requester(),e,t.id);if(!n.ok)return null;let s=n.data??"";return this.traces.set(r,Nr(s)),s}finishHandoff(e){this.handoffJobId=null,this.handoffError=e,this.render()}visibleStatuses(){let e=this.pipelines.map((t)=>t.status);for(let t of this.jobs.values())if(Array.isArray(t))for(let r of t)e.push(r.status);for(let t of this.bridges.values())if(Array.isArray(t))for(let r of t)e.push(r.status);return e}hasActive(){return wt(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let e=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=e;let t=_r(this.visibleStatuses(),{elapsedMs:e-this.pollStartedAt});if(t==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},t)}async pollOnce(){if(this.disposed||!this.resolved)return;let e=++this.generation;if(this.redirectHops=0,await this.loadPipelines(e,this.resolved),e!==this.generation)return;if(this.refreshOpenTrace(e),await this.refetchVisible(e),e===this.generation)this.schedulePoll()}async refetchVisible(e){if(!this.resolved)return;let t=this.resolved.project,r=new Map,o=(s,a,d)=>{let p=I(s.project,s.pipelineId);if(!r.get(p)||d)r.set(p,{target:s,status:a,expanded:d})};for(let s of this.pipelines){let a=s.id===this.expandedId,d=this.bridges.get(I(t,s.id)),p=Array.isArray(d)?Ie(d)>0:!1;if(a||J(s.status)||p)o({project:t,pipelineId:s.id},s.status,a)}for(let s of this.downstreamPath){let a=this.bridges.get(I(s.project,s.pipelineId)),d=Array.isArray(a)?a[0]:void 0;o({project:s.project,pipelineId:s.pipelineId},d?.status??this.jobsStatus(s),!0)}let n=[];for(let{target:s,status:a,expanded:d}of r.values()){let p=I(s.project,s.pipelineId);if(d||J(a)||this.hasCachedDownstream(p))n.push(this.loadBridges(e,s.project,s.pipelineId,!0));if((d||J(a))&&Array.isArray(this.jobs.get(p)))n.push(this.loadJobs(e,s.project,s.pipelineId,!0))}await Promise.all(n)}hasCachedDownstream(e){let t=this.bridges.get(e);return Array.isArray(t)&&Ie(t)>0}jobsStatus(e){let t=this.jobs.get(I(e.project,e.pipelineId));if(Array.isArray(t)){for(let r of t)if(J(r.status))return"running"}return"success"}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),hr)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let e=this.timers.now();for(let t of Array.from(this.root.querySelectorAll("[data-live]"))){let r=Number(t.dataset.start);if(!Number.isFinite(r))continue;if(t.dataset.live==="ago")t.textContent=Me(r,e);else if(t.dataset.live==="elapsed"){let o=t.dataset.end?Number(t.dataset.end):e;t.textContent=Pe(r,Number.isFinite(o)?o:e)}}}configuredHost(){return this.config?.host??ae}baseUrl(){return`https://${this.configuredHost()}`}openConfig(e){this.configOpen=!0,this.configError=null,this.configDraft={host:e??this.config?.host??ae,project:this.config?.project??"",token:""},this.render()}closeConfig(){this.configOpen=!1,this.configError=null,this.configDraft=null,this.render()}async submitConfig(e){if(this.configBusy)return;let t=e.host.trim(),r=t===""?ae:Cr(t);if(!r){this.configError="Enter a bare host like gitlab.example.com, or a full https:// origin.",this.render();return}this.configBusy=!0,this.configError=null,this.render();try{let o=await this.postConfig(Tt,{host:r,project:e.project.trim()});if(!o.ok){this.configError=o.error;return}if(this.applyConfig(o.config),e.token.trim()){let n=await this.postConfig(yt,{host:r,token:e.token.trim()});if(!n.ok){this.configError=n.error;return}this.applyConfig(n.config)}this.configOpen=!1,this.configDraft=null,this.refresh()}finally{this.configBusy=!1,this.render()}}async clearTokenFor(e){if(this.configBusy)return;this.configBusy=!0,this.configError=null,this.render();try{let t=await this.postConfig(yt,{host:e,token:null});if(!t.ok){this.configError=t.error;return}this.applyConfig(t.config),this.refresh()}finally{this.configBusy=!1,this.render()}}async postConfig(e,t){let r;try{r=await this.port.serviceRequest({method:"POST",path:e,body:JSON.stringify(t)})}catch(n){return{ok:!1,error:Ir(n)}}let o=r.status>=200&&r.status<300?Ot(r.body):null;if(!o)return{ok:!1,error:"The configuration could not be saved."};return{ok:!0,config:o}}requester(){let e=this.baseUrl();return async(t)=>{let r=await this.port.serviceRequest({method:"POST",path:dr,body:JSON.stringify({baseUrl:e,method:t.method??"GET",path:t.path,query:t.query??{}})});return Or(r)}}disposeHandles(){for(let e of this.handles.splice(0))e.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;if(this.drawerEl)this.drawerScrollTop=this.drawerEl.scrollTop;Ur(this.root),this.root.className="gp";let e=c("div","gp-progress");if(!this.isFirstLoad())e.hidden=!0;if(this.root.append(e),this.root.append(this.renderHeader()),this.configOpen)this.root.append(this.renderConfigForm());let t=this.renderHandoffNotice();if(t)this.root.append(t);let r=this.renderHealNotice();if(r)this.root.append(r);this.scrollEl=c("div","gp-scroll");let o=c("div","gp-pad");if(o.append(...this.renderContent()),this.scrollEl.append(o),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;if(this.drawerEl)this.drawerEl.scrollTop=this.followTail?this.drawerEl.scrollHeight:this.drawerScrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let e=this.resolved!=null&&this.updatedAt!=null;if(e&&this.tickTimer==null)this.startTicker();if(!e)this.stopTicker()}renderHeader(){let e=c("div","gp-head"),t=c("div","gp-head-row"),r=c("div","gp-project"),o=c("span","gp-project-path");if(this.resolved)o.textContent=`${this.resolved.host}/${this.resolved.project}`;else o.hidden=!0;if(r.append(o),this.username)r.append(c("span","gp-head-user",this.username));if(!this.resolved)r.hidden=!0;t.append(r,c("span","gp-spacer"));let n=c("span","gp-updated");if(this.resolved==null||this.updatedAt==null)n.hidden=!0;else{let d=c("span","gp-dot");d.dataset.idle=this.hasActive()?"false":"true";let p=c("span");p.dataset.live="ago",p.dataset.start=String(this.updatedAt),p.textContent=Me(this.updatedAt,this.timers.now()),n.append(d,p)}t.append(n);let s=c("button","gp-iconbtn gp-config-open");if(s.type="button",s.setAttribute("aria-label","Configure"),s.title="Configure",s.innerHTML=No,this.configOpen)s.setAttribute("aria-expanded","true");s.addEventListener("click",()=>this.configOpen?this.closeConfig():this.openConfig()),t.append(s);let a=c("button","gp-iconbtn");if(a.type="button",a.setAttribute("aria-label","Refresh"),a.title="Refresh",a.innerHTML=Po,this.isFirstLoad())a.dataset.spinning="true";return a.addEventListener("click",()=>this.refresh()),t.append(a),e.append(t),e.append(this.renderScope()),e}renderConfigForm(){let e=this.config,t=e?.host??ae,r=e?Ct(e,t):!1,o=c("div","gp-config"),n=(A,F)=>{let V=c("label","gp-config-field");return V.append(c("span","gp-config-label",A),F),V},s=this.configDraft??{host:t,project:e?.project??"",token:""},a=document.createElement("input");a.className="gp-config-host",a.name="host",a.type="text",a.value=s.host,a.placeholder=ae,a.addEventListener("input",()=>{if(this.configDraft)this.configDraft.host=a.value}),o.append(n("Configured host",a));let d=document.createElement("input");d.className="gp-config-project",d.name="project",d.type="text",d.value=s.project,d.placeholder="group/project",d.addEventListener("input",()=>{if(this.configDraft)this.configDraft.project=d.value}),o.append(n("Project override",d));let p=document.createElement("input");if(p.className="gp-config-token",p.name="token",p.type="password",p.value=s.token,p.autocomplete="off",p.placeholder=r?"A token is saved":"read_api token",p.addEventListener("input",()=>{if(this.configDraft)this.configDraft.token=p.value}),o.append(n("Access token",p)),this.configError)o.append(c("p","gp-config-error",this.configError));let u=c("div","gp-config-actions"),E=c("button","gp-config-save");if(E.type="button",E.textContent=this.configBusy?"Saving…":"Save",E.disabled=this.configBusy,u.append(E),r){let A=c("button","gp-config-clear");A.type="button",A.textContent="Clear token",A.disabled=this.configBusy,A.addEventListener("click",()=>void this.clearTokenFor(t)),u.append(A)}let _=c("button","gp-config-cancel");_.type="button",_.textContent="Cancel",_.addEventListener("click",()=>this.closeConfig()),u.append(_),o.append(u);let D=()=>{this.submitConfig({host:a.value,project:d.value,token:p.value})};return E.addEventListener("click",D),o.addEventListener("keydown",(A)=>{let F=A.target;if(A.key==="Enter"&&F?.tagName==="INPUT")A.preventDefault(),D()}),o}renderScope(){let e=c("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return e.hidden=!0,e;let r=c("div");e.append(r),this.handles.push(xt(r,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(n)=>this.setScope(n)}));let o=this.scope==="branch"?this.resolved?.ref??"":"all refs";return e.append(c("span","gp-scope-ref",o)),e}renderContent(){let e=[];if(this.error){let r=c("div","gp-state");r.append(c("p","gp-state-body",this.error));let o=c("div","gp-state-actions"),n=c("div");this.handles.push(B(n,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),o.append(n),r.append(o),e.push(r)}if(this.problem)return e.push(this.renderProblem(this.problem)),e;if(this.isFirstLoad())return e.push(this.renderSkeleton()),e;if(this.pipelines.length===0)return e.push(this.renderEmpty()),e;let t=c("div","gp-list");for(let r of this.pipelines)t.append(this.renderPipeline(r));return e.push(t),e}renderProblem(e){let t=c("div","gp-state"),r=c("h2","gp-state-title",e.title);if(t.append(r,c("p","gp-state-body",e.body)),e.detail)t.append(c("p","gp-state-detail",e.detail));if(e.hint)t.append(c("p","gp-state-hint",e.hint));let o=c("div","gp-state-actions");if(e.configure){let s=c("div");this.handles.push(B(s,{label:"Configure",variant:"default",size:"sm",onClick:()=>this.openConfig(e.configureHost)})),o.append(s)}if(e.action){let s=c("div"),{label:a,url:d}=e.action;this.handles.push(B(s,{label:a,variant:"default",size:"sm",onClick:()=>void this.port.openUrl(d)})),o.append(s)}let n=c("div");return this.handles.push(B(n,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),o.append(n),t.append(o),t}renderEmpty(){let e=c("div"),t=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(Et(e,{title:t?"No pipelines for this ref":"No pipelines yet",body:t?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:t?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),e}renderSkeleton(){let e=c("div","gp-skel");for(let t=0;t<5;t+=1){let r=c("div","gp-skel-row"),o=c("span","gp-skel-line");o.dataset.w="short";let n=c("span","gp-skel-line");n.dataset.w="grow",r.append(o,n),e.append(r)}return e}renderPipeline(e){let t=this.resolved?.project??"",r=this.expandedId===e.id,o=c("div","gp-item");o.dataset.open=r?"true":"false";let n=c("button","gp-row");n.type="button",n.setAttribute("aria-expanded",String(r));let s=c("span","gp-caret");s.innerHTML=Mo,n.append(s,je(Z(e.status),15));let a=c("span","gp-row-main"),d=c("span","gp-row-line");d.append(c("span","gp-ref",e.ref||"—")),d.append(c("span","gp-sha",fe(e.sha))),a.append(d,c("div","gp-row-sub",Do(e))),n.append(a,this.timingSpan(e));let p=this.collapsedDownstreamCount(t,e.id);if(p>0)n.append(c("span","gp-downstream-badge",`↳ ${p} downstream`));if(n.addEventListener("click",()=>this.togglePipeline(e.id)),o.append(n),r){let u=c("div","gp-jobs");if(e.web_url)u.append(this.renderExternalLink("gp-jobs-link","View pipeline in GitLab",e.web_url));let E=this.bridges.get(I(t,e.id));if(u.append(this.renderJobsBody(t,e.id,E)),E==="error")u.append(c("div","gp-row-sub","Could not load downstream pipelines."));o.append(u)}return o}collapsedDownstreamCount(e,t){let r=this.bridges.get(I(e,t));return Array.isArray(r)?Ie(r):0}renderJobsBody(e,t,r,o="root"){let n=c("div","gp-jobs-body"),s=this.jobs.get(I(e,t));if(s===void 0||s==="loading")return n.append(c("div","gp-row-sub","Loading jobs…")),n;if(s==="error")return n.append(c("div","gp-row-sub",o==="downstream"?"Could not read this downstream project. It may be private, or the token may not reach it.":"Could not load jobs. Collapse and reopen to retry.")),n;if(r==="error"&&o==="downstream")n.append(c("div","gp-row-sub","Could not read this downstream project’s own triggers."));let a=Array.isArray(r)?r:[];if(s.length===0&&a.length===0&&r!=="error")return n.append(c("div","gp-row-sub","No jobs reported yet.")),n;for(let d of Pr(s,a))n.append(this.renderStage(e,t,d));return n}renderExternalLink(e,t,r){let o=document.createElement("a");return o.className=e,o.href=r,o.target="_blank",o.rel="noreferrer",o.textContent=t,o.addEventListener("click",(n)=>{n.preventDefault(),this.port.openUrl(r)}),o}timingSpan(e){let t=J(e.status),r=ee(e.started_at);if(t&&r!=null){let s=ee(e.finished_at),a=c("span","gp-row-meta");if(a.dataset.live="elapsed",a.dataset.start=String(r),s!=null)a.dataset.end=String(s);return a.textContent=Pe(r,s??this.timers.now()),a}if(ee(e.finished_at)!=null&&e.duration!=null)return c("span","gp-row-meta",Le(e.duration));let n=ee(e.created_at);if(n!=null){let s=c("span","gp-row-meta");return s.dataset.live="ago",s.dataset.start=String(n),s.textContent=Me(n,this.timers.now()),s}return c("span","gp-row-meta","—")}jobMeta(e){let t=ee(e.started_at);if(e.status==="running"&&t!=null){let o=c("span","gp-job-meta");return o.dataset.live="elapsed",o.dataset.start=String(t),o.textContent=Pe(t,this.timers.now()),o}let r=ee(e.finished_at);if(e.duration!=null&&r!=null)return c("span","gp-job-meta",Le(e.duration));if(e.status==="running")return c("span","gp-job-meta","running");return c("span","gp-job-meta",ue(e).label.toLowerCase())}renderStage(e,t,r){let o=c("div","gp-stage"),n=c("div","gp-stage-head");n.append(c("span","gp-stage-name",r.stage),c("span","gp-stage-count",`${r.done}/${r.total}`),c("span","gp-stage-line")),o.append(n);for(let s of r.jobs){let a=c("div","gp-job");if(a.tabIndex=0,a.setAttribute("role","button"),this.openJob?.project===e&&this.openJob.jobId===s.id)a.dataset.selected="true";if(a.setAttribute("aria-label",`${s.name}, ${ue(s).label}`),a.append(je(ue(s),13),c("span","gp-job-name",s.name)),a.append(this.jobMeta(s)),a.addEventListener("click",()=>this.openJobDrawer(e,t,s.id)),a.addEventListener("keydown",(d)=>{if(d.target!==a)return;if(d.key==="Enter"||d.key===" ")d.preventDefault(),this.openJobDrawer(e,t,s.id)}),He(s)&&this.canHandoffJob(e))a.append(this.renderHandoffAction(e,t,s));o.append(a)}for(let s of r.triggers)o.append(this.renderTriggerRow(e,t,s));return o}renderTriggerRow(e,t,r){let o=xr(r.state,r.status),n=c("div","gp-job gp-trigger");if(n.dataset.trigger="true",n.append(je(o,13),c("span","gp-job-name",r.name)),n.append(c("span","gp-job-meta",o.label.toLowerCase())),!r.downstream)return n;let s=this.renderDownstreamCard(e,t,r),a=c("div","gp-trigger-wrap");return a.append(n,s),a}renderDownstreamCard(e,t,r,o){let n=r.downstream,s=c("div","gp-downstream-card");if(!n)return s;s.append(c("div","gp-downstream-label",St(n,e)));let a=c("div","gp-downstream-meta");if(a.append(je(Z(n.status),13)),a.append(c("span","gp-ref",n.ref||"—")),a.append(c("span","gp-sha",fe(n.sha))),a.append(c("span","gp-downstream-iid",`#${n.iid}`)),s.append(a),n.web_url)s.append(this.renderExternalLink("gp-jobs-link","View pipeline in GitLab",n.web_url));let d=vt(n),p=o??this.nodeFor(e,t),u=d??"";if(d&&this.nodeFor(u,n.id)){let E=this.bridges.get(I(u,n.id));s.append(this.renderJobsBody(u,n.id,E,"downstream")),this.renderNestedTriggerCards(s,u,n.id,p)}else{let E=d!=null&&this.cardCanExpand(e,t,n.id,u,p),_=c("button","gp-downstream-open");if(_.type="button",_.textContent=E?"Show jobs":"Continue in GitLab",_.setAttribute("aria-label",`${_.textContent} — ${St(n,e)}`),_.addEventListener("click",(D)=>{if(D.stopPropagation(),E)this.toggleDownstream(e,t,u,n.id);else if(n.web_url)this.port.openUrl(n.web_url)}),s.append(_),!E&&!n.web_url)_.disabled=!0}return s}nodeFor(e,t){return this.downstreamPath.find((r)=>r.pipelineId===t&&le(r.project,e))}renderNestedTriggerCards(e,t,r,o){let n=this.bridges.get(I(t,r));if(!Array.isArray(n))return;for(let s of n)if(s.downstream)e.append(this.renderDownstreamCard(t,r,s,o))}cardCanExpand(e,t,r,o,n){let s=n?.generation??0;if(!mr(s))return!1;let a={project:o,pipelineId:r};for(let d of this.openPathFor(e,t,n))if(d.project===a.project&&d.pipelineId===a.pipelineId)return!1;return!0}openPathFor(e,t,r){let o={project:e,pipelineId:t};if(r)return[...r.ancestors,o];return[{project:this.resolved?.project??"",pipelineId:this.expandedId??-1},o]}toggleDownstream(e,t,r,o){let n=this.nodeFor(e,t),s=n?this.downstreamPath.indexOf(n):-1,a=n?this.downstreamPath.slice(0,s+1):[],d=(n?.generation??0)+1,p=[...n?.ancestors??[],{project:e,pipelineId:t}],u={project:r,pipelineId:o,generation:d,ancestors:p};this.downstreamPath=[...a,u],this.openJob=null;let E=I(r,o);if(!Array.isArray(this.jobs.get(E)))this.loadJobs(this.generation,r,o,!1);if(!Array.isArray(this.bridges.get(E)))this.loadBridges(this.generation,r,o,!1);this.render()}renderHandoffAction(e,t,r){let o=c("button","gp-handoff");o.type="button";let n=this.handoffJobId===r.id,s=this.canHandoff();if(o.disabled=!s||n,o.textContent=n?"Starting…":"Start session",o.title=s?"Start a session for this failed job":this.directory==null?"Open a project to start a session — a session needs a checkout to fix.":"This project could not be resolved, so a session cannot be started.",o.setAttribute("aria-label",`${o.textContent} — ${r.name}`),s&&!n)o.addEventListener("click",(a)=>{a.stopPropagation(),this.startHandoff(e,t,r.id)});return o}renderHealNotice(){if(!this.healNotice)return null;let e=this.configuredHost(),{from:t,to:r}=this.healNotice,o=c("div","gp-notice");o.setAttribute("role","status"),o.append(c("span","gp-notice-text",`Showing ${e}/${t} as ${e}/${r}.`));let n=c("button","gp-notice-close");return n.type="button",n.textContent="Dismiss",n.addEventListener("click",()=>{this.healNotice=null,this.render()}),o.append(n),o}renderHandoffNotice(){if(!this.handoffError)return null;let e=c("div","gp-notice");e.setAttribute("role","alert"),e.append(c("span","gp-notice-text",this.handoffError));let t=c("button","gp-notice-close");return t.type="button",t.textContent="Dismiss",t.addEventListener("click",()=>this.finishHandoff(null)),e.append(t),e}renderDrawer(e){let t=c("div","gp-drawer"),r=this.jobById(e.project,e.pipelineId,e.jobId),o=c("div","gp-drawer-head"),n=c("span","gp-drawer-title",r?`${r.name} · ${ue(r).label}`:`Job #${e.jobId}`);if(o.append(n),r?.web_url)o.append(this.renderExternalLink("gp-drawer-link","View full log in GitLab",r.web_url));if(r&&He(r)&&this.canHandoffJob(e.project))o.append(this.renderHandoffAction(e.project,e.pipelineId,r));let s=c("button","gp-drawer-close");s.type="button",s.setAttribute("aria-label","Close log"),s.title="Close",s.innerHTML=Uo,s.addEventListener("click",()=>this.closeDrawer()),o.append(s),t.append(o);let a=this.traces.get(ge(e.project,e.jobId));if(!a)return this.drawerEl=null,t.append(c("div","gp-drawer-empty","Loading log…")),t;if(a.state==="missing")return this.drawerEl=null,t.append(c("div","gp-drawer-empty","No log output yet — the job has not started.")),t;if(a.state==="error")return this.drawerEl=null,t.append(c("div","gp-drawer-empty","Could not load the log. Close and reopen to retry.")),t;if(a.truncated)t.append(jo(a.truncated));let d=c("pre","gp-drawer-body");return d.textContent=Ue(a.text,Oe).join(`
`),d.addEventListener("scroll",()=>{this.drawerScrollTop=d.scrollTop,this.followTail=Go(d)}),this.drawerEl=d,t.append(d),t}renderFooter(){let e=c("div","gp-foot");return e.append(c("span","","Read-only")),e}}function je(e,t){let r=c("span","gp-icon");if(e.tone!=="neutral")r.dataset.tone=e.tone;if(e.animate)r.dataset.animate="true";if(e.muted)r.dataset.muted="true";r.setAttribute("role","img"),r.setAttribute("aria-label",e.label);let o=c("span","gp-icon-svg");return o.innerHTML=`<svg viewBox="0 0 24 24" width="${t}" height="${t}" aria-hidden="true" fill="currentColor">${Mr[e.glyph]??Mr.dot}</svg>`,r.append(o),r}function Go(e,t=24){return e.scrollHeight-e.scrollTop-e.clientHeight<=t}function Ho(e){if(e.length>=ur)return"host";if(kt(e).length>Oe)return"cap";return null}function Nr(e){return e.trim()?{state:"ready",text:e,truncated:Ho(e)}:{state:"missing",text:"",truncated:null}}function jo(e){let t=c("div","gp-drawer-notice");return t.textContent=e==="host"?"GitLab returned a capped log. View the full log in GitLab.":`Older lines not shown (last ${Oe} lines). View the full log in GitLab.`,t}function $o(e){if(e==="no-model")return"No model is selected in OpenChamber, so the session got no message.";if(e==="skipped")return"OpenChamber skipped the message. Open a project and try again.";return"OpenChamber could not start the session."}function Do(e){let t=[`#${e.iid}`,Z(e.status).label];if(e.merge_request?.iid!=null)t.push(`!${e.merge_request.iid}`);else if(e.tag)t.push("tag");else if(e.name)t.push(e.name);if(e.source&&e.source!=="push")t.push(e.source.replace(/_/g," "));return t.join(" · ")}function Gr(e,t){switch(e.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"linked-worktree":{let r={kind:"linked-worktree",title:"Linked worktree",body:"This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.",hint:"Set the “Project” setting to this worktree’s GitLab project path to read its pipelines."};if(e.detectedRef)r.detail=`Current ref: ${e.detectedRef}`;return r}case"host-mismatch":{let r=e.detectedHost??"another host";return{kind:"host-mismatch",title:"Different GitLab host",body:e.detectedHost?`This remote points at ${r}, but the Configured host is ${t}. To read this project, set Configured host to ${r} and add an Access token for it.`:`This remote points at ${r}, but the Configured host is ${t}. To read this project, set Configured host to the remote’s GitLab host and add an Access token for it.`,detail:e.detectedPath?`${r}/${e.detectedPath}`:r,configure:!0,configureHost:e.detectedHost}}}}function jr(e){return{kind:"no-token",title:"No Access token",body:`No Access token is stored for ${e}, so its pipelines cannot be read.`,hint:"Add a personal access token with the read_api scope in the configuration form.",configure:!0}}function It(){return{kind:"service",title:"Proxy service unavailable",body:"This extension reaches GitLab through its Proxy service, which is not running. It may not be granted yet, or it failed to start.",hint:"Open Settings → Extensions and allow this extension’s service, then refresh."}}function Fo(e,t){return{kind:"moved",title:"Project moved",body:`This project's path no longer resolves; GitLab has moved it to ${e}.`,hint:"Update the git remote or the Project setting, then refresh.",...t?{action:{label:"Open in GitLab",url:t}}:{}}}function Bo(e){return{kind:"redirected",title:"GitLab redirected this request",body:"GitLab answered with a redirect this extension could not follow. The project may have moved, or the session may have expired.",hint:"Check the GitLab host and the Project setting, then refresh.",...e?{action:{label:"Open in GitLab",url:e}}:{}}}function Xo(e,t){if(e.kind==="no-token")return jr(t);if(e.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored Access token cannot read this project. It may be invalid or expired, or lack the read_api scope.",hint:"Replace it in the configuration form.",configure:!0};if(e.kind==="service")return It();return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the Access token cannot see it."}}function $r(e,t,r={}){return new Hr(e,t,r).start()}var Dr=`
html, body { margin: 0; height: 100%; color-scheme: light dark; }
/* The host writes 0.875rem onto the iframe root inline; !important beats it so
   rem units equal the pixel tiers OpenChamber's own UI uses. */
html { font-size: 16px !important; }
*, *::before, *::after { box-sizing: border-box; }

.gp {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: var(--oc-fg, CanvasText);
  background: var(--oc-bg, Canvas);
  font-family: var(--oc-font, system-ui, sans-serif);
  font-size: 0.875rem;
  line-height: 1.45;
}
.gp button { font: inherit; color: inherit; }

.gp-progress {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  overflow: hidden;
  background: transparent;
  z-index: 5;
}
.gp-progress[hidden] { display: none; }
.gp-progress::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: -40%;
  width: 40%;
  background: var(--oc-primary, #5b8def);
  animation: gp-slide 1.1s ease-in-out infinite;
}
@keyframes gp-slide { from { left: -40%; } to { left: 100%; } }

.gp-head {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 10px 8px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
}
.gp-head-row { display: flex; align-items: center; gap: 8px; }
.gp-spacer { flex: 1 1 auto; }

.gp-updated { display: inline-flex; align-items: center; gap: 5px; color: var(--oc-muted, GrayText); font-size: 0.75rem; white-space: nowrap; }
.gp-updated[hidden] { display: none; }
.gp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--oc-info, #3a7bbf); }
.gp-dot[data-idle='true'] { background: var(--oc-muted, GrayText); animation: none; }
.gp-dot[data-idle='false'] { animation: gp-pulse 1.4s ease-in-out infinite; }
@keyframes gp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

.gp-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  cursor: pointer;
}
.gp-iconbtn:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }
.gp-iconbtn[data-spinning='true'] svg { animation: gp-spin 0.9s linear infinite; }

.gp-project { display: flex; min-width: 0; }
.gp-project-path {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gp-project-path[hidden] { display: none; }
.gp-head-user {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  white-space: nowrap;
}
.gp-head-user::before { content: '·'; margin: 0 6px; }

.gp-scope { display: flex; align-items: center; gap: 8px; }
.gp-scope[hidden] { display: none; }
.gp-scope-ref {
  min-width: 0;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gp-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.gp-pad { padding: 8px 8px 12px; }

.gp-list { display: flex; flex-direction: column; gap: 2px; }

.gp-item {
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
}
.gp-item[data-open='true'] { border-color: var(--oc-border, rgba(127, 127, 127, 0.35)); background: var(--oc-subtle, transparent); }

.gp-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.gp-row:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }

.gp-caret { display: inline-flex; color: var(--oc-muted, GrayText); transition: transform 0.12s ease; }
.gp-item[data-open='true'] .gp-caret { transform: rotate(90deg); }

.gp-row-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1 1 auto; }
.gp-row-line { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.gp-ref {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.gp-sha {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}
.gp-row-meta { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; white-space: nowrap; }
.gp-row-sub {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
}

.gp-icon { display: inline-flex; flex: 0 0 auto; color: var(--oc-muted, GrayText); }
.gp-icon[data-tone='success'] { color: var(--oc-success-text, #2e9e4f); }
.gp-icon[data-tone='error'] { color: var(--oc-error-text, #c04040); }
.gp-icon[data-tone='warning'] { color: var(--oc-warning-text, #b8860b); }
.gp-icon[data-tone='info'] { color: var(--oc-info-text, #3a7bbf); }
.gp-icon[data-tone='primary'] { color: var(--oc-primary-text, #9db8f5); }
.gp-icon[data-muted='true'] { opacity: 0.55; }
.gp-icon[data-animate='true'] .gp-icon-svg { animation: gp-spin 0.9s linear infinite; }
.gp-icon-svg { display: inline-flex; }
@keyframes gp-spin { to { transform: rotate(360deg); } }

.gp-jobs { display: flex; flex-direction: column; gap: 6px; padding: 2px 8px 8px 22px; }
.gp-jobs-body { display: flex; flex-direction: column; gap: 6px; }
.gp-jobs-link { align-self: flex-start; color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.75rem; }
.gp-jobs-link:hover { text-decoration: underline; }

.gp-downstream-badge {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  white-space: nowrap;
}

.gp-trigger-wrap { display: flex; flex-direction: column; gap: 2px; }
.gp-trigger .gp-job-name { font-style: italic; }
.gp-downstream-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0 6px 4px 20px;
  padding: 6px 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-left: 2px solid var(--oc-primary, #5b8def);
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-muted-surface, var(--oc-subtle, transparent));
}
.gp-downstream-label { font-weight: 500; font-size: 0.75rem; }
.gp-downstream-meta { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.gp-downstream-iid { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-downstream-open {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}
.gp-downstream-open:hover:not([disabled]) { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-downstream-open[disabled] { color: var(--oc-muted, GrayText); opacity: 0.6; cursor: default; }
.gp-stage { display: flex; flex-direction: column; gap: 1px; }
.gp-stage-head { display: flex; align-items: center; gap: 6px; color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-stage-name { flex: 0 0 auto; }
.gp-stage-count { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.gp-stage-line { flex: 1 1 auto; height: 1px; background: var(--oc-border, rgba(127, 127, 127, 0.35)); }

.gp-job {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.gp-job:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-job[data-selected='true'] { background: var(--oc-selection, rgba(91, 141, 239, 0.25)); color: var(--oc-selection-fg, var(--oc-fg, CanvasText)); }
.gp-job-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.gp-job-meta { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.gp-handoff {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.75rem;
  white-space: nowrap;
  cursor: pointer;
}
.gp-handoff:hover:not([disabled]) { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-handoff[disabled] { color: var(--oc-muted, GrayText); opacity: 0.6; cursor: default; }

.gp-notice {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-muted-surface, var(--oc-subtle, transparent));
  color: var(--oc-error-text, #c04040);
  font-size: 0.8125rem;
}
.gp-notice-text { flex: 1 1 auto; }
.gp-notice-close {
  flex: 0 0 auto;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 9px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  font-size: 0.75rem;
  cursor: pointer;
}
.gp-notice-close:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }

.gp-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 14px; text-align: center; }
.gp-state-title { margin: 0; font-size: 0.875rem; font-weight: 600; }
.gp-state-body { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.8125rem; max-width: 34ch; }
.gp-state-hint { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.75rem; max-width: 34ch; }
.gp-state-detail { margin: 0; font-family: var(--oc-mono, ui-monospace, monospace); font-size: 0.75rem; color: var(--oc-muted, GrayText); word-break: break-all; }
.gp-state-actions { display: flex; gap: 6px; margin-top: 2px; }
/* The kit's empty state is the other half of the same screen; keep its title on
   the 14px scale the hand-rolled states use. */
.gp .oc-sdk-empty-title { font-size: 0.875rem; }

.gp-drawer {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  max-height: 62%;
  border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-elevated, var(--oc-bg, Canvas));
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
}
.gp-drawer-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); }
.gp-drawer-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 0.8125rem; }
.gp-drawer-link { color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.75rem; white-space: nowrap; }
.gp-drawer-link:hover { text-decoration: underline; }
.gp-drawer-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0;
  border: 1px solid transparent; border-radius: var(--oc-radius, 9px);
  background: transparent; color: var(--oc-muted, GrayText); cursor: pointer;
}
.gp-drawer-close:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }
.gp-drawer-body {
  margin: 0;
  padding: 8px 10px 12px;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--oc-fg, CanvasText);
}
.gp-drawer-empty { padding: 14px 10px; color: var(--oc-muted, GrayText); font-size: 0.75rem; text-align: center; }
.gp-drawer-notice { flex: 0 0 auto; padding: 6px 10px; border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-warning-text, #e0b567); font-size: 0.75rem; }

.gp-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-muted, GrayText); font-size: 0.75rem; }

.gp-config {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  background: var(--oc-muted-surface, var(--oc-hover, rgba(127, 127, 127, 0.08)));
}
.gp-config-field { display: flex; flex-direction: column; gap: 3px; }
.gp-config-label { color: var(--oc-muted, GrayText); font-size: 0.75rem; }
.gp-config input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-bg, Canvas);
  color: var(--oc-fg, CanvasText);
  font: inherit;
  font-size: 0.8125rem;
}
.gp-config input:focus { outline: 2px solid var(--oc-focus, #5b8def); outline-offset: -1px; }
.gp-config-error { margin: 0; color: var(--oc-error-text, #e08a8a); font-size: 0.75rem; }
.gp-config-actions { display: flex; align-items: center; gap: 8px; }
.gp-config-actions button {
  padding: 5px 10px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 9px);
  background: var(--oc-bg, Canvas);
  color: var(--oc-fg, CanvasText);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
.gp-config-actions button:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-config-actions button:disabled { opacity: 0.6; cursor: default; }
.gp-config-save { background: var(--oc-primary, #5b8def); color: var(--oc-primary-fg, #ffffff); border-color: transparent; }
.gp-config-clear { margin-left: auto; color: var(--oc-error-text, #e08a8a); }

.gp-skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px; }
.gp-skel-row { display: flex; gap: 8px; }
.gp-skel-line { height: 10px; border-radius: 4px; background: var(--oc-subtle, var(--oc-hover, rgba(127, 127, 127, 0.15))); opacity: 0.6; }
.gp-skel-line[data-w='short'] { flex: 0 0 28%; }
.gp-skel-line[data-w='grow'] { flex: 1 1 auto; }
`;function zo(e){let t=document.createElement("style");t.textContent=e,document.head.append(t)}var Fr=document.getElementById("root");if(Fr){zo(Dr);let e=tr(),t=$r(Fr,e,{});window.addEventListener("beforeunload",()=>t.dispose())}})();
