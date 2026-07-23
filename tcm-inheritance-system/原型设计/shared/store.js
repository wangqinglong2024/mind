/* 表单中台 · 共享数据层（新模型）
   模型：类目(单级) → 表单模板 → 分页 → 卡片 → 题目；发布状态为业务侧字段。存 localStorage，两端互通。
   状态：draft 草稿 / published 已发布 / unpublished 已下架（可再分 显示/隐藏 数据，见 form.hidden）。
        下架后禁止再次发布；删除为硬删除（连带清除采集数据）。 */
window.MJ = window.MJ || {};
(function(){
  const K = { cat:'mjf_cats', form:'mjf_forms', sub:'mjf_subs', ver:'mjf_ver' };
  const SEED_VER = '8';
  const uid = p => (p||'id')+'_'+Math.random().toString(36).slice(2,7);
  function load(k,d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } }
  function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }

  const TYPES = {
    radio:        { name:'单选',    group:'选择', choice:true },
    checkbox:     { name:'多选',    group:'选择', choice:true },
    radioScore:   { name:'单选打分', group:'选择', choice:true, score:true },
    checkboxScore:{ name:'多选打分', group:'选择', choice:true, score:true },
    text:         { name:'单行文本', group:'填空' },
    textarea:     { name:'多行文本', group:'填空' },
    number:       { name:'数字',    group:'填空' },
    date:         { name:'日期时间', group:'填空' },
    image:        { name:'图片',    group:'采集' },
    tags:         { name:'标签文本', group:'采集' },
    subtable:     { name:'列表',    group:'采集' },
    richtext:     { name:'富文本',  group:'采集' },
  };
  const GROUPS = ['选择','填空','采集'];

  /* 子表可用的列类型（单选/多选在填报端为下拉） */
  const SUBCOL_TYPES = [['text','单行文本'],['number','数字'],['date','日期'],['radio','单选(下拉)'],['checkbox','多选(下拉)']];
  function newSubCol(type){ return { id:uid('col'), name:'', type:type||'text', options: (type==='radio'||type==='checkbox')?['选项1','选项2']:[] }; }

  function newOption(){ return { text:'', linkType:null, linkName:'', linkId:null, score:'' }; }
  function newQuestion(type){
    const t = TYPES[type]; const q = { id:uid('q'), type, title:'', required:false, hint:'' };
    if(t.choice){ q.options=[newOption(),newOption(),newOption()]; q.linkEnabled=false; q.optionCols=1; }
    if(type==='radio'||type==='radioScore'){ q.defaultIndex=null; q.defaultEnabled=false; }
    if(type==='richtext'){ q.placeholder='请输入内容（支持加粗、颜色等）'; }
    if(type==='number'){ q.unit=''; }
    if(type==='subtable'){ q.columns=[newSubCol('text'),newSubCol('number')]; q.columns[0].name='名称'; q.columns[1].name='数值'; }
    q.query = { on:false, mode:'' };
    q.showInList = false;
    return q;
  }
  function newCard(title){ return { id:uid('cd'), title:title||'', questions:[] }; }
  function newPage(){ const c=newCard(''); c.questions.push(newQuestion('radio')); return { id:uid('pg'), theme:'', cards:[c] }; }
  function newForm(categoryId){
    return { id:uid('form'), categoryId:categoryId||null, title:'', status:'draft', hidden:false,
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
    /* 全组件示例表单（管理端默认 / 应用端查看模拟均用它） */
    const f1 = {
      id:'form_v1', categoryId:'c_gxb', title:'冠心病 · 初诊表', status:'published', hidden:false,
      createdBy:'张三', createdAt:now-86400000*3, updatedAt:now-3600000, updatedBy:'张三',
      pages:[
        { id:'p1', theme:'基本情况', cards:[
          { id:'cd1', title:'患者信息', questions:[
            { id:'q_sex', type:'radio', title:'性别', required:true, hint:'', linkEnabled:false, optionCols:2, defaultIndex:null,
              options:[{text:'男'},{text:'女'},{text:'不愿透露'}], query:{on:true,mode:'select'}, showInList:true },
            { id:'q_age', type:'number', title:'年龄', required:true, unit:'岁', min:0, max:120,
              query:{on:true,mode:'range'}, showInList:true },
            { id:'q_visit', type:'date', title:'就诊日期', required:false, precision:'date',
              query:{on:true,mode:'range'}, showInList:true },
            { id:'q_tel', type:'text', title:'联系电话', required:false, format:'phone', placeholder:'请输入手机号',
              query:{on:false,mode:''}, showInList:false },
          ]},
          { id:'cd_his', title:'既往史', questions:[
            { id:'q_past', type:'checkbox', title:'既往疾病', required:false, linkEnabled:false, optionCols:2,
              options:[{text:'高血压'},{text:'糖尿病'},{text:'高血脂'},{text:'无'}], query:{on:true,mode:'multi'}, showInList:false },
            { id:'q_allergy', type:'textarea', title:'过敏史', required:false, rows:2, placeholder:'如无请填“无”',
              query:{on:true,mode:'fuzzy'}, showInList:false },
          ]},
        ]},
        { id:'p2', theme:'刻下症', cards:[
          { id:'cd2', title:'四诊', questions:[
            { id:'q_main', type:'text', title:'主诉', required:true, placeholder:'请描述主要不适', query:{on:true,mode:'fuzzy'}, showInList:true },
            { id:'q_sym', type:'checkboxScore', title:'兼症（按严重程度计分）', required:false, linkEnabled:true, optionCols:2,
              options:[{text:'体寒',score:'1'},{text:'发烧',linkType:'symptom',linkName:'发烧（体温高）',linkId:'sym_fever',score:'2'},{text:'乏力',score:'1'},{text:'心悸',score:'2'}],
              query:{on:true,mode:'multi'}, showInList:false },
            { id:'q_tongue', type:'radioScore', title:'舌质', required:false, defaultEnabled:true, defaultIndex:0, linkEnabled:false, optionCols:1,
              options:[{text:'淡红',score:'0'},{text:'淡白',score:'1'},{text:'红',score:'2'}], query:{on:false,mode:''}, showInList:false },
            { id:'q_symtags', type:'tags', title:'症状标签', required:false, query:{on:true,mode:'fuzzy'}, showInList:false },
            { id:'q_temp', type:'number', title:'体温', required:false, unit:'℃', query:{on:false,mode:''}, showInList:false },
            { id:'q_photo', type:'image', title:'舌象照片', required:false, imgMax:3 },
            { id:'q_drug', type:'subtable', title:'用药记录', required:false,
              columns:[
                { id:'col_name', name:'药名', type:'text', options:[] },
                { id:'col_dose', name:'剂量', type:'text', options:[] },
                { id:'col_freq', name:'频次', type:'radio', options:['每日1次','每日2次','每日3次'] },
                { id:'col_way',  name:'用药方式', type:'checkbox', options:['口服','外用','注射'] },
                { id:'col_start',name:'起始日期', type:'date', options:[] },
              ], query:{on:false,mode:''}, showInList:false },
          ]},
          { id:'cd3', title:'补充', questions:[
            { id:'q_desc', type:'richtext', title:'病情补充说明', required:false, placeholder:'可填写病情补充，支持加粗、颜色等', query:{on:false,mode:''}, showInList:false },
          ]},
        ]},
      ]
    };
    const f2 = newForm('c_common'); f2.id='form_draft'; f2.title='随访表（草稿）'; f2.status='draft'; f2.createdBy='李四'; f2.createdAt=now-86400000; f2.updatedAt=now-86400000; f2.updatedBy='李四';
    const f3 = JSON.parse(JSON.stringify(f1)); f3.id='form_off'; f3.categoryId='c_gxb'; f3.title='旧版初诊表'; f3.status='unpublished'; f3.hidden=false; f3.createdAt=now-86400000*8;
    /* 通用问诊：一张已发布表单，保证该大类在应用端可见 */
    const f4 = {
      id:'form_common', categoryId:'c_common', title:'通用初诊问诊表', status:'published', hidden:false,
      createdBy:'王五', createdAt:now-86400000*2, updatedAt:now-3600000*4, updatedBy:'王五',
      pages:[{ id:'pc1', theme:'基本信息', cards:[{ id:'cdc1', title:'患者', questions:[
        { id:'g_sex', type:'radio', title:'性别', required:true, linkEnabled:false, optionCols:2, defaultIndex:null, options:[{text:'男'},{text:'女'}], query:{on:true,mode:'select'}, showInList:true },
        { id:'g_age', type:'number', title:'年龄', required:true, unit:'岁', query:{on:true,mode:'range'}, showInList:true },
        { id:'g_main', type:'text', title:'主诉', required:true, placeholder:'请描述主要不适', query:{on:true,mode:'fuzzy'}, showInList:true },
        { id:'g_his', type:'textarea', title:'现病史', required:false, rows:3, query:{on:true,mode:'fuzzy'}, showInList:false },
        { id:'g_date', type:'date', title:'就诊日期', required:false, precision:'date', query:{on:true,mode:'range'}, showInList:true },
      ]}]}]
    };
    /* 专家数据：一张已发布表单 */
    const f5 = {
      id:'form_expert', categoryId:'c_expert', title:'专家验案采集', status:'published', hidden:false,
      createdBy:'赵六', createdAt:now-86400000*5, updatedAt:now-3600000*8, updatedBy:'赵六',
      pages:[{ id:'pe1', theme:'验案', cards:[{ id:'cde1', title:'病例', questions:[
        { id:'e_name', type:'text', title:'患者姓名', required:true, query:{on:true,mode:'fuzzy'}, showInList:true },
        { id:'e_zx', type:'radio', title:'证型', required:true, linkEnabled:false, optionCols:2, defaultIndex:null, options:[{text:'气虚'},{text:'血瘀'},{text:'痰湿'},{text:'阴虚'}], query:{on:true,mode:'select'}, showInList:true },
        { id:'e_sym', type:'tags', title:'关键症状', required:false, query:{on:true,mode:'fuzzy'}, showInList:false },
        { id:'e_rx', type:'textarea', title:'处方', required:false, rows:3, query:{on:false,mode:''}, showInList:false },
        { id:'e_date', type:'date', title:'诊次日期', required:false, precision:'date', query:{on:true,mode:'range'}, showInList:true },
      ]}]}]
    };
    const forms=[f1,f2,f3,f4,f5];
    const subs=[
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*2, by:'患者A', values:{ q_sex:'男', q_age:64, q_visit:'2026-07-18', q_tel:'13800000001', q_past:['高血压','高血脂'], q_allergy:'无', q_main:'胸闷气短2年', q_sym:['体寒','乏力'], q_tongue:'淡白', q_symtags:['胸闷','气短'], q_temp:36.6, q_drug:[{col_name:'阿司匹林',col_dose:'100mg',col_freq:'每日1次',col_way:['口服'],col_start:'2026-07-01'}], q_desc:'既往<b>体健</b>，近期<span style="color:#2b7de9">规律服药</span>，未见明显不适。' } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*5, by:'患者B', values:{ q_sex:'女', q_age:58, q_visit:'2026-07-15', q_tel:'13800000002', q_past:['糖尿病'], q_allergy:'青霉素', q_main:'心悸、劳累后明显', q_sym:['发烧（体温高）'], q_tongue:'红', q_symtags:['心悸'], q_temp:37.8, q_drug:[] } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*9, by:'患者C', values:{ q_sex:'男', q_age:71, q_visit:'2026-07-10', q_past:['无'], q_main:'活动后气促', q_sym:['乏力'], q_tongue:'淡红', q_symtags:['气促'], q_temp:36.4, q_drug:[] } },
      { id:uid('s'), formId:'form_v1', createdAt:now-3600000*26, by:'患者D', values:{ q_sex:'女', q_age:49, q_visit:'2026-07-05', q_past:['高血压'], q_main:'偶发心前区不适', q_sym:['体寒'], q_tongue:'淡红', q_symtags:['胸痛'], q_temp:36.7, q_drug:[] } },
      { id:uid('s'), formId:'form_common', createdAt:now-3600000*3, by:'录入员', values:{ g_sex:'男', g_age:52, g_main:'反复头晕1月', g_his:'1月前无明显诱因出现头晕，休息后可缓解。', g_date:'2026-07-20' } },
      { id:uid('s'), formId:'form_common', createdAt:now-3600000*7, by:'录入员', values:{ g_sex:'女', g_age:38, g_main:'失眠多梦', g_his:'近半年入睡困难，易醒。', g_date:'2026-07-19' } },
      { id:uid('s'), formId:'form_expert', createdAt:now-3600000*10, by:'专家助理', values:{ e_name:'张患者', e_zx:'血瘀', e_sym:['胸痛','舌暗'], e_rx:'血府逐瘀汤加减', e_date:'2026-07-16' } },
      { id:uid('s'), formId:'form_expert', createdAt:now-3600000*30, by:'专家助理', values:{ e_name:'李患者', e_zx:'气虚', e_sym:['乏力','气短'], e_rx:'补中益气汤加减', e_date:'2026-07-12' } },
    ];
    save(K.cat,cats); save(K.form,forms); save(K.sub,subs); save(K.ver,SEED_VER);
  }

  MJ.Store = {
    K, uid, seed, TYPES, GROUPS, SUBCOL_TYPES, newForm, newPage, newCard, newQuestion, newOption, newSubCol,
    typeName:t=>(TYPES[t]||{}).name||t,
    /* 查询形式规则：
       选择题（含打分）→ 单选查询/多选查询；文本/多行/富文本/标签/列表 → 模糊/精准；数字 → 数字范围；日期 → 日期时间范围；图片不支持查询 */
    queryModesFor(q){ switch(q.type){
      case 'radio': case 'checkbox': case 'radioScore': case 'checkboxScore': return [['select','单选查询'],['multi','多选查询']];
      case 'text': case 'textarea': case 'richtext': case 'tags': case 'subtable': return [['fuzzy','模糊查询'],['exact','精准查询']];
      case 'number': return [['range','数字范围']];
      case 'date': return [['range','日期时间范围']];
      default: return null; } },
    canQuery(q){ return !!this.queryModesFor(q); },
    /* 可在数据列表中显示为列的题型：单选/单选打分/单行文本/数字/日期。
       富文本、列表、标签、多行文本、多选、多选打分、图片 不支持列显示 */
    canShowInList(q){ return ['radio','radioScore','text','number','date'].includes(q.type); },
    statusLabel(f){
      if(f.status==='draft') return '草稿';
      if(f.status==='published') return '已发布';
      if(f.status==='unpublished') return f.hidden? '已下架（隐藏数据）':'已下架（显示数据）';
      return f.status;
    },
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
    deleteForm(id){ save(K.form, this.getForms().filter(f=>f.id!==id)); save(K.sub, load(K.sub,[]).filter(s=>s.formId!==id)); },
    getSubmissions(formId){ const s=load(K.sub,[]); return formId? s.filter(x=>x.formId===formId): s; },
    addSubmission(sub){ const s=load(K.sub,[]); s.push(sub); save(K.sub,s); },
    updateSubmission(sub){ const s=load(K.sub,[]); const i=s.findIndex(x=>x.id===sub.id); if(i>=0){ s[i]=sub; save(K.sub,s); } },
    deleteSubmission(id){ save(K.sub, load(K.sub,[]).filter(s=>s.id!==id)); },
    reset(){ [K.cat,K.form,K.sub,K.ver].forEach(k=>localStorage.removeItem(k)); seed(); },
  };
  seed();
})();
