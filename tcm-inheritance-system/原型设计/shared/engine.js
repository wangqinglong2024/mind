/* 渲染引擎：预览 / 应用端填报 共用。问卷网风格，题目整行；卡片分组。
   interactive=true 时渲染可真实填写的控件（预览/填报）；false 时为禁用占位（搭建器非选择题预览）。 */
window.MJ = window.MJ || {};
(function(){
  const esc = s => (s==null?'':String(s)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const optLabel = o => o.linkName || o.text || '';

  function choiceList(q, interactive){
    const isRadio = (q.type==='radio'||q.type==='radioScore');
    const inputType = isRadio?'radio':'checkbox';
    const scored = (q.type==='radioScore'||q.type==='checkboxScore');
    const cols = Number(q.optionCols)===2 ? ' cols2' : '';
    return `<div class="q-opts${cols}">`+ (q.options||[]).map((o,i)=>{
      const score = scored && o.score!=='' && o.score!=null ? `<span class="q-score">${esc(o.score)}分</span>` : '';
      const ctrl = interactive
        ? `<input type="${inputType}" name="${q.id}" class="q-real">`
        : `<span class="${isRadio?'q-radio':'q-check'}"></span>`;
      return `<label class="q-opt">${ctrl}<span class="q-opt-t">${esc(optLabel(o))||'<i class=ph>选项'+(i+1)+'</i>'}</span>${score}</label>`;
    }).join('') + `</div>`;
  }

  function renderQuestion(q, no, interactive){
    if(q.type==='richtext'){
      // 预览(interactive)=富文本编辑器；查看数据(非interactive)=渲染
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
      case 'tags': body=`<div class="q-tags"><span class="q-chip">示例标签 ×</span><input class="q-input q-taginput" ${dis} placeholder="输入后回车添加"></div>`; break;
      case 'subtable': body=`<div class="q-sub">列表：多列可加行（列表组件）</div>`; break;
      default: body='';
    }
    return `<div class="q">${head}${hint}<div class="q-b">${body}</div></div>`;
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

  MJ.Engine = { renderQuestion, renderForm, esc };
})();
