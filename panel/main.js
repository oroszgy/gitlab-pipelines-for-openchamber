(()=>{var E0="https://sdlc.webcloud.ec.europa.eu",ZT=20,CT="/proxy",X0=20000,FT=256000,WT=5000,VT=1000;var D="openchamber.sdk",Q=1;var w0=`
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
`;function N0(T){let S=T.documentElement;if(S.hasAttribute("data-oc-scrollbar-activity"))return;S.setAttribute("data-oc-scrollbar-activity","");let _=new WeakMap;T.addEventListener("scroll",(U)=>{let G=U.target===T?S:U.target;if(!(G instanceof Element))return;if(!G.hasAttribute("data-oc-scrolling"))G.setAttribute("data-oc-scrolling","");let A=_.get(G);if(A!==void 0)clearTimeout(A);_.set(G,setTimeout(()=>{_.delete(G),G.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var FS=`(${N0.toString()})(document);`;var m0=128,H0=65536;var JT=["file","directory","other","missing"],g0=(T)=>Boolean(T&&"sessionId"in T),j0=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var KT=/^[0-9a-f]{7,64}$/i,c0=(T)=>KT.test(T),M0=500,k0=32000,LT=16000,BT=128,PT=200,IT=2000,bT=16000,RT=80,wT=200,NT=16000;var mT=2000;var q0=20000,z0=1024,Y0=2000000;var $0=64000,D0=8000,h0=4000;var d0=90000;var HT=999,yT=1e4,Q0=500,gT=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],jT=["stopped","starting","ready","failed"],WS=new Set(gT),cT=(T)=>WS.has(T),qT=(T)=>T&&cT(T)?T:"HOST_REJECTED",u=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(u);if(Object(T)===T)return Object.values(T).every(u);return!1},hT=(T)=>u(T)&&JSON.stringify(T).length<=NT,OT=(T)=>T?.trim().slice(0,wT)??"",i=(T)=>{let S=T.id.trim().slice(0,BT),_=T.title.trim().slice(0,PT),U=T.url.trim().slice(0,IT),G=T.text?.trim().slice(0,bT),A=T.author?.trim().slice(0,RT),X=T.kind==="pull"?"pull":"issue",M={providerId:T.providerId.trim(),id:S,title:_||S,url:U,kind:X};if(G)M.text=G;if(A)M.author=A;if(X==="pull"){let k=OT(T.branches?.head),z=OT(T.branches?.base);if(k&&z)M.branches={head:k,base:z}}if(hT(T.data))M.data=T.data;return M},v0=(T)=>{let S=i(T);if(T.projectId)S.projectId=T.projectId;if(T.navigation)S.navigation=T.navigation;if(T.worktree)S.worktree=T.worktree;return S},p0=(T)=>{let S={text:T.text.trim().slice(0,LT)};if(T.send)S.send=!0;return S},n0=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(HT,Math.max(0,Math.round(T)))},o0=(T)=>{if(!Number.isFinite(T))return 0;return Math.min(yT,Math.max(0,Math.ceil(T)))};var r=(T)=>T.length>0&&T.length<=z0&&!T.includes("\x00")&&!T.includes("\\");var Z0=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>mT)return!1;return!T.split("/").some((_)=>_==="."||_==="..")},VS=new Set(jT),l0=(T)=>Boolean(T&&"status"in T&&VS.has(String(T.status))&&!("body"in T)),C0=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),a0=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),u0=(T)=>Boolean(T&&"written"in T&&T.written===!0),i0=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),OS=new Set(JT),r0=(T)=>Boolean(T&&"kind"in T&&"size"in T&&OS.has(String(T.kind))&&Number.isFinite(T.size)),t0=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),JS=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),KS=(T)=>Object(T)===T?T:null,y0=(T)=>String(T)===T&&T.length>0,LS=(T)=>{if(!y0(T.id))return null;if(T.ok===!0){let S={channel:D,v:Q,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)S.payload=T.payload;return S}if(T.ok===!1&&y0(T.error))return{channel:D,v:Q,type:"result",id:T.id,ok:!1,error:T.error,code:qT(y0(T.code)?T.code:void 0)};return null},s0=(T)=>{let S=KS(T);if(!S||S.channel!==D||S.v!==Q)return null;if(S.type==="result")return LS(S);if(!JS.has(String(S.type))||Object(S.payload)!==S.payload)return null;return S};class Y extends Error{code;constructor(T,S){super(S);this.name="HostRequestError",this.code=T}}var dT=()=>Promise.reject(new Y("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),F0=()=>Promise.reject(new Y("BAD_PATH",`File path must be 1 to ${z0} characters without NUL or backslash.`)),C=(T)=>{return T.value+=1,`oc-${T.value}`},e0=(T={})=>{let S=T.target??("window"in globalThis?window:null);if(!S)throw new Y("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let _=T.acceptSource??((f)=>f===S.parent),U=T.requestTimeoutMs??q0,G=new Set,A=new Set,X=new Set,M=new Set,k=new Set,z=new Set,m=new Set,T0=null,S0=null,l=new Map,a=new Map,_0=!1,Z={value:0},F=null,j=null,DT=(f)=>{if(!f)return null;return{sessionId:f.id,phase:f.busy?"started":"completed"}},h=(f)=>{S.parent.postMessage(f,"*")},b=(f,x)=>{for(let $ of f)try{$(x)}catch(O){console.error(O)}},QT=(f)=>{if(!(f instanceof MessageEvent))return;if(!_(f.source))return;let x=s0(f.data);if(!x)return;if(x.type==="workspace"){let O=a.get(x.payload.subscriptionId);if(O)b([O],x.payload.snapshot);return}if(x.type==="ready"){if(F=x.payload,j=DT(x.payload.session),b(G,x.payload),b(A,x.payload.directory),b(X,x.payload.session),j)b(M,j);b(k,x.payload.connection),b(z,x.payload.settings),b(m,x.payload.item);return}if(x.type==="directory"){if(F)F={...F,directory:x.payload.directory};b(A,x.payload.directory);return}if(x.type==="session"){if(F)F={...F,session:x.payload.session};if(!x.payload.session)j=null;else if(j?.sessionId!==x.payload.session.id)j=DT(x.payload.session);b(X,x.payload.session);return}if(x.type==="session-lifecycle"){j=x.payload,b(M,x.payload);return}if(x.type==="connection"){if(F)F={...F,connection:x.payload.connection};b(k,x.payload.connection);return}if(x.type==="settings"){if(F)F={...F,settings:x.payload.settings};b(z,x.payload.settings);return}if(x.type==="item"){if(F)F={...F,item:x.payload.item};b(m,x.payload.item);return}if(x.type==="action"){let O=(P)=>{if(!_0)h({channel:D,v:Q,type:"action-result",id:x.id,payload:P})},y=S0;if(!y){O({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(x.payload)).then(()=>O({ok:!0}),(P)=>{let R0=(P instanceof Error?P.message:String(P)).trim();O({ok:!1,error:(R0||"Action failed.").slice(0,Q0)})});return}if(x.type==="resolve"){let O=(P)=>{h({channel:D,v:Q,type:"resolve-result",id:x.id,payload:P})},y=T0;if(!y){O({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(x.payload)).then((P)=>O({item:P?i(P):null}),(P)=>{let R0=(P instanceof Error?P.message:String(P)).trim();O({error:(R0||"Command failed.").slice(0,Q0)})});return}let $=l.get(x.id);if(!$)return;if(clearTimeout($.timer),l.delete(x.id),x.ok){$.resolve(x.payload);return}$.reject(new Y(x.code,x.error))};S.addEventListener("message",QT),h({channel:D,v:Q,type:"hello"});let R=(f,x=U)=>{if(_0||S.parent===S)return Promise.reject(new Y("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise(($,O)=>{let y=setTimeout(()=>{l.delete(f.id),O(new Y("HOST_TIMEOUT","Host did not answer in time."))},x);l.set(f.id,{resolve:$,reject:O,timer:y}),h(f)})},I=(f)=>R(f).then(()=>{return}),d={channel:D,v:Q},v=(f,x=1024)=>{if(!f.trim()||f.length>x)throw new Y("HOST_REJECTED",`Identity must contain 1 to ${x} characters.`)},I0=async(f)=>{if(f.kind!=="projects")v(f.projectId);let x=await R({...d,type:"workspace-read",id:C(Z),payload:f});if(!x||!("kind"in x)||!("state"in x)||x.kind!==f.kind)throw new Y("HOST_REJECTED","Host did not return workspace data.");return x},b0=async(f,x)=>{if(f.kind!=="projects")v(f.projectId);let $=C(Z);a.set($,x);try{await I({...d,type:"workspace-subscribe",id:C(Z),payload:{subscriptionId:$,query:f}})}catch(O){if(a.delete($),!_0)h({...d,type:"workspace-unsubscribe",id:C(Z),payload:{subscriptionId:$}});throw O}return()=>{if(!a.delete($)||_0)return;h({...d,type:"workspace-unsubscribe",id:C(Z),payload:{subscriptionId:$}})}},A0=async(f)=>{if("key"in f&&(f.key.length===0||f.key.length>m0))throw new Y("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(f.op==="set"&&!u(f.value))throw new Y("HOST_REJECTED","Storage values must be JSON.");if(f.op==="set"&&new TextEncoder().encode(JSON.stringify(f.value)).length>H0)throw new Y("HOST_REJECTED","Storage value exceeds 64 KiB.");let x=await R({...d,type:"storage",id:C(Z),payload:f});if(!x||!("storage"in x)||x.op!==f.op)throw new Y("HOST_REJECTED","Host did not return storage data.");return x};return{onAction:(f)=>{return S0=f,()=>{if(S0===f)S0=null}},listProjects:async()=>{let f=await I0({kind:"projects"});if(f.kind!=="projects")throw new Y("HOST_REJECTED","Expected projects.");return f},listWorktrees:async(f)=>{let x=await I0({kind:"worktrees",projectId:f});if(x.kind!=="worktrees")throw new Y("HOST_REJECTED","Expected worktrees.");return x},listSessions:async(f)=>{let x=await I0({kind:"sessions",projectId:f});if(x.kind!=="sessions")throw new Y("HOST_REJECTED","Expected sessions.");return x},onProjects:(f)=>b0({kind:"projects"},(x)=>{if(x.kind==="projects")f(x)}),onWorktrees:(f,x)=>b0({kind:"worktrees",projectId:f},($)=>{if($.kind==="worktrees")x($)}),onSessions:(f,x)=>b0({kind:"sessions",projectId:f},($)=>{if($.kind==="sessions")x($)}),openSession:async(f)=>{v(f),await I({...d,type:"open-session",id:C(Z),payload:{sessionId:f}})},storage:{get:async(f)=>{let x=await A0({op:"get",key:f});return x.op==="get"&&x.found?x.value:void 0},set:async(f,x)=>{await A0({op:"set",key:f,value:x})},delete:async(f)=>{await A0({op:"delete",key:f})},keys:async()=>{let f=await A0({op:"keys"});if(f.op!=="keys")throw new Y("HOST_REJECTED","Expected storage keys.");return f.keys}},onReady:(f)=>{if(G.add(f),F)f(F);return()=>{G.delete(f)}},onDirectory:(f)=>{if(A.add(f),F)f(F.directory);return()=>{A.delete(f)}},onSession:(f)=>{if(X.add(f),F)f(F.session);return()=>{X.delete(f)}},onSessionLifecycle:(f)=>{if(M.add(f),j)f(j);return()=>{M.delete(f)}},onConnection:(f)=>{if(k.add(f),F)f(F.connection);return()=>{k.delete(f)}},onSettings:(f)=>{if(z.add(f),F)f(F.settings);return()=>{z.delete(f)}},onItem:(f)=>{if(m.add(f),F)f(F.item);return()=>{m.delete(f)}},onResolve:(f)=>{return T0=f,()=>{if(T0===f)T0=null}},toast:(f)=>{let x=f.message.trim();if(!x||x.length>M0)return Promise.reject(new Y("HOST_REJECTED",`Toast message must contain 1 to ${M0} characters.`));if(f.copy&&f.copy!==!0&&(!f.copy.text.length||f.copy.text.length>k0))return Promise.reject(new Y("HOST_REJECTED",`Toast copy text must contain 1 to ${k0} characters.`));return I({channel:D,v:Q,type:"toast",id:C(Z),payload:{...f,message:x}})},openUrl:(f)=>I({channel:D,v:Q,type:"open-url",id:C(Z),payload:{url:f}}),openCommit:(f)=>c0(f)?I({channel:D,v:Q,type:"open-commit",id:C(Z),payload:{sha:f}}):Promise.reject(new Y("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(f)=>I({channel:D,v:Q,type:"open-surface",id:C(Z),payload:{surfaceId:f}}),writeClipboard:(f)=>I({channel:D,v:Q,type:"clipboard-write",id:C(Z),payload:{text:f}}),compose:(f)=>I({channel:D,v:Q,type:"compose",id:C(Z),payload:f}),attach:(f)=>I({channel:D,v:Q,type:"attach",id:C(Z),payload:i(f)}),startSession:async(f)=>{if(f.projectId!==void 0)v(f.projectId);let x=f.worktree;if(x&&x!==!0)if(x.kind==="existing")v(x.directory);else{if(x.name!==void 0)v(x.name,200);if(x.baseBranch!==void 0)v(x.baseBranch,200)}let $=await R({channel:D,v:Q,type:"start-session",id:C(Z),payload:v0(f)},T.requestTimeoutMs??180000);if(!g0($))throw new Y("HOST_REJECTED","Host did not return a session.");return $},prompt:(f)=>R({channel:D,v:Q,type:"prompt",id:C(Z),payload:p0(f)}).then((x)=>{if(!j0(x))throw new Y("HOST_REJECTED","Host did not return a prompt result.");return x}),sessionLink:(f)=>I({channel:D,v:Q,type:"session-link",id:C(Z),payload:i(f)}),close:()=>I({channel:D,v:Q,type:"close",id:C(Z)}),oauthStart:()=>I({channel:D,v:Q,type:"oauth-start",id:C(Z)}),oauthDisconnect:()=>I({channel:D,v:Q,type:"oauth-disconnect",id:C(Z)}),request:(f)=>(Z0(f.path)?R({channel:D,v:Q,type:"request",id:C(Z),payload:f}):dT()).then((x)=>{if(!C0(x))throw new Y("HOST_REJECTED","Host request result was empty.");return x}),serviceRequest:(f)=>(Z0(f.path)?R({channel:D,v:Q,type:"service-request",id:C(Z),payload:f}):dT()).then((x)=>{if(!C0(x))throw new Y("HOST_REJECTED","Host service request result was empty.");return x}),serviceStatus:()=>R({channel:D,v:Q,type:"service-status",id:C(Z)}).then((f)=>{if(!l0(f))throw new Y("HOST_REJECTED","Host did not return service status.");return f}),readFile:(f)=>(r(f)?R({channel:D,v:Q,type:"file-read",id:C(Z),payload:{path:f}}):F0()).then((x)=>{if(!a0(x))throw new Y("HOST_REJECTED","Host did not return file content.");return x}),writeFile:(f,x)=>{if(!r(f))return F0();if(x.length>Y0)return Promise.reject(new Y("FILE_TOO_LARGE",`Content is over ${Y0} characters.`));return R({channel:D,v:Q,type:"file-write",id:C(Z),payload:{path:f,content:x}}).then(($)=>{if(!u0($))throw new Y("HOST_REJECTED","Host did not confirm the write.");return $})},listDir:(f)=>(r(f)?R({channel:D,v:Q,type:"file-list",id:C(Z),payload:{path:f}}):F0()).then((x)=>{if(!i0(x))throw new Y("HOST_REJECTED","Host did not return directory entries.");return x}),stat:(f)=>(r(f)?R({channel:D,v:Q,type:"file-stat",id:C(Z),payload:{path:f}}):F0()).then((x)=>{if(!r0(x))throw new Y("HOST_REJECTED","Host did not return file status.");return x}),generate:(f)=>{let x=f.prompt.trim(),$=f.system?.trim();if(x.length===0||x.length>$0)return Promise.reject(new Y("HOST_REJECTED",`Prompt must be 1 to ${$0} characters.`));if($!==void 0&&($.length===0||$.length>D0))return Promise.reject(new Y("HOST_REJECTED",`System prompt must be 1 to ${D0} characters.`));let O=f.maxOutputTokens===void 0?void 0:Math.min(h0,Math.max(1,Math.floor(f.maxOutputTokens)));if(O!==void 0&&!Number.isFinite(O))return Promise.reject(new Y("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:x};if($!==void 0)y.system=$;if(O!==void 0)y.maxOutputTokens=O;return R({channel:D,v:Q,type:"generate",id:C(Z),payload:y},T.requestTimeoutMs??d0).then((P)=>{if(!t0(P))throw new Y("HOST_REJECTED","Host did not return generated text.");return P})},setBadge:(f)=>I({channel:D,v:Q,type:"badge",id:C(Z),payload:{count:n0(f)}}),setHeight:(f)=>I({channel:D,v:Q,type:"resize",id:C(Z),payload:{height:o0(f)}}),dispose:()=>{for(let f of a.keys())h({...d,type:"workspace-unsubscribe",id:C(Z),payload:{subscriptionId:f}});a.clear(),_0=!0,T0=null,S0=null,S.removeEventListener("message",QT);for(let f of l.values())clearTimeout(f.timer),f.reject(new Y("HOST_UNAVAILABLE","Host client was disposed."));l.clear(),G.clear(),A.clear(),X.clear(),M.clear(),k.clear(),z.clear(),m.clear()}}};var vT=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var K_=new Set(vT);var pT=["none","agent","user"];var B_=new Set(pT);function nT(){let T=e0();return{request:(S)=>T.request({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),serviceRequest:(S)=>T.serviceRequest({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),readFile:(S)=>T.readFile(S),listProjects:()=>T.listProjects(),listWorktrees:(S)=>T.listWorktrees(S),openUrl:(S)=>T.openUrl(S),onReady:(S)=>T.onReady(S),onConnection:(S)=>T.onConnection(S),dispose:()=>T.dispose()}}var BS=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],oT=(T,S)=>{S.style.colorScheme=T.mode;for(let[_,U]of BS)S.style.setProperty(_,T.tokens[U]);S.style.setProperty("font-family",T.tokens.font),S.style.setProperty("font-size","0.875rem"),S.style.setProperty("line-height","1.45"),S.style.setProperty("color",T.tokens.foreground)},TT=(T,S)=>{if(oT(T.theme,S),S.dataset)S.dataset.ocSurface=T.surface,S.dataset.ocTheme=T.theme.mode};var lT="oc-sdk-ui-style",t=(T)=>{while(T.firstChild)T.removeChild(T.firstChild)},L=(T)=>{let S=document.getElementById(lT);if(S instanceof HTMLStyleElement){if(S.textContent!==T)S.textContent=T;return}N0(document);let _=document.createElement("style");_.id=lT,_.textContent=T,document.head.appendChild(_)},V=(T,S)=>{let _=document.createElement(T);if(S)_.className=S;return _},c=(T)=>{let S=V("button",T);return S.type="button",S},w=(T,S)=>{let _=S??"";if(T.textContent!==_)T.textContent=_};var PS={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},W=(T,S)=>`var(--${T}, var(--oc-${PS[T]}, ${S}))`,p=W("surface-background","transparent"),W0=W("surface-elevated","transparent"),U0=W("surface-elevated-foreground","inherit"),f0=W("surface-foreground","inherit"),J=W("surface-muted-foreground","gray"),IS=W("surface-muted","transparent"),H=W("interactive-border","currentColor"),N=W("interactive-hover","transparent"),n=W("interactive-active","transparent"),ST=W("interactive-selection","transparent"),_T=W("interactive-selection-foreground","inherit"),iT=W("interactive-focus-ring","currentColor"),g=W("primary","currentColor"),UT=W("primary-text","inherit"),fT=W("error-text","inherit"),bS=W("font-sans","inherit"),GT=W("font-mono","monospace"),aT=W("radius","9px"),K=(T,S,_="transparent")=>`color-mix(in srgb, ${T} ${S}%, ${_})`,uT=`box-shadow: 0 0 0 2px ${iT};`,V0=(T)=>{let S=W(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${S}; --oc-sdk-tone-text: ${W(`${T}-text`,"inherit")}; }`},B=`
${w0}
.oc-sdk { box-sizing: border-box; color: ${f0}; font-family: ${bS}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${uT} }
.oc-sdk-mono { font-family: ${GT}; }
.oc-sdk-muted { color: ${J}; }
${V0("success")}${V0("warning")}${V0("error")}${V0("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${g}; --oc-sdk-tone-text: ${UT}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${aT}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${UT}; background: ${K(g,10,p)}; border-color: ${K(g,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${K(g,16,p)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${K(g,22,p)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${IS}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-btn[data-variant="outline"] { background: ${W0}; color: ${U0}; border-color: ${H}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${N}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${n}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${W("status-error","red")}; color: ${fT}; background: ${K("var(--oc-sdk-tone)",7,p)}; border-color: ${K("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${K("var(--oc-sdk-tone)",9,p)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${K("var(--oc-sdk-tone)",11,p)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${J}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${fT}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${aT}; background: ${W0}; color: ${U0}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${K(H,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${J}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${iT}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${W("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${W("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${GT}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${J}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${g}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${J}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${N}; color: ${f0}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${H}; border-radius: 6px; background: ${W0}; color: ${U0}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${J}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${J}; }
.oc-sdk-popup { --surface-foreground: ${U0}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${K(H,60)}; border-radius: 12px; background: ${W0}; color: ${U0}; box-shadow: 0 8px 24px ${K(f0,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${N}; }
.oc-sdk-option[aria-selected="true"] { background: ${ST}; color: ${_T}; }
.oc-sdk-option[data-destructive="true"] { color: ${fT}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${K(W("status-error","red"),10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${J}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${J}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${H}; border-radius: 4px; color: ${g}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${K(g,65,H)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${H}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${p}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${g}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${uT} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${J}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${K(f0,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${J}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${f0}; }
.oc-sdk-tab[aria-selected="true"] { color: ${_T}; background: ${ST}; border-color: ${H}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${J}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${N}; color: ${J}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${K("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${N}; }
.oc-sdk-row[aria-selected="true"] { background: ${ST}; color: ${_T}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${GT}; font-size: 0.75rem; color: ${J}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${J}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${J}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${J}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${J}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${J}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${H}; border-top-color: ${g}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${K("var(--oc-sdk-tone)",40)}; border-radius: 8px; background: ${K("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${J}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${J}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${K(H,40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${J}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${H}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${g}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${UT}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${K(H,60)}; }
`;var RS=()=>{let T=document.createElement("span");return T.className="oc-sdk-spinner-ring",T.setAttribute("aria-hidden","true"),T},q=(T,S)=>{L(B);let _=S,U=c("oc-sdk oc-sdk-btn"),G=RS(),A=document.createElement("span");U.append(A),T.append(U);let X=()=>{if(U.dataset.variant=_.variant??"default",U.dataset.size=_.size??"default",U.disabled=Boolean(_.disabled)||Boolean(_.loading),U.dataset.loading=_.loading?"true":"false",U.setAttribute("aria-busy",_.loading?"true":"false"),_.loading&&G.parentNode!==U)U.prepend(G);else if(!_.loading&&G.parentNode===U)G.remove();w(A,_.label)},M=()=>{if(_.disabled||_.loading)return;_.onClick()};return U.addEventListener("click",M),X(),{update:(k)=>{_={..._,...k},X()},dispose:()=>{U.removeEventListener("click",M),U.remove()}}};var s=(T,S="vertical")=>{let[_,U]=S==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(T.key===_||T.ctrlKey&&T.key.toLowerCase()==="n")return"next";if(T.key===U||T.ctrlKey&&T.key.toLowerCase()==="p")return"previous";if(T.key==="Home")return"first";if(T.key==="End")return"last";return null},e=(T,S,_)=>{let U=T.filter((k)=>!k.disabled);if(U.length===0)return null;let G=U[0],A=U[U.length-1];if(_==="first"||!G||!A)return G?.id??null;if(_==="last")return A.id;let X=U.findIndex((k)=>k.id===S);if(X===-1)return _==="next"?G.id:A.id;return U[Math.min(U.length-1,Math.max(0,X+(_==="next"?1:-1)))]?.id??null};var xT=(T,S)=>{L(B);let _=S,U=V("div","oc-sdk oc-sdk-tabs");U.setAttribute("role","tablist"),T.append(U);let G=()=>{t(U),U.dataset.track=_.trackBackground?"true":"false";for(let X of _.items){let M=c("oc-sdk-tab");M.setAttribute("role","tab");let k=X.id===_.activeId;M.setAttribute("aria-selected",k?"true":"false"),M.tabIndex=k?0:-1,M.dataset.id=X.id;let z=V("span");if(z.textContent=X.label,M.append(z),X.count!==void 0){let m=V("span","oc-sdk-tab-count");m.textContent=String(X.count),M.append(m)}M.addEventListener("click",()=>{if(X.id!==_.activeId)_.onChange(X.id)}),U.append(M)}},A=(X)=>{let M=s(X,"horizontal");if(!M)return;let k=e(_.items,_.activeId,M);if(k&&k!==_.activeId){X.preventDefault(),_.onChange(k);let z=U.querySelector(`[data-id="${CSS.escape(k)}"]`);if(z instanceof HTMLElement)z.focus()}};return U.addEventListener("keydown",A),G(),{update:(X)=>{_={..._,...X},G()},dispose:()=>{U.removeEventListener("keydown",A),U.remove()}}};var AT=(T,S)=>{L(B);let _=S,U=V("div","oc-sdk oc-sdk-empty"),G=V("h2","oc-sdk-empty-title"),A=V("p","oc-sdk-empty-body"),X=V("div","oc-sdk-empty-action");U.append(G,A,X),T.append(U);let M=null,k=()=>{if(w(G,_.title),w(A,_.body),A.hidden=!_.body,X.hidden=!_.action,!_.action){M?.dispose(),M=null;return}let z={label:_.action.label,onClick:_.action.onClick};if(M)M.update(z);else M=q(X,{...z,variant:"outline",size:"sm"})};return k(),{update:(z)=>{_={..._,...z},k()},dispose:()=>{M?.dispose(),M=null,U.remove()}}};function tT(T){return(T??"").slice(0,7)}function o(T){if(T==null||T==="")return null;if(typeof T==="number")return Number.isFinite(T)?T:null;let S=Date.parse(T);return Number.isNaN(S)?null:S}function J0(T){if(T==null||!Number.isFinite(T))return"";let S=Math.max(0,Math.round(T));if(S<60)return`${S}s`;let _=Math.floor(S/60),U=S%60;if(_<60)return U?`${_}m ${String(U).padStart(2,"0")}s`:`${_}m`;let G=Math.floor(_/60),A=_%60;return`${G}h ${String(A).padStart(2,"0")}m`}function K0(T,S){return J0((S-T)/1000)}function L0(T,S=Date.now()){let _=Math.max(0,Math.round((S-T)/1000));if(_<10)return"just now";if(_<60)return`${_}s ago`;let U=Math.floor(_/60);if(U<60)return`${U}m ago`;let G=Math.floor(U/60);if(G<24)return`${G}h ago`;let A=Math.floor(G/24);if(A<30)return`${A}d ago`;return`${Math.floor(A/30)}mo ago`}function ET(T){if(T==null||T==="")return[];return(T.endsWith(`
`)?T.slice(0,-1):T).split(`
`)}function sT(T,S){if(S<=0)return[];return ET(T).slice(-S)}function eT(T){return(S)=>T.request(S)}function XT(T){return`/api/v4/projects/${encodeURIComponent(T)}`}function yS(T,S={scope:"all"}){let _={per_page:String(S.perPage??ZT)};if(S.scope==="branch"){if(S.ref)_.ref=S.ref}else _.order_by="updated_at",_.sort="desc";return{path:`${XT(T)}/pipelines`,query:_}}function gS(T,S){return{path:`${XT(T)}/pipelines/${S}/jobs`,query:{per_page:"100"}}}function jS(T,S){return{path:`${XT(T)}/jobs/${S}/trace`,query:{}}}function cS(T){if(T>=200&&T<300)return null;if(T===401||T===403)return{kind:"unauthorized"};if(T===404)return{kind:"not-found"};return{kind:"http",status:T}}function qS(T){if(typeof T!=="object"||T===null)return null;let S=T.code;return typeof S==="string"?S:null}function hS(T){let S=qS(T);if(S==="DISCONNECTED")return{kind:"disconnected"};if(S==="NO_SERVICE"||S==="SERVICE_FAILED"||S==="NOT_GRANTED")return{kind:"service"};return{kind:"network"}}async function MT(T,S){let _;try{_=await T(S)}catch(G){return{ok:!1,failure:hS(G)}}let U=cS(_.status);if(U)return{ok:!1,failure:U};return{ok:!0,status:_.status,body:_.body}}function TS(T,S){try{return{ok:!0,data:JSON.parse(T)}}catch{return{ok:!1,failure:{kind:"http",status:S}}}}async function SS(T,S,_){let U=yS(S,_),G=await MT(T,{method:"GET",...U});if(!G.ok)return G;return TS(G.body,G.status)}async function _S(T,S,_){let U=gS(S,_),G=await MT(T,{method:"GET",...U});if(!G.ok)return G;return TS(G.body,G.status)}async function US(T,S,_){let U=jS(S,_),G=await MT(T,{method:"GET",...U});if(!G.ok){if(G.failure.kind==="not-found")return{ok:!0,data:""};return G}return{ok:!0,data:G.body}}var dS={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"calendar"},waiting_for_resource:{label:"Waiting for resource",tone:"neutral",glyph:"pause"},waiting_for_callback:{label:"Waiting for callback",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},fS={label:"Unknown",tone:"neutral",glyph:"dot"};function B0(T){if(!T)return fS;return dS[T]??fS}function G0(T){let S=B0(T.status);if(T.status==="failed"&&T.allow_failure)return{...S,label:"Failed (allowed)",tone:"warning"};return S}var vS=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],pS=new Set(vS);function x0(T){return T!=null&&pS.has(T)}function nS(T,S={}){if(!kT(T))return{active:!1,delayMs:null};let U=S.intervalMs??WT,G=S.elapsedMs??0,A=G>600000?3:G>120000?2:1;return{active:!0,delayMs:U*A}}function kT(T){for(let S of T)if(x0(S))return!0;return!1}function GS(T,S={}){return nS(T,S).delayMs}function YT(T){try{return new URL(T).host}catch{return T.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function oS(T){let S=T.trim();if(!S)return null;let _="",U="";if(S.includes("://")){let A;try{A=new URL(S)}catch{return null}_=A.host,U=A.pathname}else{let A=S.indexOf(":");if(A<0)return null;_=S.slice(0,A).replace(/^[^@]*@/,""),U=S.slice(A+1),U=U.replace(/^\/+/,"")}let G=xS(U);if(!_||!G)return null;return{host:_,path:G}}function xS(T){let S=T.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(S.toLowerCase().endsWith(".git"))S=S.slice(0,-4);return S.replace(/\/+$/,"")}function lS(T){let S=[],_=null;for(let U of T.split(/\r?\n/)){let G=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(U);if(G){_=G[1]??null;continue}if(/^\s*\[/.test(U)){_=null;continue}if(_==null)continue;let A=/^\s*url\s*=\s*(.+?)\s*$/.exec(U);if(A&&A[1])S.push({name:_,url:A[1]})}return S}function aS(T){let S=lS(T),_=["origin","upstream"],U=[..._.flatMap((G)=>S.filter((A)=>A.name===G)),...S.filter((G)=>!_.includes(G.name))];for(let G of U){let A=oS(G.url);if(A)return{remote:A,name:G.name}}return null}function uS(T){if(!T)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(T)?.[1]??null}function $T(T,S){if(!T||!S)return!1;return T.replace(/\/+$/,"")===S.replace(/\/+$/,"")}function iS(T){return T!=null&&/^\s*gitdir:\s*\S+/.test(T)}function zT(T,S,_){if(T&&_){let U=_.find((G)=>$T(G.directory,T));if(U?.branch)return U.branch}return uS(S)}function AS(T){let S=YT(T.apiOrigin),_=T.projectOverride?.trim()??"";if(!T.directory&&!_)return{ok:!1,failure:"no-project"};if(_){let G=xS(_);if(!G)return{ok:!1,failure:"no-project"};return{ok:!0,host:S,project:G,ref:zT(T.directory,T.head,T.worktrees),source:"override"}}let U=T.gitConfig?aS(T.gitConfig):null;if(!U){if(iS(T.gitFile))return{ok:!1,failure:"linked-worktree",detectedRef:zT(T.directory,T.head,T.worktrees)};return{ok:!1,failure:"not-a-repo"}}if(U.remote.host!==S)return{ok:!1,failure:"host-mismatch",detectedHost:U.remote.host,detectedPath:U.remote.path};return{ok:!0,host:S,project:U.remote.path,ref:zT(T.directory,T.head,T.worktrees),source:"derived"}}var rS=new Set(["success","failed","canceled","skipped"]);function tS(T){return rS.has(T.status)}function ES(T=[]){let S=[],_=new Map;for(let U of T){let G=_.get(U.stage);if(!G)G=[],_.set(U.stage,G),S.push(U.stage);G.push(U)}return S.map((U)=>{let G=_.get(U)??[];return{stage:U,jobs:G,done:G.filter(tS).length,total:G.length}})}var sS={setTimeout:(T,S)=>globalThis.setTimeout(T,S),clearTimeout:(T)=>globalThis.clearTimeout(T),setInterval:(T,S)=>globalThis.setInterval(T,S),clearInterval:(T)=>globalThis.clearInterval(T),now:()=>Date.now()},XS={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',calendar:'<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},eS='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M7 4a3 3 0 0 0-1 5.83v4.34A3.001 3.001 0 1 0 8 17v-4h1a4 4 0 0 0 4-4V8.83a3.001 3.001 0 1 0-2 0V9a2 2 0 0 1-2 2H8V9.83A3 3 0 0 0 7 4zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm8-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7 16a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',T_='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',S_='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',__='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';function E(T,S,_){let U=document.createElement(T);if(S)U.className=S;if(_!=null)U.textContent=_;return U}function MS(T){while(T.firstChild)T.removeChild(T.firstChild)}class $S{root;port;options;timers;directory=null;settingsProject="";settingsHost="";settingsToken="";started=!1;disposed=!1;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;jobs=new Map;openJob=null;traces=new Map;traceLoadingId=null;updatedAt=null;lastHost=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;drawerEl=null;drawerScrollTop=0;followTail=!0;handles=[];unsubReady=null;unsubConnection=null;constructor(T,S,_){this.root=T,this.port=S,this.options=_,this.timers=_.timers??sS}start(){return this.unsubReady=this.port.onReady((T)=>this.handleReady(T)),this.unsubConnection=this.port.onConnection((T)=>this.handleConnection(T)),this.render(),this}handleReady(T){TT(T,document.documentElement);let S=T.settings?.project??"",_=T.settings?.host??"",U=T.settings?.token??"",G=T.directory!==this.directory||S!==this.settingsProject||_!==this.settingsHost||U!==this.settingsToken||!this.started;if(this.directory=T.directory,this.settingsProject=S,this.settingsHost=_,this.settingsToken=U,G)this.started=!0,this.refresh();else this.render()}handleConnection(T){if(this.isCustomHost())return;if(!T.connected){this.problem=DS(this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.problem?.kind==="disconnected")this.refresh()}refresh(){if(this.disposed)return;let T=++this.generation;this.runRefresh(T)}setScope(T){if(T===this.scope)return;this.scope=T,this.expandedId=null,this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.unsubConnection?.(),this.disposeHandles(),MS(this.root),this.port.dispose()}async runRefresh(T){this.error=null;let S=this.hostSettingProblem();if(S){this.problem=S,this.phase="problem",this.resolved=null,this.forgetHostData(),this.stopAllTimers(),this.render();return}let _=this.effectiveHost();if(_!==this.lastHost)this.forgetHostData(),this.lastHost=_;let U=this.settingsProject.trim();if(!this.directory&&!U){this.problem=YS({ok:!1,failure:"no-project"},this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.pipelines.length===0)this.phase="loading";this.render();let G=await this.deriveProject();if(this.disposed||T!==this.generation)return;if(!G.ok){this.problem=YS(G,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}this.problem=null,this.resolved=G,await this.loadPipelines(T,G)}hostSettingProblem(){let T=this.settingsHost.trim();if(T==="")return null;let S=zS(T);if(S==null)return M_(T);if(P0(S)===this.configuredHost())return null;if(this.settingsToken.trim()==="")return X_(P0(S));return null}forgetHostData(){this.pipelines=[],this.jobs.clear(),this.traces.clear(),this.openJob=null,this.expandedId=null,this.updatedAt=null}async deriveProject(){let T=this.settingsProject.trim(),S=this.directory,_=null,U=null,G=null,A=null;if(S){try{_=(await this.port.readFile(".git/config")).content}catch{_=null}if(_==null)try{U=(await this.port.readFile(".git")).content}catch{U=null}try{G=(await this.port.readFile(".git/HEAD")).content}catch{G=null}try{let M=(await this.port.listProjects()).projects.find((k)=>$T(k.directory,S));if(M)A=(await this.port.listWorktrees(M.id)).worktrees}catch{A=null}}return AS({directory:S,apiOrigin:this.isCustomHost()?this.customBase()??this.options.apiOrigin:this.options.apiOrigin,projectOverride:T,gitConfig:_,gitFile:U,head:G,worktrees:A})}async loadPipelines(T,S){let _=S.ref?this.scope:"all",U=await SS(this.requester(),S.project,{scope:_,ref:S.ref});if(this.disposed||T!==this.generation)return;if(!U.ok){this.handleFailure(U.failure);return}if(this.pipelines=U.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.expandedId!=null)this.loadJobs(T,this.expandedId,this.jobs.has(this.expandedId));this.render(),this.schedulePoll()}handleFailure(T){if(T.kind==="disconnected"||T.kind==="unauthorized"||T.kind==="not-found"||T.kind==="service"){this.problem=E_(T,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.error=T.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${T.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}togglePipeline(T){if(this.expandedId===T){this.expandedId=null,this.render();return}if(this.expandedId=T,!this.jobs.has(T))this.jobs.set(T,"loading"),this.render(),this.loadJobs(this.generation,T,!1);else this.render()}async loadJobs(T,S,_){let U=this.resolved?.project;if(!U)return;if(!_||!Array.isArray(this.jobs.get(S)))this.jobs.set(S,"loading"),this.render();let G=await _S(this.requester(),U,S);if(this.disposed||T!==this.generation)return;if(G.ok)this.jobs.set(S,G.data);else if(_);else this.jobs.set(S,"error");if(this.expandedId===S)this.render()}openJobDrawer(T,S){if(this.openJob={pipelineId:T,jobId:S},this.followTail=!0,this.drawerScrollTop=0,this.traces.has(S)){this.render();return}this.traceLoadingId=S,this.render(),this.loadTrace(this.generation,S)}async loadTrace(T,S){let _=this.resolved?.project;if(!_)return;let U=await US(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(this.traceLoadingId=null,!U.ok)this.traces.set(S,{state:"error",text:"",truncated:null});else{let G=U.data??"";if(!G.trim())this.traces.set(S,{state:"missing",text:"",truncated:null});else this.traces.set(S,{state:"ready",text:G,truncated:G_(G)})}this.render()}refreshOpenTrace(T){let S=this.openJob;if(!S||this.traceLoadingId===S.jobId)return;let _=this.jobById(S.jobId);if(!_||!x0(_.status))return;this.loadTrace(T,S.jobId)}jobById(T){for(let S of this.jobs.values()){if(!Array.isArray(S))continue;let _=S.find((U)=>U.id===T);if(_)return _}return}closeDrawer(){this.openJob=null,this.followTail=!0,this.drawerScrollTop=0,this.render()}visibleStatuses(){let T=this.pipelines.map((S)=>S.status);for(let S of this.jobs.values())if(Array.isArray(S))for(let _ of S)T.push(_.status);return T}hasActive(){return kT(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let T=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=T;let S=GS(this.visibleStatuses(),{elapsedMs:T-this.pollStartedAt});if(S==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},S)}async pollOnce(){if(this.disposed||!this.resolved)return;let T=++this.generation;if(await this.loadPipelines(T,this.resolved),T===this.generation)this.refreshOpenTrace(T)}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),VT)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let T=this.timers.now();for(let S of Array.from(this.root.querySelectorAll("[data-live]"))){let _=Number(S.dataset.start);if(!Number.isFinite(_))continue;if(S.dataset.live==="ago")S.textContent=L0(_,T);else if(S.dataset.live==="elapsed"){let U=S.dataset.end?Number(S.dataset.end):T;S.textContent=K0(_,Number.isFinite(U)?U:T)}}}configuredHost(){return YT(this.options.apiOrigin)}customBase(){return zS(this.settingsHost)}isCustomHost(){let T=this.customBase();if(T==null)return!1;return P0(T)!==this.configuredHost()}effectiveHost(){let T=this.customBase();return T!=null&&this.isCustomHost()?P0(T):this.configuredHost()}requester(){let T=this.isCustomHost()?this.customBase():null;if(T!=null){let S=this.settingsToken.trim();return async(_)=>{let U=await this.port.serviceRequest({method:_.method??"GET",path:CT,query:{baseUrl:T},body:JSON.stringify({baseUrl:T,token:S,method:_.method??"GET",path:_.path,query:_.query??{}})});return f_(U)}}return eT(this.port)}disposeHandles(){for(let T of this.handles.splice(0))T.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;if(this.drawerEl)this.drawerScrollTop=this.drawerEl.scrollTop;MS(this.root),this.root.className="gp";let T=E("div","gp-progress");if(!this.isFirstLoad())T.hidden=!0;this.root.append(T),this.root.append(this.renderHeader()),this.scrollEl=E("div","gp-scroll");let S=E("div","gp-pad");if(S.append(...this.renderContent()),this.scrollEl.append(S),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;if(this.drawerEl)this.drawerEl.scrollTop=this.followTail?this.drawerEl.scrollHeight:this.drawerScrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let T=this.resolved!=null&&this.updatedAt!=null;if(T&&this.tickTimer==null)this.startTicker();if(!T)this.stopTicker()}renderHeader(){let T=E("div","gp-head"),S=E("div","gp-head-row"),_=E("span","gp-brand"),U=E("span","gp-brand-mark");U.innerHTML=eS,_.append(U,E("span","gp-brand-title","Pipelines")),S.append(_,E("span","gp-spacer"));let G=E("span","gp-updated");if(this.resolved==null||this.updatedAt==null)G.hidden=!0;else{let k=E("span","gp-dot");k.dataset.idle=this.hasActive()?"false":"true";let z=E("span");z.dataset.live="ago",z.dataset.start=String(this.updatedAt),z.textContent=L0(this.updatedAt,this.timers.now()),G.append(k,z)}S.append(G);let A=E("button","gp-iconbtn");if(A.type="button",A.setAttribute("aria-label","Refresh"),A.title="Refresh",A.innerHTML=T_,this.isFirstLoad())A.dataset.spinning="true";A.addEventListener("click",()=>this.refresh()),S.append(A),T.append(S);let X=E("div","gp-project");if(this.isCustomHost()){let k=E("span","gp-host-tag","Custom host");k.dataset.mode="custom",X.append(k)}let M=E("span","gp-project-path");if(this.resolved)M.textContent=`${this.resolved.host}/${this.resolved.project}`;else M.hidden=!0;if(X.append(M),!this.resolved&&!this.isCustomHost())X.hidden=!0;return T.append(X),T.append(this.renderScope()),T}renderScope(){let T=E("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return T.hidden=!0,T;let _=E("div");T.append(_),this.handles.push(xT(_,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(G)=>this.setScope(G)}));let U=this.scope==="branch"?this.resolved?.ref??"":"all refs";return T.append(E("span","gp-scope-ref",U)),T}renderContent(){let T=[];if(this.error){let _=E("div","gp-state");_.append(E("p","gp-state-body",this.error));let U=E("div","gp-state-actions"),G=E("div");this.handles.push(q(G,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(G),_.append(U),T.push(_)}if(this.problem)return T.push(this.renderProblem(this.problem)),T;if(this.isFirstLoad())return T.push(this.renderSkeleton()),T;if(this.pipelines.length===0)return T.push(this.renderEmpty()),T;let S=E("div","gp-list");for(let _ of this.pipelines)S.append(this.renderPipeline(_));return T.push(S),T}renderProblem(T){let S=E("div","gp-state"),_=E("h2","gp-state-title",T.title);if(S.append(_,E("p","gp-state-body",T.body)),T.detail)S.append(E("p","gp-state-detail",T.detail));if(T.hint)S.append(E("p","gp-state-hint",T.hint));let U=E("div","gp-state-actions"),G=E("div");return this.handles.push(q(G,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(G),S.append(U),S}renderEmpty(){let T=E("div"),S=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(AT(T,{title:S?"No pipelines for this ref":"No pipelines yet",body:S?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:S?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),T}renderSkeleton(){let T=E("div","gp-skel");for(let S=0;S<5;S+=1){let _=E("div","gp-skel-row"),U=E("span","gp-skel-line");U.dataset.w="short";let G=E("span","gp-skel-line");G.dataset.w="grow",_.append(U,G),T.append(_)}return T}renderPipeline(T){let S=this.expandedId===T.id,_=E("div","gp-item");_.dataset.open=S?"true":"false";let U=E("button","gp-row");U.type="button",U.setAttribute("aria-expanded",String(S));let G=E("span","gp-caret");G.innerHTML=S_,U.append(G,kS(B0(T.status),15));let A=E("span","gp-row-main"),X=E("span","gp-row-line");if(X.append(E("span","gp-ref",T.ref||"—")),X.append(E("span","gp-sha",tT(T.sha))),A.append(X,E("div","gp-row-sub",A_(T))),U.append(A,this.timingSpan(T)),U.addEventListener("click",()=>this.togglePipeline(T.id)),_.append(U),S){let M=E("div","gp-jobs");if(T.web_url){let z=document.createElement("a");z.className="gp-jobs-link",z.href=T.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View pipeline in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(T.web_url)}),M.append(z)}let k=this.jobs.get(T.id);if(k===void 0||k==="loading")M.append(E("div","gp-row-sub","Loading jobs…"));else if(k==="error")M.append(E("div","gp-row-sub","Could not load jobs. Collapse and reopen to retry."));else if(k.length===0)M.append(E("div","gp-row-sub","No jobs reported yet."));else for(let z of ES(k))M.append(this.renderStage(T.id,z));_.append(M)}return _}timingSpan(T){let S=x0(T.status),_=o(T.started_at);if(S&&_!=null){let A=o(T.finished_at),X=E("span","gp-row-meta");if(X.dataset.live="elapsed",X.dataset.start=String(_),A!=null)X.dataset.end=String(A);return X.textContent=K0(_,A??this.timers.now()),X}if(o(T.finished_at)!=null&&T.duration!=null)return E("span","gp-row-meta",J0(T.duration));let G=o(T.created_at);if(G!=null){let A=E("span","gp-row-meta");return A.dataset.live="ago",A.dataset.start=String(G),A.textContent=L0(G,this.timers.now()),A}return E("span","gp-row-meta","—")}jobMeta(T){let S=o(T.started_at);if(T.status==="running"&&S!=null){let U=E("span","gp-job-meta");return U.dataset.live="elapsed",U.dataset.start=String(S),U.textContent=K0(S,this.timers.now()),U}let _=o(T.finished_at);if(T.duration!=null&&_!=null)return E("span","gp-job-meta",J0(T.duration));if(T.status==="running")return E("span","gp-job-meta","running");return E("span","gp-job-meta",G0(T).label.toLowerCase())}renderStage(T,S){let _=E("div","gp-stage"),U=E("div","gp-stage-head");U.append(E("span","gp-stage-name",S.stage),E("span","gp-stage-count",`${S.done}/${S.total}`),E("span","gp-stage-line")),_.append(U);for(let G of S.jobs){let A=E("button","gp-job");if(A.type="button",this.openJob?.jobId===G.id)A.dataset.selected="true";A.setAttribute("aria-label",`${G.name}, ${G0(G).label}`),A.append(kS(G0(G),13),E("span","gp-job-name",G.name)),A.append(this.jobMeta(G)),A.addEventListener("click",()=>this.openJobDrawer(T,G.id)),_.append(A)}return _}renderDrawer(T){let S=E("div","gp-drawer"),_=this.jobs.get(T.pipelineId),U=Array.isArray(_)?_.find((z)=>z.id===T.jobId):void 0,G=E("div","gp-drawer-head"),A=E("span","gp-drawer-title",U?`${U.name} · ${G0(U).label}`:`Job #${T.jobId}`);if(G.append(A),U?.web_url){let z=document.createElement("a");z.className="gp-drawer-link",z.href=U.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View full log in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(U.web_url)}),G.append(z)}let X=E("button","gp-drawer-close");X.type="button",X.setAttribute("aria-label","Close log"),X.title="Close",X.innerHTML=__,X.addEventListener("click",()=>this.closeDrawer()),G.append(X),S.append(G);let M=this.traces.get(T.jobId);if(!M)return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Loading log…")),S;if(M.state==="missing")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","No log output yet — the job has not started.")),S;if(M.state==="error")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Could not load the log. Close and reopen to retry.")),S;if(M.truncated)S.append(x_(M.truncated));let k=E("pre","gp-drawer-body");return k.textContent=sT(M.text,X0).join(`
`),k.addEventListener("scroll",()=>{this.drawerScrollTop=k.scrollTop,this.followTail=U_(k)}),this.drawerEl=k,S.append(k),S}renderFooter(){let T=E("div","gp-foot");if(T.append(E("span","","Read-only")),this.isCustomHost())T.append(E("span","gp-foot-host",`Custom host: ${this.effectiveHost()}`));return T}}function kS(T,S){let _=E("span","gp-icon");if(T.tone!=="neutral")_.dataset.tone=T.tone;if(T.animate)_.dataset.animate="true";if(T.muted)_.dataset.muted="true";_.setAttribute("role","img"),_.setAttribute("aria-label",T.label);let U=E("span","gp-icon-svg");return U.innerHTML=`<svg viewBox="0 0 24 24" width="${S}" height="${S}" aria-hidden="true" fill="currentColor">${XS[T.glyph]??XS.dot}</svg>`,_.append(U),_}function U_(T,S=24){return T.scrollHeight-T.scrollTop-T.clientHeight<=S}function zS(T){let S=T.trim();if(!S)return null;if(S.includes("://")){if(S.slice(0,S.indexOf("://")).toLowerCase()!=="https")return null;let U;try{U=new URL(S)}catch{return null}if(U.username||U.password)return null;if(U.pathname!=="/"&&U.pathname!=="")return null;if(U.search||U.hash)return null;return U.origin}if(!/^[a-z0-9.-]+(:\d+)?$/i.test(S))return null;return`https://${S}`}function P0(T){return T.replace(/^https:\/\//,"").replace(/\/+$/,"")}function f_(T){try{let S=JSON.parse(T.body);if(typeof S.status==="number")return{status:S.status,body:S.body??""};if(S.error)throw Error(S.error)}catch(S){if(S instanceof SyntaxError);else throw S}return{status:T.status,body:T.body}}function G_(T){if(T.length>=FT)return"host";if(ET(T).length>X0)return"cap";return null}function x_(T){let S=E("div","gp-drawer-notice");return S.textContent=T==="host"?"GitLab returned a capped log. View the full log in GitLab.":`Older lines not shown (last ${X0} lines). View the full log in GitLab.`,S}function A_(T){let S=[`#${T.iid}`,B0(T.status).label];if(T.merge_request?.iid!=null)S.push(`!${T.merge_request.iid}`);else if(T.tag)S.push("tag");else if(T.name)S.push(T.name);if(T.source&&T.source!=="push")S.push(T.source.replace(/_/g," "));return S.join(" · ")}function YS(T,S){switch(T.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"linked-worktree":{let _={kind:"linked-worktree",title:"Linked worktree",body:"This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.",hint:"Set the “Project” setting to this worktree’s GitLab project path to read its pipelines."};if(T.detectedRef)_.detail=`Current ref: ${T.detectedRef}`;return _}case"host-mismatch":return{kind:"host-mismatch",title:"Different GitLab host",body:`This remote points at ${T.detectedHost}, but this extension only talks to ${S}.`,detail:T.detectedPath?`${T.detectedHost}/${T.detectedPath}`:T.detectedHost,hint:"Set the “Project” setting to a project path on this extension’s GitLab host."}}}function DS(T){return{kind:"disconnected",title:"GitLab not connected",body:`No personal access token is stored for ${T}. Connect one to read pipelines.`}}function E_(T,S){if(T.kind==="disconnected")return DS(S);if(T.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored token cannot read this project. A personal access token with the read_api scope is required."};if(T.kind==="service")return{kind:"service",title:"Proxy service unavailable",body:"The local proxy that reaches a custom GitLab host is not running. It may not be granted yet, or it failed to start.",hint:"Open Settings → Extensions and allow this extension’s service, then refresh."};return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the token cannot see it."}}function X_(T){return{kind:"custom-token",title:"No token for this host",body:`The Panel reaches ${T} through the proxy service and needs a personal access token for it.`,hint:"Set the “Access token” setting to a personal access token with the read_api scope."}}function M_(T){return{kind:"custom-host",title:"Invalid GitLab host",body:`“${T}” is not a usable host. Enter a bare host like gitlab.example.com, or a full https:// origin.`,hint:"Fix the “GitLab host” setting, or clear it to use the built-in instance."}}function QS(T,S,_){return new $S(T,S,{..._,apiOrigin:_.apiOrigin||E0}).start()}var ZS=`
html, body { margin: 0; height: 100%; color-scheme: light dark; }
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
  font-size: 0.8125rem;
  line-height: 1.4;
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
.gp-brand { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.gp-brand-mark { display: inline-flex; color: var(--oc-primary, #5b8def); }
.gp-brand-title { letter-spacing: 0.01em; }
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
  width: 26px; height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 6px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  cursor: pointer;
}
.gp-iconbtn:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }
.gp-iconbtn[data-spinning='true'] svg { animation: gp-spin 0.9s linear infinite; }

.gp-project { display: flex; min-width: 0; }
.gp-project-path {
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gp-project-path[hidden] { display: none; }

.gp-scope { display: flex; align-items: center; gap: 8px; }
.gp-scope[hidden] { display: none; }
.gp-scope-ref {
  min-width: 0;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gp-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.gp-pad { padding: 8px 8px 12px; }

.gp-list { display: flex; flex-direction: column; gap: 2px; }

.gp-item {
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 6px);
}
.gp-item[data-open='true'] { border-color: var(--oc-border, rgba(127, 127, 127, 0.35)); background: var(--oc-subtle, transparent); }

.gp-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--oc-radius, 6px);
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
  font-weight: 600;
}
.gp-sha {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-family: var(--oc-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
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
.gp-jobs-link { align-self: flex-start; color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.6875rem; }
.gp-jobs-link:hover { text-decoration: underline; }
.gp-stage { display: flex; flex-direction: column; gap: 1px; }
.gp-stage-head { display: flex; align-items: center; gap: 6px; color: var(--oc-muted, GrayText); font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; }
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
  border-radius: var(--oc-radius, 6px);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.gp-job:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-job[data-selected='true'] { background: var(--oc-selection, rgba(91, 141, 239, 0.25)); color: var(--oc-selection-fg, var(--oc-fg, CanvasText)); }
.gp-job-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-job-meta { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.6875rem; font-variant-numeric: tabular-nums; }

.gp-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 14px; text-align: center; }
.gp-state-title { margin: 0; font-size: 0.9375rem; font-weight: 600; }
.gp-state-body { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.75rem; max-width: 34ch; }
.gp-state-hint { margin: 0; color: var(--oc-muted, GrayText); font-size: 0.6875rem; max-width: 34ch; }
.gp-state-detail { margin: 0; font-family: var(--oc-mono, ui-monospace, monospace); font-size: 0.6875rem; color: var(--oc-muted, GrayText); word-break: break-all; }
.gp-state-actions { display: flex; gap: 6px; margin-top: 2px; }

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
.gp-drawer-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 0.75rem; }
.gp-drawer-link { color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.75rem; white-space: nowrap; }
.gp-drawer-link:hover { text-decoration: underline; }
.gp-drawer-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; padding: 0;
  border: 1px solid transparent; border-radius: var(--oc-radius, 6px);
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
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--oc-fg, CanvasText);
}
.gp-drawer-empty { padding: 14px 10px; color: var(--oc-muted, GrayText); font-size: 0.75rem; text-align: center; }
.gp-drawer-notice { flex: 0 0 auto; padding: 6px 10px; border-bottom: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-warning-text, #e0b567); font-size: 0.6875rem; }

.gp-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-muted, GrayText); font-size: 0.6875rem; }

.gp-skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px; }
.gp-skel-row { display: flex; gap: 8px; }
.gp-skel-line { height: 10px; border-radius: 4px; background: var(--oc-subtle, var(--oc-hover, rgba(127, 127, 127, 0.15))); opacity: 0.6; }
.gp-skel-line[data-w='short'] { flex: 0 0 28%; }
.gp-skel-line[data-w='grow'] { flex: 1 1 auto; }
`;function k_(T){let S=document.createElement("style");S.textContent=T,document.head.append(S)}var CS=document.getElementById("root");if(CS){k_(ZS);let T=nT(),S=QS(CS,T,{apiOrigin:E0});window.addEventListener("beforeunload",()=>S.dispose())}})();
