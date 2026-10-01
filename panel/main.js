(()=>{var N1="gitlab-pipelines",Q0="https://sdlc.webcloud.ec.europa.eu",I1=20,H1="/proxy",Z0=20000,b1=256000,w1=5000,m1=1000;var Z="openchamber.sdk",k=1;var d0=`
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
`;function p0(T){let _=T.documentElement;if(_.hasAttribute("data-oc-scrollbar-activity"))return;_.setAttribute("data-oc-scrollbar-activity","");let S=new WeakMap;T.addEventListener("scroll",(x)=>{let U=x.target===T?_:x.target;if(!(U instanceof Element))return;if(!U.hasAttribute("data-oc-scrolling"))U.setAttribute("data-oc-scrolling","");let G=S.get(U);if(G!==void 0)clearTimeout(G);S.set(U,setTimeout(()=>{S.delete(U),U.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var wT=`(${p0.toString()})(document);`;var l0=128,u0=65536;var q1=["file","directory","other","missing"],n0=(T)=>Boolean(T&&"sessionId"in T),o0=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var g1=/^[0-9a-f]{7,64}$/i,i0=(T)=>g1.test(T),k0=500,C0=32000,h1=16000,j1=128,c1=200,v1=2000,A0=16000,d1=80,p1=200,l1=16000;var u1=2000;var r0=20000,D0=1024,V0=2000000;var W0=64000,F0=8000,s0=4000;var t0=90000;var a1=999,n1=1e4,J0=500,o1=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],i1=["stopped","starting","ready","failed"],mT=new Set(o1),r1=(T)=>mT.has(T),s1=(T)=>T&&r1(T)?T:"HOST_REJECTED",e=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(e);if(Object(T)===T)return Object.values(T).every(e);return!1},t1=(T)=>e(T)&&JSON.stringify(T).length<=l1,y1=(T)=>T?.trim().slice(0,p1)??"",T0=(T)=>{let _=T.id.trim().slice(0,j1),S=T.title.trim().slice(0,c1),x=T.url.trim().slice(0,v1),U=T.text?.trim().slice(0,A0),G=T.author?.trim().slice(0,d1),E=T.kind==="pull"?"pull":"issue",z={providerId:T.providerId.trim(),id:_,title:S||_,url:x,kind:E};if(U)z.text=U;if(G)z.author=G;if(E==="pull"){let M=y1(T.branches?.head),Y=y1(T.branches?.base);if(M&&Y)z.branches={head:M,base:Y}}if(t1(T.data))z.data=T.data;return z},e0=(T)=>{let _=T0(T);if(T.projectId)_.projectId=T.projectId;if(T.navigation)_.navigation=T.navigation;if(T.worktree)_.worktree=T.worktree;return _},T1=(T)=>{let _={text:T.text.trim().slice(0,h1)};if(T.send)_.send=!0;return _},_1=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(a1,Math.max(0,Math.round(T)))},S1=(T)=>{if(!Number.isFinite(T))return 0;return Math.min(n1,Math.max(0,Math.ceil(T)))};var _0=(T)=>T.length>0&&T.length<=D0&&!T.includes("\x00")&&!T.includes("\\");var O0=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>u1)return!1;return!T.split("/").some((S)=>S==="."||S==="..")},yT=new Set(i1),x1=(T)=>Boolean(T&&"status"in T&&yT.has(String(T.status))&&!("body"in T)),B0=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),U1=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),G1=(T)=>Boolean(T&&"written"in T&&T.written===!0),f1=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),qT=new Set(q1),A1=(T)=>Boolean(T&&"kind"in T&&"size"in T&&qT.has(String(T.kind))&&Number.isFinite(T.size)),E1=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),gT=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),hT=(T)=>Object(T)===T?T:null,a0=(T)=>String(T)===T&&T.length>0,jT=(T)=>{if(!a0(T.id))return null;if(T.ok===!0){let _={channel:Z,v:k,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)_.payload=T.payload;return _}if(T.ok===!1&&a0(T.error))return{channel:Z,v:k,type:"result",id:T.id,ok:!1,error:T.error,code:s1(a0(T.code)?T.code:void 0)};return null},X1=(T)=>{let _=hT(T);if(!_||_.channel!==Z||_.v!==k)return null;if(_.type==="result")return jT(_);if(!gT.has(String(_.type))||Object(_.payload)!==_.payload)return null;return _};class $ extends Error{code;constructor(T,_){super(_);this.name="HostRequestError",this.code=T}}var e1=()=>Promise.reject(new $("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),L0=()=>Promise.reject(new $("BAD_PATH",`File path must be 1 to ${D0} characters without NUL or backslash.`)),D=(T)=>{return T.value+=1,`oc-${T.value}`},z1=(T={})=>{let _=T.target??("window"in globalThis?window:null);if(!_)throw new $("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let S=T.acceptSource??((f)=>f===_.parent),x=T.requestTimeoutMs??r0,U=new Set,G=new Set,E=new Set,z=new Set,M=new Set,Y=new Set,B=new Set,b=null,p=null,s=new Map,t=new Map,f0=!1,C={value:0},V=null,j=null,R1=(f)=>{if(!f)return null;return{sessionId:f.id,phase:f.busy?"started":"completed"}},l=(f)=>{_.parent.postMessage(f,"*")},H=(f,A)=>{for(let Q of f)try{Q(A)}catch(J){console.error(J)}},P1=(f)=>{if(!(f instanceof MessageEvent))return;if(!S(f.source))return;let A=X1(f.data);if(!A)return;if(A.type==="workspace"){let J=t.get(A.payload.subscriptionId);if(J)H([J],A.payload.snapshot);return}if(A.type==="ready"){if(V=A.payload,j=R1(A.payload.session),H(U,A.payload),H(G,A.payload.directory),H(E,A.payload.session),j)H(z,j);H(M,A.payload.connection),H(Y,A.payload.settings),H(B,A.payload.item);return}if(A.type==="directory"){if(V)V={...V,directory:A.payload.directory};H(G,A.payload.directory);return}if(A.type==="session"){if(V)V={...V,session:A.payload.session};if(!A.payload.session)j=null;else if(j?.sessionId!==A.payload.session.id)j=R1(A.payload.session);H(E,A.payload.session);return}if(A.type==="session-lifecycle"){j=A.payload,H(z,A.payload);return}if(A.type==="connection"){if(V)V={...V,connection:A.payload.connection};H(M,A.payload.connection);return}if(A.type==="settings"){if(V)V={...V,settings:A.payload.settings};H(Y,A.payload.settings);return}if(A.type==="item"){if(V)V={...V,item:A.payload.item};H(B,A.payload.item);return}if(A.type==="action"){let J=(P)=>{if(!f0)l({channel:Z,v:k,type:"action-result",id:A.id,payload:P})},g=p;if(!g){J({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>g(A.payload)).then(()=>J({ok:!0}),(P)=>{let v0=(P instanceof Error?P.message:String(P)).trim();J({ok:!1,error:(v0||"Action failed.").slice(0,J0)})});return}if(A.type==="resolve"){let J=(P)=>{l({channel:Z,v:k,type:"resolve-result",id:A.id,payload:P})},g=b;if(!g){J({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>g(A.payload)).then((P)=>J({item:P?T0(P):null}),(P)=>{let v0=(P instanceof Error?P.message:String(P)).trim();J({error:(v0||"Command failed.").slice(0,J0)})});return}let Q=s.get(A.id);if(!Q)return;if(clearTimeout(Q.timer),s.delete(A.id),A.ok){Q.resolve(A.payload);return}Q.reject(new $(A.code,A.error))};_.addEventListener("message",P1),l({channel:Z,v:k,type:"hello"});let w=(f,A=x)=>{if(f0||_.parent===_)return Promise.reject(new $("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((Q,J)=>{let g=setTimeout(()=>{s.delete(f.id),J(new $("HOST_TIMEOUT","Host did not answer in time."))},A);s.set(f.id,{resolve:Q,reject:J,timer:g}),l(f)})},I=(f)=>w(f).then(()=>{return}),u={channel:Z,v:k},a=(f,A=1024)=>{if(!f.trim()||f.length>A)throw new $("HOST_REJECTED",`Identity must contain 1 to ${A} characters.`)},j0=async(f)=>{if(f.kind!=="projects")a(f.projectId);let A=await w({...u,type:"workspace-read",id:D(C),payload:f});if(!A||!("kind"in A)||!("state"in A)||A.kind!==f.kind)throw new $("HOST_REJECTED","Host did not return workspace data.");return A},c0=async(f,A)=>{if(f.kind!=="projects")a(f.projectId);let Q=D(C);t.set(Q,A);try{await I({...u,type:"workspace-subscribe",id:D(C),payload:{subscriptionId:Q,query:f}})}catch(J){if(t.delete(Q),!f0)l({...u,type:"workspace-unsubscribe",id:D(C),payload:{subscriptionId:Q}});throw J}return()=>{if(!t.delete(Q)||f0)return;l({...u,type:"workspace-unsubscribe",id:D(C),payload:{subscriptionId:Q}})}},$0=async(f)=>{if("key"in f&&(f.key.length===0||f.key.length>l0))throw new $("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(f.op==="set"&&!e(f.value))throw new $("HOST_REJECTED","Storage values must be JSON.");if(f.op==="set"&&new TextEncoder().encode(JSON.stringify(f.value)).length>u0)throw new $("HOST_REJECTED","Storage value exceeds 64 KiB.");let A=await w({...u,type:"storage",id:D(C),payload:f});if(!A||!("storage"in A)||A.op!==f.op)throw new $("HOST_REJECTED","Host did not return storage data.");return A};return{onAction:(f)=>{return p=f,()=>{if(p===f)p=null}},listProjects:async()=>{let f=await j0({kind:"projects"});if(f.kind!=="projects")throw new $("HOST_REJECTED","Expected projects.");return f},listWorktrees:async(f)=>{let A=await j0({kind:"worktrees",projectId:f});if(A.kind!=="worktrees")throw new $("HOST_REJECTED","Expected worktrees.");return A},listSessions:async(f)=>{let A=await j0({kind:"sessions",projectId:f});if(A.kind!=="sessions")throw new $("HOST_REJECTED","Expected sessions.");return A},onProjects:(f)=>c0({kind:"projects"},(A)=>{if(A.kind==="projects")f(A)}),onWorktrees:(f,A)=>c0({kind:"worktrees",projectId:f},(Q)=>{if(Q.kind==="worktrees")A(Q)}),onSessions:(f,A)=>c0({kind:"sessions",projectId:f},(Q)=>{if(Q.kind==="sessions")A(Q)}),openSession:async(f)=>{a(f),await I({...u,type:"open-session",id:D(C),payload:{sessionId:f}})},storage:{get:async(f)=>{let A=await $0({op:"get",key:f});return A.op==="get"&&A.found?A.value:void 0},set:async(f,A)=>{await $0({op:"set",key:f,value:A})},delete:async(f)=>{await $0({op:"delete",key:f})},keys:async()=>{let f=await $0({op:"keys"});if(f.op!=="keys")throw new $("HOST_REJECTED","Expected storage keys.");return f.keys}},onReady:(f)=>{if(U.add(f),V)f(V);return()=>{U.delete(f)}},onDirectory:(f)=>{if(G.add(f),V)f(V.directory);return()=>{G.delete(f)}},onSession:(f)=>{if(E.add(f),V)f(V.session);return()=>{E.delete(f)}},onSessionLifecycle:(f)=>{if(z.add(f),j)f(j);return()=>{z.delete(f)}},onConnection:(f)=>{if(M.add(f),V)f(V.connection);return()=>{M.delete(f)}},onSettings:(f)=>{if(Y.add(f),V)f(V.settings);return()=>{Y.delete(f)}},onItem:(f)=>{if(B.add(f),V)f(V.item);return()=>{B.delete(f)}},onResolve:(f)=>{return b=f,()=>{if(b===f)b=null}},toast:(f)=>{let A=f.message.trim();if(!A||A.length>k0)return Promise.reject(new $("HOST_REJECTED",`Toast message must contain 1 to ${k0} characters.`));if(f.copy&&f.copy!==!0&&(!f.copy.text.length||f.copy.text.length>C0))return Promise.reject(new $("HOST_REJECTED",`Toast copy text must contain 1 to ${C0} characters.`));return I({channel:Z,v:k,type:"toast",id:D(C),payload:{...f,message:A}})},openUrl:(f)=>I({channel:Z,v:k,type:"open-url",id:D(C),payload:{url:f}}),openCommit:(f)=>i0(f)?I({channel:Z,v:k,type:"open-commit",id:D(C),payload:{sha:f}}):Promise.reject(new $("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(f)=>I({channel:Z,v:k,type:"open-surface",id:D(C),payload:{surfaceId:f}}),writeClipboard:(f)=>I({channel:Z,v:k,type:"clipboard-write",id:D(C),payload:{text:f}}),compose:(f)=>I({channel:Z,v:k,type:"compose",id:D(C),payload:f}),attach:(f)=>I({channel:Z,v:k,type:"attach",id:D(C),payload:T0(f)}),startSession:async(f)=>{if(f.projectId!==void 0)a(f.projectId);let A=f.worktree;if(A&&A!==!0)if(A.kind==="existing")a(A.directory);else{if(A.name!==void 0)a(A.name,200);if(A.baseBranch!==void 0)a(A.baseBranch,200)}let Q=await w({channel:Z,v:k,type:"start-session",id:D(C),payload:e0(f)},T.requestTimeoutMs??180000);if(!n0(Q))throw new $("HOST_REJECTED","Host did not return a session.");return Q},prompt:(f)=>w({channel:Z,v:k,type:"prompt",id:D(C),payload:T1(f)}).then((A)=>{if(!o0(A))throw new $("HOST_REJECTED","Host did not return a prompt result.");return A}),sessionLink:(f)=>I({channel:Z,v:k,type:"session-link",id:D(C),payload:T0(f)}),close:()=>I({channel:Z,v:k,type:"close",id:D(C)}),oauthStart:()=>I({channel:Z,v:k,type:"oauth-start",id:D(C)}),oauthDisconnect:()=>I({channel:Z,v:k,type:"oauth-disconnect",id:D(C)}),request:(f)=>(O0(f.path)?w({channel:Z,v:k,type:"request",id:D(C),payload:f}):e1()).then((A)=>{if(!B0(A))throw new $("HOST_REJECTED","Host request result was empty.");return A}),serviceRequest:(f)=>(O0(f.path)?w({channel:Z,v:k,type:"service-request",id:D(C),payload:f}):e1()).then((A)=>{if(!B0(A))throw new $("HOST_REJECTED","Host service request result was empty.");return A}),serviceStatus:()=>w({channel:Z,v:k,type:"service-status",id:D(C)}).then((f)=>{if(!x1(f))throw new $("HOST_REJECTED","Host did not return service status.");return f}),readFile:(f)=>(_0(f)?w({channel:Z,v:k,type:"file-read",id:D(C),payload:{path:f}}):L0()).then((A)=>{if(!U1(A))throw new $("HOST_REJECTED","Host did not return file content.");return A}),writeFile:(f,A)=>{if(!_0(f))return L0();if(A.length>V0)return Promise.reject(new $("FILE_TOO_LARGE",`Content is over ${V0} characters.`));return w({channel:Z,v:k,type:"file-write",id:D(C),payload:{path:f,content:A}}).then((Q)=>{if(!G1(Q))throw new $("HOST_REJECTED","Host did not confirm the write.");return Q})},listDir:(f)=>(_0(f)?w({channel:Z,v:k,type:"file-list",id:D(C),payload:{path:f}}):L0()).then((A)=>{if(!f1(A))throw new $("HOST_REJECTED","Host did not return directory entries.");return A}),stat:(f)=>(_0(f)?w({channel:Z,v:k,type:"file-stat",id:D(C),payload:{path:f}}):L0()).then((A)=>{if(!A1(A))throw new $("HOST_REJECTED","Host did not return file status.");return A}),generate:(f)=>{let A=f.prompt.trim(),Q=f.system?.trim();if(A.length===0||A.length>W0)return Promise.reject(new $("HOST_REJECTED",`Prompt must be 1 to ${W0} characters.`));if(Q!==void 0&&(Q.length===0||Q.length>F0))return Promise.reject(new $("HOST_REJECTED",`System prompt must be 1 to ${F0} characters.`));let J=f.maxOutputTokens===void 0?void 0:Math.min(s0,Math.max(1,Math.floor(f.maxOutputTokens)));if(J!==void 0&&!Number.isFinite(J))return Promise.reject(new $("HOST_REJECTED","maxOutputTokens must be a number."));let g={prompt:A};if(Q!==void 0)g.system=Q;if(J!==void 0)g.maxOutputTokens=J;return w({channel:Z,v:k,type:"generate",id:D(C),payload:g},T.requestTimeoutMs??t0).then((P)=>{if(!E1(P))throw new $("HOST_REJECTED","Host did not return generated text.");return P})},setBadge:(f)=>I({channel:Z,v:k,type:"badge",id:D(C),payload:{count:_1(f)}}),setHeight:(f)=>I({channel:Z,v:k,type:"resize",id:D(C),payload:{height:S1(f)}}),dispose:()=>{for(let f of t.keys())l({...u,type:"workspace-unsubscribe",id:D(C),payload:{subscriptionId:f}});t.clear(),f0=!0,b=null,p=null,_.removeEventListener("message",P1);for(let f of s.values())clearTimeout(f.timer),f.reject(new $("HOST_UNAVAILABLE","Host client was disposed."));s.clear(),U.clear(),G.clear(),E.clear(),z.clear(),M.clear(),Y.clear(),B.clear()}}};var TT=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var s_=new Set(TT);var _T=["none","agent","user"];var e_=new Set(_T);function ST(){let T=z1();return{request:(_)=>T.request({method:_.method??"GET",path:_.path,..._.query?{query:_.query}:{},..._.body!=null?{body:_.body}:{}}),serviceRequest:(_)=>T.serviceRequest({method:_.method??"GET",path:_.path,..._.query?{query:_.query}:{},..._.body!=null?{body:_.body}:{}}),readFile:(_)=>T.readFile(_),listProjects:()=>T.listProjects(),listWorktrees:(_)=>T.listWorktrees(_),startSession:(_)=>T.startSession(_),openUrl:(_)=>T.openUrl(_),onReady:(_)=>T.onReady(_),onConnection:(_)=>T.onConnection(_),dispose:()=>T.dispose()}}var cT=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],xT=(T,_)=>{_.style.colorScheme=T.mode;for(let[S,x]of cT)_.style.setProperty(S,T.tokens[x]);_.style.setProperty("font-family",T.tokens.font),_.style.setProperty("font-size","0.875rem"),_.style.setProperty("line-height","1.45"),_.style.setProperty("color",T.tokens.foreground)},M1=(T,_)=>{if(xT(T.theme,_),_.dataset)_.dataset.ocSurface=T.surface,_.dataset.ocTheme=T.theme.mode};var UT="oc-sdk-ui-style",S0=(T)=>{while(T.firstChild)T.removeChild(T.firstChild)},K=(T)=>{let _=document.getElementById(UT);if(_ instanceof HTMLStyleElement){if(_.textContent!==T)_.textContent=T;return}p0(document);let S=document.createElement("style");S.id=UT,S.textContent=T,document.head.appendChild(S)},F=(T,_)=>{let S=document.createElement(T);if(_)S.className=_;return S},c=(T)=>{let _=F("button",T);return _.type="button",_},m=(T,_)=>{let S=_??"";if(T.textContent!==S)T.textContent=S};var vT={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},W=(T,_)=>`var(--${T}, var(--oc-${vT[T]}, ${_}))`,n=W("surface-background","transparent"),K0=W("surface-elevated","transparent"),E0=W("surface-elevated-foreground","inherit"),X0=W("surface-foreground","inherit"),O=W("surface-muted-foreground","gray"),dT=W("surface-muted","transparent"),q=W("interactive-border","currentColor"),y=W("interactive-hover","transparent"),o=W("interactive-active","transparent"),Y1=W("interactive-selection","transparent"),$1=W("interactive-selection-foreground","inherit"),AT=W("interactive-focus-ring","currentColor"),h=W("primary","currentColor"),Q1=W("primary-text","inherit"),Z1=W("error-text","inherit"),pT=W("font-sans","inherit"),k1=W("font-mono","monospace"),GT=W("radius","9px"),L=(T,_,S="transparent")=>`color-mix(in srgb, ${T} ${_}%, ${S})`,fT=`box-shadow: 0 0 0 2px ${AT};`,R0=(T)=>{let _=W(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${_}; --oc-sdk-tone-text: ${W(`${T}-text`,"inherit")}; }`},R=`
${d0}
.oc-sdk { box-sizing: border-box; color: ${X0}; font-family: ${pT}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${fT} }
.oc-sdk-mono { font-family: ${k1}; }
.oc-sdk-muted { color: ${O}; }
${R0("success")}${R0("warning")}${R0("error")}${R0("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${h}; --oc-sdk-tone-text: ${Q1}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${GT}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${Q1}; background: ${L(h,10,n)}; border-color: ${L(h,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${L(h,16,n)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${L(h,22,n)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${dT}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="outline"] { background: ${K0}; color: ${E0}; border-color: ${q}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${y}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${o}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${W("status-error","red")}; color: ${Z1}; background: ${L("var(--oc-sdk-tone)",7,n)}; border-color: ${L("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${L("var(--oc-sdk-tone)",9,n)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${L("var(--oc-sdk-tone)",11,n)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${O}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${Z1}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${GT}; background: ${K0}; color: ${E0}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${L(q,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${O}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${AT}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${W("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${W("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${k1}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${O}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${h}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${O}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${y}; color: ${X0}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${q}; border-radius: 6px; background: ${K0}; color: ${E0}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${O}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${O}; }
.oc-sdk-popup { --surface-foreground: ${E0}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${L(q,60)}; border-radius: 12px; background: ${K0}; color: ${E0}; box-shadow: 0 8px 24px ${L(X0,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${y}; }
.oc-sdk-option[aria-selected="true"] { background: ${Y1}; color: ${$1}; }
.oc-sdk-option[data-destructive="true"] { color: ${Z1}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${L(W("status-error","red"),10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${O}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${O}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${q}; border-radius: 4px; color: ${h}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${L(h,65,q)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${q}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${n}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${h}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${fT} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${O}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${L(X0,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${O}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${X0}; }
.oc-sdk-tab[aria-selected="true"] { color: ${$1}; background: ${Y1}; border-color: ${q}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${O}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${y}; color: ${O}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${L("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${y}; }
.oc-sdk-row[aria-selected="true"] { background: ${Y1}; color: ${$1}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${k1}; font-size: 0.75rem; color: ${O}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${O}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${O}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${O}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${O}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${O}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${q}; border-top-color: ${h}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${L("var(--oc-sdk-tone)",40)}; border-radius: 8px; background: ${L("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${O}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${O}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${L(q,40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${O}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${q}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${h}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${Q1}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${L(q,60)}; }
`;var lT=()=>{let T=document.createElement("span");return T.className="oc-sdk-spinner-ring",T.setAttribute("aria-hidden","true"),T},v=(T,_)=>{K(R);let S=_,x=c("oc-sdk oc-sdk-btn"),U=lT(),G=document.createElement("span");x.append(G),T.append(x);let E=()=>{if(x.dataset.variant=S.variant??"default",x.dataset.size=S.size??"default",x.disabled=Boolean(S.disabled)||Boolean(S.loading),x.dataset.loading=S.loading?"true":"false",x.setAttribute("aria-busy",S.loading?"true":"false"),S.loading&&U.parentNode!==x)x.prepend(U);else if(!S.loading&&U.parentNode===x)U.remove();m(G,S.label)},z=()=>{if(S.disabled||S.loading)return;S.onClick()};return x.addEventListener("click",z),E(),{update:(M)=>{S={...S,...M},E()},dispose:()=>{x.removeEventListener("click",z),x.remove()}}};var x0=(T,_="vertical")=>{let[S,x]=_==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(T.key===S||T.ctrlKey&&T.key.toLowerCase()==="n")return"next";if(T.key===x||T.ctrlKey&&T.key.toLowerCase()==="p")return"previous";if(T.key==="Home")return"first";if(T.key==="End")return"last";return null},U0=(T,_,S)=>{let x=T.filter((M)=>!M.disabled);if(x.length===0)return null;let U=x[0],G=x[x.length-1];if(S==="first"||!U||!G)return U?.id??null;if(S==="last")return G.id;let E=x.findIndex((M)=>M.id===_);if(E===-1)return S==="next"?U.id:G.id;return x[Math.min(x.length-1,Math.max(0,E+(S==="next"?1:-1)))]?.id??null};var C1=(T,_)=>{K(R);let S=_,x=F("div","oc-sdk oc-sdk-tabs");x.setAttribute("role","tablist"),T.append(x);let U=()=>{S0(x),x.dataset.track=S.trackBackground?"true":"false";for(let E of S.items){let z=c("oc-sdk-tab");z.setAttribute("role","tab");let M=E.id===S.activeId;z.setAttribute("aria-selected",M?"true":"false"),z.tabIndex=M?0:-1,z.dataset.id=E.id;let Y=F("span");if(Y.textContent=E.label,z.append(Y),E.count!==void 0){let B=F("span","oc-sdk-tab-count");B.textContent=String(E.count),z.append(B)}z.addEventListener("click",()=>{if(E.id!==S.activeId)S.onChange(E.id)}),x.append(z)}},G=(E)=>{let z=x0(E,"horizontal");if(!z)return;let M=U0(S.items,S.activeId,z);if(M&&M!==S.activeId){E.preventDefault(),S.onChange(M);let Y=x.querySelector(`[data-id="${CSS.escape(M)}"]`);if(Y instanceof HTMLElement)Y.focus()}};return x.addEventListener("keydown",G),U(),{update:(E)=>{S={...S,...E},U()},dispose:()=>{x.removeEventListener("keydown",G),x.remove()}}};var D1=(T,_)=>{K(R);let S=_,x=F("div","oc-sdk oc-sdk-empty"),U=F("h2","oc-sdk-empty-title"),G=F("p","oc-sdk-empty-body"),E=F("div","oc-sdk-empty-action");x.append(U,G,E),T.append(x);let z=null,M=()=>{if(m(U,S.title),m(G,S.body),G.hidden=!S.body,E.hidden=!S.action,!S.action){z?.dispose(),z=null;return}let Y={label:S.action.label,onClick:S.action.onClick};if(z)z.update(Y);else z=v(E,{...Y,variant:"outline",size:"sm"})};return M(),{update:(Y)=>{S={...S,...Y},M()},dispose:()=>{z?.dispose(),z=null,x.remove()}}};var iT={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"calendar"},waiting_for_resource:{label:"Waiting for resource",tone:"neutral",glyph:"pause"},waiting_for_callback:{label:"Waiting for callback",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},XT={label:"Unknown",tone:"neutral",glyph:"dot"};function i(T){if(!T)return XT;return iT[T]??XT}function z0(T){let _=i(T.status);if(T.status==="failed"&&T.allow_failure)return{..._,label:"Failed (allowed)",tone:"warning"};return _}var rT=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],sT=new Set(rT);function d(T){return T!=null&&sT.has(T)}var tT=3;function zT(T){return T<tT}var eT=new Set(["success","failed","canceled","skipped"]);function MT(T,_){return(T??[]).map((S)=>{let x=S.downstream_pipeline??null;if(x)return{id:S.id,name:S.name,stage:S.stage,state:"ready",status:x.status,downstream:x};let U=S.status==="failed"?"could-not-start":eT.has(S.status)?"ready":"starting";return{id:S.id,name:S.name,stage:S.stage,state:U,status:S.status,downstream:null}})}function T_(T){let _;try{_=new URL(T)}catch{return null}let x=/^\/?(.+?)\/-\//.exec(_.pathname)?.[1];if(!x)return null;try{return decodeURIComponent(x)}catch{return x}}function V1(T){return T_(T.web_url)}function W1(T,_){let S=V1(T);if(S==null)return`project #${T.project_id}`;return S===_?"child pipeline":S}function N0(T){return(T??[]).filter((_)=>_.downstream!=null).length}function YT(T,_){if(T==="starting")return{label:"Starting",tone:"warning",glyph:"clock"};if(T==="could-not-start")return{label:"Could not start",tone:"error",glyph:"cross"};return i(_)}function M0(T){return(T??"").slice(0,7)}function r(T){if(T==null||T==="")return null;if(typeof T==="number")return Number.isFinite(T)?T:null;let _=Date.parse(T);return Number.isNaN(_)?null:_}function I0(T){if(T==null||!Number.isFinite(T))return"";let _=Math.max(0,Math.round(T));if(_<60)return`${_}s`;let S=Math.floor(_/60),x=_%60;if(S<60)return x?`${S}m ${String(x).padStart(2,"0")}s`:`${S}m`;let U=Math.floor(S/60),G=S%60;return`${U}h ${String(G).padStart(2,"0")}m`}function H0(T,_){return I0((_-T)/1000)}function b0(T,_=Date.now()){let S=Math.max(0,Math.round((_-T)/1000));if(S<10)return"just now";if(S<60)return`${S}s ago`;let x=Math.floor(S/60);if(x<60)return`${x}m ago`;let U=Math.floor(x/60);if(U<24)return`${U}h ago`;let G=Math.floor(U/24);if(G<30)return`${G}d ago`;return`${Math.floor(G/30)}mo ago`}function F1(T){if(T==null||T==="")return[];return(T.endsWith(`
`)?T.slice(0,-1):T).split(`
`)}function w0(T,_){if(_<=0)return[];return F1(T).slice(-_)}function $T(T){return(_)=>T.request(_)}function m0(T){return`/api/v4/projects/${encodeURIComponent(T)}`}function __(T,_={scope:"all"}){let S={per_page:String(_.perPage??I1)};if(_.scope==="branch"){if(_.ref)S.ref=_.ref}else S.order_by="updated_at",S.sort="desc";return{path:`${m0(T)}/pipelines`,query:S}}function S_(T,_){return{path:`${m0(T)}/pipelines/${_}/jobs`,query:{per_page:"100"}}}function x_(T,_){return{path:`${m0(T)}/pipelines/${_}/bridges`,query:{per_page:"100"}}}function U_(T,_){return{path:`${m0(T)}/jobs/${_}/trace`,query:{}}}var G_=new Set([301,302,303,307,308]);function f_(T){let S=/This resource has been moved permanently to\s+(\S+)/.exec(T)?.[1];if(!S)return null;try{let x=new URL(S);if(x.protocol!=="https:"&&x.protocol!=="http:")return null;return x.toString()}catch{return null}}function A_(T){if(T>=200&&T<300)return null;if(T===401||T===403)return{kind:"unauthorized"};if(T===404)return{kind:"not-found"};if(G_.has(T))return{kind:"redirect",target:null};return{kind:"http",status:T}}function E_(T){if(typeof T!=="object"||T===null)return null;let _=T.code;return typeof _==="string"?_:null}function X_(T){let _=E_(T);if(_==="DISCONNECTED")return{kind:"disconnected"};if(_==="NO_SERVICE"||_==="SERVICE_FAILED"||_==="NOT_GRANTED")return{kind:"service"};return{kind:"network"}}async function y0(T,_){let S;try{S=await T(_)}catch(U){return{ok:!1,failure:X_(U)}}let x=A_(S.status);if(x){if(x.kind==="redirect")return{ok:!1,failure:{kind:"redirect",target:f_(S.body)}};return{ok:!1,failure:x}}return{ok:!0,status:S.status,body:S.body}}function J1(T,_){try{return{ok:!0,data:JSON.parse(T)}}catch{return{ok:!1,failure:{kind:"http",status:_}}}}async function QT(T,_,S){let x=__(_,S),U=await y0(T,{method:"GET",...x});if(!U.ok)return U;return J1(U.body,U.status)}async function ZT(T,_,S){let x=S_(_,S),U=await y0(T,{method:"GET",...x});if(!U.ok)return U;return J1(U.body,U.status)}async function kT(T,_,S){let x=x_(_,S),U=await y0(T,{method:"GET",...x});if(!U.ok)return U;return J1(U.body,U.status)}async function O1(T,_,S){let x=U_(_,S),U=await y0(T,{method:"GET",...x});if(!U.ok){if(U.failure.kind==="not-found")return{ok:!0,data:""};return U}return{ok:!0,data:U.body}}var z_=100,M_="Investigate the cause and fix it in this repository. If the failure is infrastructure, a flaky test, or a runner/network/registry problem, say so plainly instead of inventing a code change.";function q0(T){return T.status==="failed"}function Y_(T){let _=["A GitLab CI job has failed.",""];if(_.push(`- Project: ${T.project}`),T.pipeline)_.push(`- Pipeline #${T.pipeline.iid} (${T.pipeline.ref||"—"} @ ${M0(T.pipeline.sha)})`);if(_.push(`- Job: ${T.job.name} (${T.job.stage})`),T.pipeline?.web_url)_.push(`- Pipeline: ${T.pipeline.web_url}`);if(T.job.web_url)_.push(`- Job log: ${T.job.web_url}`);let S=_.join(`
`),x=`

${M_}`,U=w0(T.trace,z_).join(`
`);if(U==="")return`${S}${x}`;let G=(M)=>`${S}

Tail of the job log:

\`\`\`
${M}
\`\`\`${x}`,E=G(U);if(E.length<=A0)return E;let z=U.slice(E.length-A0);return z===""?`${S}${x}`:G(z)}function CT(T){return{providerId:T.providerId,id:`job-${T.job.id}`,title:T.job.name||`Job #${T.job.id}`,url:T.job.web_url??"",text:Y_(T),navigation:"open"}}function $_(T,_={}){if(!B1(T))return{active:!1,delayMs:null};let x=_.intervalMs??w1,U=_.elapsedMs??0,G=U>600000?3:U>120000?2:1;return{active:!0,delayMs:x*G}}function B1(T){for(let _ of T)if(d(_))return!0;return!1}function DT(T,_={}){return $_(T,_).delayMs}function K1(T){try{return new URL(T).host}catch{return T.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function Q_(T){let _=T.trim();if(!_)return null;let S="",x="";if(_.includes("://")){let G;try{G=new URL(_)}catch{return null}S=G.host,x=G.pathname}else{let G=_.indexOf(":");if(G<0)return null;S=_.slice(0,G).replace(/^[^@]*@/,""),x=_.slice(G+1),x=x.replace(/^\/+/,"")}let U=VT(x);if(!S||!U)return null;return{host:S,path:U}}function VT(T){let _=T.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(_.toLowerCase().endsWith(".git"))_=_.slice(0,-4);return _.replace(/\/+$/,"")}function Z_(T){let _=[],S=null;for(let x of T.split(/\r?\n/)){let U=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(x);if(U){S=U[1]??null;continue}if(/^\s*\[/.test(x)){S=null;continue}if(S==null)continue;let G=/^\s*url\s*=\s*(.+?)\s*$/.exec(x);if(G&&G[1])_.push({name:S,url:G[1]})}return _}function k_(T){let _=Z_(T),S=["origin","upstream"],x=[...S.flatMap((U)=>_.filter((G)=>G.name===U)),..._.filter((U)=>!S.includes(U.name))];for(let U of x){let G=Q_(U.url);if(G)return{remote:G,name:U.name}}return null}function C_(T){if(!T)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(T)?.[1]??null}function G0(T,_){if(!T||!_)return!1;return T.replace(/\/+$/,"")===_.replace(/\/+$/,"")}function D_(T){return T!=null&&/^\s*gitdir:\s*\S+/.test(T)}function L1(T,_,S){if(T&&S){let x=S.find((U)=>G0(U.directory,T));if(x?.branch)return x.branch}return C_(_)}function WT(T){let _=K1(T.apiOrigin),S=T.projectOverride?.trim()??"";if(!T.directory&&!S)return{ok:!1,failure:"no-project"};if(S){let U=VT(S);if(!U)return{ok:!1,failure:"no-project"};return{ok:!0,host:_,project:U,ref:L1(T.directory,T.head,T.worktrees),source:"override"}}let x=T.gitConfig?k_(T.gitConfig):null;if(!x){if(D_(T.gitFile))return{ok:!1,failure:"linked-worktree",detectedRef:L1(T.directory,T.head,T.worktrees)};return{ok:!1,failure:"not-a-repo"}}if(x.remote.host!==_)return{ok:!1,failure:"host-mismatch",detectedHost:x.remote.host,detectedPath:x.remote.path};return{ok:!0,host:_,project:x.remote.path,ref:L1(T.directory,T.head,T.worktrees),source:"derived"}}var FT=new Set(["success","failed","canceled","skipped"]);function V_(T){return FT.has(T.status)}function JT(T=[],_=[]){let S=[],x=new Map,U=(G)=>{let E=x.get(G);if(!E)E={jobs:[],triggers:[]},x.set(G,E),S.push(G);return E};for(let G of T)U(G.stage).jobs.push(G);for(let G of _)U(G.stage).triggers.push(G);return S.map((G)=>{let E=x.get(G)??{jobs:[],triggers:[]};return{stage:G,jobs:E.jobs,triggers:E.triggers,done:E.jobs.filter(V_).length+E.triggers.filter((z)=>FT.has(z.status)).length,total:E.jobs.length+E.triggers.length}})}var W_={setTimeout:(T,_)=>globalThis.setTimeout(T,_),clearTimeout:(T)=>globalThis.clearTimeout(T),setInterval:(T,_)=>globalThis.setInterval(T,_),clearInterval:(T)=>globalThis.clearInterval(T),now:()=>Date.now()},F_=5;function N(T,_){return`${T}\x00${_}`}function Y0(T,_){return`${T}\x00${_}`}var OT={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',calendar:'<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},J_='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M5.54429 2.67305C5.81644 2.49995 6.13587 2.41612 6.45799 2.43329C6.78102 2.4505 7.09056 2.56841 7.34318 2.77049L7.34405 2.77119C7.59044 2.96879 7.76998 3.2372 7.85866 3.5399L9.30537 7.96754H14.6944L16.1411 3.5399C16.2298 3.23722 16.4093 2.96879 16.6557 2.77116L16.6604 2.76745C16.9128 2.56777 17.2209 2.45133 17.5424 2.43423C17.8638 2.41712 18.1826 2.50023 18.4547 2.67197L18.4571 2.67347C18.7307 2.84735 18.9427 3.10328 19.0624 3.40486L19.0664 3.41491L21.5393 9.86622C21.9619 10.9712 22.0136 12.1836 21.6865 13.3205C21.3594 14.4574 20.6715 15.457 19.7263 16.1685L12.9955 21.2331L12.9945 21.2338C12.7066 21.4513 12.3554 21.5692 11.9943 21.5692C11.6332 21.5692 11.2819 21.4513 10.9939 21.2337L4.26254 16.1683C3.32063 15.4562 2.63541 14.4574 2.30989 13.3224C1.98437 12.1873 2.03616 10.9772 2.45747 9.8741L4.93724 3.40497C5.0571 3.10297 5.26966 2.84673 5.54429 2.67305ZM6.35534 4.73567L4.16029 10.4639C3.87993 11.2013 3.82298 12.0676 4.04049 12.8261C4.25704 13.5811 4.71123 14.2461 5.33544 14.7225L11.9943 19.7329L18.6484 14.7265C19.2789 14.2502 19.7379 13.5822 19.9563 12.8227C20.1751 12.0624 20.1148 11.1847 19.8328 10.4455L17.6444 4.73558L16.0001 9.76791H7.9996L6.35534 4.73567Z"/></svg>',O_='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',B_='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',L_='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';function X(T,_,S){let x=document.createElement(T);if(_)x.className=_;if(S!=null)x.textContent=S;return x}function BT(T){while(T.firstChild)T.removeChild(T.firstChild)}class PT{root;port;options;timers;directory=null;settingsProject="";settingsHost="";settingsToken="";started=!1;disposed=!1;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;bridges=new Map;jobs=new Map;downstreamPath=[];openJob=null;traces=new Map;traceLoadingKey=null;handoffJobId=null;handoffError=null;updatedAt=null;lastHost=null;healed=new Map;derivedProject=null;redirectHops=0;pendingHealNotice=null;healNotice=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;drawerEl=null;drawerScrollTop=0;followTail=!0;handles=[];unsubReady=null;unsubConnection=null;constructor(T,_,S){this.root=T,this.port=_,this.options=S,this.timers=S.timers??W_}start(){return this.unsubReady=this.port.onReady((T)=>this.handleReady(T)),this.unsubConnection=this.port.onConnection((T)=>this.handleConnection(T)),this.render(),this}handleReady(T){M1(T,document.documentElement);let _=T.settings?.project??"",S=T.settings?.host??"",x=T.settings?.token??"",U=T.directory!==this.directory||_!==this.settingsProject||S!==this.settingsHost||x!==this.settingsToken||!this.started;if(this.directory=T.directory,this.settingsProject=_,this.settingsHost=S,this.settingsToken=x,U)this.started=!0,this.refresh();else this.render()}handleConnection(T){if(this.isCustomHost())return;if(!T.connected){this.problem=NT(this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.problem?.kind==="disconnected")this.refresh()}refresh(){if(this.disposed)return;let T=++this.generation;this.runRefresh(T)}setScope(T){if(T===this.scope)return;this.scope=T,this.expandedId=null,this.downstreamPath=[],this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.unsubConnection?.(),this.disposeHandles(),BT(this.root),this.port.dispose()}async runRefresh(T){this.error=null;let _=this.hostSettingProblem();if(_){this.problem=_,this.phase="problem",this.resolved=null,this.forgetHostData(),this.stopAllTimers(),this.render();return}let S=this.effectiveHost();if(S!==this.lastHost)this.forgetHostData(),this.lastHost=S;let x=this.settingsProject.trim();if(!this.directory&&!x){this.problem=RT({ok:!1,failure:"no-project"},this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.pipelines.length===0)this.phase="loading";this.render();let U=await this.deriveProject();if(this.disposed||T!==this.generation)return;if(!U.ok){this.problem=RT(U,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}this.problem=null,this.derivedProject=U.project,this.redirectHops=0,this.resolved=this.applyHealedProject(U),await this.loadPipelines(T,this.resolved,!0)}hostSettingProblem(){let T=this.settingsHost.trim();if(T==="")return null;let _=LT(T);if(_==null)return g_(T);if(h0(_)===this.configuredHost())return null;if(this.settingsToken.trim()==="")return q_(h0(_));return null}forgetHostData(){this.pipelines=[],this.bridges.clear(),this.jobs.clear(),this.traces.clear(),this.openJob=null,this.expandedId=null,this.downstreamPath=[],this.updatedAt=null,this.healed.clear(),this.derivedProject=null,this.redirectHops=0,this.pendingHealNotice=null,this.healNotice=null}async deriveProject(){let T=this.settingsProject.trim(),_=this.directory,S=null,x=null,U=null,G=null;if(_){try{S=(await this.port.readFile(".git/config")).content}catch{S=null}if(S==null)try{x=(await this.port.readFile(".git")).content}catch{x=null}try{U=(await this.port.readFile(".git/HEAD")).content}catch{U=null}try{let z=(await this.port.listProjects()).projects.find((M)=>G0(M.directory,_));if(z)G=(await this.port.listWorktrees(z.id)).worktrees}catch{G=null}}return WT({directory:_,apiOrigin:this.isCustomHost()?this.customBase()??this.options.apiOrigin:this.options.apiOrigin,projectOverride:T,gitConfig:S,gitFile:x,head:U,worktrees:G})}async loadPipelines(T,_,S=!1){let x=_.ref?this.scope:"all",U=await QT(this.requester(),_.project,{scope:x,ref:_.ref});if(this.disposed||T!==this.generation)return;if(!U.ok){if(U.failure.kind==="redirect"&&this.healRedirect(T,_,U.failure.target))return;this.handleFailure(U.failure);return}if(this.pipelines=U.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.promoteHealNotice(),this.pruneDownstreamNode(),S){if(this.seedBridges(T,_.project),this.expandedId!=null)this.loadJobs(T,_.project,this.expandedId,!0)}this.render(),this.schedulePoll()}seedBridges(T,_){for(let S of this.pipelines){let x=N(_,S.id);if(!this.bridges.has(x))this.loadBridges(T,_,S.id,!1)}}pruneDownstreamNode(){let T=this.downstreamPath[0];if(!T)return;if(this.pipelines.some((_)=>_.id===T.ancestors[0]?.pipelineId))return;this.downstreamPath=[],this.openJob=null}handleFailure(T){if(T.kind==="disconnected"||T.kind==="unauthorized"||T.kind==="not-found"||T.kind==="service"){this.problem=y_(T,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(T.kind==="redirect"){if(this.pendingHealNotice=null,this.derivedProject)this.healed.delete(this.derivedProject);this.problem=this.redirectProblem(T.target),this.phase="problem",this.stopAllTimers(),this.render();return}if(this.error=T.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${T.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}applyHealedProject(T){let _=this.healed.get(T.project);return _?{...T,project:_}:T}healRedirect(T,_,S){if(S==null||this.redirectHops>=F_)return!1;let x=R_(S,this.effectiveHost());if(x==null)return!1;this.redirectHops+=1;let U=this.derivedProject??_.project;return this.healed.set(U,x),this.pendingHealNotice={from:U,to:x},this.resolved={..._,project:x},this.loadPipelines(T,this.resolved,!0),!0}promoteHealNotice(){if(!this.pendingHealNotice)return;this.healNotice=this.pendingHealNotice,this.pendingHealNotice=null}redirectProblem(T){let _=this.derivedProject??this.resolved?.project??"",S=_?`${this.webOrigin()}/${_}`:null;return T?w_(T,S):m_(S)}webOrigin(){return this.customBase()??this.options.apiOrigin.replace(/\/+$/,"")}togglePipeline(T){if(this.expandedId===T){this.expandedId=null,this.downstreamPath=[],this.openJob=null,this.render();return}this.expandedId=T,this.downstreamPath=[];let _=this.resolved?.project;if(_){let S=N(_,T);if(!Array.isArray(this.jobs.get(S)))this.loadJobs(this.generation,_,T,!1);if(!Array.isArray(this.bridges.get(S)))this.loadBridges(this.generation,_,T,!1)}this.render()}async loadJobs(T,_,S,x){let U=N(_,S);if(!x||!Array.isArray(this.jobs.get(U)))this.jobs.set(U,"loading"),this.render();let G=await ZT(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(G.ok)this.jobs.set(U,G.data);else if(x);else this.jobs.set(U,"error");this.render()}async loadBridges(T,_,S,x){let U=N(_,S),G=await kT(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(G.ok)this.bridges.set(U,MT(G.data,_));else if(x);else this.bridges.set(U,"error");if(this.render(),!x&&this.resolved)this.schedulePoll()}openJobDrawer(T,_,S){this.openJob={project:T,pipelineId:_,jobId:S},this.followTail=!0,this.drawerScrollTop=0;let x=Y0(T,S);if(this.traces.has(x)){this.render();return}this.traceLoadingKey=x,this.render(),this.loadTrace(this.generation,T,S)}async loadTrace(T,_,S){let x=Y0(_,S),U=await O1(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(this.traceLoadingKey===x)this.traceLoadingKey=null;if(!U.ok)this.traces.set(x,{state:"error",text:"",truncated:null});else this.traces.set(x,KT(U.data??""));this.render()}refreshOpenTrace(T){let _=this.openJob;if(!_)return;if(this.traceLoadingKey===Y0(_.project,_.jobId))return;let S=this.jobById(_.project,_.pipelineId,_.jobId);if(!S||!d(S.status))return;this.loadTrace(T,_.project,_.jobId)}jobById(T,_,S){let x=this.jobs.get(N(T,_));if(!Array.isArray(x))return;return x.find((U)=>U.id===S)}closeDrawer(){this.openJob=null,this.followTail=!0,this.drawerScrollTop=0,this.render()}canHandoff(){return this.directory!=null&&this.resolved!=null}canHandoffJob(T){return this.resolved!=null&&G0(T,this.resolved.project)}startHandoff(T,_,S){if(!this.canHandoff()||!this.canHandoffJob(T)||this.handoffJobId!=null)return;let x=this.jobById(T,_,S);if(!x||!q0(x))return;let U=this.pipelineFor(T,_);this.handoffJobId=S,this.handoffError=null,this.render(),this.runHandoff(T,U,x)}pipelineFor(T,_){let S=this.pipelines.find((U)=>U.id===_);if(S&&G0(T,this.resolved?.project??""))return S;let x=this.triggerFor(T,_)?.downstream;if(x)return{...x,started_at:null,finished_at:null,duration:null};return S??null}triggerFor(T,_){for(let[S,x]of this.bridges){if(!Array.isArray(x))continue;if(S.split("\x00")[0]!==T)continue;let U=x.find((G)=>G.downstream?.id===_);if(U)return U}return}async runHandoff(T,_,S){let x=await this.traceFor(T,S);if(this.disposed)return;if(x==null){this.finishHandoff("Could not read the job log to hand off. The session was not started.");return}let U;try{U=(await this.port.startSession(CT({providerId:N1,project:T,pipeline:_,job:S,trace:x}))).sent}catch{this.finishHandoff("Could not start a session for this job.");return}if(this.disposed)return;this.finishHandoff(U==="sent"?null:H_(U))}async traceFor(T,_){let S=Y0(T,_.id),x=this.traces.get(S);if(x?.state==="ready")return x.text;let U=await O1(this.requester(),T,_.id);if(!U.ok)return null;let G=U.data??"";return this.traces.set(S,KT(G)),G}finishHandoff(T){this.handoffJobId=null,this.handoffError=T,this.render()}visibleStatuses(){let T=this.pipelines.map((_)=>_.status);for(let _ of this.jobs.values())if(Array.isArray(_))for(let S of _)T.push(S.status);for(let _ of this.bridges.values())if(Array.isArray(_))for(let S of _)T.push(S.status);return T}hasActive(){return B1(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let T=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=T;let _=DT(this.visibleStatuses(),{elapsedMs:T-this.pollStartedAt});if(_==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},_)}async pollOnce(){if(this.disposed||!this.resolved)return;let T=++this.generation;if(this.redirectHops=0,await this.loadPipelines(T,this.resolved),T!==this.generation)return;if(this.refreshOpenTrace(T),await this.refetchVisible(T),T===this.generation)this.schedulePoll()}async refetchVisible(T){if(!this.resolved)return;let _=this.resolved.project,S=new Map,x=(G,E,z)=>{let M=N(G.project,G.pipelineId);if(!S.get(M)||z)S.set(M,{target:G,status:E,expanded:z})};for(let G of this.pipelines){let E=G.id===this.expandedId,z=this.bridges.get(N(_,G.id)),M=Array.isArray(z)?N0(z)>0:!1;if(E||d(G.status)||M)x({project:_,pipelineId:G.id},G.status,E)}for(let G of this.downstreamPath){let E=this.bridges.get(N(G.project,G.pipelineId)),z=Array.isArray(E)?E[0]:void 0;x({project:G.project,pipelineId:G.pipelineId},z?.status??this.jobsStatus(G),!0)}let U=[];for(let{target:G,status:E,expanded:z}of S.values()){let M=N(G.project,G.pipelineId);if(z||d(E)||this.hasCachedDownstream(M))U.push(this.loadBridges(T,G.project,G.pipelineId,!0));if((z||d(E))&&Array.isArray(this.jobs.get(M)))U.push(this.loadJobs(T,G.project,G.pipelineId,!0))}await Promise.all(U)}hasCachedDownstream(T){let _=this.bridges.get(T);return Array.isArray(_)&&N0(_)>0}jobsStatus(T){let _=this.jobs.get(N(T.project,T.pipelineId));if(Array.isArray(_)){for(let S of _)if(d(S.status))return"running"}return"success"}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),m1)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let T=this.timers.now();for(let _ of Array.from(this.root.querySelectorAll("[data-live]"))){let S=Number(_.dataset.start);if(!Number.isFinite(S))continue;if(_.dataset.live==="ago")_.textContent=b0(S,T);else if(_.dataset.live==="elapsed"){let x=_.dataset.end?Number(_.dataset.end):T;_.textContent=H0(S,Number.isFinite(x)?x:T)}}}configuredHost(){return K1(this.options.apiOrigin)}customBase(){return LT(this.settingsHost)}isCustomHost(){let T=this.customBase();if(T==null)return!1;return h0(T)!==this.configuredHost()}effectiveHost(){let T=this.customBase();return T!=null&&this.isCustomHost()?h0(T):this.configuredHost()}requester(){let T=this.isCustomHost()?this.customBase():null;if(T!=null){let _=this.settingsToken.trim();return async(S)=>{let x=await this.port.serviceRequest({method:S.method??"GET",path:H1,query:{baseUrl:T},body:JSON.stringify({baseUrl:T,token:_,method:S.method??"GET",path:S.path,query:S.query??{}})});return P_(x)}}return $T(this.port)}disposeHandles(){for(let T of this.handles.splice(0))T.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;if(this.drawerEl)this.drawerScrollTop=this.drawerEl.scrollTop;BT(this.root),this.root.className="gp";let T=X("div","gp-progress");if(!this.isFirstLoad())T.hidden=!0;this.root.append(T),this.root.append(this.renderHeader());let _=this.renderHandoffNotice();if(_)this.root.append(_);let S=this.renderHealNotice();if(S)this.root.append(S);this.scrollEl=X("div","gp-scroll");let x=X("div","gp-pad");if(x.append(...this.renderContent()),this.scrollEl.append(x),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;if(this.drawerEl)this.drawerEl.scrollTop=this.followTail?this.drawerEl.scrollHeight:this.drawerScrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let T=this.resolved!=null&&this.updatedAt!=null;if(T&&this.tickTimer==null)this.startTicker();if(!T)this.stopTicker()}renderHeader(){let T=X("div","gp-head"),_=X("div","gp-head-row"),S=X("span","gp-brand"),x=X("span","gp-brand-mark");x.innerHTML=J_,S.append(x,X("span","gp-brand-title","Pipelines")),_.append(S,X("span","gp-spacer"));let U=X("span","gp-updated");if(this.resolved==null||this.updatedAt==null)U.hidden=!0;else{let M=X("span","gp-dot");M.dataset.idle=this.hasActive()?"false":"true";let Y=X("span");Y.dataset.live="ago",Y.dataset.start=String(this.updatedAt),Y.textContent=b0(this.updatedAt,this.timers.now()),U.append(M,Y)}_.append(U);let G=X("button","gp-iconbtn");if(G.type="button",G.setAttribute("aria-label","Refresh"),G.title="Refresh",G.innerHTML=O_,this.isFirstLoad())G.dataset.spinning="true";G.addEventListener("click",()=>this.refresh()),_.append(G),T.append(_);let E=X("div","gp-project");if(this.isCustomHost()){let M=X("span","gp-host-tag","Custom host");M.dataset.mode="custom",E.append(M)}let z=X("span","gp-project-path");if(this.resolved)z.textContent=`${this.resolved.host}/${this.resolved.project}`;else z.hidden=!0;if(E.append(z),!this.resolved&&!this.isCustomHost())E.hidden=!0;return T.append(E),T.append(this.renderScope()),T}renderScope(){let T=X("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return T.hidden=!0,T;let S=X("div");T.append(S),this.handles.push(C1(S,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(U)=>this.setScope(U)}));let x=this.scope==="branch"?this.resolved?.ref??"":"all refs";return T.append(X("span","gp-scope-ref",x)),T}renderContent(){let T=[];if(this.error){let S=X("div","gp-state");S.append(X("p","gp-state-body",this.error));let x=X("div","gp-state-actions"),U=X("div");this.handles.push(v(U,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),x.append(U),S.append(x),T.push(S)}if(this.problem)return T.push(this.renderProblem(this.problem)),T;if(this.isFirstLoad())return T.push(this.renderSkeleton()),T;if(this.pipelines.length===0)return T.push(this.renderEmpty()),T;let _=X("div","gp-list");for(let S of this.pipelines)_.append(this.renderPipeline(S));return T.push(_),T}renderProblem(T){let _=X("div","gp-state"),S=X("h2","gp-state-title",T.title);if(_.append(S,X("p","gp-state-body",T.body)),T.detail)_.append(X("p","gp-state-detail",T.detail));if(T.hint)_.append(X("p","gp-state-hint",T.hint));let x=X("div","gp-state-actions");if(T.action){let G=X("div"),{label:E,url:z}=T.action;this.handles.push(v(G,{label:E,variant:"default",size:"sm",onClick:()=>void this.port.openUrl(z)})),x.append(G)}let U=X("div");return this.handles.push(v(U,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),x.append(U),_.append(x),_}renderEmpty(){let T=X("div"),_=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(D1(T,{title:_?"No pipelines for this ref":"No pipelines yet",body:_?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:_?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),T}renderSkeleton(){let T=X("div","gp-skel");for(let _=0;_<5;_+=1){let S=X("div","gp-skel-row"),x=X("span","gp-skel-line");x.dataset.w="short";let U=X("span","gp-skel-line");U.dataset.w="grow",S.append(x,U),T.append(S)}return T}renderPipeline(T){let _=this.resolved?.project??"",S=this.expandedId===T.id,x=X("div","gp-item");x.dataset.open=S?"true":"false";let U=X("button","gp-row");U.type="button",U.setAttribute("aria-expanded",String(S));let G=X("span","gp-caret");G.innerHTML=B_,U.append(G,g0(i(T.status),15));let E=X("span","gp-row-main"),z=X("span","gp-row-line");z.append(X("span","gp-ref",T.ref||"—")),z.append(X("span","gp-sha",M0(T.sha))),E.append(z,X("div","gp-row-sub",b_(T))),U.append(E,this.timingSpan(T));let M=this.collapsedDownstreamCount(_,T.id);if(M>0)U.append(X("span","gp-downstream-badge",`↳ ${M} downstream`));if(U.addEventListener("click",()=>this.togglePipeline(T.id)),x.append(U),S){let Y=X("div","gp-jobs");if(T.web_url)Y.append(this.renderExternalLink("gp-jobs-link","View pipeline in GitLab",T.web_url));let B=this.bridges.get(N(_,T.id));if(Y.append(this.renderJobsBody(_,T.id,B)),B==="error")Y.append(X("div","gp-row-sub","Could not load downstream pipelines."));x.append(Y)}return x}collapsedDownstreamCount(T,_){let S=this.bridges.get(N(T,_));return Array.isArray(S)?N0(S):0}renderJobsBody(T,_,S,x="root"){let U=X("div","gp-jobs-body"),G=this.jobs.get(N(T,_));if(G===void 0||G==="loading")return U.append(X("div","gp-row-sub","Loading jobs…")),U;if(G==="error")return U.append(X("div","gp-row-sub",x==="downstream"?"Could not read this downstream project. It may be private, or the token may not reach it.":"Could not load jobs. Collapse and reopen to retry.")),U;if(S==="error"&&x==="downstream")U.append(X("div","gp-row-sub","Could not read this downstream project’s own triggers."));let E=Array.isArray(S)?S:[];if(G.length===0&&E.length===0&&S!=="error")return U.append(X("div","gp-row-sub","No jobs reported yet.")),U;for(let z of JT(G,E))U.append(this.renderStage(T,_,z));return U}renderExternalLink(T,_,S){let x=document.createElement("a");return x.className=T,x.href=S,x.target="_blank",x.rel="noreferrer",x.textContent=_,x.addEventListener("click",(U)=>{U.preventDefault(),this.port.openUrl(S)}),x}timingSpan(T){let _=d(T.status),S=r(T.started_at);if(_&&S!=null){let G=r(T.finished_at),E=X("span","gp-row-meta");if(E.dataset.live="elapsed",E.dataset.start=String(S),G!=null)E.dataset.end=String(G);return E.textContent=H0(S,G??this.timers.now()),E}if(r(T.finished_at)!=null&&T.duration!=null)return X("span","gp-row-meta",I0(T.duration));let U=r(T.created_at);if(U!=null){let G=X("span","gp-row-meta");return G.dataset.live="ago",G.dataset.start=String(U),G.textContent=b0(U,this.timers.now()),G}return X("span","gp-row-meta","—")}jobMeta(T){let _=r(T.started_at);if(T.status==="running"&&_!=null){let x=X("span","gp-job-meta");return x.dataset.live="elapsed",x.dataset.start=String(_),x.textContent=H0(_,this.timers.now()),x}let S=r(T.finished_at);if(T.duration!=null&&S!=null)return X("span","gp-job-meta",I0(T.duration));if(T.status==="running")return X("span","gp-job-meta","running");return X("span","gp-job-meta",z0(T).label.toLowerCase())}renderStage(T,_,S){let x=X("div","gp-stage"),U=X("div","gp-stage-head");U.append(X("span","gp-stage-name",S.stage),X("span","gp-stage-count",`${S.done}/${S.total}`),X("span","gp-stage-line")),x.append(U);for(let G of S.jobs){let E=X("div","gp-job");if(E.tabIndex=0,E.setAttribute("role","button"),this.openJob?.project===T&&this.openJob.jobId===G.id)E.dataset.selected="true";if(E.setAttribute("aria-label",`${G.name}, ${z0(G).label}`),E.append(g0(z0(G),13),X("span","gp-job-name",G.name)),E.append(this.jobMeta(G)),E.addEventListener("click",()=>this.openJobDrawer(T,_,G.id)),E.addEventListener("keydown",(z)=>{if(z.target!==E)return;if(z.key==="Enter"||z.key===" ")z.preventDefault(),this.openJobDrawer(T,_,G.id)}),q0(G)&&this.canHandoffJob(T))E.append(this.renderHandoffAction(T,_,G));x.append(E)}for(let G of S.triggers)x.append(this.renderTriggerRow(T,_,G));return x}renderTriggerRow(T,_,S){let x=YT(S.state,S.status),U=X("div","gp-job gp-trigger");if(U.dataset.trigger="true",U.append(g0(x,13),X("span","gp-job-name",S.name)),U.append(X("span","gp-job-meta",x.label.toLowerCase())),!S.downstream)return U;let G=this.renderDownstreamCard(T,_,S),E=X("div","gp-trigger-wrap");return E.append(U,G),E}renderDownstreamCard(T,_,S,x){let U=S.downstream,G=X("div","gp-downstream-card");if(!U)return G;G.append(X("div","gp-downstream-label",W1(U,T)));let E=X("div","gp-downstream-meta");if(E.append(g0(i(U.status),13)),E.append(X("span","gp-ref",U.ref||"—")),E.append(X("span","gp-sha",M0(U.sha))),E.append(X("span","gp-downstream-iid",`#${U.iid}`)),G.append(E),U.web_url)G.append(this.renderExternalLink("gp-jobs-link","View pipeline in GitLab",U.web_url));let z=V1(U),M=x??this.nodeFor(T,_),Y=z??"";if(z&&this.nodeFor(Y,U.id)){let B=this.bridges.get(N(Y,U.id));G.append(this.renderJobsBody(Y,U.id,B,"downstream")),this.renderNestedTriggerCards(G,Y,U.id,M)}else{let B=z!=null&&this.cardCanExpand(T,_,U.id,Y,M),b=X("button","gp-downstream-open");if(b.type="button",b.textContent=B?"Show jobs":"Continue in GitLab",b.setAttribute("aria-label",`${b.textContent} — ${W1(U,T)}`),b.addEventListener("click",(p)=>{if(p.stopPropagation(),B)this.toggleDownstream(T,_,Y,U.id);else if(U.web_url)this.port.openUrl(U.web_url)}),G.append(b),!B&&!U.web_url)b.disabled=!0}return G}nodeFor(T,_){return this.downstreamPath.find((S)=>S.pipelineId===_&&G0(S.project,T))}renderNestedTriggerCards(T,_,S,x){let U=this.bridges.get(N(_,S));if(!Array.isArray(U))return;for(let G of U)if(G.downstream)T.append(this.renderDownstreamCard(_,S,G,x))}cardCanExpand(T,_,S,x,U){let G=U?.generation??0;if(!zT(G))return!1;let E={project:x,pipelineId:S};for(let z of this.openPathFor(T,_,U))if(z.project===E.project&&z.pipelineId===E.pipelineId)return!1;return!0}openPathFor(T,_,S){let x={project:T,pipelineId:_};if(S)return[...S.ancestors,x];return[{project:this.resolved?.project??"",pipelineId:this.expandedId??-1},x]}toggleDownstream(T,_,S,x){let U=this.nodeFor(T,_),G=U?this.downstreamPath.indexOf(U):-1,E=U?this.downstreamPath.slice(0,G+1):[],z=(U?.generation??0)+1,M=[...U?.ancestors??[],{project:T,pipelineId:_}],Y={project:S,pipelineId:x,generation:z,ancestors:M};this.downstreamPath=[...E,Y],this.openJob=null;let B=N(S,x);if(!Array.isArray(this.jobs.get(B)))this.loadJobs(this.generation,S,x,!1);if(!Array.isArray(this.bridges.get(B)))this.loadBridges(this.generation,S,x,!1);this.render()}renderHandoffAction(T,_,S){let x=X("button","gp-handoff");x.type="button";let U=this.handoffJobId===S.id,G=this.canHandoff();if(x.disabled=!G||U,x.textContent=U?"Starting…":"Start session",x.title=G?"Start a session for this failed job":this.directory==null?"Open a project to start a session — a session needs a checkout to fix.":"This project could not be resolved, so a session cannot be started.",x.setAttribute("aria-label",`${x.textContent} — ${S.name}`),G&&!U)x.addEventListener("click",(E)=>{E.stopPropagation(),this.startHandoff(T,_,S.id)});return x}renderHealNotice(){if(!this.healNotice)return null;let T=this.effectiveHost(),{from:_,to:S}=this.healNotice,x=X("div","gp-notice");x.setAttribute("role","status"),x.append(X("span","gp-notice-text",`Showing ${T}/${_} as ${T}/${S}.`));let U=X("button","gp-notice-close");return U.type="button",U.textContent="Dismiss",U.addEventListener("click",()=>{this.healNotice=null,this.render()}),x.append(U),x}renderHandoffNotice(){if(!this.handoffError)return null;let T=X("div","gp-notice");T.setAttribute("role","alert"),T.append(X("span","gp-notice-text",this.handoffError));let _=X("button","gp-notice-close");return _.type="button",_.textContent="Dismiss",_.addEventListener("click",()=>this.finishHandoff(null)),T.append(_),T}renderDrawer(T){let _=X("div","gp-drawer"),S=this.jobById(T.project,T.pipelineId,T.jobId),x=X("div","gp-drawer-head"),U=X("span","gp-drawer-title",S?`${S.name} · ${z0(S).label}`:`Job #${T.jobId}`);if(x.append(U),S?.web_url)x.append(this.renderExternalLink("gp-drawer-link","View full log in GitLab",S.web_url));if(S&&q0(S)&&this.canHandoffJob(T.project))x.append(this.renderHandoffAction(T.project,T.pipelineId,S));let G=X("button","gp-drawer-close");G.type="button",G.setAttribute("aria-label","Close log"),G.title="Close",G.innerHTML=L_,G.addEventListener("click",()=>this.closeDrawer()),x.append(G),_.append(x);let E=this.traces.get(Y0(T.project,T.jobId));if(!E)return this.drawerEl=null,_.append(X("div","gp-drawer-empty","Loading log…")),_;if(E.state==="missing")return this.drawerEl=null,_.append(X("div","gp-drawer-empty","No log output yet — the job has not started.")),_;if(E.state==="error")return this.drawerEl=null,_.append(X("div","gp-drawer-empty","Could not load the log. Close and reopen to retry.")),_;if(E.truncated)_.append(I_(E.truncated));let z=X("pre","gp-drawer-body");return z.textContent=w0(E.text,Z0).join(`
`),z.addEventListener("scroll",()=>{this.drawerScrollTop=z.scrollTop,this.followTail=K_(z)}),this.drawerEl=z,_.append(z),_}renderFooter(){let T=X("div","gp-foot");if(T.append(X("span","","Read-only")),this.isCustomHost())T.append(X("span","gp-foot-host",`Custom host: ${this.effectiveHost()}`));return T}}function g0(T,_){let S=X("span","gp-icon");if(T.tone!=="neutral")S.dataset.tone=T.tone;if(T.animate)S.dataset.animate="true";if(T.muted)S.dataset.muted="true";S.setAttribute("role","img"),S.setAttribute("aria-label",T.label);let x=X("span","gp-icon-svg");return x.innerHTML=`<svg viewBox="0 0 24 24" width="${_}" height="${_}" aria-hidden="true" fill="currentColor">${OT[T.glyph]??OT.dot}</svg>`,S.append(x),S}function K_(T,_=24){return T.scrollHeight-T.scrollTop-T.clientHeight<=_}function LT(T){let _=T.trim();if(!_)return null;if(_.includes("://")){if(_.slice(0,_.indexOf("://")).toLowerCase()!=="https")return null;let x;try{x=new URL(_)}catch{return null}if(x.username||x.password)return null;if(x.pathname!=="/"&&x.pathname!=="")return null;if(x.search||x.hash)return null;return x.origin}if(!/^[a-z0-9.-]+(:\d+)?$/i.test(_))return null;return`https://${_}`}function R_(T,_){let S;try{S=new URL(T)}catch{return null}if(S.host!==_)return null;let U=/^\/api\/v4\/projects\/(.+?)\/?$/.exec(S.pathname)?.[1];if(!U)return null;try{return decodeURIComponent(U)}catch{return null}}function h0(T){return T.replace(/^https:\/\//,"").replace(/\/+$/,"")}function P_(T){try{let _=JSON.parse(T.body);if(typeof _.status==="number")return{status:_.status,body:_.body??""};if(_.error)throw Error(_.error)}catch(_){if(_ instanceof SyntaxError);else throw _}return{status:T.status,body:T.body}}function N_(T){if(T.length>=b1)return"host";if(F1(T).length>Z0)return"cap";return null}function KT(T){return T.trim()?{state:"ready",text:T,truncated:N_(T)}:{state:"missing",text:"",truncated:null}}function I_(T){let _=X("div","gp-drawer-notice");return _.textContent=T==="host"?"GitLab returned a capped log. View the full log in GitLab.":`Older lines not shown (last ${Z0} lines). View the full log in GitLab.`,_}function H_(T){if(T==="no-model")return"No model is selected in OpenChamber, so the session got no message.";if(T==="skipped")return"OpenChamber skipped the message. Open a project and try again.";return"OpenChamber could not start the session."}function b_(T){let _=[`#${T.iid}`,i(T.status).label];if(T.merge_request?.iid!=null)_.push(`!${T.merge_request.iid}`);else if(T.tag)_.push("tag");else if(T.name)_.push(T.name);if(T.source&&T.source!=="push")_.push(T.source.replace(/_/g," "));return _.join(" · ")}function RT(T,_){switch(T.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"linked-worktree":{let S={kind:"linked-worktree",title:"Linked worktree",body:"This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.",hint:"Set the “Project” setting to this worktree’s GitLab project path to read its pipelines."};if(T.detectedRef)S.detail=`Current ref: ${T.detectedRef}`;return S}case"host-mismatch":return{kind:"host-mismatch",title:"Different GitLab host",body:`This remote points at ${T.detectedHost}, but this extension only talks to ${_}.`,detail:T.detectedPath?`${T.detectedHost}/${T.detectedPath}`:T.detectedHost,hint:"Set the “Project” setting to a project path on this extension’s GitLab host."}}}function NT(T){return{kind:"disconnected",title:"GitLab not connected",body:`No personal access token is stored for ${T}. Connect one to read pipelines.`}}function w_(T,_){return{kind:"moved",title:"Project moved",body:`This project's path no longer resolves; GitLab has moved it to ${T}.`,hint:"Update the git remote or the Project setting, then refresh.",..._?{action:{label:"Open in GitLab",url:_}}:{}}}function m_(T){return{kind:"redirected",title:"GitLab redirected this request",body:"GitLab answered with a redirect this extension could not follow. The project may have moved, or the session may have expired.",hint:"Check the GitLab host and the Project setting, then refresh.",...T?{action:{label:"Open in GitLab",url:T}}:{}}}function y_(T,_){if(T.kind==="disconnected")return NT(_);if(T.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored token cannot read this project. A personal access token with the read_api scope is required."};if(T.kind==="service")return{kind:"service",title:"Proxy service unavailable",body:"The local proxy that reaches a custom GitLab host is not running. It may not be granted yet, or it failed to start.",hint:"Open Settings → Extensions and allow this extension’s service, then refresh."};return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the token cannot see it."}}function q_(T){return{kind:"custom-token",title:"No token for this host",body:`The Panel reaches ${T} through the proxy service and needs a personal access token for it.`,hint:"Set the “Access token” setting to a personal access token with the read_api scope."}}function g_(T){return{kind:"custom-host",title:"Invalid GitLab host",body:`“${T}” is not a usable host. Enter a bare host like gitlab.example.com, or a full https:// origin.`,hint:"Fix the “GitLab host” setting, or clear it to use the built-in instance."}}function IT(T,_,S){return new PT(T,_,{...S,apiOrigin:S.apiOrigin||Q0}).start()}var HT=`
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
.gp-brand-mark { display: inline-flex; color: var(--oc-fg, CanvasText); }
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
.gp-jobs-body { display: flex; flex-direction: column; gap: 6px; }
.gp-jobs-link { align-self: flex-start; color: var(--oc-primary-text, #9db8f5); text-decoration: none; font-size: 0.6875rem; }
.gp-jobs-link:hover { text-decoration: underline; }

.gp-downstream-badge {
  flex: 0 0 auto;
  color: var(--oc-muted, GrayText);
  font-size: 0.6875rem;
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
  border-radius: var(--oc-radius, 6px);
  background: var(--oc-muted-surface, var(--oc-subtle, transparent));
}
.gp-downstream-label { font-weight: 600; font-size: 0.75rem; }
.gp-downstream-meta { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.gp-downstream-iid { flex: 0 0 auto; color: var(--oc-muted, GrayText); font-size: 0.6875rem; }
.gp-downstream-open {
  align-self: flex-start;
  padding: 2px 7px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 6px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.6875rem;
  white-space: nowrap;
  cursor: pointer;
}
.gp-downstream-open:hover:not([disabled]) { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); }
.gp-downstream-open[disabled] { color: var(--oc-muted, GrayText); opacity: 0.6; cursor: default; }
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

.gp-handoff {
  flex: 0 0 auto;
  padding: 2px 7px;
  border: 1px solid var(--oc-border, rgba(127, 127, 127, 0.35));
  border-radius: var(--oc-radius, 6px);
  background: transparent;
  color: var(--oc-primary-text, #9db8f5);
  font-size: 0.6875rem;
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
  font-size: 0.6875rem;
}
.gp-notice-text { flex: 1 1 auto; }
.gp-notice-close {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: var(--oc-radius, 6px);
  background: transparent;
  color: var(--oc-muted, GrayText);
  cursor: pointer;
}
.gp-notice-close:hover { background: var(--oc-hover, rgba(127, 127, 127, 0.15)); color: var(--oc-fg, CanvasText); }

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
`;function h_(T){let _=document.createElement("style");_.textContent=T,document.head.append(_)}var bT=document.getElementById("root");if(bT){h_(HT);let T=ST(),_=IT(bT,T,{apiOrigin:Q0});window.addEventListener("beforeunload",()=>_.dispose())}})();
