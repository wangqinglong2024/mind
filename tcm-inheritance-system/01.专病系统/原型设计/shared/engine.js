/* 表单渲染引擎：布局算法 + 填报渲染。管理端预览与应用端共用，保证"预览=应用端" */
window.MJ = window.MJ || {};
(function(){
  const BLOCK = new Set(['textarea','tags','image','subtable']); // 块级：固定整行
  const WIDTHS = { 'full':1, '3/4':0.75, '2/3':2/3, '1/2':0.5, '1/3':1/3, '1/4':0.25 };
  const TYPE_NAME = { text:'单行文本', textarea:'多行文本', radio:'单选', checkbox:'多选', number:'数字', date:'日期', image:'图片', tags:'标签文本', subtable:'列表' };
  const EPS = 0.005;
  const el = (t,c,txt)=>{ const e=document.createElement(t); if(c)e.className=c; if(txt!=null)e.textContent=txt; return e; };

  function effWidth(f, device){
    if(BLOCK.has(f.type)) return 1;
    let w = WIDTHS[f.width] ?? 1;
    if(device==='h5') w = (w<=0.5+EPS) ? 0.5 : 1;  // 移动端降档：≤½→½，>½→整行
    return w;
  }

  // 行排布：放不下换行；每行最后一个拉伸填满剩余
  function layoutRows(fields, device){
    const rows=[]; let cur=[]; let used=0;
    const flush=()=>{ if(cur.length){ const rem=1-used; if(rem>EPS) cur[cur.length-1].w+=rem; rows.push(cur); cur=[]; used=0; } };
    fields.forEach(f=>{
      const w=effWidth(f,device);
      if(w>=1-EPS){ flush(); rows.push([{f,w:1}]); return; }      // 块级/整行独占
      if(used+w>1+EPS) flush();                                    // 放不下先收尾换行
      cur.push({f,w}); used+=w;
    });
    flush();
    return rows;
  }

  /* ---------- 单个字段控件 ---------- */
  function control(f, value, device){
    const t=f.type;
    if(t==='text'||t==='number'||t==='date'){
      const inp=el('input','ctrl');
      inp.type = t==='number'?'number' : t==='date'?'date' : 'text';
      if(t==='number'){ if(f.min!=null)inp.min=f.min; if(f.max!=null)inp.max=f.max; }
      if(value!=null) inp.value=value;
      else if(t==='date'&&f.defaultToday) inp.value=new Date().toISOString().slice(0,10);
      if(f.placeholder) inp.placeholder=f.placeholder;
      if(t==='number'&&f.unit){
        const wrap=el('div','suffix'); inp.classList.remove('ctrl'); wrap.appendChild(inp);
        const u=el('span','u',f.unit); wrap.appendChild(u);
        return { node:wrap, get:()=> inp.value===''?'':(t==='number'?Number(inp.value):inp.value), mark:s=>inp.style.borderColor=s?'var(--danger)':'' };
      }
      return { node:inp, get:()=> inp.value===''?'':(t==='number'?Number(inp.value):inp.value), mark:s=>inp.style.borderColor=s?'var(--danger)':'' };
    }
    if(t==='textarea'){
      const ta=el('textarea','ctrl'); if(f.rows)ta.rows=f.rows; if(value)ta.value=value; if(f.placeholder)ta.placeholder=f.placeholder;
      return { node:ta, get:()=>ta.value, mark:s=>ta.style.borderColor=s?'var(--danger)':'' };
    }
    if(t==='radio'){ // 单选：下拉列表
      const s=el('select','ctrl'); const ph=el('option',null,'请选择'); ph.value=''; s.appendChild(ph);
      (f.options||[]).forEach(o=>{ const op=el('option',null,o); op.value=o; s.appendChild(op); });
      if(value!=null&&value!=='') s.value=value;
      return { node:s, get:()=>s.value, mark:st=>s.style.borderColor=st?'var(--danger)':'' };
    }
    if(t==='checkbox'){ // 多选：多选下拉
      const box=el('div','ms'); const disp=el('div','ms-disp ctrl'); const panel=el('div','ms-panel');
      const sel=new Set(Array.isArray(value)?value:[]);
      const sync=()=>{ disp.textContent = sel.size? [...sel].join('、') : '请选择'; disp.classList.toggle('placeholder', sel.size===0); };
      (f.options||[]).forEach(o=>{ const lab=el('label','ms-opt'); const i=el('input'); i.type='checkbox'; i.value=o; if(sel.has(o))i.checked=true; i.onchange=()=>{ i.checked?sel.add(o):sel.delete(o); sync(); }; lab.append(i,el('span',null,o)); panel.appendChild(lab); });
      disp.onclick=e=>{ e.stopPropagation(); box.classList.toggle('open'); };
      box.addEventListener('_close',()=>box.classList.remove('open'));
      document.addEventListener('click',()=>box.classList.remove('open'));
      box.append(disp,panel); sync();
      return { node:box, get:()=>[...sel], mark:st=>disp.style.borderColor=st?'var(--danger)':'' };
    }
    if(t==='tags'){
      const box=el('div','tags-field'); const chips=el('div','chips'); const arr=Array.isArray(value)?value.slice():[];
      const render=()=>{ chips.innerHTML=''; arr.forEach((tg,i)=>{ const c=el('span','chip'); c.appendChild(el('span',null,tg)); const x=el('span','chip-x','×'); x.onclick=()=>{arr.splice(i,1);render();}; c.appendChild(x); chips.appendChild(c); }); };
      const push=v=>{ v=(v||'').trim(); if(!v)return; if(!f.allowRepeat&&arr.includes(v))return; if(f.maxTags&&arr.length>=f.maxTags)return; arr.push(v); render(); };
      const inp=el('input','ctrl'); inp.placeholder='输入词后回车添加标签';
      inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); push(inp.value); inp.value=''; } };
      box.appendChild(chips); box.appendChild(inp);
      render();
      return { node:box, get:()=>arr.slice(), mark:s=>box.style.outline=s?'1px solid var(--danger)':'' };
    }
    if(t==='image'){
      const wrap=el('div','imgs'); const store=[];
      const add=el('label','img-add','+');
      const file=el('input'); file.type='file'; file.accept='image/*'; file.multiple=(f.max||9)>1; file.style.display='none';
      add.appendChild(file);
      const render=()=>{ wrap.querySelectorAll('.thumb').forEach(n=>n.remove()); store.forEach(src=>{ const im=el('img','thumb'); im.src=src; wrap.insertBefore(im,add); }); };
      file.onchange=()=>{ [...file.files].slice(0,(f.max||9)-store.length).forEach(fl=>store.push(URL.createObjectURL(fl))); file.value=''; render(); };
      if(Array.isArray(value)) value.forEach(v=>store.push(v));
      wrap.appendChild(add); render();
      return { node:wrap, get:()=>store.slice(), mark:()=>{} };
    }
    if(t==='subtable'){
      const wrap=el('div','subt-wrap'); const tb=el('table','subt');
      const thead=el('thead'); const htr=el('tr'); htr.appendChild(el('th','idx','#'));
      (f.columns||[]).forEach(c=>htr.appendChild(el('th',null,c.label))); htr.appendChild(el('th','op','操作'));
      thead.appendChild(htr); tb.appendChild(thead);
      const body=el('tbody'); tb.appendChild(body);
      const rows=[];
      function addRow(data){
        const tr=el('tr'); const idx=el('td','idx'); tr.appendChild(idx);
        const cells=(f.columns||[]).map(c=>{
          const td=el('td'); let node,get;
          if(c.type==='radio'){ const s=el('select'); (c.options||[]).forEach(o=>{const op=el('option',null,o);op.value=o;s.appendChild(op);}); if(data&&data[c.id]!=null)s.value=data[c.id]; node=s; get=()=>s.value; }
          else { const i=el('input'); i.type=c.type==='number'?'number':(c.type==='date'?'date':'text'); if(data&&data[c.id]!=null)i.value=data[c.id]; node=i; get=()=>i.value===''?'':(c.type==='number'?Number(i.value):i.value); }
          td.appendChild(node); tr.appendChild(td); return {c,get};
        });
        const opTd=el('td','op'); const del=el('span','link danger','删除'); del.onclick=()=>{ const i=rows.indexOf(ref); if(i>=0){rows.splice(i,1);} tr.remove(); renum(); }; opTd.appendChild(del); tr.appendChild(opTd);
        const ref={tr,cells}; rows.push(ref); body.appendChild(tr); renum();
      }
      function renum(){ [...body.children].forEach((tr,i)=>tr.firstChild.textContent=i+1); }
      (Array.isArray(value)&&value.length?value:[null]).forEach(addRow);
      wrap.appendChild(tb);
      const bar=el('div'); bar.style.padding='8px'; const btn=el('button','btn sm','+ 添加一行'); btn.type='button'; btn.onclick=()=>addRow(null); bar.appendChild(btn); wrap.appendChild(bar);
      return { node:wrap, get:()=> rows.map(r=>{ const o={}; r.cells.forEach(cc=>o[cc.c.id]=cc.get()); return o; }), mark:()=>{} };
    }
    const span=el('div','hint','[未知类型]'); return {node:span,get:()=>null,mark:()=>{}};
  }

  function renderField(f, value, device){
    const wrap=el('div','field'+(f.required?' req':''));
    wrap.appendChild(el('label',null,f.label||TYPE_NAME[f.type]||''));
    const c=control(f, value, device);
    wrap.appendChild(c.node);
    if(f.hint) wrap.appendChild(el('div','hint',f.hint));
    const errEl=el('div','err'); errEl.style.display='none'; wrap.appendChild(errEl);
    return { field:f, wrap, get:c.get, validate(){
      const v=c.get(); let msg='';
      const empty = v===''||v==null||(Array.isArray(v)&&v.length===0);
      if(f.required && empty) msg='此项必填';
      else if(f.type==='number'&&v!==''){ if(f.min!=null&&v<f.min)msg=`不能小于${f.min}`; if(f.max!=null&&v>f.max)msg=`不能大于${f.max}`; }
      c.mark(!!msg); errEl.textContent=msg; errEl.style.display=msg?'block':'none';
      return !msg;
    }};
  }

  /* ---------- 整表渲染 ---------- */
  function renderForm(form, opts){
    opts=opts||{}; const device=opts.device||'web'; const values=opts.values||{};
    const root=el('div','mj-form'); if(device==='h5') root.classList.add('h5');
    const items=[]; let pageIdx=0;
    const pageWraps=[];
    const nav=el('div','page-nav');
    form.pages.forEach((pg,pi)=>{
      const pill=el('div','page-pill'+(pi===0?' active':'')); pill.appendChild(el('span',null,pg.title||('第'+(pi+1)+'页')));
      pill.appendChild(el('span','n',(pi+1)+'/'+form.pages.length)); pill.onclick=()=>goto(pi); nav.appendChild(pill);
    });
    if(form.pages.length>1) root.appendChild(nav);

    form.pages.forEach((pg,pi)=>{
      const pageEl=el('div','page'); pageEl.style.display= pi===0?'block':'none';
      (pg.cards||[]).forEach(card=>{
        const cardEl=el('div','form-card');
        cardEl.appendChild(el('div','h',card.title||'卡片'));
        const body=el('div','b');
        layoutRows(card.fields||[], device).forEach(row=>{
          const rowEl=el('div','mj-row');
          row.forEach(it=>{
            const col=el('div','mj-col'); col.style.flex='0 0 '+(it.w*100)+'%'; col.style.maxWidth=(it.w*100)+'%';
            const rf=renderField(it.f, values[it.f.id], device); items.push(rf); col.appendChild(rf.wrap); rowEl.appendChild(col);
          });
          body.appendChild(rowEl);
        });
        cardEl.appendChild(body); pageEl.appendChild(cardEl);
      });
      pageWraps.push(pageEl); root.appendChild(pageEl);
    });

    // 底部翻页
    const foot=el('div','page-nav'); foot.style.marginTop='4px'; foot.style.justifyContent='space-between';
    const prev=el('button','btn','上一步'); const next=el('button','btn primary','下一步'); const submit=el('button','btn green','提交');
    prev.type=next.type=submit.type='button';
    const left=el('div'); left.appendChild(prev); const right=el('div'); right.appendChild(next); right.appendChild(submit);
    foot.appendChild(left); foot.appendChild(right);
    if(form.pages.length>0) root.appendChild(foot);

    function refreshFoot(){ prev.style.visibility=pageIdx>0?'visible':'hidden'; const last=pageIdx===form.pages.length-1; next.style.display=last?'none':''; submit.style.display=last?'':'none'; }
    function goto(i){ pageIdx=Math.max(0,Math.min(form.pages.length-1,i)); pageWraps.forEach((p,idx)=>p.style.display=idx===pageIdx?'block':'none'); [...nav.children].forEach((c,idx)=>c.classList.toggle('active',idx===pageIdx)); refreshFoot(); root.scrollTop=0; }
    function validatePage(idx){ let ok=true; items.forEach(it=>{ const inPage=form.pages[idx].cards.some(c=>c.fields.some(ff=>ff.id===it.field.id)); if(inPage && !it.validate()) ok=false; }); return ok; }
    prev.onclick=()=>goto(pageIdx-1);
    next.onclick=()=>{ if(validatePage(pageIdx)) goto(pageIdx+1); };
    refreshFoot();

    return {
      el:root, pageNext:next, pageSubmit:submit,
      collect(){ const o={}; items.forEach(it=>o[it.field.id]=it.get()); return o; },
      validate(){ let ok=true; items.forEach(it=>{ if(!it.validate())ok=false; }); if(!ok){ for(let i=0;i<form.pages.length;i++){ if(!validatePage(i)){ goto(i); break; } } } return ok; },
      onSubmit(cb){ submit.onclick=()=>{ if(this.validate()) cb(this.collect()); }; }
    };
  }

  /* ---------- 列表列（动态基于字段） ---------- */
  function listColumns(form){
    const cols=[];
    form.pages.forEach(pg=>pg.cards.forEach(cd=>cd.fields.forEach(f=>{ if(f.showInList) cols.push(f); })));
    return cols;
  }
  function summary(f, v){
    if(v==null||v==='') return '';
    if(f.type==='image') return Array.isArray(v)&&v.length?('📷 '+v.length+'张'):'';
    if(f.type==='subtable') return Array.isArray(v)?(v.length+' 条'):'';
    if(f.type==='checkbox') return Array.isArray(v)?v.join('、'):v;
    if(f.type==='number'&&f.unit) return v+f.unit;
    return String(v);
  }

  MJ.Engine = { renderForm, layoutRows, effWidth, listColumns, summary, TYPE_NAME, BLOCK, WIDTHS };
})();
