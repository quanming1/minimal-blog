var e=class extends HTMLElement{static observedAttributes=[`open`,`label`];_lastFocused=null;_prevBodyOverflow=null;_panel;_focusableSel=`a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])`;constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`
  <style>
  :host {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: none;
    align-items: flex-start;
    justify-content: center;
    padding: 12vh 1em 1em;
    background: var(--overlay, rgba(0, 0, 0, 0.35));
  }
  :host([open]) {
    display: flex;
  }
  .panel {
    width: min(34em, 100%);
    max-height: 70vh;
    overflow-y: auto;
    background: var(--bg, #fff);
    color: var(--text, #333);
    border: 1px solid var(--divider, rgba(0,0,0,.3));
    padding: 1.2em 1.4em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); /* 克制：遮罩已分层，阴影仅轻微提升 */
  }
  ::slotted(*) {
    /* 面板内容由调用方负责布局，这里仅兜底边距 */
  }
  @media (prefers-reduced-motion: reduce) {
    :host { transition: none !important; }
  }
</style>
  <div class="panel" part="panel" role="dialog" aria-modal="true" tabindex="-1">
    <slot></slot>
  </div>
`,this._panel=e.querySelector(`.panel`)}connectedCallback(){this._panel.setAttribute(`aria-label`,this.getAttribute(`label`)??``),this.addEventListener(`keydown`,this._onKeydown),this.addEventListener(`click`,this._onClick),this.hasAttribute(`open`)&&this._show()}disconnectedCallback(){this.removeEventListener(`keydown`,this._onKeydown),this.removeEventListener(`click`,this._onClick),this._restoreScroll()}attributeChangedCallback(e,t,n){e===`open`?n===null?this._hide():this._show():e===`label`&&this._panel?.setAttribute(`aria-label`,n??``)}_onKeydown=e=>{if(this.hasAttribute(`open`)){if(e.key===`Escape`){this._requestClose();return}e.key===`Tab`&&this._trapFocus(e)}};_onClick=e=>{e.composedPath()[0]===this&&this._requestClose()};_requestClose(){let e=new CustomEvent(`mb-dialog-close`,{bubbles:!0,composed:!0,cancelable:!0});this.dispatchEvent(e)&&this.removeAttribute(`open`)}_show(){this._prevBodyOverflow===null&&(this._prevBodyOverflow=document.body.style.overflow,document.body.style.overflow=`hidden`),this._lastFocused=document.activeElement instanceof HTMLElement?document.activeElement:null,requestAnimationFrame(()=>{let e=this.querySelector(this._focusableSel);e?e.focus():this._panel.focus()})}_hide(){this._restoreScroll(),this._lastFocused&&this._lastFocused.isConnected&&this._lastFocused.focus(),this._lastFocused=null}_restoreScroll(){this._prevBodyOverflow!==null&&(document.body.style.overflow=this._prevBodyOverflow,this._prevBodyOverflow=null)}_isVisible(e){return e.offsetParent!==null||e.getClientRects().length>0||e.closest(`[hidden]`)===null&&getComputedStyle(e).display!==`none`}_trapFocus(e){let t=Array.from(this.querySelectorAll(this._focusableSel)).filter(e=>this._isVisible(e));if(t.length===0){e.preventDefault(),this._panel.focus();return}let n=t[0],r=t[t.length-1],i=document.activeElement;e.shiftKey?(i===n||!this.contains(i))&&(e.preventDefault(),r.focus()):(i===r||!this.contains(i))&&(e.preventDefault(),n.focus())}},t=`<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,n=`
  :host {
    position: fixed;
    right: 1.2em;
    bottom: calc(1.2em + 48px); /* 避让回到顶部按钮（40px + 间距），见 v1.3.0 审查 M1 */
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
    pointer-events: none;
  }
  .item {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.5em;
    background: var(--bg, #fff);
    color: var(--text, #333);
    border: 1px solid var(--divider, rgba(0,0,0,.3));
    border-left: 2px solid var(--accent, #3c5011); /* 克制 2px（印刷风 accent 不作大面积色块） */
    padding: 0.55em 1em;
    font-size: 0.92em;
    line-height: 1.5;
    max-width: 24em;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    cursor: pointer;
  }
  .toast-icon {
    width: 1em;
    height: 1em;
    flex-shrink: 0;
    color: var(--accent, #3c5011); /* 成功对勾随 accent，与左侧 2px 边一致 */
  }
  .item.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .item.leaving {
    opacity: 0;
    transform: translateY(4px);
  }
  @media (max-width: 900px) {
    :host {
      right: 1em;
      left: 1em;
      bottom: calc(4.6em + 48px); /* 避让底部导航 + 回顶（4.6em 高 44px） */
      align-items: center;
    }
    .item {
      max-width: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .item {
      transition: none;
    }
  }
`,r=class extends HTMLElement{constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`<style>${n}</style><div class="viewport" role="status" aria-live="polite"></div>`,this._viewport=e.querySelector(`.viewport`)}_viewport;show(e,n={}){let r=typeof n.duration==`number`?Math.max(500,n.duration):2500,i=document.createElement(`div`);i.className=`item`,i.innerHTML=`${t}<span class="toast-text"></span>`,i.querySelector(`.toast-text`).textContent=e,i.addEventListener(`click`,()=>o()),this._viewport.appendChild(i),requestAnimationFrame(()=>i.classList.add(`visible`));let a=!1,o=()=>{a||(a=!0,i.classList.remove(`visible`),i.classList.add(`leaving`),setTimeout(()=>i.remove(),220))};return setTimeout(o,r),o}};customElements.get(`mb-dialog`)||customElements.define(`mb-dialog`,e),customElements.get(`mb-toast`)||customElements.define(`mb-toast`,r);function i(e){document.documentElement.dataset.theme=e?`dark`:`light`;try{localStorage.setItem(`mb-theme`,e?`dark`:`light`)}catch{}}function a(){try{return localStorage.getItem(`mb-theme`)===`dark`}catch{return!1}}var o=null;document.addEventListener(`astro:page-load`,()=>{i(a());let e=document.getElementById(`theme-toggle`);if(e&&e.addEventListener(`click`,()=>{i((document.documentElement.dataset.theme||`light`)!==`dark`)}),o&&=(o(),null),document.body.dataset.reading===`true`){let e=document.getElementById(`reading-progress`),t=document.getElementById(`back-to-top`),n=!1,r=()=>{let r=document.documentElement.scrollHeight-window.innerHeight,i=r>0?Math.min(1,window.scrollY/r):0;e&&(e.style.width=`${(i*100).toFixed(1)}%`),t&&t.classList.toggle(`visible`,window.scrollY>600),n=!1},i=()=>{n||(n=!0,requestAnimationFrame(r))};window.addEventListener(`scroll`,i,{passive:!0}),r(),o=()=>window.removeEventListener(`scroll`,i);let a=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches;t?.addEventListener(`click`,()=>{window.scrollTo({top:0,behavior:a?`auto`:`smooth`})})}let t=(document.documentElement.lang||``).startsWith(`zh`),n=t?`复制`:`Copy`,r=t?`已复制`:`Copied`;document.querySelectorAll(`.post-body pre.astro-code`).forEach(e=>{if(!(e instanceof HTMLElement)||e.querySelector(`.code-actions`))return;e.classList.add(`has-actions`);let i=document.createElement(`div`);i.className=`code-actions`;let a=e.getAttribute(`data-language`)??``;if(a&&a!==`plaintext`){let e=document.createElement(`span`);e.className=`code-lang`,e.textContent=a,i.appendChild(e)}let o=document.createElement(`button`);o.type=`button`,o.className=`code-copy`,o.textContent=n,o.setAttribute(`aria-label`,`${n} code`);let s=document.querySelector(`mb-toast`),c=null,l=e=>{let i=e?r:t?`复制失败`:`Failed`;o.setAttribute(`aria-label`,`${i} code`),s?.show(i),c&&clearTimeout(c),c=setTimeout(()=>{o.setAttribute(`aria-label`,`${n} code`),c=null},1500)};o.addEventListener(`click`,()=>{let t=e.querySelector(`code`)?.innerText??``,n=()=>{let e=document.createElement(`textarea`);e.value=t,e.style.position=`fixed`,e.style.opacity=`0`,document.body.appendChild(e),e.select();let n=document.execCommand(`copy`);document.body.removeChild(e),l(n)};navigator.clipboard?.writeText?navigator.clipboard.writeText(t).then(()=>l(!0),()=>n()):n()}),i.appendChild(o),e.appendChild(i)})});