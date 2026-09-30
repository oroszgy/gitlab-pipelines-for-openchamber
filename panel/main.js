(()=>{var E0="https://sdlc.webcloud.ec.europa.eu",CT=20,QT="/proxy",X0=20000,ZT=256000,FT=5000,WT=1000;var D="openchamber.sdk",C=1;var w0=`
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
`;function N0(T){let S=T.documentElement;if(S.hasAttribute("data-oc-scrollbar-activity"))return;S.setAttribute("data-oc-scrollbar-activity","");let _=new WeakMap;T.addEventListener("scroll",(f)=>{let G=f.target===T?S:f.target;if(!(G instanceof Element))return;if(!G.hasAttribute("data-oc-scrolling"))G.setAttribute("data-oc-scrolling","");let A=_.get(G);if(A!==void 0)clearTimeout(A);_.set(G,setTimeout(()=>{_.delete(G),G.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var ZS=`(${N0.toString()})(document);`;var m0=128,H0=65536;var VT=["file","directory","other","missing"],g0=(T)=>Boolean(T&&"sessionId"in T),j0=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var JT=/^[0-9a-f]{7,64}$/i,c0=(T)=>JT.test(T),M0=500,k0=32000,KT=16000,BT=128,LT=200,PT=2000,bT=16000,IT=80,RT=200,wT=16000;var NT=2000;var q0=20000,z0=1024,Y0=2000000;var $0=64000,D0=8000,h0=4000;var d0=90000;var mT=999,HT=1e4,C0=500,yT=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],gT=["stopped","starting","ready","failed"],FS=new Set(yT),jT=(T)=>FS.has(T),cT=(T)=>T&&jT(T)?T:"HOST_REJECTED",u=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(u);if(Object(T)===T)return Object.values(T).every(u);return!1},qT=(T)=>u(T)&&JSON.stringify(T).length<=wT,OT=(T)=>T?.trim().slice(0,RT)??"",i=(T)=>{let S=T.id.trim().slice(0,BT),_=T.title.trim().slice(0,LT),f=T.url.trim().slice(0,PT),G=T.text?.trim().slice(0,bT),A=T.author?.trim().slice(0,IT),X=T.kind==="pull"?"pull":"issue",M={providerId:T.providerId.trim(),id:S,title:_||S,url:f,kind:X};if(G)M.text=G;if(A)M.author=A;if(X==="pull"){let k=OT(T.branches?.head),z=OT(T.branches?.base);if(k&&z)M.branches={head:k,base:z}}if(qT(T.data))M.data=T.data;return M},v0=(T)=>{let S=i(T);if(T.projectId)S.projectId=T.projectId;if(T.navigation)S.navigation=T.navigation;if(T.worktree)S.worktree=T.worktree;return S},p0=(T)=>{let S={text:T.text.trim().slice(0,KT)};if(T.send)S.send=!0;return S},n0=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(mT,Math.max(0,Math.round(T)))},o0=(T)=>{if(!Number.isFinite(T))return 0;return Math.min(HT,Math.max(0,Math.ceil(T)))};var r=(T)=>T.length>0&&T.length<=z0&&!T.includes("\x00")&&!T.includes("\\");var Q0=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>NT)return!1;return!T.split("/").some((_)=>_==="."||_==="..")},WS=new Set(gT),l0=(T)=>Boolean(T&&"status"in T&&WS.has(String(T.status))&&!("body"in T)),Z0=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),a0=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),u0=(T)=>Boolean(T&&"written"in T&&T.written===!0),i0=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),OS=new Set(VT),r0=(T)=>Boolean(T&&"kind"in T&&"size"in T&&OS.has(String(T.kind))&&Number.isFinite(T.size)),t0=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),VS=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),JS=(T)=>Object(T)===T?T:null,y0=(T)=>String(T)===T&&T.length>0,KS=(T)=>{if(!y0(T.id))return null;if(T.ok===!0){let S={channel:D,v:C,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)S.payload=T.payload;return S}if(T.ok===!1&&y0(T.error))return{channel:D,v:C,type:"result",id:T.id,ok:!1,error:T.error,code:cT(y0(T.code)?T.code:void 0)};return null},s0=(T)=>{let S=JS(T);if(!S||S.channel!==D||S.v!==C)return null;if(S.type==="result")return KS(S);if(!VS.has(String(S.type))||Object(S.payload)!==S.payload)return null;return S};class Y extends Error{code;constructor(T,S){super(S);this.name="HostRequestError",this.code=T}}var hT=()=>Promise.reject(new Y("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),F0=()=>Promise.reject(new Y("BAD_PATH",`File path must be 1 to ${z0} characters without NUL or backslash.`)),Z=(T)=>{return T.value+=1,`oc-${T.value}`},e0=(T={})=>{let S=T.target??("window"in globalThis?window:null);if(!S)throw new Y("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let _=T.acceptSource??((U)=>U===S.parent),f=T.requestTimeoutMs??q0,G=new Set,A=new Set,X=new Set,M=new Set,k=new Set,z=new Set,m=new Set,T0=null,S0=null,l=new Map,a=new Map,_0=!1,Q={value:0},F=null,j=null,$T=(U)=>{if(!U)return null;return{sessionId:U.id,phase:U.busy?"started":"completed"}},h=(U)=>{S.parent.postMessage(U,"*")},I=(U,x)=>{for(let $ of U)try{$(x)}catch(V){console.error(V)}},DT=(U)=>{if(!(U instanceof MessageEvent))return;if(!_(U.source))return;let x=s0(U.data);if(!x)return;if(x.type==="workspace"){let V=a.get(x.payload.subscriptionId);if(V)I([V],x.payload.snapshot);return}if(x.type==="ready"){if(F=x.payload,j=$T(x.payload.session),I(G,x.payload),I(A,x.payload.directory),I(X,x.payload.session),j)I(M,j);I(k,x.payload.connection),I(z,x.payload.settings),I(m,x.payload.item);return}if(x.type==="directory"){if(F)F={...F,directory:x.payload.directory};I(A,x.payload.directory);return}if(x.type==="session"){if(F)F={...F,session:x.payload.session};if(!x.payload.session)j=null;else if(j?.sessionId!==x.payload.session.id)j=$T(x.payload.session);I(X,x.payload.session);return}if(x.type==="session-lifecycle"){j=x.payload,I(M,x.payload);return}if(x.type==="connection"){if(F)F={...F,connection:x.payload.connection};I(k,x.payload.connection);return}if(x.type==="settings"){if(F)F={...F,settings:x.payload.settings};I(z,x.payload.settings);return}if(x.type==="item"){if(F)F={...F,item:x.payload.item};I(m,x.payload.item);return}if(x.type==="action"){let V=(P)=>{if(!_0)h({channel:D,v:C,type:"action-result",id:x.id,payload:P})},y=S0;if(!y){V({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(x.payload)).then(()=>V({ok:!0}),(P)=>{let R0=(P instanceof Error?P.message:String(P)).trim();V({ok:!1,error:(R0||"Action failed.").slice(0,C0)})});return}if(x.type==="resolve"){let V=(P)=>{h({channel:D,v:C,type:"resolve-result",id:x.id,payload:P})},y=T0;if(!y){V({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(x.payload)).then((P)=>V({item:P?i(P):null}),(P)=>{let R0=(P instanceof Error?P.message:String(P)).trim();V({error:(R0||"Command failed.").slice(0,C0)})});return}let $=l.get(x.id);if(!$)return;if(clearTimeout($.timer),l.delete(x.id),x.ok){$.resolve(x.payload);return}$.reject(new Y(x.code,x.error))};S.addEventListener("message",DT),h({channel:D,v:C,type:"hello"});let R=(U,x=f)=>{if(_0||S.parent===S)return Promise.reject(new Y("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise(($,V)=>{let y=setTimeout(()=>{l.delete(U.id),V(new Y("HOST_TIMEOUT","Host did not answer in time."))},x);l.set(U.id,{resolve:$,reject:V,timer:y}),h(U)})},b=(U)=>R(U).then(()=>{return}),d={channel:D,v:C},v=(U,x=1024)=>{if(!U.trim()||U.length>x)throw new Y("HOST_REJECTED",`Identity must contain 1 to ${x} characters.`)},b0=async(U)=>{if(U.kind!=="projects")v(U.projectId);let x=await R({...d,type:"workspace-read",id:Z(Q),payload:U});if(!x||!("kind"in x)||!("state"in x)||x.kind!==U.kind)throw new Y("HOST_REJECTED","Host did not return workspace data.");return x},I0=async(U,x)=>{if(U.kind!=="projects")v(U.projectId);let $=Z(Q);a.set($,x);try{await b({...d,type:"workspace-subscribe",id:Z(Q),payload:{subscriptionId:$,query:U}})}catch(V){if(a.delete($),!_0)h({...d,type:"workspace-unsubscribe",id:Z(Q),payload:{subscriptionId:$}});throw V}return()=>{if(!a.delete($)||_0)return;h({...d,type:"workspace-unsubscribe",id:Z(Q),payload:{subscriptionId:$}})}},A0=async(U)=>{if("key"in U&&(U.key.length===0||U.key.length>m0))throw new Y("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(U.op==="set"&&!u(U.value))throw new Y("HOST_REJECTED","Storage values must be JSON.");if(U.op==="set"&&new TextEncoder().encode(JSON.stringify(U.value)).length>H0)throw new Y("HOST_REJECTED","Storage value exceeds 64 KiB.");let x=await R({...d,type:"storage",id:Z(Q),payload:U});if(!x||!("storage"in x)||x.op!==U.op)throw new Y("HOST_REJECTED","Host did not return storage data.");return x};return{onAction:(U)=>{return S0=U,()=>{if(S0===U)S0=null}},listProjects:async()=>{let U=await b0({kind:"projects"});if(U.kind!=="projects")throw new Y("HOST_REJECTED","Expected projects.");return U},listWorktrees:async(U)=>{let x=await b0({kind:"worktrees",projectId:U});if(x.kind!=="worktrees")throw new Y("HOST_REJECTED","Expected worktrees.");return x},listSessions:async(U)=>{let x=await b0({kind:"sessions",projectId:U});if(x.kind!=="sessions")throw new Y("HOST_REJECTED","Expected sessions.");return x},onProjects:(U)=>I0({kind:"projects"},(x)=>{if(x.kind==="projects")U(x)}),onWorktrees:(U,x)=>I0({kind:"worktrees",projectId:U},($)=>{if($.kind==="worktrees")x($)}),onSessions:(U,x)=>I0({kind:"sessions",projectId:U},($)=>{if($.kind==="sessions")x($)}),openSession:async(U)=>{v(U),await b({...d,type:"open-session",id:Z(Q),payload:{sessionId:U}})},storage:{get:async(U)=>{let x=await A0({op:"get",key:U});return x.op==="get"&&x.found?x.value:void 0},set:async(U,x)=>{await A0({op:"set",key:U,value:x})},delete:async(U)=>{await A0({op:"delete",key:U})},keys:async()=>{let U=await A0({op:"keys"});if(U.op!=="keys")throw new Y("HOST_REJECTED","Expected storage keys.");return U.keys}},onReady:(U)=>{if(G.add(U),F)U(F);return()=>{G.delete(U)}},onDirectory:(U)=>{if(A.add(U),F)U(F.directory);return()=>{A.delete(U)}},onSession:(U)=>{if(X.add(U),F)U(F.session);return()=>{X.delete(U)}},onSessionLifecycle:(U)=>{if(M.add(U),j)U(j);return()=>{M.delete(U)}},onConnection:(U)=>{if(k.add(U),F)U(F.connection);return()=>{k.delete(U)}},onSettings:(U)=>{if(z.add(U),F)U(F.settings);return()=>{z.delete(U)}},onItem:(U)=>{if(m.add(U),F)U(F.item);return()=>{m.delete(U)}},onResolve:(U)=>{return T0=U,()=>{if(T0===U)T0=null}},toast:(U)=>{let x=U.message.trim();if(!x||x.length>M0)return Promise.reject(new Y("HOST_REJECTED",`Toast message must contain 1 to ${M0} characters.`));if(U.copy&&U.copy!==!0&&(!U.copy.text.length||U.copy.text.length>k0))return Promise.reject(new Y("HOST_REJECTED",`Toast copy text must contain 1 to ${k0} characters.`));return b({channel:D,v:C,type:"toast",id:Z(Q),payload:{...U,message:x}})},openUrl:(U)=>b({channel:D,v:C,type:"open-url",id:Z(Q),payload:{url:U}}),openCommit:(U)=>c0(U)?b({channel:D,v:C,type:"open-commit",id:Z(Q),payload:{sha:U}}):Promise.reject(new Y("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(U)=>b({channel:D,v:C,type:"open-surface",id:Z(Q),payload:{surfaceId:U}}),writeClipboard:(U)=>b({channel:D,v:C,type:"clipboard-write",id:Z(Q),payload:{text:U}}),compose:(U)=>b({channel:D,v:C,type:"compose",id:Z(Q),payload:U}),attach:(U)=>b({channel:D,v:C,type:"attach",id:Z(Q),payload:i(U)}),startSession:async(U)=>{if(U.projectId!==void 0)v(U.projectId);let x=U.worktree;if(x&&x!==!0)if(x.kind==="existing")v(x.directory);else{if(x.name!==void 0)v(x.name,200);if(x.baseBranch!==void 0)v(x.baseBranch,200)}let $=await R({channel:D,v:C,type:"start-session",id:Z(Q),payload:v0(U)},T.requestTimeoutMs??180000);if(!g0($))throw new Y("HOST_REJECTED","Host did not return a session.");return $},prompt:(U)=>R({channel:D,v:C,type:"prompt",id:Z(Q),payload:p0(U)}).then((x)=>{if(!j0(x))throw new Y("HOST_REJECTED","Host did not return a prompt result.");return x}),sessionLink:(U)=>b({channel:D,v:C,type:"session-link",id:Z(Q),payload:i(U)}),close:()=>b({channel:D,v:C,type:"close",id:Z(Q)}),oauthStart:()=>b({channel:D,v:C,type:"oauth-start",id:Z(Q)}),oauthDisconnect:()=>b({channel:D,v:C,type:"oauth-disconnect",id:Z(Q)}),request:(U)=>(Q0(U.path)?R({channel:D,v:C,type:"request",id:Z(Q),payload:U}):hT()).then((x)=>{if(!Z0(x))throw new Y("HOST_REJECTED","Host request result was empty.");return x}),serviceRequest:(U)=>(Q0(U.path)?R({channel:D,v:C,type:"service-request",id:Z(Q),payload:U}):hT()).then((x)=>{if(!Z0(x))throw new Y("HOST_REJECTED","Host service request result was empty.");return x}),serviceStatus:()=>R({channel:D,v:C,type:"service-status",id:Z(Q)}).then((U)=>{if(!l0(U))throw new Y("HOST_REJECTED","Host did not return service status.");return U}),readFile:(U)=>(r(U)?R({channel:D,v:C,type:"file-read",id:Z(Q),payload:{path:U}}):F0()).then((x)=>{if(!a0(x))throw new Y("HOST_REJECTED","Host did not return file content.");return x}),writeFile:(U,x)=>{if(!r(U))return F0();if(x.length>Y0)return Promise.reject(new Y("FILE_TOO_LARGE",`Content is over ${Y0} characters.`));return R({channel:D,v:C,type:"file-write",id:Z(Q),payload:{path:U,content:x}}).then(($)=>{if(!u0($))throw new Y("HOST_REJECTED","Host did not confirm the write.");return $})},listDir:(U)=>(r(U)?R({channel:D,v:C,type:"file-list",id:Z(Q),payload:{path:U}}):F0()).then((x)=>{if(!i0(x))throw new Y("HOST_REJECTED","Host did not return directory entries.");return x}),stat:(U)=>(r(U)?R({channel:D,v:C,type:"file-stat",id:Z(Q),payload:{path:U}}):F0()).then((x)=>{if(!r0(x))throw new Y("HOST_REJECTED","Host did not return file status.");return x}),generate:(U)=>{let x=U.prompt.trim(),$=U.system?.trim();if(x.length===0||x.length>$0)return Promise.reject(new Y("HOST_REJECTED",`Prompt must be 1 to ${$0} characters.`));if($!==void 0&&($.length===0||$.length>D0))return Promise.reject(new Y("HOST_REJECTED",`System prompt must be 1 to ${D0} characters.`));let V=U.maxOutputTokens===void 0?void 0:Math.min(h0,Math.max(1,Math.floor(U.maxOutputTokens)));if(V!==void 0&&!Number.isFinite(V))return Promise.reject(new Y("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:x};if($!==void 0)y.system=$;if(V!==void 0)y.maxOutputTokens=V;return R({channel:D,v:C,type:"generate",id:Z(Q),payload:y},T.requestTimeoutMs??d0).then((P)=>{if(!t0(P))throw new Y("HOST_REJECTED","Host did not return generated text.");return P})},setBadge:(U)=>b({channel:D,v:C,type:"badge",id:Z(Q),payload:{count:n0(U)}}),setHeight:(U)=>b({channel:D,v:C,type:"resize",id:Z(Q),payload:{height:o0(U)}}),dispose:()=>{for(let U of a.keys())h({...d,type:"workspace-unsubscribe",id:Z(Q),payload:{subscriptionId:U}});a.clear(),_0=!0,T0=null,S0=null,S.removeEventListener("message",DT);for(let U of l.values())clearTimeout(U.timer),U.reject(new Y("HOST_UNAVAILABLE","Host client was disposed."));l.clear(),G.clear(),A.clear(),X.clear(),M.clear(),k.clear(),z.clear(),m.clear()}}};var dT=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var K_=new Set(dT);var vT=["none","agent","user"];var L_=new Set(vT);function pT(){let T=e0();return{request:(S)=>T.request({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),serviceRequest:(S)=>T.serviceRequest({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),readFile:(S)=>T.readFile(S),listProjects:()=>T.listProjects(),listWorktrees:(S)=>T.listWorktrees(S),openUrl:(S)=>T.openUrl(S),onReady:(S)=>T.onReady(S),onConnection:(S)=>T.onConnection(S),dispose:()=>T.dispose()}}var BS=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],nT=(T,S)=>{S.style.colorScheme=T.mode;for(let[_,f]of BS)S.style.setProperty(_,T.tokens[f]);S.style.setProperty("font-family",T.tokens.font),S.style.setProperty("font-size","0.875rem"),S.style.setProperty("line-height","1.45"),S.style.setProperty("color",T.tokens.foreground)},TT=(T,S)=>{if(nT(T.theme,S),S.dataset)S.dataset.ocSurface=T.surface,S.dataset.ocTheme=T.theme.mode};var oT="oc-sdk-ui-style",t=(T)=>{while(T.firstChild)T.removeChild(T.firstChild)},B=(T)=>{let S=document.getElementById(oT);if(S instanceof HTMLStyleElement){if(S.textContent!==T)S.textContent=T;return}N0(document);let _=document.createElement("style");_.id=oT,_.textContent=T,document.head.appendChild(_)},O=(T,S)=>{let _=document.createElement(T);if(S)_.className=S;return _},c=(T)=>{let S=O("button",T);return S.type="button",S},w=(T,S)=>{let _=S??"";if(T.textContent!==_)T.textContent=_};var LS={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},W=(T,S)=>`var(--${T}, var(--oc-${LS[T]}, ${S}))`,p=W("surface-background","transparent"),W0=W("surface-elevated","transparent"),f0=W("surface-elevated-foreground","inherit"),U0=W("surface-foreground","inherit"),J=W("surface-muted-foreground","gray"),PS=W("surface-muted","transparent"),H=W("interactive-border","currentColor"),N=W("interactive-hover","transparent"),n=W("interactive-active","transparent"),ST=W("interactive-selection","transparent"),_T=W("interactive-selection-foreground","inherit"),uT=W("interactive-focus-ring","currentColor"),g=W("primary","currentColor"),fT=W("primary-text","inherit"),UT=W("error-text","inherit"),bS=W("font-sans","inherit"),GT=W("font-mono","monospace"),lT=W("radius","9px"),K=(T,S,_="transparent")=>`color-mix(in srgb, ${T} ${S}%, ${_})`,aT=`box-shadow: 0 0 0 2px ${uT};`,O0=(T)=>{let S=W(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${S}; --oc-sdk-tone-text: ${W(`${T}-text`,"inherit")}; }`},L=`
${w0}
.oc-sdk { box-sizing: border-box; color: ${U0}; font-family: ${bS}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${aT} }
.oc-sdk-mono { font-family: ${GT}; }
.oc-sdk-muted { color: ${J}; }
${O0("success")}${O0("warning")}${O0("error")}${O0("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${g}; --oc-sdk-tone-text: ${fT}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${lT}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${fT}; background: ${K(g,10,p)}; border-color: ${K(g,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${K(g,16,p)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${K(g,22,p)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${PS}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-btn[data-variant="outline"] { background: ${W0}; color: ${f0}; border-color: ${H}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${N}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${n}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${W("status-error","red")}; color: ${UT}; background: ${K("var(--oc-sdk-tone)",7,p)}; border-color: ${K("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${K("var(--oc-sdk-tone)",9,p)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${K("var(--oc-sdk-tone)",11,p)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${J}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${UT}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${lT}; background: ${W0}; color: ${f0}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${K(H,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${J}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${uT}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${W("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${W("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${GT}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${J}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${g}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${J}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${N}; color: ${U0}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${H}; border-radius: 6px; background: ${W0}; color: ${f0}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${N}, ${N}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${n}, ${n}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${J}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${J}; }
.oc-sdk-popup { --surface-foreground: ${f0}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${K(H,60)}; border-radius: 12px; background: ${W0}; color: ${f0}; box-shadow: 0 8px 24px ${K(U0,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${N}; }
.oc-sdk-option[aria-selected="true"] { background: ${ST}; color: ${_T}; }
.oc-sdk-option[data-destructive="true"] { color: ${UT}; }
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
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${aT} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${J}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${K(U0,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${J}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${U0}; }
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
.oc-sdk-text a { color: ${fT}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${K(H,60)}; }
`;var IS=()=>{let T=document.createElement("span");return T.className="oc-sdk-spinner-ring",T.setAttribute("aria-hidden","true"),T},q=(T,S)=>{B(L);let _=S,f=c("oc-sdk oc-sdk-btn"),G=IS(),A=document.createElement("span");f.append(A),T.append(f);let X=()=>{if(f.dataset.variant=_.variant??"default",f.dataset.size=_.size??"default",f.disabled=Boolean(_.disabled)||Boolean(_.loading),f.dataset.loading=_.loading?"true":"false",f.setAttribute("aria-busy",_.loading?"true":"false"),_.loading&&G.parentNode!==f)f.prepend(G);else if(!_.loading&&G.parentNode===f)G.remove();w(A,_.label)},M=()=>{if(_.disabled||_.loading)return;_.onClick()};return f.addEventListener("click",M),X(),{update:(k)=>{_={..._,...k},X()},dispose:()=>{f.removeEventListener("click",M),f.remove()}}};var s=(T,S="vertical")=>{let[_,f]=S==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(T.key===_||T.ctrlKey&&T.key.toLowerCase()==="n")return"next";if(T.key===f||T.ctrlKey&&T.key.toLowerCase()==="p")return"previous";if(T.key==="Home")return"first";if(T.key==="End")return"last";return null},e=(T,S,_)=>{let f=T.filter((k)=>!k.disabled);if(f.length===0)return null;let G=f[0],A=f[f.length-1];if(_==="first"||!G||!A)return G?.id??null;if(_==="last")return A.id;let X=f.findIndex((k)=>k.id===S);if(X===-1)return _==="next"?G.id:A.id;return f[Math.min(f.length-1,Math.max(0,X+(_==="next"?1:-1)))]?.id??null};var xT=(T,S)=>{B(L);let _=S,f=O("div","oc-sdk oc-sdk-tabs");f.setAttribute("role","tablist"),T.append(f);let G=()=>{t(f),f.dataset.track=_.trackBackground?"true":"false";for(let X of _.items){let M=c("oc-sdk-tab");M.setAttribute("role","tab");let k=X.id===_.activeId;M.setAttribute("aria-selected",k?"true":"false"),M.tabIndex=k?0:-1,M.dataset.id=X.id;let z=O("span");if(z.textContent=X.label,M.append(z),X.count!==void 0){let m=O("span","oc-sdk-tab-count");m.textContent=String(X.count),M.append(m)}M.addEventListener("click",()=>{if(X.id!==_.activeId)_.onChange(X.id)}),f.append(M)}},A=(X)=>{let M=s(X,"horizontal");if(!M)return;let k=e(_.items,_.activeId,M);if(k&&k!==_.activeId){X.preventDefault(),_.onChange(k);let z=f.querySelector(`[data-id="${CSS.escape(k)}"]`);if(z instanceof HTMLElement)z.focus()}};return f.addEventListener("keydown",A),G(),{update:(X)=>{_={..._,...X},G()},dispose:()=>{f.removeEventListener("keydown",A),f.remove()}}};var AT=(T,S)=>{B(L);let _=S,f=O("div","oc-sdk oc-sdk-empty"),G=O("h2","oc-sdk-empty-title"),A=O("p","oc-sdk-empty-body"),X=O("div","oc-sdk-empty-action");f.append(G,A,X),T.append(f);let M=null,k=()=>{if(w(G,_.title),w(A,_.body),A.hidden=!_.body,X.hidden=!_.action,!_.action){M?.dispose(),M=null;return}let z={label:_.action.label,onClick:_.action.onClick};if(M)M.update(z);else M=q(X,{...z,variant:"outline",size:"sm"})};return k(),{update:(z)=>{_={..._,...z},k()},dispose:()=>{M?.dispose(),M=null,f.remove()}}};function rT(T){return(T??"").slice(0,7)}function o(T){if(T==null||T==="")return null;if(typeof T==="number")return Number.isFinite(T)?T:null;let S=Date.parse(T);return Number.isNaN(S)?null:S}function J0(T){if(T==null||!Number.isFinite(T))return"";let S=Math.max(0,Math.round(T));if(S<60)return`${S}s`;let _=Math.floor(S/60),f=S%60;if(_<60)return f?`${_}m ${String(f).padStart(2,"0")}s`:`${_}m`;let G=Math.floor(_/60),A=_%60;return`${G}h ${String(A).padStart(2,"0")}m`}function K0(T,S){return J0((S-T)/1000)}function B0(T,S=Date.now()){let _=Math.max(0,Math.round((S-T)/1000));if(_<10)return"just now";if(_<60)return`${_}s ago`;let f=Math.floor(_/60);if(f<60)return`${f}m ago`;let G=Math.floor(f/60);if(G<24)return`${G}h ago`;let A=Math.floor(G/24);if(A<30)return`${A}d ago`;return`${Math.floor(A/30)}mo ago`}function ET(T){if(T==null||T==="")return[];return(T.endsWith(`
`)?T.slice(0,-1):T).split(`
`)}function tT(T,S){if(S<=0)return[];return ET(T).slice(-S)}function sT(T){return(S)=>T.request(S)}function XT(T){return`/api/v4/projects/${encodeURIComponent(T)}`}function HS(T,S={scope:"all"}){let _={per_page:String(S.perPage??CT)};if(S.scope==="branch"){if(S.ref)_.ref=S.ref}else _.order_by="updated_at",_.sort="desc";return{path:`${XT(T)}/pipelines`,query:_}}function yS(T,S){return{path:`${XT(T)}/pipelines/${S}/jobs`,query:{per_page:"100"}}}function gS(T,S){return{path:`${XT(T)}/jobs/${S}/trace`,query:{}}}function jS(T){if(T>=200&&T<300)return null;if(T===401||T===403)return{kind:"unauthorized"};if(T===404)return{kind:"not-found"};return{kind:"http",status:T}}function cS(T){if(typeof T!=="object"||T===null)return null;let S=T.code;return typeof S==="string"?S:null}function qS(T){let S=cS(T);if(S==="DISCONNECTED")return{kind:"disconnected"};if(S==="NO_SERVICE"||S==="SERVICE_FAILED"||S==="NOT_GRANTED")return{kind:"service"};return{kind:"network"}}async function MT(T,S){let _;try{_=await T(S)}catch(G){return{ok:!1,failure:qS(G)}}let f=jS(_.status);if(f)return{ok:!1,failure:f};return{ok:!0,status:_.status,body:_.body}}function eT(T,S){try{return{ok:!0,data:JSON.parse(T)}}catch{return{ok:!1,failure:{kind:"http",status:S}}}}async function TS(T,S,_){let f=HS(S,_),G=await MT(T,{method:"GET",...f});if(!G.ok)return G;return eT(G.body,G.status)}async function SS(T,S,_){let f=yS(S,_),G=await MT(T,{method:"GET",...f});if(!G.ok)return G;return eT(G.body,G.status)}async function _S(T,S,_){let f=gS(S,_),G=await MT(T,{method:"GET",...f});if(!G.ok){if(G.failure.kind==="not-found")return{ok:!0,data:""};return G}return{ok:!0,data:G.body}}var hS={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"calendar"},waiting_for_resource:{label:"Waiting for resource",tone:"neutral",glyph:"pause"},waiting_for_callback:{label:"Waiting for callback",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},fS={label:"Unknown",tone:"neutral",glyph:"dot"};function L0(T){if(!T)return fS;return hS[T]??fS}function G0(T){let S=L0(T.status);if(T.status==="failed"&&T.allow_failure)return{...S,label:"Failed (allowed)",tone:"warning"};return S}var dS=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],vS=new Set(dS);function x0(T){return T!=null&&vS.has(T)}function pS(T,S={}){if(!kT(T))return{active:!1,delayMs:null};let f=S.intervalMs??FT,G=S.elapsedMs??0,A=G>600000?3:G>120000?2:1;return{active:!0,delayMs:f*A}}function kT(T){for(let S of T)if(x0(S))return!0;return!1}function US(T,S={}){return pS(T,S).delayMs}function P0(T){try{return new URL(T).host}catch{return T.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function nS(T){let S=T.trim();if(!S)return null;let _="",f="";if(S.includes("://")){let A;try{A=new URL(S)}catch{return null}_=A.host,f=A.pathname}else{let A=S.indexOf(":");if(A<0)return null;_=S.slice(0,A).replace(/^[^@]*@/,""),f=S.slice(A+1),f=f.replace(/^\/+/,"")}let G=GS(f);if(!_||!G)return null;return{host:_,path:G}}function GS(T){let S=T.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(S.toLowerCase().endsWith(".git"))S=S.slice(0,-4);return S.replace(/\/+$/,"")}function oS(T){let S=[],_=null;for(let f of T.split(/\r?\n/)){let G=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(f);if(G){_=G[1]??null;continue}if(/^\s*\[/.test(f)){_=null;continue}if(_==null)continue;let A=/^\s*url\s*=\s*(.+?)\s*$/.exec(f);if(A&&A[1])S.push({name:_,url:A[1]})}return S}function lS(T){let S=oS(T),_=["origin","upstream"],f=[..._.flatMap((G)=>S.filter((A)=>A.name===G)),...S.filter((G)=>!_.includes(G.name))];for(let G of f){let A=nS(G.url);if(A)return{remote:A,name:G.name}}return null}function aS(T){if(!T)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(T)?.[1]??null}function YT(T,S){if(!T||!S)return!1;return T.replace(/\/+$/,"")===S.replace(/\/+$/,"")}function uS(T){return T!=null&&/^\s*gitdir:\s*\S+/.test(T)}function zT(T,S,_){if(T&&_){let f=_.find((G)=>YT(G.directory,T));if(f?.branch)return f.branch}return aS(S)}function xS(T){let S=P0(T.apiOrigin),_=T.projectOverride?.trim()??"";if(!T.directory&&!_)return{ok:!1,failure:"no-project"};if(_){let G=GS(_);if(!G)return{ok:!1,failure:"no-project"};return{ok:!0,host:S,project:G,ref:zT(T.directory,T.head,T.worktrees),source:"override"}}let f=T.gitConfig?lS(T.gitConfig):null;if(!f){if(uS(T.gitFile))return{ok:!1,failure:"linked-worktree",detectedRef:zT(T.directory,T.head,T.worktrees)};return{ok:!1,failure:"not-a-repo"}}if(f.remote.host!==S)return{ok:!1,failure:"host-mismatch",detectedHost:f.remote.host,detectedPath:f.remote.path};return{ok:!0,host:S,project:f.remote.path,ref:zT(T.directory,T.head,T.worktrees),source:"derived"}}var iS=new Set(["success","failed","canceled","skipped"]);function rS(T){return iS.has(T.status)}function AS(T=[]){let S=[],_=new Map;for(let f of T){let G=_.get(f.stage);if(!G)G=[],_.set(f.stage,G),S.push(f.stage);G.push(f)}return S.map((f)=>{let G=_.get(f)??[];return{stage:f,jobs:G,done:G.filter(rS).length,total:G.length}})}var tS={setTimeout:(T,S)=>globalThis.setTimeout(T,S),clearTimeout:(T)=>globalThis.clearTimeout(T),setInterval:(T,S)=>globalThis.setInterval(T,S),clearInterval:(T)=>globalThis.clearInterval(T),now:()=>Date.now()},ES={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',calendar:'<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},sS='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M7 4a3 3 0 0 0-1 5.83v4.34A3.001 3.001 0 1 0 8 17v-4h1a4 4 0 0 0 4-4V8.83a3.001 3.001 0 1 0-2 0V9a2 2 0 0 1-2 2H8V9.83A3 3 0 0 0 7 4zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm8-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7 16a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',eS='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',T_='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',S_='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';function E(T,S,_){let f=document.createElement(T);if(S)f.className=S;if(_!=null)f.textContent=_;return f}function XS(T){while(T.firstChild)T.removeChild(T.firstChild)}class YS{root;port;options;timers;directory=null;settingsProject="";settingsHost="";settingsToken="";started=!1;disposed=!1;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;jobs=new Map;openJob=null;traces=new Map;traceLoadingId=null;updatedAt=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;drawerEl=null;drawerScrollTop=0;followTail=!0;handles=[];unsubReady=null;unsubConnection=null;constructor(T,S,_){this.root=T,this.port=S,this.options=_,this.timers=_.timers??tS}start(){return this.unsubReady=this.port.onReady((T)=>this.handleReady(T)),this.unsubConnection=this.port.onConnection((T)=>this.handleConnection(T)),this.render(),this}handleReady(T){TT(T,document.documentElement);let S=T.settings?.project??"",_=T.settings?.host??"",f=T.settings?.token??"",G=T.directory!==this.directory||S!==this.settingsProject||_!==this.settingsHost||f!==this.settingsToken||!this.started;if(this.directory=T.directory,this.settingsProject=S,this.settingsHost=_,this.settingsToken=f,G)this.started=!0,this.refresh();else this.render()}handleConnection(T){if(this.isCustomHost())return;if(!T.connected){this.problem=$S(this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.problem?.kind==="disconnected")this.refresh()}refresh(){if(this.disposed)return;let T=++this.generation;this.runRefresh(T)}setScope(T){if(T===this.scope)return;this.scope=T,this.expandedId=null,this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.unsubConnection?.(),this.disposeHandles(),XS(this.root),this.port.dispose()}async runRefresh(T){this.error=null;let S=this.hostSettingProblem();if(S){this.problem=S,this.phase="problem",this.resolved=null,this.forgetHostData(),this.stopAllTimers(),this.render();return}this.forgetHostData();let _=this.settingsProject.trim();if(!this.directory&&!_){this.problem=zS({ok:!1,failure:"no-project"},this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.pipelines.length===0)this.phase="loading";this.render();let f=await this.deriveProject();if(this.disposed||T!==this.generation)return;if(!f.ok){this.problem=zS(f,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}this.problem=null,this.resolved=f,await this.loadPipelines(T,f)}hostSettingProblem(){let T=this.settingsHost.trim();if(T==="")return null;let S=kS(T);if(!f_(S))return M_(T);if(S===this.configuredHost())return null;if(this.settingsToken.trim()==="")return X_(S);return null}forgetHostData(){this.pipelines=[],this.jobs.clear(),this.traces.clear(),this.openJob=null,this.expandedId=null,this.updatedAt=null}async deriveProject(){let T=this.settingsProject.trim(),S=this.directory,_=null,f=null,G=null,A=null;if(S){try{_=(await this.port.readFile(".git/config")).content}catch{_=null}if(_==null)try{f=(await this.port.readFile(".git")).content}catch{f=null}try{G=(await this.port.readFile(".git/HEAD")).content}catch{G=null}try{let M=(await this.port.listProjects()).projects.find((k)=>YT(k.directory,S));if(M)A=(await this.port.listWorktrees(M.id)).worktrees}catch{A=null}}return xS({directory:S,apiOrigin:this.isCustomHost()?`https://${this.settingHost()}`:this.options.apiOrigin,projectOverride:T,gitConfig:_,gitFile:f,head:G,worktrees:A})}async loadPipelines(T,S){let _=S.ref?this.scope:"all",f=await TS(this.requester(),S.project,{scope:_,ref:S.ref});if(this.disposed||T!==this.generation)return;if(!f.ok){this.handleFailure(f.failure);return}if(this.pipelines=f.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.expandedId!=null)this.loadJobs(T,this.expandedId,this.jobs.has(this.expandedId));this.render(),this.schedulePoll()}handleFailure(T){if(T.kind==="disconnected"||T.kind==="unauthorized"||T.kind==="not-found"||T.kind==="service"){this.problem=E_(T,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.error=T.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${T.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}togglePipeline(T){if(this.expandedId===T){this.expandedId=null,this.render();return}if(this.expandedId=T,!this.jobs.has(T))this.jobs.set(T,"loading"),this.render(),this.loadJobs(this.generation,T,!1);else this.render()}async loadJobs(T,S,_){let f=this.resolved?.project;if(!f)return;if(!_||!Array.isArray(this.jobs.get(S)))this.jobs.set(S,"loading"),this.render();let G=await SS(this.requester(),f,S);if(this.disposed||T!==this.generation)return;if(G.ok)this.jobs.set(S,G.data);else if(_);else this.jobs.set(S,"error");if(this.expandedId===S)this.render()}openJobDrawer(T,S){if(this.openJob={pipelineId:T,jobId:S},this.followTail=!0,this.drawerScrollTop=0,this.traces.has(S)){this.render();return}this.traceLoadingId=S,this.render(),this.loadTrace(this.generation,S)}async loadTrace(T,S){let _=this.resolved?.project;if(!_)return;let f=await _S(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(this.traceLoadingId=null,!f.ok)this.traces.set(S,{state:"error",text:"",truncated:null});else{let G=f.data??"";if(!G.trim())this.traces.set(S,{state:"missing",text:"",truncated:null});else this.traces.set(S,{state:"ready",text:G,truncated:G_(G)})}this.render()}refreshOpenTrace(T){let S=this.openJob;if(!S||this.traceLoadingId===S.jobId)return;let _=this.jobById(S.jobId);if(!_||!x0(_.status))return;this.loadTrace(T,S.jobId)}jobById(T){for(let S of this.jobs.values()){if(!Array.isArray(S))continue;let _=S.find((f)=>f.id===T);if(_)return _}return}closeDrawer(){this.openJob=null,this.followTail=!0,this.drawerScrollTop=0,this.render()}visibleStatuses(){let T=this.pipelines.map((S)=>S.status);for(let S of this.jobs.values())if(Array.isArray(S))for(let _ of S)T.push(_.status);return T}hasActive(){return kT(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let T=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=T;let S=US(this.visibleStatuses(),{elapsedMs:T-this.pollStartedAt});if(S==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},S)}async pollOnce(){if(this.disposed||!this.resolved)return;let T=++this.generation;if(await this.loadPipelines(T,this.resolved),T===this.generation)this.refreshOpenTrace(T)}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),WT)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let T=this.timers.now();for(let S of Array.from(this.root.querySelectorAll("[data-live]"))){let _=Number(S.dataset.start);if(!Number.isFinite(_))continue;if(S.dataset.live==="ago")S.textContent=B0(_,T);else if(S.dataset.live==="elapsed"){let f=S.dataset.end?Number(S.dataset.end):T;S.textContent=K0(_,Number.isFinite(f)?f:T)}}}configuredHost(){return P0(this.options.apiOrigin)}settingHost(){return kS(this.settingsHost)}isCustomHost(){let T=this.settingHost();return T!==""&&T!==this.configuredHost()}effectiveHost(){return this.isCustomHost()?this.settingHost():this.configuredHost()}requester(){if(this.isCustomHost()){let T=this.settingHost(),S=this.settingsToken.trim();return async(_)=>{let f=await this.port.serviceRequest({method:_.method??"GET",path:QT,query:{baseUrl:T},body:JSON.stringify({baseUrl:T,token:S,method:_.method??"GET",path:_.path,query:_.query??{}})});return U_(f)}}return sT(this.port)}disposeHandles(){for(let T of this.handles.splice(0))T.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;if(this.drawerEl)this.drawerScrollTop=this.drawerEl.scrollTop;XS(this.root),this.root.className="gp";let T=E("div","gp-progress");if(!this.isFirstLoad())T.hidden=!0;this.root.append(T),this.root.append(this.renderHeader()),this.scrollEl=E("div","gp-scroll");let S=E("div","gp-pad");if(S.append(...this.renderContent()),this.scrollEl.append(S),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;if(this.drawerEl)this.drawerEl.scrollTop=this.followTail?this.drawerEl.scrollHeight:this.drawerScrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let T=this.resolved!=null&&this.updatedAt!=null;if(T&&this.tickTimer==null)this.startTicker();if(!T)this.stopTicker()}renderHeader(){let T=E("div","gp-head"),S=E("div","gp-head-row"),_=E("span","gp-brand"),f=E("span","gp-brand-mark");f.innerHTML=sS,_.append(f,E("span","gp-brand-title","Pipelines")),S.append(_,E("span","gp-spacer"));let G=E("span","gp-updated");if(this.resolved==null||this.updatedAt==null)G.hidden=!0;else{let k=E("span","gp-dot");k.dataset.idle=this.hasActive()?"false":"true";let z=E("span");z.dataset.live="ago",z.dataset.start=String(this.updatedAt),z.textContent=B0(this.updatedAt,this.timers.now()),G.append(k,z)}S.append(G);let A=E("button","gp-iconbtn");if(A.type="button",A.setAttribute("aria-label","Refresh"),A.title="Refresh",A.innerHTML=eS,this.isFirstLoad())A.dataset.spinning="true";A.addEventListener("click",()=>this.refresh()),S.append(A),T.append(S);let X=E("div","gp-project");if(this.isCustomHost()){let k=E("span","gp-host-tag","Custom host");k.dataset.mode="custom",X.append(k)}let M=E("span","gp-project-path");if(this.resolved)M.textContent=`${this.resolved.host}/${this.resolved.project}`;else M.hidden=!0;if(X.append(M),!this.resolved&&!this.isCustomHost())X.hidden=!0;return T.append(X),T.append(this.renderScope()),T}renderScope(){let T=E("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return T.hidden=!0,T;let _=E("div");T.append(_),this.handles.push(xT(_,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(G)=>this.setScope(G)}));let f=this.scope==="branch"?this.resolved?.ref??"":"all refs";return T.append(E("span","gp-scope-ref",f)),T}renderContent(){let T=[];if(this.error){let _=E("div","gp-state");_.append(E("p","gp-state-body",this.error));let f=E("div","gp-state-actions"),G=E("div");this.handles.push(q(G,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),f.append(G),_.append(f),T.push(_)}if(this.problem)return T.push(this.renderProblem(this.problem)),T;if(this.isFirstLoad())return T.push(this.renderSkeleton()),T;if(this.pipelines.length===0)return T.push(this.renderEmpty()),T;let S=E("div","gp-list");for(let _ of this.pipelines)S.append(this.renderPipeline(_));return T.push(S),T}renderProblem(T){let S=E("div","gp-state"),_=E("h2","gp-state-title",T.title);if(S.append(_,E("p","gp-state-body",T.body)),T.detail)S.append(E("p","gp-state-detail",T.detail));if(T.hint)S.append(E("p","gp-state-hint",T.hint));let f=E("div","gp-state-actions"),G=E("div");return this.handles.push(q(G,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),f.append(G),S.append(f),S}renderEmpty(){let T=E("div"),S=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(AT(T,{title:S?"No pipelines for this ref":"No pipelines yet",body:S?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:S?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),T}renderSkeleton(){let T=E("div","gp-skel");for(let S=0;S<5;S+=1){let _=E("div","gp-skel-row"),f=E("span","gp-skel-line");f.dataset.w="short";let G=E("span","gp-skel-line");G.dataset.w="grow",_.append(f,G),T.append(_)}return T}renderPipeline(T){let S=this.expandedId===T.id,_=E("div","gp-item");_.dataset.open=S?"true":"false";let f=E("button","gp-row");f.type="button",f.setAttribute("aria-expanded",String(S));let G=E("span","gp-caret");G.innerHTML=T_,f.append(G,MS(L0(T.status),15));let A=E("span","gp-row-main"),X=E("span","gp-row-line");if(X.append(E("span","gp-ref",T.ref||"—")),X.append(E("span","gp-sha",rT(T.sha))),A.append(X,E("div","gp-row-sub",A_(T))),f.append(A,this.timingSpan(T)),f.addEventListener("click",()=>this.togglePipeline(T.id)),_.append(f),S){let M=E("div","gp-jobs");if(T.web_url){let z=document.createElement("a");z.className="gp-jobs-link",z.href=T.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View pipeline in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(T.web_url)}),M.append(z)}let k=this.jobs.get(T.id);if(k===void 0||k==="loading")M.append(E("div","gp-row-sub","Loading jobs…"));else if(k==="error")M.append(E("div","gp-row-sub","Could not load jobs. Collapse and reopen to retry."));else if(k.length===0)M.append(E("div","gp-row-sub","No jobs reported yet."));else for(let z of AS(k))M.append(this.renderStage(T.id,z));_.append(M)}return _}timingSpan(T){let S=x0(T.status),_=o(T.started_at);if(S&&_!=null){let A=o(T.finished_at),X=E("span","gp-row-meta");if(X.dataset.live="elapsed",X.dataset.start=String(_),A!=null)X.dataset.end=String(A);return X.textContent=K0(_,A??this.timers.now()),X}if(o(T.finished_at)!=null&&T.duration!=null)return E("span","gp-row-meta",J0(T.duration));let G=o(T.created_at);if(G!=null){let A=E("span","gp-row-meta");return A.dataset.live="ago",A.dataset.start=String(G),A.textContent=B0(G,this.timers.now()),A}return E("span","gp-row-meta","—")}jobMeta(T){let S=o(T.started_at);if(T.status==="running"&&S!=null){let f=E("span","gp-job-meta");return f.dataset.live="elapsed",f.dataset.start=String(S),f.textContent=K0(S,this.timers.now()),f}let _=o(T.finished_at);if(T.duration!=null&&_!=null)return E("span","gp-job-meta",J0(T.duration));if(T.status==="running")return E("span","gp-job-meta","running");return E("span","gp-job-meta",G0(T).label.toLowerCase())}renderStage(T,S){let _=E("div","gp-stage"),f=E("div","gp-stage-head");f.append(E("span","gp-stage-name",S.stage),E("span","gp-stage-count",`${S.done}/${S.total}`),E("span","gp-stage-line")),_.append(f);for(let G of S.jobs){let A=E("button","gp-job");if(A.type="button",this.openJob?.jobId===G.id)A.dataset.selected="true";A.setAttribute("aria-label",`${G.name}, ${G0(G).label}`),A.append(MS(G0(G),13),E("span","gp-job-name",G.name)),A.append(this.jobMeta(G)),A.addEventListener("click",()=>this.openJobDrawer(T,G.id)),_.append(A)}return _}renderDrawer(T){let S=E("div","gp-drawer"),_=this.jobs.get(T.pipelineId),f=Array.isArray(_)?_.find((z)=>z.id===T.jobId):void 0,G=E("div","gp-drawer-head"),A=E("span","gp-drawer-title",f?`${f.name} · ${G0(f).label}`:`Job #${T.jobId}`);if(G.append(A),f?.web_url){let z=document.createElement("a");z.className="gp-drawer-link",z.href=f.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View full log in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(f.web_url)}),G.append(z)}let X=E("button","gp-drawer-close");X.type="button",X.setAttribute("aria-label","Close log"),X.title="Close",X.innerHTML=S_,X.addEventListener("click",()=>this.closeDrawer()),G.append(X),S.append(G);let M=this.traces.get(T.jobId);if(!M)return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Loading log…")),S;if(M.state==="missing")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","No log output yet — the job has not started.")),S;if(M.state==="error")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Could not load the log. Close and reopen to retry.")),S;if(M.truncated)S.append(x_(M.truncated));let k=E("pre","gp-drawer-body");return k.textContent=tT(M.text,X0).join(`
`),k.addEventListener("scroll",()=>{this.drawerScrollTop=k.scrollTop,this.followTail=__(k)}),this.drawerEl=k,S.append(k),S}renderFooter(){let T=E("div","gp-foot");if(T.append(E("span","","Read-only")),this.isCustomHost())T.append(E("span","gp-foot-host",`Custom host: ${this.effectiveHost()}`));return T}}function MS(T,S){let _=E("span","gp-icon");if(T.tone!=="neutral")_.dataset.tone=T.tone;if(T.animate)_.dataset.animate="true";if(T.muted)_.dataset.muted="true";_.setAttribute("role","img"),_.setAttribute("aria-label",T.label);let f=E("span","gp-icon-svg");return f.innerHTML=`<svg viewBox="0 0 24 24" width="${S}" height="${S}" aria-hidden="true" fill="currentColor">${ES[T.glyph]??ES.dot}</svg>`,_.append(f),_}function __(T,S=24){return T.scrollHeight-T.scrollTop-T.clientHeight<=S}function kS(T){let S=T.trim();if(!S)return"";if(S.includes("://"))return P0(S);return S.replace(/\/+$/,"")}function f_(T){return/^[a-z0-9.-]+(:\d+)?$/i.test(T)}function U_(T){try{let S=JSON.parse(T.body);if(typeof S.status==="number")return{status:S.status,body:S.body??""}}catch{}return{status:T.status,body:T.body}}function G_(T){if(T.length>=ZT)return"host";if(ET(T).length>X0)return"cap";return null}function x_(T){let S=E("div","gp-drawer-notice");return S.textContent=T==="host"?"GitLab returned a capped log. View the full log in GitLab.":`Older lines not shown (last ${X0} lines). View the full log in GitLab.`,S}function A_(T){let S=[`#${T.iid}`,L0(T.status).label];if(T.merge_request?.iid!=null)S.push(`!${T.merge_request.iid}`);else if(T.tag)S.push("tag");else if(T.name)S.push(T.name);if(T.source&&T.source!=="push")S.push(T.source.replace(/_/g," "));return S.join(" · ")}function zS(T,S){switch(T.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"linked-worktree":{let _={kind:"linked-worktree",title:"Linked worktree",body:"This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.",hint:"Set the “Project” setting to this worktree’s GitLab project path to read its pipelines."};if(T.detectedRef)_.detail=`Current ref: ${T.detectedRef}`;return _}case"host-mismatch":return{kind:"host-mismatch",title:"Different GitLab host",body:`This remote points at ${T.detectedHost}, but this extension only talks to ${S}.`,detail:T.detectedPath?`${T.detectedHost}/${T.detectedPath}`:T.detectedHost,hint:"Set the “Project” setting to a project path on this extension’s GitLab host."}}}function $S(T){return{kind:"disconnected",title:"GitLab not connected",body:`No personal access token is stored for ${T}. Connect one to read pipelines.`}}function E_(T,S){if(T.kind==="disconnected")return $S(S);if(T.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored token cannot read this project. A personal access token with the read_api scope is required."};if(T.kind==="service")return{kind:"service",title:"Proxy service unavailable",body:"The local proxy that reaches a custom GitLab host is not running. It may not be granted yet, or it failed to start.",hint:"Open Settings → Extensions and allow this extension’s service, then refresh."};return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the token cannot see it."}}function X_(T){return{kind:"custom-token",title:"No token for this host",body:`The Panel reaches ${T} through the proxy service and needs a personal access token for it.`,hint:"Set the “Access token” setting to a personal access token with the read_api scope."}}function M_(T){return{kind:"custom-host",title:"Invalid GitLab host",body:`“${T}” is not a usable host. Enter a bare host like gitlab.example.com, or a full https:// origin.`,hint:"Fix the “GitLab host” setting, or clear it to use the built-in instance."}}function DS(T,S,_){return new YS(T,S,{..._,apiOrigin:_.apiOrigin||E0}).start()}var CS=`
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
`;function k_(T){let S=document.createElement("style");S.textContent=T,document.head.append(S)}var QS=document.getElementById("root");if(QS){k_(CS);let T=pT(),S=DS(QS,T,{apiOrigin:E0});window.addEventListener("beforeunload",()=>S.dispose())}})();
