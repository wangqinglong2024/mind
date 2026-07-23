/* 渲染引擎：
   - renderForm/renderQuestion：搭建器画布“静态占位预览”（非可填）。
   - renderFill/activate/collectValues：预览、应用端“查看/编辑/采集”共用的可交互渲染 + 取值。 */
window.MJ = window.MJ || {};
(function(){
  const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const optLabel = o => o.linkName || o.text || '';
  const asArr = v => Array.isArray(v)? v : (v==null||v===''? [] : [v]);

  /* ============ 静态占位（搭建器画布） ============ */
  function choiceList(q, interactive){
    const isRadio = (q.type==='radio'||q.type==='radioScore');
    const inputType = isRadio?'radio':'checkbox';
    const scored = (q.type==='radioScore'||q.type==='checkboxScore');
    const cols = Number(q.optionCols)===2 ? ' cols2' : '';
    return `<div class="q-opts${cols}">`+ (q.options||[]).map((o,i)=>{
      const score = scored && o.score!=='' && o.score!=null ? `<span class="q-score">${esc(o.score)}分</span>` : '';
      const on = isRadio && Number(q.defaultIndex)===i;
      const ctrl = interactive
        ? `<input type="${inputType}" name="${q.id}" class="q-real">`
        : `<span class="${isRadio?'q-radio':'q-check'}${on?' on':''}"></span>`;
      return `<label class="q-opt">${ctrl}<span class="q-opt-t">${esc(optLabel(o))||'<i class=ph>选项'+(i+1)+'</i>'}</span>${score}</label>`;
    }).join('') + `</div>`;
  }

  function renderQuestion(q, no, interactive){
    if(q.type==='richtext'){
      return interactive
        ? `<div class="q"><div class="q-rich-edit" contenteditable="true">${q.content||''}</div></div>`
        : `<div class="q q-rich">${q.content||''}</div>`;
    }
    const dis = interactive?'':'disabled';
    const req = q.required ? `<span class="q-req">*</span>` : '';
    const head = `<div class="q-h">${req}<span class="q-no">${no}.</span> <span class="q-title">${esc(q.title)||'<i class=ph>未命名题目</i>'}</span></div>`;
    const hint = q.hint ? `<div class="q-hint">${esc(q.hint)}</div>` : '';
    let body='';
    switch(q.type){
      case 'radio': case 'radioScore': case 'checkbox': case 'checkboxScore': body=choiceList(q, interactive); break;
      case 'text': body=`<input class="q-input" ${dis} placeholder="${esc(q.placeholder)||'请输入'}">`; break;
      case 'textarea': body=`<textarea class="q-input" rows="${q.rows||3}" ${dis} placeholder="${esc(q.placeholder)||'请输入'}"></textarea>`; break;
      case 'number': body=`<div class="q-num"><input class="q-input" type="number" ${dis} placeholder="${esc(q.placeholder)||'请输入数字'}">${q.unit?`<span class="q-unit">${esc(q.unit)}</span>`:''}</div>`; break;
      case 'date': body=`<input class="q-input" type="${q.precision==='datetime'?'datetime-local':'date'}" ${dis}>`; break;
      case 'image': body=`<div class="q-img">＋</div>`; break;
      case 'tags': body=`<div class="q-tags"><input class="q-input q-taginput" ${dis} placeholder="输入后回车添加"></div>`; break;
      case 'subtable': body=subtablePreview(q); break;
      default: body='';
    }
    return `<div class="q">${head}${hint}<div class="q-b">${body}</div></div>`;
  }
  function subtablePreview(q){
    const cols=q.columns||[];
    if(!cols.length) return `<div class="q-sub">列表：请在右侧配置列</div>`;
    return `<div class="subt-wrap"><table class="subt"><thead><tr><th class="idx">#</th>${cols.map(c=>`<th>${esc(c.name)||'未命名列'}</th>`).join('')}</tr></thead>`+
      `<tbody><tr><td class="idx">1</td>${cols.map(()=>`<td style="color:#c2ccd9">…</td>`).join('')}</tr></tbody></table></div>`;
  }

  function renderForm(form, opts){
    opts=opts||{}; const interactive = opts.interactive!==false;
    const pages = form.pages||[]; let no=0;
    const body = pages.map((pg,pi)=>{
      const tab = pages.length>1 ? `<div class="pv-page">第 ${pi+1}/${pages.length} 页</div>` : '';
      const theme = pg.theme ? `<div class="pv-theme">${esc(pg.theme)}</div>` : '';
      const cards = (pg.cards||[]).map(cd=>{
        const ct = cd.title ? `<div class="pv-card-t">${esc(cd.title)}</div>` : '';
        const qs = (cd.questions||[]).map(q=>{ if(q.type!=='richtext') no++; return renderQuestion(q, no, interactive); }).join('');
        return `<div class="pv-card">${ct}${qs}</div>`;
      }).join('');
      return `<section class="pv-page-sec">${tab}${theme}${cards}</section>`;
    }).join('');
    return `<div class="pv-title">${esc(form.title)||'未命名表单'}</div>${body}`;
  }

  /* ============ 可交互填报（预览 / 查看 / 编辑 / 采集共用） ============ */
  const FILLREG = {};   // qid -> question（供动态加行等使用）

  function fillControl(q, val, ro){
    const dis = ro?'disabled':'';
    switch(q.type){
      case 'radio': case 'radioScore': case 'checkbox': case 'checkboxScore': return fillChoice(q,val,ro);
      case 'text': return `<input class="q-input q-fill" ${dis} value="${esc(val)}" placeholder="${esc(q.placeholder)||'请输入'}">`;
      case 'textarea': return `<textarea class="q-input q-fill" rows="${q.rows||3}" ${dis} placeholder="${esc(q.placeholder)||'请输入'}">${esc(val)}</textarea>`;
      case 'number': return `<div class="q-num"><input class="q-input q-fill" type="number" ${dis} value="${val==null?'':esc(val)}" placeholder="${esc(q.placeholder)||'请输入数字'}">${q.unit?`<span class="q-unit">${esc(q.unit)}</span>`:''}</div>`;
      case 'date': return `<input class="q-input q-fill" type="${q.precision==='datetime'?'datetime-local':'date'}" ${dis} value="${esc(val)}">`;
      case 'image': return fillImage(val,ro);
      case 'tags': return fillTags(val,ro);
      case 'subtable': return fillSubtable(q,val,ro);
      case 'richtext': return fillRich(q,val,ro);
      default: return '';
    }
  }
  function fillChoice(q,val,ro){
    const isRadio=(q.type==='radio'||q.type==='radioScore');
    const inputType=isRadio?'radio':'checkbox';
    const scored=(q.type==='radioScore'||q.type==='checkboxScore');
    const cols=Number(q.optionCols)===2?' cols2':'';
    const sel=asArr(val);
    return `<div class="q-opts${cols}">`+(q.options||[]).map((o,i)=>{
      const label=optLabel(o);
      const score=scored&&o.score!==''&&o.score!=null?`<span class="q-score">${esc(o.score)}分</span>`:'';
      let checked = sel.includes(label);
      if(isRadio && !sel.length && Number(q.defaultIndex)===i && val==null) checked=true;
      return `<label class="q-opt"><input type="${inputType}" name="${q.id}" class="q-real" value="${esc(label)}" ${checked?'checked':''} ${ro?'disabled':''}><span class="q-opt-t">${esc(label)||'<i class=ph>选项'+(i+1)+'</i>'}</span>${score}</label>`;
    }).join('')+`</div>`;
  }
  function fillRich(q,val,ro){
    if(ro) return `<div class="q-rich">${val||'<span style="color:#c2ccd9">—</span>'}</div>`;
    const ph=esc(q.placeholder)||'请输入内容（支持加粗、颜色等）';
    return `<div class="rt-tb">`+
      `<button type="button" onmousedown="return MJ.Engine._rt(event,'bold')"><b>B</b></button>`+
      `<button type="button" onmousedown="return MJ.Engine._rt(event,'italic')"><i>I</i></button>`+
      `<button type="button" onmousedown="return MJ.Engine._rt(event,'foreColor','#2b7de9')" style="color:#2b7de9">蓝</button>`+
      `<button type="button" onmousedown="return MJ.Engine._rt(event,'foreColor','#e45c5c')" style="color:#e45c5c">红</button>`+
      `<button type="button" onmousedown="return MJ.Engine._rt(event,'insertUnorderedList')">• 列表</button></div>`+
      `<div class="q-rich-edit q-richfill" contenteditable="true" data-ph="${ph}">${val||''}</div>`;
  }
  function fillImage(val,ro){
    const cnt=asArr(val).length;
    const thumbs=Array.from({length:cnt}).map(()=>`<div class="q-img" style="background:#eef4fb;color:#9db4d6">🖼</div>`).join('');
    return `<div class="imgs">${thumbs}${ro?'':'<div class="q-img q-imgadd">＋</div>'}</div>`;
  }
  function fillTags(val,ro){
    const chips=asArr(val).map(t=>`<span class="q-chip">${esc(t)}${ro?'':' <b class="tg-x">×</b>'}</span>`).join('');
    return `<div class="q-tags">${chips}${ro?'':'<input class="q-input q-taginput" placeholder="输入后回车添加">'}</div>`;
  }
  function subCell(col,val,ro){
    const dis=ro?'disabled':'';
    if(col.type==='number') return `<input class="fc" data-col="${col.id}" type="number" ${dis} value="${val==null?'':esc(val)}">`;
    if(col.type==='date') return `<input class="fc" data-col="${col.id}" type="date" ${dis} value="${esc(val)}">`;
    if(col.type==='radio') return `<select class="fc" data-col="${col.id}" ${dis}><option value="">请选择</option>${(col.options||[]).map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
    if(col.type==='checkbox'){
      const sel=asArr(val); const disp=sel.length?sel.join('、'):'请选择';
      return `<div class="cellms ${ro?'ro':''}" data-col="${col.id}"><div class="cellms-d ${sel.length?'':'ph'}">${esc(disp)}</div>`+
        (ro?'':`<div class="cellms-p">${(col.options||[]).map(o=>`<label><input type="checkbox" value="${esc(o)}" ${sel.includes(o)?'checked':''}> ${esc(o)}</label>`).join('')}</div>`)+`</div>`;
    }
    return `<input class="fc" data-col="${col.id}" ${dis} value="${esc(val)}">`;
  }
  function subRowHTML(q,row,idx,ro){
    const cols=q.columns||[];
    return `<tr>${cols.map(c=>`<td>${subCell(c,row?row[c.id]:'',ro)}</td>`).join('')}${ro?'':'<td class="op"><span class="subt-del" title="删除">×</span></td>'}</tr>`;
  }
  function fillSubtable(q,val,ro){
    FILLREG[q.id]=q;
    const cols=q.columns||[];
    if(!cols.length) return `<div class="q-sub">（未配置列）</div>`;
    const rows=asArr(val);
    const bodyRows = rows.length? rows.map((r,i)=>subRowHTML(q,r,i,ro)).join('')
      : (ro? `<tr><td colspan="${cols.length}" style="text-align:center;color:#c2ccd9">无数据</td></tr>` : subRowHTML(q,null,0,ro));
    return `<div class="q-subt" data-subt="${q.id}"><div class="subt-wrap"><table class="subt"><thead><tr>${cols.map(c=>`<th>${esc(c.name)||'列'}</th>`).join('')}${ro?'':'<th class="op"></th>'}</tr></thead>`+
      `<tbody>${bodyRows}</tbody></table></div>${ro?'':`<button type="button" class="btn sm subt-add" data-subt="${q.id}" style="margin-top:8px">＋ 添加一行</button>`}</div>`;
  }

  function renderFill(form, values, opts){
    opts=opts||{}; const ro=!!opts.readonly; values=values||{};
    const pages=form.pages||[]; const multi=pages.length>1; let no=0;
    const body=pages.map((p,pi)=>{
      const theme=p.theme?`<div class="pv-theme">${esc(p.theme)}</div>`:'';
      const cards=(p.cards||[]).map(cd=>{
        const ct=cd.title?`<div class="pv-card-t">${esc(cd.title)}</div>`:'';
        const qs=(cd.questions||[]).map(q=>{
          no++;
          const req=q.required?`<span class="q-req">*</span>`:'';
          const head=`<div class="q-h">${req}<span class="q-no">${no}.</span> <span class="q-title">${esc(q.title)||'未命名题目'}</span></div>`;
          const hint=q.hint?`<div class="q-hint">${esc(q.hint)}</div>`:'';
          return `<div class="q" data-qid="${q.id}" data-qtype="${q.type}">${head}${hint}<div class="q-b">${fillControl(q,values[q.id],ro)}</div></div>`;
        }).join('');
        return `<div class="pv-card">${ct}${qs}</div>`;
      }).join('');
      return `<section class="pv-page-sec" data-page="${pi}"${multi&&pi>0?' style="display:none"':''}>${theme}${cards}</section>`;
    }).join('');
    let pager='', nav='';
    if(multi){
      pager=`<div class="pv-pager">`+pages.map((p,pi)=>`<span class="pv-pagi ${pi===0?'active':''}" data-goto="${pi}">${pi+1}</span>`).join('')+`</div>`;
      nav=`<div class="pv-pagenav"><button type="button" class="btn pv-prev" disabled>← 上一页</button><span class="pv-pageinfo">第 1/${pages.length} 页</span><button type="button" class="btn pv-next">下一页 →</button></div>`;
    }
    return `<div class="pv-title">${esc(form.title)||'未命名表单'}</div>${pager}${body}${nav}`;
  }
  function showPage(root, idx){
    const secs=[...root.querySelectorAll('.pv-page-sec')]; if(!secs.length) return;
    idx=Math.max(0,Math.min(secs.length-1,idx));
    secs.forEach((s,i)=>s.style.display=(i===idx?'':'none'));
    root.querySelectorAll('.pv-pagi').forEach((p,i)=>p.classList.toggle('active',i===idx));
    const info=root.querySelector('.pv-pageinfo'); if(info)info.textContent=`第 ${idx+1}/${secs.length} 页`;
    const prev=root.querySelector('.pv-prev'), next=root.querySelector('.pv-next');
    if(prev)prev.disabled=(idx===0); if(next)next.disabled=(idx===secs.length-1);
    if(root.closest) { const box=root.closest('.m-b'); if(box) box.scrollTop=0; }
  }
  function curPage(root){ const secs=[...root.querySelectorAll('.pv-page-sec')]; const i=secs.findIndex(s=>s.style.display!=='none'); return i<0?0:i; }

  /* 绑定交互（标签回车、子表加/删行、多选列下拉） */
  function activate(root){
    if(!root||root._mjBound) return; root._mjBound=true;
    root.addEventListener('keydown',e=>{
      if(e.key==='Enter' && e.target.classList.contains('q-taginput')){
        e.preventDefault(); const v=e.target.value.trim(); if(!v) return;
        const chip=document.createElement('span'); chip.className='q-chip';
        chip.innerHTML=esc(v)+' <b class="tg-x">×</b>';
        e.target.parentNode.insertBefore(chip,e.target); e.target.value='';
      }
    });
    root.addEventListener('click',e=>{
      const t=e.target;
      if(t.classList.contains('pv-pagi')){ showPage(root, Number(t.getAttribute('data-goto'))); return; }
      if(t.classList.contains('pv-prev')){ showPage(root, curPage(root)-1); return; }
      if(t.classList.contains('pv-next')){ showPage(root, curPage(root)+1); return; }
      if(t.classList.contains('tg-x')){ t.closest('.q-chip').remove(); return; }
      if(t.classList.contains('subt-del')){ t.closest('tr').remove(); return; }
      if(t.classList.contains('subt-add')){
        const id=t.getAttribute('data-subt'); const q=FILLREG[id]; if(!q) return;
        const tb=t.parentNode.querySelector('tbody');
        const tmp=document.createElement('tbody'); tmp.innerHTML=subRowHTML(q,null,0,false);
        tb.appendChild(tmp.firstElementChild); return;
      }
      const d=t.closest('.cellms-d');
      if(d){
        const box=d.parentNode; const willOpen=!box.classList.contains('open');
        root.querySelectorAll('.cellms.open').forEach(x=>x.classList.remove('open'));
        if(willOpen){ box.classList.add('open'); const p=box.querySelector('.cellms-p'); const r=d.getBoundingClientRect();
          p.style.left=r.left+'px'; p.style.top=(r.bottom+2)+'px'; p.style.minWidth=r.width+'px'; }
        return;
      }
    });
    root.addEventListener('change',e=>{
      if(e.target.matches('.cellms input[type=checkbox]')){
        const box=e.target.closest('.cellms'); const sel=[...box.querySelectorAll('input:checked')].map(i=>i.value);
        const disp=box.querySelector('.cellms-d'); disp.textContent=sel.length?sel.join('、'):'请选择'; disp.classList.toggle('ph',!sel.length);
      }
    });
    document.addEventListener('click',e=>{ if(!e.target.closest('.cellms')) root.querySelectorAll('.cellms.open').forEach(x=>x.classList.remove('open')); });
  }

  /* 从 DOM 收集填报值 */
  function collectValues(root, form){
    const out={};
    (form.pages||[]).forEach(p=>(p.cards||[]).forEach(cd=>(cd.questions||[]).forEach(q=>{
      if(q.type==='image') return;
      const wrap=root.querySelector(`.q[data-qid="${q.id}"]`); if(!wrap) return;
      switch(q.type){
        case 'richtext': { const ed=wrap.querySelector('.q-richfill'); out[q.id]=ed?ed.innerHTML:''; break; }
        case 'radio': case 'radioScore': { const c=wrap.querySelector('input:checked'); out[q.id]=c?c.value:''; break; }
        case 'checkbox': case 'checkboxScore': out[q.id]=[...wrap.querySelectorAll('input:checked')].map(i=>i.value); break;
        case 'tags': out[q.id]=[...wrap.querySelectorAll('.q-chip')].map(c=>c.textContent.replace(/×\s*$/,'').trim()); break;
        case 'subtable': {
          const rows=[]; wrap.querySelectorAll('tbody tr').forEach(tr=>{
            if(tr.querySelector('td[colspan]')) return;
            const row={}; let any=false;
            (q.columns||[]).forEach(col=>{
              if(col.type==='checkbox'){ const box=tr.querySelector(`.cellms[data-col="${col.id}"]`); const sel=box?[...box.querySelectorAll('input:checked')].map(i=>i.value):[]; row[col.id]=sel; if(sel.length)any=true; }
              else{ const el=tr.querySelector(`.fc[data-col="${col.id}"]`); const v=el?el.value:''; row[col.id]=v; if(v)any=true; }
            });
            if(any) rows.push(row);
          });
          out[q.id]=rows; break;
        }
        default: { const el=wrap.querySelector('.q-fill'); out[q.id]=el?el.value:''; }
      }
    })));
    return out;
  }

  function _rt(e,cmd,val){ e.preventDefault(); document.execCommand(cmd,false,val||null); return false; }
  MJ.Engine = { renderQuestion, renderForm, renderFill, activate, collectValues, esc, _rt };
})();
