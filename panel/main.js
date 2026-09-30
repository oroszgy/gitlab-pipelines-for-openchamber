(()=>{var OT="gitlab-pipelines",X0="https://sdlc.webcloud.ec.europa.eu",JT=20,KT="/proxy",M0=20000,BT=256000,LT=5000,PT=1000;var Q="openchamber.sdk",Z=1;var y0=`
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
`;function H0(T){let S=T.documentElement;if(S.hasAttribute("data-oc-scrollbar-activity"))return;S.setAttribute("data-oc-scrollbar-activity","");let _=new WeakMap;T.addEventListener("scroll",(U)=>{let f=U.target===T?S:U.target;if(!(f instanceof Element))return;if(!f.hasAttribute("data-oc-scrolling"))f.setAttribute("data-oc-scrolling","");let A=_.get(f);if(A!==void 0)clearTimeout(A);_.set(f,setTimeout(()=>{_.delete(f),f.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var J1=`(${H0.toString()})(document);`;var c0=128,j0=65536;var IT=["file","directory","other","missing"],h0=(T)=>Boolean(T&&"sessionId"in T),d0=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var wT=/^[0-9a-f]{7,64}$/i,v0=(T)=>wT.test(T),k0=500,z0=32000,NT=16000,bT=128,mT=200,gT=2000,U0=16000,yT=80,HT=200,cT=16000;var jT=2000;var p0=20000,Y0=1024,$0=2000000;var Q0=64000,Z0=8000,o0=4000;var n0=90000;var qT=999,hT=1e4,D0=500,dT=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],vT=["stopped","starting","ready","failed"],K1=new Set(dT),pT=(T)=>K1.has(T),oT=(T)=>T&&pT(T)?T:"HOST_REJECTED",u=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(u);if(Object(T)===T)return Object.values(T).every(u);return!1},nT=(T)=>u(T)&&JSON.stringify(T).length<=cT,RT=(T)=>T?.trim().slice(0,HT)??"",r=(T)=>{let S=T.id.trim().slice(0,bT),_=T.title.trim().slice(0,mT),U=T.url.trim().slice(0,gT),f=T.text?.trim().slice(0,U0),A=T.author?.trim().slice(0,yT),X=T.kind==="pull"?"pull":"issue",M={providerId:T.providerId.trim(),id:S,title:_||S,url:U,kind:X};if(f)M.text=f;if(A)M.author=A;if(X==="pull"){let k=RT(T.branches?.head),z=RT(T.branches?.base);if(k&&z)M.branches={head:k,base:z}}if(nT(T.data))M.data=T.data;return M},a0=(T)=>{let S=r(T);if(T.projectId)S.projectId=T.projectId;if(T.navigation)S.navigation=T.navigation;if(T.worktree)S.worktree=T.worktree;return S},l0=(T)=>{let S={text:T.text.trim().slice(0,NT)};if(T.send)S.send=!0;return S},u0=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(qT,Math.max(0,Math.round(T)))},r0=(T)=>{if(!Number.isFinite(T))return 0;return Math.min(hT,Math.max(0,Math.ceil(T)))};var i=(T)=>T.length>0&&T.length<=Y0&&!T.includes("\x00")&&!T.includes("\\");var C0=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>jT)return!1;return!T.split("/").some((_)=>_==="."||_==="..")},B1=new Set(vT),i0=(T)=>Boolean(T&&"status"in T&&B1.has(String(T.status))&&!("body"in T)),W0=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),s0=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),t0=(T)=>Boolean(T&&"written"in T&&T.written===!0),e0=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),L1=new Set(IT),TT=(T)=>Boolean(T&&"kind"in T&&"size"in T&&L1.has(String(T.kind))&&Number.isFinite(T.size)),ST=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),P1=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),R1=(T)=>Object(T)===T?T:null,q0=(T)=>String(T)===T&&T.length>0,I1=(T)=>{if(!q0(T.id))return null;if(T.ok===!0){let S={channel:Q,v:Z,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)S.payload=T.payload;return S}if(T.ok===!1&&q0(T.error))return{channel:Q,v:Z,type:"result",id:T.id,ok:!1,error:T.error,code:oT(q0(T.code)?T.code:void 0)};return null},_T=(T)=>{let S=R1(T);if(!S||S.channel!==Q||S.v!==Z)return null;if(S.type==="result")return I1(S);if(!P1.has(String(S.type))||Object(S.payload)!==S.payload)return null;return S};class Y extends Error{code;constructor(T,S){super(S);this.name="HostRequestError",this.code=T}}var aT=()=>Promise.reject(new Y("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),F0=()=>Promise.reject(new Y("BAD_PATH",`File path must be 1 to ${Y0} characters without NUL or backslash.`)),C=(T)=>{return T.value+=1,`oc-${T.value}`},UT=(T={})=>{let S=T.target??("window"in globalThis?window:null);if(!S)throw new Y("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let _=T.acceptSource??((x)=>x===S.parent),U=T.requestTimeoutMs??p0,f=new Set,A=new Set,X=new Set,M=new Set,k=new Set,z=new Set,m=new Set,T0=null,S0=null,a=new Map,l=new Map,_0=!1,D={value:0},W=null,c=null,FT=(x)=>{if(!x)return null;return{sessionId:x.id,phase:x.busy?"started":"completed"}},h=(x)=>{S.parent.postMessage(x,"*")},I=(x,G)=>{for(let $ of x)try{$(G)}catch(O){console.error(O)}},VT=(x)=>{if(!(x instanceof MessageEvent))return;if(!_(x.source))return;let G=_T(x.data);if(!G)return;if(G.type==="workspace"){let O=l.get(G.payload.subscriptionId);if(O)I([O],G.payload.snapshot);return}if(G.type==="ready"){if(W=G.payload,c=FT(G.payload.session),I(f,G.payload),I(A,G.payload.directory),I(X,G.payload.session),c)I(M,c);I(k,G.payload.connection),I(z,G.payload.settings),I(m,G.payload.item);return}if(G.type==="directory"){if(W)W={...W,directory:G.payload.directory};I(A,G.payload.directory);return}if(G.type==="session"){if(W)W={...W,session:G.payload.session};if(!G.payload.session)c=null;else if(c?.sessionId!==G.payload.session.id)c=FT(G.payload.session);I(X,G.payload.session);return}if(G.type==="session-lifecycle"){c=G.payload,I(M,G.payload);return}if(G.type==="connection"){if(W)W={...W,connection:G.payload.connection};I(k,G.payload.connection);return}if(G.type==="settings"){if(W)W={...W,settings:G.payload.settings};I(z,G.payload.settings);return}if(G.type==="item"){if(W)W={...W,item:G.payload.item};I(m,G.payload.item);return}if(G.type==="action"){let O=(P)=>{if(!_0)h({channel:Q,v:Z,type:"action-result",id:G.id,payload:P})},y=S0;if(!y){O({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(G.payload)).then(()=>O({ok:!0}),(P)=>{let g0=(P instanceof Error?P.message:String(P)).trim();O({ok:!1,error:(g0||"Action failed.").slice(0,D0)})});return}if(G.type==="resolve"){let O=(P)=>{h({channel:Q,v:Z,type:"resolve-result",id:G.id,payload:P})},y=T0;if(!y){O({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(G.payload)).then((P)=>O({item:P?r(P):null}),(P)=>{let g0=(P instanceof Error?P.message:String(P)).trim();O({error:(g0||"Command failed.").slice(0,D0)})});return}let $=a.get(G.id);if(!$)return;if(clearTimeout($.timer),a.delete(G.id),G.ok){$.resolve(G.payload);return}$.reject(new Y(G.code,G.error))};S.addEventListener("message",VT),h({channel:Q,v:Z,type:"hello"});let w=(x,G=U)=>{if(_0||S.parent===S)return Promise.reject(new Y("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise(($,O)=>{let y=setTimeout(()=>{a.delete(x.id),O(new Y("HOST_TIMEOUT","Host did not answer in time."))},G);a.set(x.id,{resolve:$,reject:O,timer:y}),h(x)})},R=(x)=>w(x).then(()=>{return}),d={channel:Q,v:Z},v=(x,G=1024)=>{if(!x.trim()||x.length>G)throw new Y("HOST_REJECTED",`Identity must contain 1 to ${G} characters.`)},b0=async(x)=>{if(x.kind!=="projects")v(x.projectId);let G=await w({...d,type:"workspace-read",id:C(D),payload:x});if(!G||!("kind"in G)||!("state"in G)||G.kind!==x.kind)throw new Y("HOST_REJECTED","Host did not return workspace data.");return G},m0=async(x,G)=>{if(x.kind!=="projects")v(x.projectId);let $=C(D);l.set($,G);try{await R({...d,type:"workspace-subscribe",id:C(D),payload:{subscriptionId:$,query:x}})}catch(O){if(l.delete($),!_0)h({...d,type:"workspace-unsubscribe",id:C(D),payload:{subscriptionId:$}});throw O}return()=>{if(!l.delete($)||_0)return;h({...d,type:"workspace-unsubscribe",id:C(D),payload:{subscriptionId:$}})}},E0=async(x)=>{if("key"in x&&(x.key.length===0||x.key.length>c0))throw new Y("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(x.op==="set"&&!u(x.value))throw new Y("HOST_REJECTED","Storage values must be JSON.");if(x.op==="set"&&new TextEncoder().encode(JSON.stringify(x.value)).length>j0)throw new Y("HOST_REJECTED","Storage value exceeds 64 KiB.");let G=await w({...d,type:"storage",id:C(D),payload:x});if(!G||!("storage"in G)||G.op!==x.op)throw new Y("HOST_REJECTED","Host did not return storage data.");return G};return{onAction:(x)=>{return S0=x,()=>{if(S0===x)S0=null}},listProjects:async()=>{let x=await b0({kind:"projects"});if(x.kind!=="projects")throw new Y("HOST_REJECTED","Expected projects.");return x},listWorktrees:async(x)=>{let G=await b0({kind:"worktrees",projectId:x});if(G.kind!=="worktrees")throw new Y("HOST_REJECTED","Expected worktrees.");return G},listSessions:async(x)=>{let G=await b0({kind:"sessions",projectId:x});if(G.kind!=="sessions")throw new Y("HOST_REJECTED","Expected sessions.");return G},onProjects:(x)=>m0({kind:"projects"},(G)=>{if(G.kind==="projects")x(G)}),onWorktrees:(x,G)=>m0({kind:"worktrees",projectId:x},($)=>{if($.kind==="worktrees")G($)}),onSessions:(x,G)=>m0({kind:"sessions",projectId:x},($)=>{if($.kind==="sessions")G($)}),openSession:async(x)=>{v(x),await R({...d,type:"open-session",id:C(D),payload:{sessionId:x}})},storage:{get:async(x)=>{let G=await E0({op:"get",key:x});return G.op==="get"&&G.found?G.value:void 0},set:async(x,G)=>{await E0({op:"set",key:x,value:G})},delete:async(x)=>{await E0({op:"delete",key:x})},keys:async()=>{let x=await E0({op:"keys"});if(x.op!=="keys")throw new Y("HOST_REJECTED","Expected storage keys.");return x.keys}},onReady:(x)=>{if(f.add(x),W)x(W);return()=>{f.delete(x)}},onDirectory:(x)=>{if(A.add(x),W)x(W.directory);return()=>{A.delete(x)}},onSession:(x)=>{if(X.add(x),W)x(W.session);return()=>{X.delete(x)}},onSessionLifecycle:(x)=>{if(M.add(x),c)x(c);return()=>{M.delete(x)}},onConnection:(x)=>{if(k.add(x),W)x(W.connection);return()=>{k.delete(x)}},onSettings:(x)=>{if(z.add(x),W)x(W.settings);return()=>{z.delete(x)}},onItem:(x)=>{if(m.add(x),W)x(W.item);return()=>{m.delete(x)}},onResolve:(x)=>{return T0=x,()=>{if(T0===x)T0=null}},toast:(x)=>{let G=x.message.trim();if(!G||G.length>k0)return Promise.reject(new Y("HOST_REJECTED",`Toast message must contain 1 to ${k0} characters.`));if(x.copy&&x.copy!==!0&&(!x.copy.text.length||x.copy.text.length>z0))return Promise.reject(new Y("HOST_REJECTED",`Toast copy text must contain 1 to ${z0} characters.`));return R({channel:Q,v:Z,type:"toast",id:C(D),payload:{...x,message:G}})},openUrl:(x)=>R({channel:Q,v:Z,type:"open-url",id:C(D),payload:{url:x}}),openCommit:(x)=>v0(x)?R({channel:Q,v:Z,type:"open-commit",id:C(D),payload:{sha:x}}):Promise.reject(new Y("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(x)=>R({channel:Q,v:Z,type:"open-surface",id:C(D),payload:{surfaceId:x}}),writeClipboard:(x)=>R({channel:Q,v:Z,type:"clipboard-write",id:C(D),payload:{text:x}}),compose:(x)=>R({channel:Q,v:Z,type:"compose",id:C(D),payload:x}),attach:(x)=>R({channel:Q,v:Z,type:"attach",id:C(D),payload:r(x)}),startSession:async(x)=>{if(x.projectId!==void 0)v(x.projectId);let G=x.worktree;if(G&&G!==!0)if(G.kind==="existing")v(G.directory);else{if(G.name!==void 0)v(G.name,200);if(G.baseBranch!==void 0)v(G.baseBranch,200)}let $=await w({channel:Q,v:Z,type:"start-session",id:C(D),payload:a0(x)},T.requestTimeoutMs??180000);if(!h0($))throw new Y("HOST_REJECTED","Host did not return a session.");return $},prompt:(x)=>w({channel:Q,v:Z,type:"prompt",id:C(D),payload:l0(x)}).then((G)=>{if(!d0(G))throw new Y("HOST_REJECTED","Host did not return a prompt result.");return G}),sessionLink:(x)=>R({channel:Q,v:Z,type:"session-link",id:C(D),payload:r(x)}),close:()=>R({channel:Q,v:Z,type:"close",id:C(D)}),oauthStart:()=>R({channel:Q,v:Z,type:"oauth-start",id:C(D)}),oauthDisconnect:()=>R({channel:Q,v:Z,type:"oauth-disconnect",id:C(D)}),request:(x)=>(C0(x.path)?w({channel:Q,v:Z,type:"request",id:C(D),payload:x}):aT()).then((G)=>{if(!W0(G))throw new Y("HOST_REJECTED","Host request result was empty.");return G}),serviceRequest:(x)=>(C0(x.path)?w({channel:Q,v:Z,type:"service-request",id:C(D),payload:x}):aT()).then((G)=>{if(!W0(G))throw new Y("HOST_REJECTED","Host service request result was empty.");return G}),serviceStatus:()=>w({channel:Q,v:Z,type:"service-status",id:C(D)}).then((x)=>{if(!i0(x))throw new Y("HOST_REJECTED","Host did not return service status.");return x}),readFile:(x)=>(i(x)?w({channel:Q,v:Z,type:"file-read",id:C(D),payload:{path:x}}):F0()).then((G)=>{if(!s0(G))throw new Y("HOST_REJECTED","Host did not return file content.");return G}),writeFile:(x,G)=>{if(!i(x))return F0();if(G.length>$0)return Promise.reject(new Y("FILE_TOO_LARGE",`Content is over ${$0} characters.`));return w({channel:Q,v:Z,type:"file-write",id:C(D),payload:{path:x,content:G}}).then(($)=>{if(!t0($))throw new Y("HOST_REJECTED","Host did not confirm the write.");return $})},listDir:(x)=>(i(x)?w({channel:Q,v:Z,type:"file-list",id:C(D),payload:{path:x}}):F0()).then((G)=>{if(!e0(G))throw new Y("HOST_REJECTED","Host did not return directory entries.");return G}),stat:(x)=>(i(x)?w({channel:Q,v:Z,type:"file-stat",id:C(D),payload:{path:x}}):F0()).then((G)=>{if(!TT(G))throw new Y("HOST_REJECTED","Host did not return file status.");return G}),generate:(x)=>{let G=x.prompt.trim(),$=x.system?.trim();if(G.length===0||G.length>Q0)return Promise.reject(new Y("HOST_REJECTED",`Prompt must be 1 to ${Q0} characters.`));if($!==void 0&&($.length===0||$.length>Z0))return Promise.reject(new Y("HOST_REJECTED",`System prompt must be 1 to ${Z0} characters.`));let O=x.maxOutputTokens===void 0?void 0:Math.min(o0,Math.max(1,Math.floor(x.maxOutputTokens)));if(O!==void 0&&!Number.isFinite(O))return Promise.reject(new Y("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:G};if($!==void 0)y.system=$;if(O!==void 0)y.maxOutputTokens=O;return w({channel:Q,v:Z,type:"generate",id:C(D),payload:y},T.requestTimeoutMs??n0).then((P)=>{if(!ST(P))throw new Y("HOST_REJECTED","Host did not return generated text.");return P})},setBadge:(x)=>R({channel:Q,v:Z,type:"badge",id:C(D),payload:{count:u0(x)}}),setHeight:(x)=>R({channel:Q,v:Z,type:"resize",id:C(D),payload:{height:r0(x)}}),dispose:()=>{for(let x of l.keys())h({...d,type:"workspace-unsubscribe",id:C(D),payload:{subscriptionId:x}});l.clear(),_0=!0,T0=null,S0=null,S.removeEventListener("message",VT);for(let x of a.values())clearTimeout(x.timer),x.reject(new Y("HOST_UNAVAILABLE","Host client was disposed."));a.clear(),f.clear(),A.clear(),X.clear(),M.clear(),k.clear(),z.clear(),m.clear()}}};var lT=["browser.open","browser.snapshot","browser.click","browser.type","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize"];var bS=new Set(lT);var uT=["none","agent","user"];var gS=new Set(uT);function rT(){let T=UT();return{request:(S)=>T.request({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),serviceRequest:(S)=>T.serviceRequest({method:S.method??"GET",path:S.path,...S.query?{query:S.query}:{},...S.body!=null?{body:S.body}:{}}),readFile:(S)=>T.readFile(S),listProjects:()=>T.listProjects(),listWorktrees:(S)=>T.listWorktrees(S),startSession:(S)=>T.startSession(S),openUrl:(S)=>T.openUrl(S),onReady:(S)=>T.onReady(S),onConnection:(S)=>T.onConnection(S),dispose:()=>T.dispose()}}var w1=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],iT=(T,S)=>{S.style.colorScheme=T.mode;for(let[_,U]of w1)S.style.setProperty(_,T.tokens[U]);S.style.setProperty("font-family",T.tokens.font),S.style.setProperty("font-size","0.875rem"),S.style.setProperty("line-height","1.45"),S.style.setProperty("color",T.tokens.foreground)},xT=(T,S)=>{if(iT(T.theme,S),S.dataset)S.dataset.ocSurface=T.surface,S.dataset.ocTheme=T.theme.mode};var sT="oc-sdk-ui-style",s=(T)=>{while(T.firstChild)T.removeChild(T.firstChild)},B=(T)=>{let S=document.getElementById(sT);if(S instanceof HTMLStyleElement){if(S.textContent!==T)S.textContent=T;return}H0(document);let _=document.createElement("style");_.id=sT,_.textContent=T,document.head.appendChild(_)},V=(T,S)=>{let _=document.createElement(T);if(S)_.className=S;return _},j=(T)=>{let S=V("button",T);return S.type="button",S},N=(T,S)=>{let _=S??"";if(T.textContent!==_)T.textContent=_};var N1={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},F=(T,S)=>`var(--${T}, var(--oc-${N1[T]}, ${S}))`,p=F("surface-background","transparent"),V0=F("surface-elevated","transparent"),x0=F("surface-elevated-foreground","inherit"),f0=F("surface-foreground","inherit"),J=F("surface-muted-foreground","gray"),b1=F("surface-muted","transparent"),g=F("interactive-border","currentColor"),b=F("interactive-hover","transparent"),o=F("interactive-active","transparent"),fT=F("interactive-selection","transparent"),GT=F("interactive-selection-foreground","inherit"),T1=F("interactive-focus-ring","currentColor"),H=F("primary","currentColor"),AT=F("primary-text","inherit"),ET=F("error-text","inherit"),m1=F("font-sans","inherit"),XT=F("font-mono","monospace"),tT=F("radius","9px"),K=(T,S,_="transparent")=>`color-mix(in srgb, ${T} ${S}%, ${_})`,eT=`box-shadow: 0 0 0 2px ${T1};`,O0=(T)=>{let S=F(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${S}; --oc-sdk-tone-text: ${F(`${T}-text`,"inherit")}; }`},L=`
${y0}
.oc-sdk { box-sizing: border-box; color: ${f0}; font-family: ${m1}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${eT} }
.oc-sdk-mono { font-family: ${XT}; }
.oc-sdk-muted { color: ${J}; }
${O0("success")}${O0("warning")}${O0("error")}${O0("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${H}; --oc-sdk-tone-text: ${AT}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${tT}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${AT}; background: ${K(H,10,p)}; border-color: ${K(H,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${K(H,16,p)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${K(H,22,p)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${b1}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${b}, ${b}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="outline"] { background: ${V0}; color: ${x0}; border-color: ${g}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${b}, ${b}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${b}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${o}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${F("status-error","red")}; color: ${ET}; background: ${K("var(--oc-sdk-tone)",7,p)}; border-color: ${K("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${K("var(--oc-sdk-tone)",9,p)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${K("var(--oc-sdk-tone)",11,p)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${J}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${ET}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${tT}; background: ${V0}; color: ${x0}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${K(g,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${J}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${b}, ${b}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${T1}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${F("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${F("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${XT}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${J}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${H}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${J}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${b}; color: ${f0}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${g}; border-radius: 6px; background: ${V0}; color: ${x0}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${b}, ${b}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${o}, ${o}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${J}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${J}; }
.oc-sdk-popup { --surface-foreground: ${x0}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${K(g,60)}; border-radius: 12px; background: ${V0}; color: ${x0}; box-shadow: 0 8px 24px ${K(f0,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${b}; }
.oc-sdk-option[aria-selected="true"] { background: ${fT}; color: ${GT}; }
.oc-sdk-option[data-destructive="true"] { color: ${ET}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${K(F("status-error","red"),10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${J}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${J}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${g}; border-radius: 4px; color: ${H}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${K(H,65,g)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${g}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${p}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${H}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${eT} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${J}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${K(f0,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${J}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${f0}; }
.oc-sdk-tab[aria-selected="true"] { color: ${GT}; background: ${fT}; border-color: ${g}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${J}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${b}; color: ${J}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${K("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${b}; }
.oc-sdk-row[aria-selected="true"] { background: ${fT}; color: ${GT}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${XT}; font-size: 0.75rem; color: ${J}; }
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
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${g}; border-top-color: ${H}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${K("var(--oc-sdk-tone)",40)}; border-radius: 8px; background: ${K("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${J}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${J}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${K(g,40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${J}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${g}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${H}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${AT}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${K(g,60)}; }
`;var g1=()=>{let T=document.createElement("span");return T.className="oc-sdk-spinner-ring",T.setAttribute("aria-hidden","true"),T},q=(T,S)=>{B(L);let _=S,U=j("oc-sdk oc-sdk-btn"),f=g1(),A=document.createElement("span");U.append(A),T.append(U);let X=()=>{if(U.dataset.variant=_.variant??"default",U.dataset.size=_.size??"default",U.disabled=Boolean(_.disabled)||Boolean(_.loading),U.dataset.loading=_.loading?"true":"false",U.setAttribute("aria-busy",_.loading?"true":"false"),_.loading&&f.parentNode!==U)U.prepend(f);else if(!_.loading&&f.parentNode===U)f.remove();N(A,_.label)},M=()=>{if(_.disabled||_.loading)return;_.onClick()};return U.addEventListener("click",M),X(),{update:(k)=>{_={..._,...k},X()},dispose:()=>{U.removeEventListener("click",M),U.remove()}}};var t=(T,S="vertical")=>{let[_,U]=S==="vertical"?["ArrowDown","ArrowUp"]:["ArrowRight","ArrowLeft"];if(T.key===_||T.ctrlKey&&T.key.toLowerCase()==="n")return"next";if(T.key===U||T.ctrlKey&&T.key.toLowerCase()==="p")return"previous";if(T.key==="Home")return"first";if(T.key==="End")return"last";return null},e=(T,S,_)=>{let U=T.filter((k)=>!k.disabled);if(U.length===0)return null;let f=U[0],A=U[U.length-1];if(_==="first"||!f||!A)return f?.id??null;if(_==="last")return A.id;let X=U.findIndex((k)=>k.id===S);if(X===-1)return _==="next"?f.id:A.id;return U[Math.min(U.length-1,Math.max(0,X+(_==="next"?1:-1)))]?.id??null};var MT=(T,S)=>{B(L);let _=S,U=V("div","oc-sdk oc-sdk-tabs");U.setAttribute("role","tablist"),T.append(U);let f=()=>{s(U),U.dataset.track=_.trackBackground?"true":"false";for(let X of _.items){let M=j("oc-sdk-tab");M.setAttribute("role","tab");let k=X.id===_.activeId;M.setAttribute("aria-selected",k?"true":"false"),M.tabIndex=k?0:-1,M.dataset.id=X.id;let z=V("span");if(z.textContent=X.label,M.append(z),X.count!==void 0){let m=V("span","oc-sdk-tab-count");m.textContent=String(X.count),M.append(m)}M.addEventListener("click",()=>{if(X.id!==_.activeId)_.onChange(X.id)}),U.append(M)}},A=(X)=>{let M=t(X,"horizontal");if(!M)return;let k=e(_.items,_.activeId,M);if(k&&k!==_.activeId){X.preventDefault(),_.onChange(k);let z=U.querySelector(`[data-id="${CSS.escape(k)}"]`);if(z instanceof HTMLElement)z.focus()}};return U.addEventListener("keydown",A),f(),{update:(X)=>{_={..._,...X},f()},dispose:()=>{U.removeEventListener("keydown",A),U.remove()}}};var kT=(T,S)=>{B(L);let _=S,U=V("div","oc-sdk oc-sdk-empty"),f=V("h2","oc-sdk-empty-title"),A=V("p","oc-sdk-empty-body"),X=V("div","oc-sdk-empty-action");U.append(f,A,X),T.append(U);let M=null,k=()=>{if(N(f,_.title),N(A,_.body),A.hidden=!_.body,X.hidden=!_.action,!_.action){M?.dispose(),M=null;return}let z={label:_.action.label,onClick:_.action.onClick};if(M)M.update(z);else M=q(X,{...z,variant:"outline",size:"sm"})};return k(),{update:(z)=>{_={..._,...z},k()},dispose:()=>{M?.dispose(),M=null,U.remove()}}};function K0(T){return(T??"").slice(0,7)}function n(T){if(T==null||T==="")return null;if(typeof T==="number")return Number.isFinite(T)?T:null;let S=Date.parse(T);return Number.isNaN(S)?null:S}function B0(T){if(T==null||!Number.isFinite(T))return"";let S=Math.max(0,Math.round(T));if(S<60)return`${S}s`;let _=Math.floor(S/60),U=S%60;if(_<60)return U?`${_}m ${String(U).padStart(2,"0")}s`:`${_}m`;let f=Math.floor(_/60),A=_%60;return`${f}h ${String(A).padStart(2,"0")}m`}function L0(T,S){return B0((S-T)/1000)}function P0(T,S=Date.now()){let _=Math.max(0,Math.round((S-T)/1000));if(_<10)return"just now";if(_<60)return`${_}s ago`;let U=Math.floor(_/60);if(U<60)return`${U}m ago`;let f=Math.floor(U/60);if(f<24)return`${f}h ago`;let A=Math.floor(f/24);if(A<30)return`${A}d ago`;return`${Math.floor(A/30)}mo ago`}function zT(T){if(T==null||T==="")return[];return(T.endsWith(`
`)?T.slice(0,-1):T).split(`
`)}function R0(T,S){if(S<=0)return[];return zT(T).slice(-S)}function _1(T){return(S)=>T.request(S)}function YT(T){return`/api/v4/projects/${encodeURIComponent(T)}`}function q1(T,S={scope:"all"}){let _={per_page:String(S.perPage??JT)};if(S.scope==="branch"){if(S.ref)_.ref=S.ref}else _.order_by="updated_at",_.sort="desc";return{path:`${YT(T)}/pipelines`,query:_}}function h1(T,S){return{path:`${YT(T)}/pipelines/${S}/jobs`,query:{per_page:"100"}}}function d1(T,S){return{path:`${YT(T)}/jobs/${S}/trace`,query:{}}}function v1(T){if(T>=200&&T<300)return null;if(T===401||T===403)return{kind:"unauthorized"};if(T===404)return{kind:"not-found"};return{kind:"http",status:T}}function p1(T){if(typeof T!=="object"||T===null)return null;let S=T.code;return typeof S==="string"?S:null}function o1(T){let S=p1(T);if(S==="DISCONNECTED")return{kind:"disconnected"};if(S==="NO_SERVICE"||S==="SERVICE_FAILED"||S==="NOT_GRANTED")return{kind:"service"};return{kind:"network"}}async function $T(T,S){let _;try{_=await T(S)}catch(f){return{ok:!1,failure:o1(f)}}let U=v1(_.status);if(U)return{ok:!1,failure:U};return{ok:!0,status:_.status,body:_.body}}function U1(T,S){try{return{ok:!0,data:JSON.parse(T)}}catch{return{ok:!1,failure:{kind:"http",status:S}}}}async function x1(T,S,_){let U=q1(S,_),f=await $T(T,{method:"GET",...U});if(!f.ok)return f;return U1(f.body,f.status)}async function f1(T,S,_){let U=h1(S,_),f=await $T(T,{method:"GET",...U});if(!f.ok)return f;return U1(f.body,f.status)}async function QT(T,S,_){let U=d1(S,_),f=await $T(T,{method:"GET",...U});if(!f.ok){if(f.failure.kind==="not-found")return{ok:!0,data:""};return f}return{ok:!0,data:f.body}}var n1=100,a1="Investigate the cause and fix it in this repository. If the failure is infrastructure, a flaky test, or a runner/network/registry problem, say so plainly instead of inventing a code change.";function I0(T){return T.status==="failed"}function l1(T){let S=["A GitLab CI job has failed.",""];if(S.push(`- Project: ${T.project}`),T.pipeline)S.push(`- Pipeline #${T.pipeline.iid} (${T.pipeline.ref||"—"} @ ${K0(T.pipeline.sha)})`);if(S.push(`- Job: ${T.job.name} (${T.job.stage})`),T.pipeline?.web_url)S.push(`- Pipeline: ${T.pipeline.web_url}`);if(T.job.web_url)S.push(`- Job log: ${T.job.web_url}`);let _=S.join(`
`),U=`

${a1}`,f=R0(T.trace,n1).join(`
`);if(f==="")return`${_}${U}`;let A=(k)=>`${_}

Tail of the job log:

\`\`\`
${k}
\`\`\`${U}`,X=A(f);if(X.length<=U0)return X;let M=f.slice(X.length-U0);return M===""?`${_}${U}`:A(M)}function G1(T){return{providerId:T.providerId,id:`job-${T.job.id}`,title:T.job.name||`Job #${T.job.id}`,url:T.job.web_url??"",text:l1(T),navigation:"open"}}var u1={success:{label:"Passed",tone:"success",glyph:"check"},failed:{label:"Failed",tone:"error",glyph:"cross"},running:{label:"Running",tone:"info",glyph:"loader",animate:!0},pending:{label:"Pending",tone:"warning",glyph:"clock"},created:{label:"Created",tone:"neutral",glyph:"circle"},preparing:{label:"Preparing",tone:"warning",glyph:"loader"},scheduled:{label:"Scheduled",tone:"neutral",glyph:"calendar"},waiting_for_resource:{label:"Waiting for resource",tone:"neutral",glyph:"pause"},waiting_for_callback:{label:"Waiting for callback",tone:"neutral",glyph:"hourglass"},canceling:{label:"Canceling",tone:"warning",glyph:"loader"},canceled:{label:"Canceled",tone:"neutral",glyph:"slash"},skipped:{label:"Skipped",tone:"neutral",glyph:"skip",muted:!0},manual:{label:"Manual",tone:"primary",glyph:"play"}},A1={label:"Unknown",tone:"neutral",glyph:"dot"};function w0(T){if(!T)return A1;return u1[T]??A1}function G0(T){let S=w0(T.status);if(T.status==="failed"&&T.allow_failure)return{...S,label:"Failed (allowed)",tone:"warning"};return S}var r1=["pending","running","created","preparing","canceling","waiting_for_resource","waiting_for_callback"],i1=new Set(r1);function A0(T){return T!=null&&i1.has(T)}function s1(T,S={}){if(!ZT(T))return{active:!1,delayMs:null};let U=S.intervalMs??LT,f=S.elapsedMs??0,A=f>600000?3:f>120000?2:1;return{active:!0,delayMs:U*A}}function ZT(T){for(let S of T)if(A0(S))return!0;return!1}function E1(T,S={}){return s1(T,S).delayMs}function CT(T){try{return new URL(T).host}catch{return T.replace(/^https?:\/\//,"").replace(/\/.*$/,"")}}function t1(T){let S=T.trim();if(!S)return null;let _="",U="";if(S.includes("://")){let A;try{A=new URL(S)}catch{return null}_=A.host,U=A.pathname}else{let A=S.indexOf(":");if(A<0)return null;_=S.slice(0,A).replace(/^[^@]*@/,""),U=S.slice(A+1),U=U.replace(/^\/+/,"")}let f=X1(U);if(!_||!f)return null;return{host:_,path:f}}function X1(T){let S=T.trim().replace(/^\/+/,"").replace(/\/+$/,"");if(S.toLowerCase().endsWith(".git"))S=S.slice(0,-4);return S.replace(/\/+$/,"")}function e1(T){let S=[],_=null;for(let U of T.split(/\r?\n/)){let f=/^\s*\[remote\s+"([^"]+)"\]\s*$/.exec(U);if(f){_=f[1]??null;continue}if(/^\s*\[/.test(U)){_=null;continue}if(_==null)continue;let A=/^\s*url\s*=\s*(.+?)\s*$/.exec(U);if(A&&A[1])S.push({name:_,url:A[1]})}return S}function TS(T){let S=e1(T),_=["origin","upstream"],U=[..._.flatMap((f)=>S.filter((A)=>A.name===f)),...S.filter((f)=>!_.includes(f.name))];for(let f of U){let A=t1(f.url);if(A)return{remote:A,name:f.name}}return null}function SS(T){if(!T)return null;return/^\s*ref:\s*refs\/(?:heads|tags)\/(.+?)\s*$/.exec(T)?.[1]??null}function WT(T,S){if(!T||!S)return!1;return T.replace(/\/+$/,"")===S.replace(/\/+$/,"")}function _S(T){return T!=null&&/^\s*gitdir:\s*\S+/.test(T)}function DT(T,S,_){if(T&&_){let U=_.find((f)=>WT(f.directory,T));if(U?.branch)return U.branch}return SS(S)}function M1(T){let S=CT(T.apiOrigin),_=T.projectOverride?.trim()??"";if(!T.directory&&!_)return{ok:!1,failure:"no-project"};if(_){let f=X1(_);if(!f)return{ok:!1,failure:"no-project"};return{ok:!0,host:S,project:f,ref:DT(T.directory,T.head,T.worktrees),source:"override"}}let U=T.gitConfig?TS(T.gitConfig):null;if(!U){if(_S(T.gitFile))return{ok:!1,failure:"linked-worktree",detectedRef:DT(T.directory,T.head,T.worktrees)};return{ok:!1,failure:"not-a-repo"}}if(U.remote.host!==S)return{ok:!1,failure:"host-mismatch",detectedHost:U.remote.host,detectedPath:U.remote.path};return{ok:!0,host:S,project:U.remote.path,ref:DT(T.directory,T.head,T.worktrees),source:"derived"}}var US=new Set(["success","failed","canceled","skipped"]);function xS(T){return US.has(T.status)}function k1(T=[]){let S=[],_=new Map;for(let U of T){let f=_.get(U.stage);if(!f)f=[],_.set(U.stage,f),S.push(U.stage);f.push(U)}return S.map((U)=>{let f=_.get(U)??[];return{stage:U,jobs:f,done:f.filter(xS).length,total:f.length}})}var fS={setTimeout:(T,S)=>globalThis.setTimeout(T,S),clearTimeout:(T)=>globalThis.clearTimeout(T),setInterval:(T,S)=>globalThis.setInterval(T,S),clearInterval:(T)=>globalThis.clearInterval(T),now:()=>Date.now()},z1={check:'<path d="M9.6 16.3 5.3 12l-1.5 1.5 5.8 5.8L21.4 7.5 19.9 6z"/>',cross:'<path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/>',clock:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.1l3.1 2.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',calendar:'<rect x="4.5" y="5.5" width="15" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 9.5h15M8.5 3.5v4M15.5 3.5v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',circle:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/>',loader:'<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="13 40"/>',hourglass:'<path d="M7 4h10v2l-3.7 4.6L17 15v2H7v-2l3.7-4.4L7 6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',pause:'<rect x="7" y="5.5" width="3.4" height="13" rx="1"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1"/>',slash:'<circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6.9 6.9 17.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',skip:'<path d="M6 5.4l9.2 6.6L6 18.6z"/><rect x="16.4" y="5.4" width="2.6" height="13.2" rx="0.6"/>',play:'<path d="M7 4.6l12.4 7.4L7 19.4z"/>',dot:'<circle cx="12" cy="12" r="4.6"/>'},GS='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M5.54429 2.67305C5.81644 2.49995 6.13587 2.41612 6.45799 2.43329C6.78102 2.4505 7.09056 2.56841 7.34318 2.77049L7.34405 2.77119C7.59044 2.96879 7.76998 3.2372 7.85866 3.5399L9.30537 7.96754H14.6944L16.1411 3.5399C16.2298 3.23722 16.4093 2.96879 16.6557 2.77116L16.6604 2.76745C16.9128 2.56777 17.2209 2.45133 17.5424 2.43423C17.8638 2.41712 18.1826 2.50023 18.4547 2.67197L18.4571 2.67347C18.7307 2.84735 18.9427 3.10328 19.0624 3.40486L19.0664 3.41491L21.5393 9.86622C21.9619 10.9712 22.0136 12.1836 21.6865 13.3205C21.3594 14.4574 20.6715 15.457 19.7263 16.1685L12.9955 21.2331L12.9945 21.2338C12.7066 21.4513 12.3554 21.5692 11.9943 21.5692C11.6332 21.5692 11.2819 21.4513 10.9939 21.2337L4.26254 16.1683C3.32063 15.4562 2.63541 14.4574 2.30989 13.3224C1.98437 12.1873 2.03616 10.9772 2.45747 9.8741L4.93724 3.40497C5.0571 3.10297 5.26966 2.84673 5.54429 2.67305ZM6.35534 4.73567L4.16029 10.4639C3.87993 11.2013 3.82298 12.0676 4.04049 12.8261C4.25704 13.5811 4.71123 14.2461 5.33544 14.7225L11.9943 19.7329L18.6484 14.7265C19.2789 14.2502 19.7379 13.5822 19.9563 12.8227C20.1751 12.0624 20.1148 11.1847 19.8328 10.4455L17.6444 4.73558L16.0001 9.76791H7.9996L6.35534 4.73567Z"/></svg>',AS='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor"><path d="M12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>',ES='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M12 13.17l4.95-4.95 1.41 1.41L12 16 5.64 9.63 7.05 8.22z"/></svg>',XS='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="currentColor"><path d="M18.4 7.0l-1.4-1.4L12 10.6 7.0 5.6 5.6 7.0l4.9 5-4.9 5 1.4 1.4 5-4.9 5 4.9 1.4-1.4-4.9-5z"/></svg>';function E(T,S,_){let U=document.createElement(T);if(S)U.className=S;if(_!=null)U.textContent=_;return U}function Y1(T){while(T.firstChild)T.removeChild(T.firstChild)}class C1{root;port;options;timers;directory=null;settingsProject="";settingsHost="";settingsToken="";started=!1;disposed=!1;scope="branch";phase="init";resolved=null;problem=null;error=null;pipelines=[];expandedId=null;jobs=new Map;openJob=null;traces=new Map;traceLoadingId=null;handoffJobId=null;handoffError=null;updatedAt=null;lastHost=null;generation=0;pollTimer=null;tickTimer=null;pollStartedAt=null;scrollTop=0;scrollEl=null;drawerEl=null;drawerScrollTop=0;followTail=!0;handles=[];unsubReady=null;unsubConnection=null;constructor(T,S,_){this.root=T,this.port=S,this.options=_,this.timers=_.timers??fS}start(){return this.unsubReady=this.port.onReady((T)=>this.handleReady(T)),this.unsubConnection=this.port.onConnection((T)=>this.handleConnection(T)),this.render(),this}handleReady(T){xT(T,document.documentElement);let S=T.settings?.project??"",_=T.settings?.host??"",U=T.settings?.token??"",f=T.directory!==this.directory||S!==this.settingsProject||_!==this.settingsHost||U!==this.settingsToken||!this.started;if(this.directory=T.directory,this.settingsProject=S,this.settingsHost=_,this.settingsToken=U,f)this.started=!0,this.refresh();else this.render()}handleConnection(T){if(this.isCustomHost())return;if(!T.connected){this.problem=W1(this.configuredHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.problem?.kind==="disconnected")this.refresh()}refresh(){if(this.disposed)return;let T=++this.generation;this.runRefresh(T)}setScope(T){if(T===this.scope)return;this.scope=T,this.expandedId=null,this.openJob=null,this.pipelines=[],this.refresh()}isPolling(){return this.pollTimer!=null}dispose(){this.disposed=!0,this.stopAllTimers(),this.unsubReady?.(),this.unsubConnection?.(),this.disposeHandles(),Y1(this.root),this.port.dispose()}async runRefresh(T){this.error=null;let S=this.hostSettingProblem();if(S){this.problem=S,this.phase="problem",this.resolved=null,this.forgetHostData(),this.stopAllTimers(),this.render();return}let _=this.effectiveHost();if(_!==this.lastHost)this.forgetHostData(),this.lastHost=_;let U=this.settingsProject.trim();if(!this.directory&&!U){this.problem=D1({ok:!1,failure:"no-project"},this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.pipelines.length===0)this.phase="loading";this.render();let f=await this.deriveProject();if(this.disposed||T!==this.generation)return;if(!f.ok){this.problem=D1(f,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}this.problem=null,this.resolved=f,await this.loadPipelines(T,f)}hostSettingProblem(){let T=this.settingsHost.trim();if(T==="")return null;let S=Q1(T);if(S==null)return CS(T);if(N0(S)===this.configuredHost())return null;if(this.settingsToken.trim()==="")return DS(N0(S));return null}forgetHostData(){this.pipelines=[],this.jobs.clear(),this.traces.clear(),this.openJob=null,this.expandedId=null,this.updatedAt=null}async deriveProject(){let T=this.settingsProject.trim(),S=this.directory,_=null,U=null,f=null,A=null;if(S){try{_=(await this.port.readFile(".git/config")).content}catch{_=null}if(_==null)try{U=(await this.port.readFile(".git")).content}catch{U=null}try{f=(await this.port.readFile(".git/HEAD")).content}catch{f=null}try{let M=(await this.port.listProjects()).projects.find((k)=>WT(k.directory,S));if(M)A=(await this.port.listWorktrees(M.id)).worktrees}catch{A=null}}return M1({directory:S,apiOrigin:this.isCustomHost()?this.customBase()??this.options.apiOrigin:this.options.apiOrigin,projectOverride:T,gitConfig:_,gitFile:U,head:f,worktrees:A})}async loadPipelines(T,S){let _=S.ref?this.scope:"all",U=await x1(this.requester(),S.project,{scope:_,ref:S.ref});if(this.disposed||T!==this.generation)return;if(!U.ok){this.handleFailure(U.failure);return}if(this.pipelines=U.data,this.updatedAt=this.timers.now(),this.phase="ready",this.error=null,this.expandedId!=null)this.loadJobs(T,this.expandedId,this.jobs.has(this.expandedId));this.render(),this.schedulePoll()}handleFailure(T){if(T.kind==="disconnected"||T.kind==="unauthorized"||T.kind==="not-found"||T.kind==="service"){this.problem=ZS(T,this.effectiveHost()),this.phase="problem",this.resolved=null,this.stopAllTimers(),this.render();return}if(this.error=T.kind==="network"?"Could not reach GitLab. Check the connection and try again.":`GitLab returned an unexpected response (${T.status}).`,this.render(),this.hasActive())this.schedulePoll();else this.stopAllTimers()}togglePipeline(T){if(this.expandedId===T){this.expandedId=null,this.render();return}if(this.expandedId=T,!this.jobs.has(T))this.jobs.set(T,"loading"),this.render(),this.loadJobs(this.generation,T,!1);else this.render()}async loadJobs(T,S,_){let U=this.resolved?.project;if(!U)return;if(!_||!Array.isArray(this.jobs.get(S)))this.jobs.set(S,"loading"),this.render();let f=await f1(this.requester(),U,S);if(this.disposed||T!==this.generation)return;if(f.ok)this.jobs.set(S,f.data);else if(_);else this.jobs.set(S,"error");if(this.expandedId===S)this.render()}openJobDrawer(T,S){if(this.openJob={pipelineId:T,jobId:S},this.followTail=!0,this.drawerScrollTop=0,this.traces.has(S)){this.render();return}this.traceLoadingId=S,this.render(),this.loadTrace(this.generation,S)}async loadTrace(T,S){let _=this.resolved?.project;if(!_)return;let U=await QT(this.requester(),_,S);if(this.disposed||T!==this.generation)return;if(this.traceLoadingId=null,!U.ok)this.traces.set(S,{state:"error",text:"",truncated:null});else this.traces.set(S,Z1(U.data??""));this.render()}refreshOpenTrace(T){let S=this.openJob;if(!S||this.traceLoadingId===S.jobId)return;let _=this.jobById(S.jobId);if(!_||!A0(_.status))return;this.loadTrace(T,S.jobId)}jobById(T){for(let S of this.jobs.values()){if(!Array.isArray(S))continue;let _=S.find((U)=>U.id===T);if(_)return _}return}closeDrawer(){this.openJob=null,this.followTail=!0,this.drawerScrollTop=0,this.render()}canHandoff(){return this.directory!=null&&this.resolved!=null}startHandoff(T,S){if(!this.canHandoff()||this.handoffJobId!=null)return;let _=this.jobById(S);if(!_||!I0(_))return;let U=this.pipelines.find((f)=>f.id===T)??null;this.handoffJobId=S,this.handoffError=null,this.render(),this.runHandoff(U,_)}async runHandoff(T,S){let _=await this.traceFor(S);if(this.disposed)return;if(_==null){this.finishHandoff("Could not read the job log to hand off. The session was not started.");return}let U;try{U=(await this.port.startSession(G1({providerId:OT,project:this.resolved?.project??"",pipeline:T,job:S,trace:_}))).sent}catch{this.finishHandoff("Could not start a session for this job.");return}if(this.disposed)return;this.finishHandoff(U==="sent"?null:$S(U))}async traceFor(T){let S=this.traces.get(T.id);if(S?.state==="ready")return S.text;let _=this.resolved?.project;if(!_)return null;let U=await QT(this.requester(),_,T.id);if(!U.ok)return null;let f=U.data??"";return this.traces.set(T.id,Z1(f)),f}finishHandoff(T){this.handoffJobId=null,this.handoffError=T,this.render()}visibleStatuses(){let T=this.pipelines.map((S)=>S.status);for(let S of this.jobs.values())if(Array.isArray(S))for(let _ of S)T.push(_.status);return T}hasActive(){return ZT(this.visibleStatuses())}schedulePoll(){this.stopPollTimer();let T=this.timers.now();if(this.pollStartedAt==null)this.pollStartedAt=T;let S=E1(this.visibleStatuses(),{elapsedMs:T-this.pollStartedAt});if(S==null){this.pollStartedAt=null;return}this.pollTimer=this.timers.setTimeout(()=>{this.pollTimer=null,this.pollOnce()},S)}async pollOnce(){if(this.disposed||!this.resolved)return;let T=++this.generation;if(await this.loadPipelines(T,this.resolved),T===this.generation)this.refreshOpenTrace(T)}stopPollTimer(){if(this.pollTimer!=null)this.timers.clearTimeout(this.pollTimer),this.pollTimer=null}startTicker(){if(this.tickTimer!=null)return;this.tickTimer=this.timers.setInterval(()=>this.updateLive(),PT)}stopTicker(){if(this.tickTimer!=null)this.timers.clearInterval(this.tickTimer),this.tickTimer=null}stopAllTimers(){this.stopPollTimer(),this.stopTicker(),this.pollStartedAt=null}updateLive(){let T=this.timers.now();for(let S of Array.from(this.root.querySelectorAll("[data-live]"))){let _=Number(S.dataset.start);if(!Number.isFinite(_))continue;if(S.dataset.live==="ago")S.textContent=P0(_,T);else if(S.dataset.live==="elapsed"){let U=S.dataset.end?Number(S.dataset.end):T;S.textContent=L0(_,Number.isFinite(U)?U:T)}}}configuredHost(){return CT(this.options.apiOrigin)}customBase(){return Q1(this.settingsHost)}isCustomHost(){let T=this.customBase();if(T==null)return!1;return N0(T)!==this.configuredHost()}effectiveHost(){let T=this.customBase();return T!=null&&this.isCustomHost()?N0(T):this.configuredHost()}requester(){let T=this.isCustomHost()?this.customBase():null;if(T!=null){let S=this.settingsToken.trim();return async(_)=>{let U=await this.port.serviceRequest({method:_.method??"GET",path:KT,query:{baseUrl:T},body:JSON.stringify({baseUrl:T,token:S,method:_.method??"GET",path:_.path,query:_.query??{}})});return kS(U)}}return _1(this.port)}disposeHandles(){for(let T of this.handles.splice(0))T.dispose()}render(){if(this.disposed)return;if(this.disposeHandles(),this.scrollEl)this.scrollTop=this.scrollEl.scrollTop;if(this.drawerEl)this.drawerScrollTop=this.drawerEl.scrollTop;Y1(this.root),this.root.className="gp";let T=E("div","gp-progress");if(!this.isFirstLoad())T.hidden=!0;this.root.append(T),this.root.append(this.renderHeader());let S=this.renderHandoffNotice();if(S)this.root.append(S);this.scrollEl=E("div","gp-scroll");let _=E("div","gp-pad");if(_.append(...this.renderContent()),this.scrollEl.append(_),this.scrollEl.addEventListener("scroll",()=>{this.scrollTop=this.scrollEl?.scrollTop??0}),this.root.append(this.scrollEl),this.root.append(this.renderFooter()),this.openJob)this.root.append(this.renderDrawer(this.openJob));if(this.scrollEl)this.scrollEl.scrollTop=this.scrollTop;if(this.drawerEl)this.drawerEl.scrollTop=this.followTail?this.drawerEl.scrollHeight:this.drawerScrollTop;this.updateLive(),this.syncTicker()}isFirstLoad(){return(this.phase==="init"||this.phase==="loading")&&this.pipelines.length===0}syncTicker(){let T=this.resolved!=null&&this.updatedAt!=null;if(T&&this.tickTimer==null)this.startTicker();if(!T)this.stopTicker()}renderHeader(){let T=E("div","gp-head"),S=E("div","gp-head-row"),_=E("span","gp-brand"),U=E("span","gp-brand-mark");U.innerHTML=GS,_.append(U,E("span","gp-brand-title","Pipelines")),S.append(_,E("span","gp-spacer"));let f=E("span","gp-updated");if(this.resolved==null||this.updatedAt==null)f.hidden=!0;else{let k=E("span","gp-dot");k.dataset.idle=this.hasActive()?"false":"true";let z=E("span");z.dataset.live="ago",z.dataset.start=String(this.updatedAt),z.textContent=P0(this.updatedAt,this.timers.now()),f.append(k,z)}S.append(f);let A=E("button","gp-iconbtn");if(A.type="button",A.setAttribute("aria-label","Refresh"),A.title="Refresh",A.innerHTML=AS,this.isFirstLoad())A.dataset.spinning="true";A.addEventListener("click",()=>this.refresh()),S.append(A),T.append(S);let X=E("div","gp-project");if(this.isCustomHost()){let k=E("span","gp-host-tag","Custom host");k.dataset.mode="custom",X.append(k)}let M=E("span","gp-project-path");if(this.resolved)M.textContent=`${this.resolved.host}/${this.resolved.project}`;else M.hidden=!0;if(X.append(M),!this.resolved&&!this.isCustomHost())X.hidden=!0;return T.append(X),T.append(this.renderScope()),T}renderScope(){let T=E("div","gp-scope");if(!(this.resolved!=null&&this.resolved.ref!=null&&this.problem==null))return T.hidden=!0,T;let _=E("div");T.append(_),this.handles.push(MT(_,{items:[{id:"branch",label:"Branch"},{id:"all",label:"All refs"}],activeId:this.scope,trackBackground:!0,onChange:(f)=>this.setScope(f)}));let U=this.scope==="branch"?this.resolved?.ref??"":"all refs";return T.append(E("span","gp-scope-ref",U)),T}renderContent(){let T=[];if(this.error){let _=E("div","gp-state");_.append(E("p","gp-state-body",this.error));let U=E("div","gp-state-actions"),f=E("div");this.handles.push(q(f,{label:"Retry",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(f),_.append(U),T.push(_)}if(this.problem)return T.push(this.renderProblem(this.problem)),T;if(this.isFirstLoad())return T.push(this.renderSkeleton()),T;if(this.pipelines.length===0)return T.push(this.renderEmpty()),T;let S=E("div","gp-list");for(let _ of this.pipelines)S.append(this.renderPipeline(_));return T.push(S),T}renderProblem(T){let S=E("div","gp-state"),_=E("h2","gp-state-title",T.title);if(S.append(_,E("p","gp-state-body",T.body)),T.detail)S.append(E("p","gp-state-detail",T.detail));if(T.hint)S.append(E("p","gp-state-hint",T.hint));let U=E("div","gp-state-actions"),f=E("div");return this.handles.push(q(f,{label:"Refresh",variant:"outline",size:"sm",onClick:()=>this.refresh()})),U.append(f),S.append(U),S}renderEmpty(){let T=E("div"),S=this.scope==="branch"&&this.resolved?.ref!=null;return this.handles.push(kT(T,{title:S?"No pipelines for this ref":"No pipelines yet",body:S?`Nothing has run on ${this.resolved?.ref}. It may be a fresh branch.`:"This project has no pipelines to show.",action:S?{label:"Show all refs",onClick:()=>this.setScope("all")}:{label:"Refresh",onClick:()=>this.refresh()}})),T}renderSkeleton(){let T=E("div","gp-skel");for(let S=0;S<5;S+=1){let _=E("div","gp-skel-row"),U=E("span","gp-skel-line");U.dataset.w="short";let f=E("span","gp-skel-line");f.dataset.w="grow",_.append(U,f),T.append(_)}return T}renderPipeline(T){let S=this.expandedId===T.id,_=E("div","gp-item");_.dataset.open=S?"true":"false";let U=E("button","gp-row");U.type="button",U.setAttribute("aria-expanded",String(S));let f=E("span","gp-caret");f.innerHTML=ES,U.append(f,$1(w0(T.status),15));let A=E("span","gp-row-main"),X=E("span","gp-row-line");if(X.append(E("span","gp-ref",T.ref||"—")),X.append(E("span","gp-sha",K0(T.sha))),A.append(X,E("div","gp-row-sub",QS(T))),U.append(A,this.timingSpan(T)),U.addEventListener("click",()=>this.togglePipeline(T.id)),_.append(U),S){let M=E("div","gp-jobs");if(T.web_url){let z=document.createElement("a");z.className="gp-jobs-link",z.href=T.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View pipeline in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(T.web_url)}),M.append(z)}let k=this.jobs.get(T.id);if(k===void 0||k==="loading")M.append(E("div","gp-row-sub","Loading jobs…"));else if(k==="error")M.append(E("div","gp-row-sub","Could not load jobs. Collapse and reopen to retry."));else if(k.length===0)M.append(E("div","gp-row-sub","No jobs reported yet."));else for(let z of k1(k))M.append(this.renderStage(T.id,z));_.append(M)}return _}timingSpan(T){let S=A0(T.status),_=n(T.started_at);if(S&&_!=null){let A=n(T.finished_at),X=E("span","gp-row-meta");if(X.dataset.live="elapsed",X.dataset.start=String(_),A!=null)X.dataset.end=String(A);return X.textContent=L0(_,A??this.timers.now()),X}if(n(T.finished_at)!=null&&T.duration!=null)return E("span","gp-row-meta",B0(T.duration));let f=n(T.created_at);if(f!=null){let A=E("span","gp-row-meta");return A.dataset.live="ago",A.dataset.start=String(f),A.textContent=P0(f,this.timers.now()),A}return E("span","gp-row-meta","—")}jobMeta(T){let S=n(T.started_at);if(T.status==="running"&&S!=null){let U=E("span","gp-job-meta");return U.dataset.live="elapsed",U.dataset.start=String(S),U.textContent=L0(S,this.timers.now()),U}let _=n(T.finished_at);if(T.duration!=null&&_!=null)return E("span","gp-job-meta",B0(T.duration));if(T.status==="running")return E("span","gp-job-meta","running");return E("span","gp-job-meta",G0(T).label.toLowerCase())}renderStage(T,S){let _=E("div","gp-stage"),U=E("div","gp-stage-head");U.append(E("span","gp-stage-name",S.stage),E("span","gp-stage-count",`${S.done}/${S.total}`),E("span","gp-stage-line")),_.append(U);for(let f of S.jobs){let A=E("div","gp-job");if(A.tabIndex=0,A.setAttribute("role","button"),this.openJob?.jobId===f.id)A.dataset.selected="true";if(A.setAttribute("aria-label",`${f.name}, ${G0(f).label}`),A.append($1(G0(f),13),E("span","gp-job-name",f.name)),A.append(this.jobMeta(f)),A.addEventListener("click",()=>this.openJobDrawer(T,f.id)),A.addEventListener("keydown",(X)=>{if(X.target!==A)return;if(X.key==="Enter"||X.key===" ")X.preventDefault(),this.openJobDrawer(T,f.id)}),I0(f))A.append(this.renderHandoffAction(f,T));_.append(A)}return _}renderHandoffAction(T,S){let _=E("button","gp-handoff");_.type="button";let U=this.handoffJobId===T.id,f=this.canHandoff();if(_.disabled=!f||U,_.textContent=U?"Starting…":"Start session",_.title=f?"Start a session for this failed job":this.directory==null?"Open a project to start a session — a session needs a checkout to fix.":"This project could not be resolved, so a session cannot be started.",_.setAttribute("aria-label",`${_.textContent} — ${T.name}`),f&&!U)_.addEventListener("click",(A)=>{A.stopPropagation(),this.startHandoff(S,T.id)});return _}renderHandoffNotice(){if(!this.handoffError)return null;let T=E("div","gp-notice");T.setAttribute("role","alert"),T.append(E("span","gp-notice-text",this.handoffError));let S=E("button","gp-notice-close");return S.type="button",S.textContent="Dismiss",S.addEventListener("click",()=>this.finishHandoff(null)),T.append(S),T}renderDrawer(T){let S=E("div","gp-drawer"),_=this.jobs.get(T.pipelineId),U=Array.isArray(_)?_.find((z)=>z.id===T.jobId):void 0,f=E("div","gp-drawer-head"),A=E("span","gp-drawer-title",U?`${U.name} · ${G0(U).label}`:`Job #${T.jobId}`);if(f.append(A),U?.web_url){let z=document.createElement("a");z.className="gp-drawer-link",z.href=U.web_url,z.target="_blank",z.rel="noreferrer",z.textContent="View full log in GitLab",z.addEventListener("click",(m)=>{m.preventDefault(),this.port.openUrl(U.web_url)}),f.append(z)}if(U&&I0(U))f.append(this.renderHandoffAction(U,T.pipelineId));let X=E("button","gp-drawer-close");X.type="button",X.setAttribute("aria-label","Close log"),X.title="Close",X.innerHTML=XS,X.addEventListener("click",()=>this.closeDrawer()),f.append(X),S.append(f);let M=this.traces.get(T.jobId);if(!M)return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Loading log…")),S;if(M.state==="missing")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","No log output yet — the job has not started.")),S;if(M.state==="error")return this.drawerEl=null,S.append(E("div","gp-drawer-empty","Could not load the log. Close and reopen to retry.")),S;if(M.truncated)S.append(YS(M.truncated));let k=E("pre","gp-drawer-body");return k.textContent=R0(M.text,M0).join(`
`),k.addEventListener("scroll",()=>{this.drawerScrollTop=k.scrollTop,this.followTail=MS(k)}),this.drawerEl=k,S.append(k),S}renderFooter(){let T=E("div","gp-foot");if(T.append(E("span","","Read-only")),this.isCustomHost())T.append(E("span","gp-foot-host",`Custom host: ${this.effectiveHost()}`));return T}}function $1(T,S){let _=E("span","gp-icon");if(T.tone!=="neutral")_.dataset.tone=T.tone;if(T.animate)_.dataset.animate="true";if(T.muted)_.dataset.muted="true";_.setAttribute("role","img"),_.setAttribute("aria-label",T.label);let U=E("span","gp-icon-svg");return U.innerHTML=`<svg viewBox="0 0 24 24" width="${S}" height="${S}" aria-hidden="true" fill="currentColor">${z1[T.glyph]??z1.dot}</svg>`,_.append(U),_}function MS(T,S=24){return T.scrollHeight-T.scrollTop-T.clientHeight<=S}function Q1(T){let S=T.trim();if(!S)return null;if(S.includes("://")){if(S.slice(0,S.indexOf("://")).toLowerCase()!=="https")return null;let U;try{U=new URL(S)}catch{return null}if(U.username||U.password)return null;if(U.pathname!=="/"&&U.pathname!=="")return null;if(U.search||U.hash)return null;return U.origin}if(!/^[a-z0-9.-]+(:\d+)?$/i.test(S))return null;return`https://${S}`}function N0(T){return T.replace(/^https:\/\//,"").replace(/\/+$/,"")}function kS(T){try{let S=JSON.parse(T.body);if(typeof S.status==="number")return{status:S.status,body:S.body??""};if(S.error)throw Error(S.error)}catch(S){if(S instanceof SyntaxError);else throw S}return{status:T.status,body:T.body}}function zS(T){if(T.length>=BT)return"host";if(zT(T).length>M0)return"cap";return null}function Z1(T){return T.trim()?{state:"ready",text:T,truncated:zS(T)}:{state:"missing",text:"",truncated:null}}function YS(T){let S=E("div","gp-drawer-notice");return S.textContent=T==="host"?"GitLab returned a capped log. View the full log in GitLab.":`Older lines not shown (last ${M0} lines). View the full log in GitLab.`,S}function $S(T){if(T==="no-model")return"No model is selected in OpenChamber, so the session got no message.";if(T==="skipped")return"OpenChamber skipped the message. Open a project and try again.";return"OpenChamber could not start the session."}function QS(T){let S=[`#${T.iid}`,w0(T.status).label];if(T.merge_request?.iid!=null)S.push(`!${T.merge_request.iid}`);else if(T.tag)S.push("tag");else if(T.name)S.push(T.name);if(T.source&&T.source!=="push")S.push(T.source.replace(/_/g," "));return S.join(" · ")}function D1(T,S){switch(T.failure){case"no-project":return{kind:"no-project",title:"No project open",body:"The panel reads the open project’s git remote to find its GitLab project. Open one, then refresh.",hint:"Or set the “Project” setting to a GitLab project path."};case"not-a-repo":return{kind:"not-a-repo",title:"Not a Git repository",body:"This project has no readable .git remote, so there is no GitLab project to derive.",hint:"Or set the “Project” setting to a GitLab project path."};case"linked-worktree":{let _={kind:"linked-worktree",title:"Linked worktree",body:"This project is a linked git worktree, so its .git points outside it and the remote cannot be read. There is no host API for the remote in this case.",hint:"Set the “Project” setting to this worktree’s GitLab project path to read its pipelines."};if(T.detectedRef)_.detail=`Current ref: ${T.detectedRef}`;return _}case"host-mismatch":return{kind:"host-mismatch",title:"Different GitLab host",body:`This remote points at ${T.detectedHost}, but this extension only talks to ${S}.`,detail:T.detectedPath?`${T.detectedHost}/${T.detectedPath}`:T.detectedHost,hint:"Set the “Project” setting to a project path on this extension’s GitLab host."}}}function W1(T){return{kind:"disconnected",title:"GitLab not connected",body:`No personal access token is stored for ${T}. Connect one to read pipelines.`}}function ZS(T,S){if(T.kind==="disconnected")return W1(S);if(T.kind==="unauthorized")return{kind:"unauthorized",title:"GitLab token rejected",body:"The stored token cannot read this project. A personal access token with the read_api scope is required."};if(T.kind==="service")return{kind:"service",title:"Proxy service unavailable",body:"The local proxy that reaches a custom GitLab host is not running. It may not be granted yet, or it failed to start.",hint:"Open Settings → Extensions and allow this extension’s service, then refresh."};return{kind:"not-found",title:"Project not found",body:"GitLab could not find this project, or the token cannot see it."}}function DS(T){return{kind:"custom-token",title:"No token for this host",body:`The Panel reaches ${T} through the proxy service and needs a personal access token for it.`,hint:"Set the “Access token” setting to a personal access token with the read_api scope."}}function CS(T){return{kind:"custom-host",title:"Invalid GitLab host",body:`“${T}” is not a usable host. Enter a bare host like gitlab.example.com, or a full https:// origin.`,hint:"Fix the “GitLab host” setting, or clear it to use the built-in instance."}}function F1(T,S,_){return new C1(T,S,{..._,apiOrigin:_.apiOrigin||X0}).start()}var V1=`
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
`;function WS(T){let S=document.createElement("style");S.textContent=T,document.head.append(S)}var O1=document.getElementById("root");if(O1){WS(V1);let T=rT(),S=F1(O1,T,{apiOrigin:X0});window.addEventListener("beforeunload",()=>S.dispose())}})();
