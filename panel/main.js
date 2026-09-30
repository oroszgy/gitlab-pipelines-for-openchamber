(()=>{var AT="gitlab-pipelines",ET="https://gitlab.com",F0=20,C0=40,$0=5000,D0=1000;var C="openchamber.sdk",$=1;var wT=`
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
`;function RT(T){let S=T.documentElement;if(S.hasAttribute("data-oc-scrollbar-activity"))return;S.setAttribute("data-oc-scrollbar-activity","");let _=new WeakMap;T.addEventListener("scroll",(U)=>{let x=U.target===T?S:U.target;if(!(x instanceof Element))return;if(!x.hasAttribute("data-oc-scrolling"))x.setAttribute("data-oc-scrolling","");let A=_.get(x);if(A!==void 0)clearTimeout(A);_.set(x,setTimeout(()=>{_.delete(x),x.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var FS=`(${RT.toString()})(document);`;var NT=128,mT=65536;var Z0=["file","directory","other","missing"],yT=(T)=>Boolean(T&&"sessionId"in T),gT=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var O0=/^[0-9a-f]{7,64}$/i,cT=(T)=>O0.test(T),XT=500,MT=32000,W0=16000,V0=128,J0=200,B0=2000,K0=16000,L0=80,b0=200,I0=16000;var P0=2000;var jT=20000,kT=1024,zT=2000000;var YT=64000,FT=8000,qT=4000;var hT=90000;var w0=999,R0=1e4,CT=500,N0=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],m0=["stopped","starting","ready","failed"],CS=new Set(N0),H0=(T)=>CS.has(T),y0=(T)=>T&&H0(T)?T:"HOST_REJECTED",i=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(i);if(Object(T)===T)return Object.values(T).every(i);return!1},g0=(T)=>i(T)&&JSON.stringify(T).length<=I0,Q0=(T)=>T?.trim().slice(0,b0)??"",r=(T)=>{let S=T.id.trim().slice(0,V0),_=T.title.trim().slice(0,J0),U=T.url.trim().slice(0,B0),x=T.text?.trim().slice(0,K0),A=T.author?.trim().slice(0,L0),X=T.kind==="pull"?"pull":"issue",M={providerId:T.providerId.trim(),id:S,title:_||S,url:U,kind:X};if(x)M.text=x;if(A)M.author=A;if(X==="pull"){let Y=Q0(T.branches?.head),k=Q0(T.branches?.base);if(Y&&k)M.branches={head:Y,base:k}}if(g0(T.data))M.data=T.data;return M},dT=(T)=>{let S=r(T);if(T.projectId)S.projectId=T.projectId;if(T.navigation)S.navigation=T.navigation;if(T.worktree)S.worktree=T.worktree;return S},vT=(T)=>{let S={text:T.text.trim().slice(0,W0)};if(T.send)S.send=!0;return S},pT=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(w0,Math.max(0,Math.round(T)))},nT=(T)=>{if(!Number.isFinite(T))return 0;return Math.min(R0,Math.max(0,Math.ceil(T)))};var t=(T)=>T.length>0&&T.length<=kT&&!T.includes("\x00")&&!T.includes("\\");var $T=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>P0)return!1;return!T.split("/").some((_)=>_==="."||_==="..")},$S=new Set(m0),oT=(T)=>Boolean(T&&"status"in T&&$S.has(String(T.status))&&!("body"in T)),DT=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),lT=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),uT=(T)=>Boolean(T&&"written"in T&&T.written===!0),aT=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),DS=new Set(Z0),iT=(T)=>Boolean(T&&"kind"in T&&"size"in T&&DS.has(String(T.kind))&&Number.isFinite(T.size)),rT=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),QS=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),ZS=(T)=>Object(T)===T?T:null,HT=(T)=>String(T)===T&&T.length>0,OS=(T)=>{if(!HT(T.id))return null;if(T.ok===!0){let S={channel:C,v:$,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)S.payload=T.payload;return S}if(T.ok===!1&&HT(T.error))return{channel:C,v:$,type:"result",id:T.id,ok:!1,error:T.error,code:y0(HT(T.code)?T.code:void 0)};return null},tT=(T)=>{let S=ZS(T);if(!S||S.channel!==C||S.v!==$)return null;if(S.type==="result")return OS(S);if(!QS.has(String(S.type))||Object(S.payload)!==S.payload)return null;return S};class z extends Error{code;constructor(T,S){super(S);this.name="HostRequestError",this.code=T}}var c0=()=>Promise.reject(new z("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),QT=()=>Promise.reject(new z("BAD_PATH",`File path must be 1 to ${kT} characters without NUL or backslash.`)),Q=(T)=>{return T.value+=1,`oc-${T.value}`},sT=(T={})=>{let S=T.target??("window"in globalThis?window:null);if(!S)throw new z("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let _=T.acceptSource??((f)=>f===S.parent),U=T.requestTimeoutMs??jT,x=new Set,A=new Set,X=new Set,M=new Set,Y=new Set,k=new Set,B=new Set,h=null,ST=null,u=new Map,a=new Map,_T=!1,D={value:0},Z=null,c=null,z0=(f)=>{if(!f)return null;return{sessionId:f.id,phase:f.busy?"started":"completed"}},d=(f)=>{S.parent.postMessage(f,"*")},w=(f,G)=>{for(let F of f)try{F(G)}catch(V){console.error(V)}},Y0=(f)=>{if(!(f instanceof MessageEvent))return;if(!_(f.source))return;let G=tT(f.data);if(!G)return;if(G.type==="workspace"){let V=a.get(G.payload.subscriptionId);if(V)w([V],G.payload.snapshot);return}if(G.type==="ready"){if(Z=G.payload,c=z0(G.payload.session),w(x,G.payload),w(A,G.payload.directory),w(X,G.payload.session),c)w(M,c);w(Y,G.payload.connection),w(k,G.payload.settings),w(B,G.payload.item);return}if(G.type==="directory"){if(Z)Z={...Z,directory:G.payload.directory};w(A,G.payload.directory);return}if(G.type==="session"){if(Z)Z={...Z,session:G.payload.session};if(!G.payload.session)c=null;else if(c?.sessionId!==G.payload.session.id)c=z0(G.payload.session);w(X,G.payload.session);return}if(G.type==="session-lifecycle"){c=G.payload,w(M,G.payload);return}if(G.type==="connection"){if(Z)Z={...Z,connection:G.payload.connection};w(Y,G.payload.connection);return}if(G.type==="settings"){if(Z)Z={...Z,settings:G.payload.settings};w(k,G.payload.settings);return}if(G.type==="item"){if(Z)Z={...Z,item:G.payload.item};w(B,G.payload.item);return}if(G.type==="action"){let V=(I)=>{if(!_T)d({channel:C,v:$,type:"action-result",id:G.id,payload:I})},y=ST;if(!y){V({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(G.payload)).then(()=>V({ok:!0}),(I)=>{let PT=(I instanceof Error?I.message:String(I)).trim();V({ok:!1,error:(PT||"Action failed.").slice(0,CT)})});return}if(G.type==="resolve"){let V=(I)=>{d({channel:C,v:$,type:"resolve-result",id:G.id,payload:I})},y=h;if(!y){V({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(G.payload)).then((I)=>V({item:I?r(I):null}),(I)=>{let PT=(I instanceof Error?I.message:String(I)).trim();V({error:(PT||"Command failed.").slice(0,CT)})});return}let F=u.get(G.id);if(!F)return;if(clearTimeout(F.timer),u.delete(G.id),G.ok){F.resolve(G.payload);return}F.reject(new z(G.code,G.error))};S.addEventListener("message",Y0),d({channel:C,v:$,type:"hello"});let R=(f,G=U)=>{if(_T||S.parent===S)return Promise.reject(new z("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((F,V)=>{let y=setTimeout(()=>{u.delete(f.id),V(new z("HOST_TIMEOUT","Host did not answer in time."))},G);u.set(f.id,{resolve:F,reject:V,timer:y}),d(f)})},P=(f)=>R(f).then(()=>{return}),v={channel:C,v:$},p=(f,G=1024)=>{if(!f.trim()||f.length>G)throw new z("HOST_REJECTED",`Identity must contain 1 to ${G} characters.`)},bT=async(f)=>{if(f.kind!=="projects")p(f.projectId);let G=await R({...v,type:"workspace-read",id:Q(D),payload:f});if(!G||!("kind"in G)||!("state"in G)||G.kind!==f.kind)throw new z("HOST_REJECTED","Host did not return workspace data.");return G},IT=async(f,G)=>{if(f.kind!=="projects")p(f.projectId);let F=Q(D);a.set(F,G);try{await P({...v,type:"workspace-subscribe",id:Q(D),payload:{subscriptionId:F,query:f}})}catch(V){if(a.delete(F),!_T)d({...v,type:"workspace-unsubscribe",id:Q(D),payload:{subscriptionId:F}});throw V}return()=>{if(!a.delete(F)||_T)return;d({...v,type:"workspace-unsubscribe",id:Q(D),payload:{subscriptionId:F}})}},GT=async(f)=>{if("key"in f&&(f.key.length===0||f.key.length>NT))throw new z("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(f.op==="set"&&!i(f.value))throw new z("HOST_REJECTED","Storage values must be JSON.");if(f.op==="set"&&new TextEncoder().encode(JSON.stringify(f.value)).length>mT)throw new z("HOST_REJECTED","Storage value exceeds 64 KiB.");let G=await R({...v,type:"storage",id:Q(D),payload:f});if(!G||!("storage"in G)||G.op!==f.op)throw new z("HOST_REJECTED","Host did not return storage data.");return G};return{onAction:(f)=>{return ST=f,()=>{if(ST===f)ST=null}},listProjects:async()=>{let f=await bT({kind:"projects"});if(f.kind!=="projects")throw new z("HOST_REJECTED","Expected projects.");return f},listWorktrees:async(f)=>{let G=await bT({kind:"worktrees",projectId:f});if(G.kind!=="worktrees")throw new z("HOST_REJECTED","Expected worktrees.");return G},listSessions:async(f)=>{let G=await bT({kind:"sessions",projectId:f});if(G.kind!=="sessions")throw new z("HOST_REJECTED","Expected sessions.");return G},onProjects:(f)=>IT({kind:"projects"},(G)=>{if(G.kind==="projects")f(G)}),onWorktrees:(f,G)=>IT({kind:"worktrees",projectId:f},(F)=>{if(F.kind==="worktrees")G(F)}),onSessions:(f,G)=>IT({kind:"sessions",projectId:f},(F)=>{if(F.kind==="sessions")G(F)}),openSession:async(f)=>{p(f),await P({...v,type:"open-session",id:Q(D),payload:{sessionId:f}})},storage:{get:async(f)=>{let G=await GT({op:"get",key:f});return G.op==="get"&&G.found?G.value:void 0},set:async(f,G)=>{await GT({op:"set",key:f,value:G})},delete:async(f)=>{await GT({op:"delete",key:f})},keys:async()=>{let f=await GT({op:"keys"});if(f.op!=="keys")throw new z("HOST_REJECTED","Expected storage keys.");return f.keys}},onReady:(f)=>{if(x.add(f),Z)f(Z);return()=>{x.delete(f)}},onDirectory:(f)=>{if(A.add(f),Z)f(Z.directory);return()=>{A.delete(f)}},onSession:(f)=>{if(X.add(f),Z)f(Z.session);return()=>{X.delete(f)}},onSessionLifecycle:(f)=>{if(M.add(f),c)f(c);return()=>{M.delete(f)}},onConnection:(f)=>{if(Y.add(f),Z)f(Z.connection);return()=>{Y.delete(f)}},onSettings:(f)=>{if(k.add(f),Z)f(Z.settings);return()=>{k.delete(f)}},onItem:(f)=>{if(B.add(f),Z)f(Z.item);return()=>{B.delete(f)}},onResolve:(f)=>{return h=f,()=>{if(h===f)h=null}},toast:(f)=>{let G=f.message.trim();if(!G||G.length>XT)return Promise.reject(new z("HOST_REJECTED",`Toast message must contain 1 to ${XT} characters.`));if(f.copy&&f.copy!==!0&&(!f.copy.text.length||f.copy.text.length>MT))return Promise.reject(new z("HOST_REJECTED",`Toast copy text must contain 1 to ${MT} characters.`));return P({channel:C,v:$,type:"toast",id:Q(D),payload:{...f,message:G}})},openUrl:(f)=>P({channel:C,v:$,type:"open-url",id:Q(D),payload:{url:f}}),openCommit:(f)=>cT(f)?P({channel:C,v:$,type:"open-commit",id:Q(D),payload:{sha:f}}):Promise.reject(new z("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(f)=>P({channel:C,v:$,type:"open-surface",id:Q(D),payload:{surfaceId:f}}),writeClipboard:(f)=>P({channel:C,v:$,type:"clipboard-write",id:Q(D),payload:{text:f}}),compose:(f)=>P({channel:C,v:$,type:"compose",id:Q(D),payload:f}),attach:(f)=>P({channel:C,v:$,type:"attach",id:Q(D),payload:r(f)}),startSession:async(f)=>{if(f.projectId!==void 0)p(f.projectId);let G=f.worktree;if(G&&G!==!0)if(G.kind==="existing")p(G.directory);else{if(G.name!==void 0)p(G.name,200);if(G.baseBranch!==void 0)p(G.baseBranch,200)}let F=await R({channel:C,v:$,type:"start-session",id:Q(D),payload:dT(f)},T.requestTimeoutMs??180000);if(!yT(F))throw new z("HOST_REJECTED","Host did not return a session.");return F},prompt:(f)=>R({channel:C,v:$,type:"prompt",id:Q(D),payload:vT(f)}).then((G)=>{if(!gT(G))throw new z("HOST_REJECTED","Host did not return a prompt result.");return G}),sessionLink:(f)=>P({channel:C,v:$,type:"session-link",id:Q(D),payload:r(f)}),close:()=>P({channel:C,v:$,type:"close",id:Q(D)}),oauthStart:()=>P({channel:C,v:$,type:"oauth-start",id:Q(D)}),oauthDisconnect:()=>P({channel:C,v:$,type:"oauth-disconnect",id:Q(D)}),request:(f)=>($T(f.path)?R({channel:C,v:$,type:"request",id:Q(D),payload:f}):c0()).then((G)=>{if(!DT(G))throw new z("HOST_REJECTED","Host request result was empty.");return G}),serviceRequest:(f)=>($T(f.path)?R({channel:C,v:$,type:"service-request",id:Q(D),payload:f}):c0()).then((G)=>{if(!DT(G))throw new z("HOST_REJECTED","Host service request result was empty.");return G}),serviceStatus:()=>R({channel:C,v:$,type:"service-status",id:Q(D)}).then((f)=>{if(!oT(f))throw new z("HOST_REJECTED","Host did not return service status.");return f}),readFile:(f)=>(t(f)?R({channel:C,v:$,type:"file-read",id:Q(D),payload:{path:f}}):QT()).then((G)=>{if(!lT(G))throw new z("HOST_REJECTED","Host did not return file content.");return G}),writeFile:(f,G)=>{if(!t(f))return QT();if(G.length>zT)return Promise.reject(new z("FILE_TOO_LARGE",`Content is over ${zT} characters.`));return R({channel:C,v:$,type:"file-write",id:Q(D),payload:{path:f,content:G}}).then((F)=>{if(!uT(F))throw new z("HOST_REJECTED","Host did not confirm the write.");return F})},listDir:(f)=>(t(f)?R({channel:C,v:$,type:"file-list",id:Q(D),payload:{path:f}}):QT()).then((G)=>{if(!aT(G))throw new z("HOST_REJECTED","Host did not return directory entries.");return G}),stat:(f)=>(t(f)?R({channel:C,v:$,type:"file-stat",id:Q(D),payload:{path:f}}):QT()).then((G)=>{if(!iT(G))throw new z("HOST_REJECTED","Host did not return file status.");return G}),generate:(f)=>{let G=f.prompt.trim(),F=f.system?.trim();if(G.length===0||G.length>YT)return Promise.reject(new z("HOST_REJECTED",`Prompt must be 1 to ${YT} characters.`));if(F!==void 0&&(F.length===0||F.length>FT))return Promise.reject(new z("HOST_REJECTED",`System prompt must be 1 to ${FT} characters.`));let V=f.maxOutputTokens===void 0?void 0:Math.min(qT,Math.max(1,Math.floor(f.maxOutputTokens)));if(V!==void 0&&!Number.isFinite(V))return Promise.reject(new z("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:G};if(F!==void 0)y.system=F;if(V!==void 0)y.maxOutputTokens=V;return R({channel:C,v:$,type:"generate",id:Q(D),payload:y},T.requestTimeoutMs??hT).then((I)=>{if(!rT(I))throw new z("HOST_REJECTED","Host did not return generated text.");return I})},setBadge:(f)=>P({channel:C,v:$,type:"badge",id:Q(D),payload:{count:pT(f)}}),setHeight:(f)=>P({channel:C,v:$,type:"resize",id:Q(D),payload:{height:nT(f)}}),dispose:()=>{for(let f of a.keys())d({...v,type:"workspace-unsubscribe",id:Q(D),payload:{subscriptionId:f}});a.clear(),_T=!0,h=null,ST=null,S.removeEventListener("message",Y0);for(let f of u.values())clearTimeout(f.timer),f.reject(new z("HOST_UNAVAILABLE","Host client was disposed."));u.clear(),x.clear(),A.clear(),X.clear(),M.clear(),Y.clear(),k.clear(),B.clear()}}};var j0=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var k_=new Set(j0);var q0=["none","agent","user"];var Y_=new Set(q0);function h0(){let T=sT();return{request:(S)=>T.request({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),readFile:(S)=>T.readFile(S),listProjects:()=>T.listProjects(),listWorktrees:(S)=>T.listWorktrees(S),openUrl:(S)=>T.openUrl(S),onReady:(S)=>T.onReady(S),onConnection:(S)=>T.onConnection(S),dispose:()=>T.dispose()}}var WS=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],d0=(T,S)=>{S.style.colorScheme=T.mode;for(let[_,U]of WS)S.style.setProperty(_,T.tokens[U]);S.style.setProperty("font-family",T.tokens.font),S.style.setProperty("font-size","0.875rem"),S.style.setProperty("line-height","1.45"),S.style.setProperty("color",T.tokens.foreground)},eT=(T,S)=>{if(d0(T.theme,S),S.dataset)S.dataset.ocSurface=T.surface,S.dataset.ocTheme=T.theme.mode};var v0="oc-sdk-ui-style",s=(T)=>{while(T.firstChild)T.removeChild(T.firstChild)},L=(T)=>{let S=document.getElementById(v0);if(S instanceof HTMLStyleElement){if(S.textContent!==T)S.textContent=T;return}RT(document);let _=document.createElement("style");_.id=v0,_.textContent=T,document.head.appendChild(_)},W=(T,S)=>{let _=document.createElement(T);if(S)_.className=S;return _},j=(T)=>{let S=W("button",T);return S.type="button",S},N=(T,S)=>{let _=S??"";if(T.textContent!==_)T.textContent=_};var VS={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},O=(T,S)=>`var(--${T}, var(--oc-${VS[T]}, ${S}))`,n=O("surface-background","transparent"),ZT=O("surface-elevated","transparent"),fT=O("surface-elevated-foreground","inherit"),UT=O("surface-foreground","inherit"),J=O("surface-muted-foreground","gray"),JS=O("surface-muted","transparent"),H=O("interactive-border","currentColor"),m=O("interactive-hover","transparent"),o=O("interactive-active","transparent"),T0=O("interactive-selection","transparent"),S0=O("interactive-selection-foreground","inherit"),o0=O("interactive-focus-ring","currentColor"),g=O("primary","currentColor"),_0=O("primary-text","inherit"),f0=O("error-text","inherit"),BS=O("font-sans","inherit"),U0=O("font-mono","monospace"),p0=O("radius","9px"),K=(T,S,_="transparent")=>`color-mix(in srgb, ${T} ${S}%, ${_})`,n0=`box-shadow: 0 0 0 2px ${o0};`,OT=(T)=>{let S=O(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${S}; --oc-sdk-tone-text: ${O(`${T}-text`,"inherit")}; }`},b=`
${wT}
.oc-sdk { box-sizing: border-box; color: ${UT}; font-family: ${BS}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${n0} }
.oc-sdk-mono { font-family: ${U0}; }
.oc-sdk-muted { color: ${J}; }
${OT("success")}${OT("warning")}${OT("error")}${OT("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${g}; --oc-sdk-tone-text: ${_0}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${p0}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${_0}; background: ${K(g,10,n)}; border-color: ${K(g,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${K(g,16,n)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${K(g,22,n)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${JS}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${m}, ${m}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="outline"] { background: ${ZT}; color: ${fT}; border-color: ${H}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${m}, ${m}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${m}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${o}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${O("status-error","red")}; color: ${f0}; background: ${K("var(--oc-sdk-tone)",7,n)}; border-color: ${K("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${K("var(--oc-sdk-tone)",9,n)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${K("var(--oc-sdk-tone)",11,n)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${J}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${f0}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${p0}; background: ${ZT}; color: ${fT}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${K(H,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${J}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${m}, ${m}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${o0}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${O("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${O("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${U0}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${J}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${g}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${J}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${m}; color: ${UT}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${H}; border-radius: 6px; background: ${ZT}; color: ${fT}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${m}, ${m}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${J}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${J}; }
.oc-sdk-popup { --surface-foreground: ${fT}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${K(H,60)}; border-radius: 12px; background: ${ZT}; color: ${fT}; box-shadow: 0 8px 24px ${K(UT,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${m}; }
.oc-sdk-option[aria-selected="true"] { background: ${T0}; color: ${S0}; }
.oc-sdk-option[data-destructive="true"] { color: ${f0}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${K(O("status-error","red"),10)}; }
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
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${n}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${g}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${n0} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${J}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${K(UT,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${J}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${UT}; }
.oc-sdk-tab[aria-selected="true"] { color: ${S0}; background: ${T0}; border-color: ${H}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${J}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${m}; color: ${J}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${K("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${m}; }
.oc-sdk-row[aria-selected="true"] { background: ${T0}; color: ${S0}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${U0}; font-size: 0.75rem; color: ${J}; }
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
.oc-sdk-text a { color: ${_0}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${K(H,60)}; }
`;var KS=()=>{let T=document.createElement("span");return T.className="oc-sdk-spinner-ring",T.setAttribute("aria-hidden","true"),T},q=(T,S)=>{L(b);let _=S,U=j("oc-sdk oc-sdk-btn"),x=KS(),A=document.createElement("span");U.append(A),T.append(U);let X=()=>{if(U.dataset.variant=_.variant??"default",U.dataset.size=_.size??"default",U.disabled=Boolean(_.disabled)||Boolean(_.loading),U.dataset.loading=_.loading?"true":"false",U.setAttribute("aria-busy",_.loading?"true":"false"),_.loading&&x.parentNode!==U)U.prepend(x);else if(!_.loading&&x.parentNode===U)x.remove();N(A,_.label)},M=()=>{if(_.disabled||_.loading)return;_.onClick()};return U.addEventListener("click",M),X(),{update:(Y)=>{_={..._,...Y},X()},dispose:()=>{U.removeEventListener("click",M),U.remove()}}};var e=(T,S="vertical")=>{let[_,U]=S==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(T.key===_||T.ctrlKey&&T.key.toLowerCase()==="n")return"next";if(T.key===U||T.ctrlKey&&T.key.toLowerCase()==="p")return"previous";if(T.key==="Home")return"first";if(T.key==="End")return"last";return null},TT=(T,S,_)=>{let U=T.filter((Y)=>!Y.disabled);if(U.length===0)return null;let x=U[0],A=U[U.length-1];if(_==="first"||!x||!A)return x?.id??null;if(_==="last")return A.id;let X=U.findIndex((Y)=>Y.id===S);if(X===-1)return _==="next"?x.id:A.id;return U[Math.min(U.length-1,Math.max(0,X+(_==="next"?1:-1)))]?.id??null};var x0=(T,S)=>{L(b);let _=S,U=W("div","oc-sdk oc-sdk-tabs");U.setAttribute("role","tablist"),T.append(U);let x=()=>{s(U),U.dataset.track=_.trackBackground?"true":"false";for(let X of _.items){let M=j("oc-sdk-tab");M.setAttribute("role","tab");let Y=X.id===_.activeId;M.setAttribute("aria-selected",Y?"true":"false"),M.tabIndex=Y?0:-1,M.dataset.id=X.id;let k=W("span");if(k.textContent=X.label,M.append(k),X.count!==void 0){let B=W("span","oc-sdk-tab-count");B.textContent=String(X.count),M.append(B)}M.addEventListener("click",()=>{if(X.id!==_.activeId)_.onChange(X.id)}),U.append(M)}},A=(X)=>{let M=e(X,"horizontal");if(!M)return;let Y=TT(_.items,_.activeId,M);if(Y&&Y!==_.activeId){X.preventDefault(),_.onChange(Y);let k=U.querySelector(`[data-id="${CSS.escape(Y)}"]`);if(k instanceof HTMLElement)k.focus()}};return U.addEventListener("keydown",A),x(),{update:(X)=>{_={..._,...X},x()},dispose:()=>{U.removeEventListener("keydown",A),U.remove()}}};var G0=(T,S)=>{L(b);let _=S,U=W("div","oc-sdk oc-sdk-empty"),x=W("h2","oc-sdk-empty-title"),A=W("p","oc-sdk-empty-body"),X=W("div","oc-sdk-empty-action");U.append(x,A,X),T.append(U);let M=null,Y=()=>{if(N(x,_.title),N(A,_.body),A.hidden=!_.body,X.hidden=!_.action,!_.action){M?.dispose(),M=null;return}let k={label:_.action.label,onClick:_.action.onClick};if(M)M.update(k);else M=q(X,{...k,variant:"outline",size:"sm"})};return Y(),{update:(k)=>{_={..._,...k},Y()},dispose:()=>{M?.dispose(),M=null,U.remove()}}};function u0(T){return(T??"").slice(0,7)}function l(T){if(T==null||T==="")return null;if(typeof T==="number")return Number.isFinite(T)?T:null;let S=Date.parse(T);return Number.isNaN(S)?null:S}function VT(T){if(T==null||!Number.isFinite(T))return"";let S=Math.max(0,Math.round(T));if(S<60)return`${S}s`;let _=Math.floor(S/60),U=S%60;if(_<60)return U?`${_}m ${String(U).padStart(2,"0")}s`:`${_}m`;let x=Math.floor(_/60),A=_%60;return`${x}h ${String(A).padStart(2,"0")}m`}function JT(T,S){return VT((S-T)/1000)}function BT(T,S=Date.now()){let _=Math.max(0,Math.round((S-T)/1000));if(_<10)return"just now";if(_<60)return`${_}s ago`;let U=Math.floor(_/60);if(U<60)return`${U}m ago`;let x=Math.floor(U/60);if(x<24)return`${x}h ago`;let A=Math.floor(x/24);if(A<30)return`${A}d ago`;return`${Math.floor(A/30)}mo ago`}function a0(T,S){if(T==null||T==="")return[];let _=T.split(`
`);if(S<=0)return[];return _.slice(-S)}function A0(T){return`/api/v4/projects/${encodeURIComponent(T)}`}function wS(T,S={scope:"all"}){let _={per_page:String(S.perPage??F0)};if(S.scope==="branch"){if(S.ref)_.ref=S.ref}else _.order_by="updated_at",_.sort="desc";return{path:`${A0(T)}/pipelines`,query:_}}function RS(T,S){return{path:`${A0(T)}/pipelines/${S}/jobs`,query:{per_page:"100"}}}function NS(T,S){return{path:`${A0(T)}/jobs/${S}/trace`,query:{}}}function mS(T){if(T>=200&&T<300)return null;if(T===401||T===403)return{kind:"unauthorized"};if(T===404)return{kind:"not-found"};return{kind:"http",status:T}}function HS(T){return typeof T==="object"&&T!==null&&T.code==="DISCONNECTED"}async function E0(T,S){let _;try{_=await T.request(S)}catch(x){return{ok:!1,failure:HS(x)?{kind:"disconnected"}:{kind:"network"}}}let U=mS(_.status);if(U)return{ok:!1,failure:U};return{ok:!0,status:_.status,body:_.body}}function i0(T,S){try{return{ok:!0,data:JSON.parse(T)}}catch{return{ok:!1,failure:{kind:"http",status:S}}}}async function r0(T,S,_){let U=wS(S,_),x=await E0(T,{method:"GET",...U});if(!x.ok)return x;return i0(x.body,x.status)}async function t0(T,S,_){let U=RS(S,_),x=await E0(T,{method:"GET",...U});if(!x.ok)return x;return i0(x.body,x.status)}async function s0(T,S,_){let U=NS(S,_),x=await E0(T,{method:"GET",...U});if(!x.ok){if(x.failure.kind==="not-found")return{ok:!0,data:""};return x}return{ok:!0,data:x.body}}var yS={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"clock"},waiting_for_resource:{label:"Waiting",tone:"neutral",glyph:"hourglass"},waiting_for_callback:{label:"Waiting",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},e0={label:"Unknown",tone:"neutral",glyph:"dot"};function KT(T){if(!T)return e0;return yS[T]??e0}function xT(T){let S=KT(T.status);if(T.status==="failed"&&T.allow_failure)return{...S,label:"Failed (allowed)",tone:"warning"};return S}var gS=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],cS=new Set(gS);function LT(T){return T!=null&&cS.has(T)}function jS(T,S={}){if(!X0(T))return{active:!1,delayMs:null};let U=S.intervalMs??$0,x=S.elapsedMs??0,A=x>600000?3:x>120000?2:1;return{active:!0,delayMs:U*A}}function X0(T){for(let S of T)if(LT(S))return!0;return!1}function TS(T,S={}){return jS(T,S).delayMs}function M0(T){try{return new URL(T).host}catch{return T.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function qS(T){let S=T.trim();if(!S)return null;let _="",U="";if(S.includes("://")){let A;try{A=new URL(S)}catch{return null}_=A.host,U=A.pathname}else{let A=S.indexOf(":");if(A<0)return null;_=S.slice(0,A).replace(/^[^@]*@/,""),U=S.slice(A+1),U=U.replace(/^\/+/,"")}let x=_S(U);if(!_||!x)return null;return{host:_,path:x}}function _S(T){let S=T.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(S.toLowerCase().endsWith(".git"))S=S.slice(0,-4);return S.replace(/\/+$/,"")}function hS(T){let S=[],_=null;for(let U of T.split(/\r?\n/)){let x=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(U);if(x){_=x[1]??null;continue}if(/^\s*\[/.test(U)){_=null;continue}if(_==null)continue;let A=/^\s*url\s*=\s*(.+?)\s*$/.exec(U);if(A&&A[1])S.push({name:_,url:A[1]})}return S}function dS(T){let S=hS(T),_=["origin","upstream"],U=[..._.flatMap((x)=>S.filter((A)=>A.name===x)),...S.filter((x)=>!_.includes(x.name))];for(let x of U){let A=qS(x.url);if(A)return{remote:A,name:x.name}}return null}function vS(T){if(!T)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(T)?.[1]??null}function k0(T,S){if(!T||!S)return!1;return T.replace(/\/+$/,"")===S.replace(/\/+$/,"")}function SS(T,S,_){if(T&&_){let U=_.find((x)=>k0(x.directory,T));if(U?.branch)return U.branch}return vS(S)}function fS(T){let S=M0(T.apiOrigin),_=T.projectOverride?.trim()??"";if(!T.directory&&!_)return{ok:!1,failure:"no-project"};if(_){let x=_S(_);if(!x)return{ok:!1,failure:"no-project"};return{ok:!0,host:S,project:x,ref:SS(T.directory,T.head,T.worktrees),source:"override"}}let U=T.gitConfig?dS(T.gitConfig):null;if(!U)return{ok:!1,failure:"not-a-repo"};if(U.remote.host!==S)return{ok:!1,failure:"host-mismatch",detectedHost:U.remote.host,detectedPath:U.remote.path};return{ok:!0,host:S,project:U.remote.path,ref:SS(T.directory,T.head,T.worktrees),source:"derived"}}var pS=new Set(["success","failed","canceled","skipped"]);function nS(T){return pS.has(T.status)}function US(T=[]){let S=[],_=new Map;for(let U of T){let x=_.get(U.stage);if(!x)x=[],_.set(U.stage,x),S.push(U.stage);x.push(U)}return S.map((U)=>{let x=_.get(U)??[];return{stage:U,jobs:x,done:x.filter(nS).length,total:x.length}})}var oS={setTimeout:(T,S)=>globalThis.setTimeout(T,S),clearTimeout:(T)=>globalThis.clearTimeout(T),setInterval:(T,S)=>globalThis.setInterval(T,S),clearInterval:(T)=>globalThis.clearInterval(T),now:()=>Date.now()},xS={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},lS='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M7 4a3 3 0 0 0-1 5.83v4.34A3.001 3.001 0 1 0 8 17v-4h1a4 4 0 0 0 4-4V8.83a3.001 3.001 0 1 0-2 0V9a2 2 0 0 1-2 2H8V9.83A3 3 0 0 0 7 4zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm8-2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM7 16a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',uS='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',aS='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',iS='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';function E(T,S,_){let U=document.createElement(T);if(S)U.className=S;if(_!=null)U.textContent=_;return U}function GS(T){while(T.firstChild)T.removeChild(T.firstChild)}class XS{root;port;options;timers;directory=null;settingsProject="";started=!1;disposed=!1;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;jobs=new Map;openJob=null;traces=new Map;traceLoadingId=null;updatedAt=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;handles=[];unsubReady=null;unsubConnection=null;constructor(T,S,_){this.root=T,this.port=S,this.options=_,this.timers=_.timers??oS}start(){return this.unsubReady=this.port.onReady((T)=>this.handleReady(T)),this.unsubConnection=this.port.onConnection((T)=>this.handleConnection(T)),this.render(),this}handleReady(T){eT(T,document.documentElement);let S=T.settings?.project??"",_=T.directory!==this.directory||S!==this.settingsProject||!this.started;if(this.directory=T.directory,this.settingsProject=S,_)this.started=!0,this.refresh();else this.render()}handleConnection(T){if(!T.connected){this.problem=MS(this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.problem?.kind==="disconnected")this.refresh()}refresh(){if(this.disposed)return;let T=++this.generation;this.runRefresh(T)}setScope(T){if(T===this.scope)return;this.scope=T,this.expandedId=null,this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.unsubConnection?.(),this.disposeHandles(),GS(this.root),this.port.dispose()}async runRefresh(T){this.error=null;let S=this.settingsProject.trim();if(!this.directory&&!S){this.problem=ES({ok:!1,failure:"no-project"},this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.pipelines.length===0)this.phase="loading";this.render();let _=await this.deriveProject();if(this.disposed||T!==this.generation)return;if(!_.ok){this.problem=ES(_,this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}this.problem=null,this.resolved=_,await this.loadPipelines(T,_)}async deriveProject(){let T=this.settingsProject.trim(),S=this.directory,_=null,U=null,x=null;if(S){try{_=(await this.port.readFile(".git/config")).content}catch{_=null}try{U=(await this.port.readFile(".git/HEAD")).content}catch{U=null}try{let X=(await this.port.listProjects()).projects.find((M)=>k0(M.directory,S));if(X)x=(await this.port.listWorktrees(X.id)).worktrees}catch{x=null}}return fS({directory:S,apiOrigin:this.options.apiOrigin,projectOverride:T,gitConfig:_,head:U,worktrees:x})}async loadPipelines(T,S){let _=S.ref?this.scope:"all",U=await r0(this.port,S.project,{scope:_,ref:S.ref});if(this.disposed||T!==this.generation)return;if(!U.ok){this.handleFailure(U.failure);return}if(this.pipelines=U.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.expandedId!=null)this.loadJobs(T,this.expandedId,this.jobs.has(this.expandedId));this.render(),this.schedulePoll()}handleFailure(T){if(T.kind==="disconnected"||T.kind==="unauthorized"||T.kind==="not-found"){this.problem=tS(T,this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.error=T.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${T.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}togglePipeline(T){if(this.expandedId===T){this.expandedId=null,this.render();return}if(this.expandedId=T,!this.jobs.has(T))this.jobs.set(T,"loading"),this.render(),this.loadJobs(this.generation,T,!1);else this.render()}async loadJobs(T,S,_){let U=this.resolved?.project;if(!U)return;if(!_||!Array.isArray(this.jobs.get(S)))this.jobs.set(S,"loading"),this.render();let x=await t0(this.port,U,S);if(this.disposed||T!==this.generation)return;if(this.jobs.set(S,x.ok?x.data:[]),this.expandedId===S)this.render()}openJobDrawer(T,S){if(this.openJob={pipelineId:T,jobId:S},this.traces.has(S)){this.render();return}this.traceLoadingId=S,this.render(),this.loadTrace(this.generation,S)}async loadTrace(T,S){let _=this.resolved?.project;if(!_)return;let U=await s0(this.port,_,S);if(this.disposed||T!==this.generation)return;this.traceLoadingId=null;let x=U.ok?U.data??"":"";this.traces.set(S,x.trim()?{state:"ready",text:x}:{state:"missing",text:""}),this.render()}closeDrawer(){this.openJob=null,this.render()}visibleStatuses(){let T=this.pipelines.map((S)=>S.status);for(let S of this.jobs.values())if(Array.isArray(S))for(let _ of S)T.push(_.status);return T}hasActive(){return X0(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let T=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=T;let S=TS(this.visibleStatuses(),{elapsedMs:T-this.pollStartedAt});if(S==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},S)}async pollOnce(){if(this.disposed||!this.resolved)return;let T=++this.generation;await this.loadPipelines(T,this.resolved)}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),D0)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let T=this.timers.now();for(let S of Array.from(this.root.querySelectorAll("[data-live]"))){let _=Number(S.dataset.start);if(!Number.isFinite(_))continue;if(S.dataset.live==="ago")S.textContent=BT(_,T);else if(S.dataset.live==="elapsed"){let U=S.dataset.end?Number(S.dataset.end):T;S.textContent=JT(_,Number.isFinite(U)?U:T)}}}configuredHost(){return M0(this.options.apiOrigin)}disposeHandles(){for(let T of this.handles.splice(0))T.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;GS(this.root),this.root.className="gp";let T=E("div","gp-progress");if(!this.isFirstLoad())T.hidden=!0;this.root.append(T),this.root.append(this.renderHeader()),this.scrollEl=E("div","gp-scroll");let S=E("div","gp-pad");if(S.append(...this.renderContent()),this.scrollEl.append(S),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let T=this.resolved!=null&&this.updatedAt!=null;if(T&&this.tickTimer==null)this.startTicker();if(!T)this.stopTicker()}renderHeader(){let T=E("div","gp-head"),S=E("div","gp-head-row"),_=E("span","gp-brand"),U=E("span","gp-brand-mark");U.innerHTML=lS,_.append(U,E("span","gp-brand-title","Pipelines")),S.append(_,E("span","gp-spacer"));let x=E("span","gp-updated");if(this.resolved==null||this.updatedAt==null)x.hidden=!0;else{let Y=E("span","gp-dot");Y.dataset.idle=this.hasActive()?"false":"true";let k=E("span");k.dataset.live="ago",k.dataset.start=String(this.updatedAt),k.textContent=BT(this.updatedAt,this.timers.now()),x.append(Y,k)}S.append(x);let A=E("button","gp-iconbtn");if(A.type="button",A.setAttribute("aria-label","Refresh"),A.title="Refresh",A.innerHTML=uS,this.isFirstLoad())A.dataset.spinning="true";A.addEventListener("click",()=>this.refresh()),S.append(A),T.append(S);let X=E("div","gp-project"),M=E("span","gp-project-path");if(this.resolved)M.textContent=`${this.resolved.host}/${this.resolved.project}`;else X.hidden=!0;return X.append(M),T.append(X),T.append(this.renderScope()),T}renderScope(){let T=E("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return T.hidden=!0,T;let _=E("div");T.append(_),this.handles.push(x0(_,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(x)=>this.setScope(x)}));let U=this.scope==="branch"?this.resolved?.ref??"":"all refs";return T.append(E("span","gp-scope-ref",U)),T}renderContent(){let T=[];if(this.error){let _=E("div","gp-state");_.append(E("p","gp-state-body",this.error));let U=E("div","gp-state-actions"),x=E("div");this.handles.push(q(x,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(x),_.append(U),T.push(_)}if(this.problem)return T.push(this.renderProblem(this.problem)),T;if(this.isFirstLoad())return T.push(this.renderSkeleton()),T;if(this.pipelines.length===0)return T.push(this.renderEmpty()),T;let S=E("div","gp-list");for(let _ of this.pipelines)S.append(this.renderPipeline(_));return T.push(S),T}renderProblem(T){let S=E("div","gp-state"),_=E("h2","gp-state-title",T.title);if(S.append(_,E("p","gp-state-body",T.body)),T.detail)S.append(E("p","gp-state-detail",T.detail));if(T.hint)S.append(E("p","gp-state-hint",T.hint));let U=E("div","gp-state-actions"),x=E("div");return this.handles.push(q(x,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(x),S.append(U),S}renderEmpty(){let T=E("div"),S=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(G0(T,{title:S?"No pipelines for this ref":"No pipelines yet",body:S?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:S?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),T}renderSkeleton(){let T=E("div","gp-skel");for(let S=0;S<5;S+=1){let _=E("div","gp-skel-row"),U=E("span","gp-skel-line");U.dataset.w="short";let x=E("span","gp-skel-line");x.dataset.w="grow",_.append(U,x),T.append(_)}return T}renderPipeline(T){let S=this.expandedId===T.id,_=E("div","gp-item");_.dataset.open=S?"true":"false";let U=E("button","gp-row");U.type="button",U.setAttribute("aria-expanded",String(S));let x=E("span","gp-caret");x.innerHTML=aS,U.append(x,AS(KT(T.status),15));let A=E("span","gp-row-main"),X=E("span","gp-row-line");if(X.append(E("span","gp-ref",T.ref||"—")),X.append(E("span","gp-sha",u0(T.sha))),A.append(X,E("div","gp-row-sub",rS(T))),U.append(A,this.timingSpan(T)),U.addEventListener("click",()=>this.togglePipeline(T.id)),_.append(U),S){let M=E("div","gp-jobs");if(T.web_url){let k=document.createElement("a");k.className="gp-jobs-link",k.href=T.web_url,k.target="_blank",k.rel="noreferrer",k.textContent="View pipeline in GitLab",k.addEventListener("click",(B)=>{B.preventDefault(),this.port.openUrl(T.web_url)}),M.append(k)}let Y=this.jobs.get(T.id);if(Y===void 0||Y==="loading")M.append(E("div","gp-row-sub","Loading jobs…"));else if(Y.length===0)M.append(E("div","gp-row-sub","No jobs reported yet."));else for(let k of US(Y))M.append(this.renderStage(T.id,k));_.append(M)}return _}timingSpan(T){let S=LT(T.status),_=l(T.started_at);if(S&&_!=null){let A=l(T.finished_at),X=E("span","gp-row-meta");if(X.dataset.live="elapsed",X.dataset.start=String(_),A!=null)X.dataset.end=String(A);return X.textContent=JT(_,A??this.timers.now()),X}if(l(T.finished_at)!=null&&T.duration!=null)return E("span","gp-row-meta",VT(T.duration));let x=l(T.created_at);if(x!=null){let A=E("span","gp-row-meta");return A.dataset.live="ago",A.dataset.start=String(x),A.textContent=BT(x,this.timers.now()),A}return E("span","gp-row-meta","—")}jobMeta(T){let S=l(T.started_at);if(T.status==="running"&&S!=null){let U=E("span","gp-job-meta");return U.dataset.live="elapsed",U.dataset.start=String(S),U.textContent=JT(S,this.timers.now()),U}let _=l(T.finished_at);if(T.duration!=null&&_!=null)return E("span","gp-job-meta",VT(T.duration));if(T.status==="running")return E("span","gp-job-meta","running");return E("span","gp-job-meta",xT(T).label.toLowerCase())}renderStage(T,S){let _=E("div","gp-stage"),U=E("div","gp-stage-head");U.append(E("span","gp-stage-name",S.stage),E("span","gp-stage-count",`${S.done}/${S.total}`),E("span","gp-stage-line")),_.append(U);for(let x of S.jobs){let A=E("button","gp-job");if(A.type="button",this.openJob?.jobId===x.id)A.dataset.selected="true";A.setAttribute("aria-label",`${x.name}, ${xT(x).label}`),A.append(AS(xT(x),13),E("span","gp-job-name",x.name)),A.append(this.jobMeta(x)),A.addEventListener("click",()=>this.openJobDrawer(T,x.id)),_.append(A)}return _}renderDrawer(T){let S=E("div","gp-drawer"),_=this.jobs.get(T.pipelineId),U=Array.isArray(_)?_.find((B)=>B.id===T.jobId):void 0,x=E("div","gp-drawer-head"),A=E("span","gp-drawer-title",U?`${U.name} · ${xT(U).label}`:`Job #${T.jobId}`);if(x.append(A),U?.web_url){let B=document.createElement("a");B.className="gp-drawer-link",B.href=U.web_url,B.target="_blank",B.rel="noreferrer",B.textContent="View full log in GitLab",B.addEventListener("click",(h)=>{h.preventDefault(),this.port.openUrl(U.web_url)}),x.append(B)}let X=E("button","gp-drawer-close");X.type="button",X.setAttribute("aria-label","Close log"),X.title="Close",X.innerHTML=iS,X.addEventListener("click",()=>this.closeDrawer()),x.append(X),S.append(x);let M=this.traces.get(T.jobId);if(!M)return S.append(E("div","gp-drawer-empty","Loading log…")),S;if(M.state==="missing")return S.append(E("div","gp-drawer-empty","No log output yet — the job has not started.")),S;let Y=a0(M.text,C0),k=E("pre","gp-drawer-body");return k.textContent=Y.join(`
`),S.append(k),S}renderFooter(){let T=E("div","gp-foot");return T.append(E("span","","Read-only")),T}}function AS(T,S){let _=E("span","gp-icon");if(T.tone!=="neutral")_.dataset.tone=T.tone;if(T.animate)_.dataset.animate="true";if(T.muted)_.dataset.muted="true";_.setAttribute("role","img"),_.setAttribute("aria-label",T.label);let U=E("span","gp-icon-svg");return U.innerHTML=`<svg viewBox="0 0 24 24" width="${S}" height="${S}" aria-hidden="true" fill="currentColor">${xS[T.glyph]??xS.dot}</svg>`,_.append(U),_}function rS(T){let S=[`#${T.iid}`,KT(T.status).label];if(T.merge_request?.iid!=null)S.push(`!${T.merge_request.iid}`);else if(T.tag)S.push("tag");else if(T.name)S.push(T.name);else if(T.source&&T.source!=="push")S.push(T.source.replace(/_/g," "));return S.join(" · ")}function ES(T,S){switch(T.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"host-mismatch":return{kind:"host-mismatch",title:"Different GitLab host",body:`This remote points at ${T.detectedHost}, but this extension only talks to ${S}.`,detail:T.detectedPath?`${T.detectedHost}/${T.detectedPath}`:T.detectedHost,hint:"Set the “Project” setting to a project path on this extension’s GitLab host."}}}function MS(T){return{kind:"disconnected",title:"GitLab not connected",body:`No personal access token is stored for ${T}. Connect one to read pipelines.`}}function tS(T,S){if(T.kind==="disconnected")return MS(S);if(T.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored token cannot read this project. A personal access token with the read_api scope is required."};return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the token cannot see it."}}function kS(T,S,_){return new XS(T,S,{..._,apiOrigin:_.apiOrigin||ET,panelId:_.panelId||AT}).start()}var zS=`
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

.gp-foot { flex: 0 0 auto; display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-top: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35)); color: var(--oc-muted, GrayText); font-size: 0.6875rem; }

.gp-skel { display: flex; flex-direction: column; gap: 8px; padding: 4px 2px; }
.gp-skel-row { display: flex; gap: 8px; }
.gp-skel-line { height: 10px; border-radius: 4px; background: var(--oc-subtle, var(--oc-hover, rgba(127, 127, 127, 0.15))); opacity: 0.6; }
.gp-skel-line[data-w='short'] { flex: 0 0 28%; }
.gp-skel-line[data-w='grow'] { flex: 1 1 auto; }
`;function sS(T){let S=document.createElement("style");S.textContent=T,document.head.append(S)}var YS=document.getElementById("root");if(YS){sS(zS);let T=h0(),S=kS(YS,T,{apiOrigin:ET,panelId:AT});window.addEventListener("beforeunload",()=>S.dispose())}})();
