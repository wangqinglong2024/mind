/* 表单中台 · 共享数据层（新模型）
   模型：类目(单级) → 表单模板 → 分页 → 卡片 → 题目；发布状态为业务侧字段。存 localStorage，两端互通。 */
window.MJ = window.MJ || {};
(function(){
  const K = { cat:'mjf_cats', form:'mjf_forms', sub:'mjf_subs', ver:'mjf_ver' };
  const SEED_VER = '6';
  const uid = p => (p||'id')+'_'+Math.random().toString(36).slice(2,7);
  function load(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } }
  function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

  const TYPES = {
    radio:        { name:'单选',    group:'选择', choice:true },
    checkbox:     { name:'多选',    group:'选择', choice:true },
    radioScore:   { name:'单选打分', group:'选择', choice:true, score:true },
    checkboxScore:{ name:'多选打分', group:'选择', choice:true, score:true },
    text:         { name:'单行文本', group:'填空', query:'文本' },
    textarea:     { name:'多行文本', group:'填空' },
    number:       { name:'数字',    group:'填空', query:'数字' },
    date:         { name:'日期时间', group:'填空', query:'日期' },
    image:        { name:'图片',    group:'采集' },
    tags:         { name:'标签文本', group:'采集' },
    subtable:     { name:'列表',    group:'采集' },
    richtext:     { name:'富文本',  group:'采集', display:true },
  };
  const GROUPS = ['选择','填空','采集'];
  const QUERY_MODES = {
    文本:[['fuzzy','模糊匹配'],['exact','精准匹配']],
    数字:[['range','数字范围'],['exact','精准匹配']],
    日期:[['range','日期时间范围'],['exact','精准匹配']],
    radio:[['select','单选下拉筛选']],
    checkbox:[['multi','多选筛选']],
  };

  function newOption(){ return { text:'', linkType:null, linkName:'', linkId:null, score:'' }; }
  function newQuestion(type){
    const t = TYPES[type]; const q = { id:uid('q'), type, title:'', required:false, hint:'' };
    if(t.choice){ q.options=[newOption(),newOption(),newOption()]; q.linkEnabled=false; q.optionCols=1; }
    if(type==='richtext'){ q.content='请在此输入说明内容（支持加粗、颜色等），填写者可见'; }
    if(type==='number'){ q.unit=''; }
    q.query = { on:false, mode:'' };
    q.showInList = false;
    return q;
  }
  function newCard(title){ return { id:uid('cd'), title:title||'', questions:[] }; }
  function newPage(){ const c=newCard(''); c.questions.push(newQuestion('radio')); return { id:uid('pg'), theme:'', cards:[c] }; }
  function newForm(categoryId){
    return { id:uid('form'), categoryId:categoryId||null, title:'', status:'draft',
             createdBy:'张三', createdAt:Date.now(), updatedAt:Date.now(), updatedBy:'张三',
             pages:[newPage()] };
  }

  /* ---------- 种子 ---------- */
  function seed(){
    if(load(K.ver)===SEED_VER) return;
    const now = Date.now();
    const cats = [
      { id:'c_gxb',    name:'冠心病',   order:1 },
      { id:'c_common', name:'通用问诊', order:2 },
      { id:'c_expert', name:'专家数据', order:3 },
    ];
    const f1 = {
      id:'form_v1', categoryId:'c_gxb', title:'冠心病 · 初诊表', status:'published',
      createdBy:'张三', createdAt:now-86400000*3, updatedAt:now-3600000, updatedBy:'张三',
      pages:[
        { id:'p1', theme:'基本情况', cards:[
          { id:'cd1', title:'患者信息', questions:[
            { id:'q_sex', type:'radio', title:'您的性别', required:true, hint:'',
              options:[{text:'男'},{text:'女'},{text:'不愿透露'}], query:{on:true,mode:'select'}, showInList:true },
            { id:'q_age', type:'number', title:'年龄', required:true, unit:'岁', min:0, max:120,
              query:{on:true,mode:'range'}, showInList:true },
            { id:'q_visit', type:'date', title:'就诊日期', required:false, precision:'date',
              query:{on:true,mode:'range'}, showInList:true },
          ]}
        ]},
        { id:'p2', theme:'刻下症', cards:[
          { id:'cd2', title:'四诊', questions:[
            { id:'q_main', type:'text', title:'主诉', required:true, placeholder:'请描述主要不适', query:{on:true,mode:'fuzzy'}, showInList:true },
            { id:'q_sym', type:'checkboxScore', title:'兼症（按严重程度计分）', required:false, linkEnabled:true, optionCols:2,
              options:[{text:'体寒',score:'1'},{text:'发烧',linkType:'symptom',linkName:'发烧（体温高）',linkId:'sym_fever',score:'2'},{text:'乏力',score:'1'}] },
          ]},
          { id:'cd3', title:'温馨提示', questions:[
            { id:'q_desc', type:'richtext', title:'', content:'温馨提示：请<b>如实</b>填写，医生将根据填写内容为您<span style="color:#2b7de9">辨证施治</span>。' },
          ]},
        ]},
      ]
    };
    const f2 = newForm('c_common'); f2.id='form_draft'; f2.title='随访表（草稿）'; f2.status='draft'; f2.createdBy='李四'; f2.createdAt=now-86400000; f2.updatedAt=now-86400000; f2.updatedBy='李四';
    const f3 = JSON.parse(JSON.stringify(f1)); f3.id='form_off'; f3.categoryId='c_gxb'; f3.title='旧版初诊表'; f3.status='unpublished'; f3.createdAt=now-86400000*8;
    const forms=[f1,f2,f3];
    const subs=[
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*2, by:'患者A', values:{ q_sex:'男', q_age:64, q_visit:'2026-07-18', q_main:'胸闷气短2年', q_sym:['体寒','乏力'] } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*5, by:'患者B', values:{ q_sex:'女', q_age:58, q_visit:'2026-07-15', q_main:'心悸、劳累后明显', q_sym:['发烧'] } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*9, by:'患者C', values:{ q_sex:'男', q_age:71, q_visit:'2026-07-10', q_main:'活动后气促', q_sym:['乏力'] } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*26, by:'患者D', values:{ q_sex:'女', q_age:49, q_visit:'2026-07-05', q_main:'偶发心前区不适', q_sym:['体寒'] } },
    ];
    save(K.cat,cats); save(K.form,forms); save(K.sub,subs); save(K.ver,SEED_VER);
  }

  MJ.Store = {
    K, uid, seed, TYPES, GROUPS, QUERY_MODES, newForm, newPage, newCard, newQuestion, newOption,
    typeName:t=>(TYPES[t]||{}).name||t,
    queryModesFor(q){ switch(q.type){
      case 'radio': case 'checkbox': case 'radioScore': case 'checkboxScore': return [['select','单选查询'],['multi','多选查询']];
      case 'text': case 'textarea': case 'richtext': case 'tags': case 'subtable': return [['fuzzy','模糊查询'],['exact','精准查询']];
      case 'number': return [['range','数字范围']];
      case 'date': return [['range','日期时间范围']];
      default: return null; } },
    canQuery(q){ return !!this.queryModesFor(q); },
    getCategories(){ return load(K.cat, []).sort((a,b)=>a.order-b.order); },
    setCategories(v){ save(K.cat, v); },
    addCategory(name){ const cs=load(K.cat,[]); cs.push({id:uid('c'),name,order:cs.length+1}); save(K.cat,cs); },
    renameCategory(id,name){ const cs=load(K.cat,[]); const c=cs.find(x=>x.id===id); if(c){c.name=name;save(K.cat,cs);} },
    deleteCategory(id){ save(K.cat, load(K.cat,[]).filter(c=>c.id!==id)); },
    getForms(){ return load(K.form, []); },
    setForms(v){ save(K.form, v); },
    getForm(id){ return this.getForms().find(f=>f.id===id); },
    formsByCategory(catId){ return this.getForms().filter(f=>f.categoryId===catId); },
    saveForm(form){ const fs=this.getForms(); const i=fs.findIndex(f=>f.id===form.id); form.updatedAt=Date.now(); if(i>=0)fs[i]=form; else fs.push(form); save(K.form,fs); },
    deleteForm(id){ save(K.form, this.getForms().filter(f=>f.id!==id)); },
    getSubmissions(formId){ const s=load(K.sub,[]); return formId? s.filter(x=>x.formId===formId): s; },
    addSubmission(sub){ const s=load(K.sub,[]); s.push(sub); save(K.sub,s); },
    reset(){ [K.cat,K.form,K.sub,K.ver].forEach(k=>localStorage.removeItem(k)); seed(); },
  };
  seed();
})();
