/* 共享数据层：类目 / 表单 / 填报数据，存 localStorage，两端互通 */
window.MJ = window.MJ || {};
(function(){
  const K = { cat:'mj_categories', form:'mj_forms', sub:'mj_submissions', ver:'mj_seed_ver' };
  const SEED_VER = '7';
  const uid = p => (p||'id')+'_'+Math.random().toString(36).slice(2,8);

  function load(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch(e){ return d; } }
  function save(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

  /* ---------- 种子数据 ---------- */
  function demoForm(id, name, catId){
    return {
      id, name, categoryId:catId,
      roles:{ edit:['管理员','录入员'], view:['专家'] },
      pages:[
        { id:'pg1', title:'基本信息', cards:[
          { id:'cd1', title:'患者信息', fields:[
            { id:'f_name', type:'text',   label:'患者姓名', required:true, width:'1/2', showInList:true, hint:'与身份证一致', mask:true },
            { id:'f_sex',  type:'radio',  label:'性别', required:true, width:'1/2', showInList:true, options:['男','女'] },
            { id:'f_age',  type:'number', label:'年龄', required:true, width:'1/2', showInList:true, min:0, max:120, unit:'岁' },
            { id:'f_visit',type:'date',   label:'就诊日期', required:true, width:'1/2', showInList:true, defaultToday:true },
          ]}
        ]},
        { id:'pg2', title:'四诊与处方', cards:[
          { id:'cd2', title:'四诊', fields:[
            { id:'f_chief', type:'textarea', label:'主诉', required:true, showInList:false, hint:'患者本次就诊主要不适' },
            { id:'f_synd',  type:'tags', label:'证候要素', showInList:true, allowRepeat:false, hint:'输入词后回车添加标签，便于按标签统计' },
            { id:'f_sym',   type:'checkbox', label:'兼症', width:'full', showInList:false, options:['头晕','乏力','失眠','纳差','便秘'] },
            { id:'f_tongue',type:'image',    label:'舌象照片', showInList:false, max:3 },
          ]},
          { id:'cd3', title:'处方', fields:[
            { id:'f_rx', type:'subtable', label:'处方用药', showInList:false, allowAddRow:true, columns:[
              { id:'c_drug', type:'text',   label:'药名', required:true },
              { id:'c_dose', type:'number', label:'剂量', min:0, unit:'g' },
              { id:'c_unit', type:'radio',  label:'单位', options:['g','ml','枚'] },
              { id:'c_proc', type:'text',   label:'炮制' },
            ]}
          ]}
        ]}
      ]
    };
  }

  function seed(){
    if(load(K.ver)===SEED_VER) return;
    const cats = [
      { id:'c_zb',    name:'专病（医案）', parentId:null, order:1 },
      { id:'c_gxb',   name:'冠心病', parentId:'c_zb', order:1 },
      { id:'c_tnb',   name:'糖尿病', parentId:'c_zb', order:2 },
      { id:'c_expert',name:'专家数据', parentId:null, order:2 },
      { id:'c_pai',   name:'学术流派', parentId:null, order:3 },
    ];
    const fGxb = demoForm('form_gxb','冠心病初诊表','c_gxb');
    const fTnb = demoForm('form_tnb','糖尿病初诊表','c_tnb');
    const fExp = {
      id:'form_exp', name:'专家档案', categoryId:'c_expert',
      roles:{edit:['管理员'],view:['专家','录入员']},
      pages:[{ id:'ep1', title:'档案', cards:[{ id:'ec1', title:'基本信息', fields:[
        { id:'e_name', type:'text', label:'专家姓名', required:true, width:'1/2', showInList:true },
        { id:'e_title',type:'radio',label:'职称', width:'1/2', showInList:true, options:['主任医师','副主任医师','主治医师'] },
        { id:'e_good', type:'textarea', label:'擅长病种', showInList:true, hint:'优势病种、特色技法' },
        { id:'e_photo',type:'image', label:'照片', showInList:false, max:1 },
      ]}]}]
    };
    const forms = [fGxb, fTnb, fExp];

    const now = Date.now();
    const subs = [
      { id:uid('s'), formId:'form_gxb', categoryId:'c_gxb', createdAt:now-86400000*2, values:{
        f_name:'张建国', f_sex:'男', f_age:64, f_visit:'2026-07-10', f_chief:'胸闷气短反复发作2年，加重3天',
        f_synd:['气虚','血瘀'], f_sym:['乏力','失眠'], f_rx:[{c_drug:'黄芪',c_dose:30,c_unit:'g',c_proc:'生'},{c_drug:'丹参',c_dose:15,c_unit:'g',c_proc:''}] }},
      { id:uid('s'), formId:'form_gxb', categoryId:'c_gxb', createdAt:now-86400000, values:{
        f_name:'李秀兰', f_sex:'女', f_age:58, f_visit:'2026-07-18', f_chief:'心悸、胸痛，劳累后明显',
        f_synd:['痰浊','气滞'], f_sym:['头晕'], f_rx:[{c_drug:'瓜蒌',c_dose:20,c_unit:'g',c_proc:''}] }},
      { id:uid('s'), formId:'form_tnb', categoryId:'c_tnb', createdAt:now-3600000, values:{
        f_name:'王大明', f_sex:'男', f_age:52, f_visit:'2026-07-20', f_chief:'口渴多饮多尿半年' }},
      { id:uid('s'), formId:'form_exp', categoryId:'c_expert', createdAt:now-3600000*5, values:{
        e_name:'陈国华', e_title:'主任医师', e_good:'擅长冠心病、心律失常，善用益气活血法' }},
    ];

    save(K.cat, cats); save(K.form, forms); save(K.sub, subs); save(K.ver, SEED_VER);
  }

  /* ---------- 对外 API ---------- */
  MJ.Store = {
    K, uid, seed,
    getCategories(){ return load(K.cat, []); },
    setCategories(v){ save(K.cat, v); },
    getForms(){ return load(K.form, []); },
    setForms(v){ save(K.form, v); },
    getForm(id){ return this.getForms().find(f=>f.id===id); },
    saveForm(form){ const fs=this.getForms(); const i=fs.findIndex(f=>f.id===form.id); if(i>=0)fs[i]=form; else fs.push(form); save(K.form, fs); },
    deleteForm(id){ save(K.form, this.getForms().filter(f=>f.id!==id)); save(K.sub, load(K.sub,[]).filter(x=>x.formId!==id)); },
    getSubmissions(formId){ const s=load(K.sub, []); return formId? s.filter(x=>x.formId===formId): s; },
    addSubmission(sub){ const s=load(K.sub, []); s.push(sub); save(K.sub, s); },
    formsByCategory(catId){ return this.getForms().filter(f=>f.categoryId===catId); },
    reset(){ [K.cat,K.form,K.sub,K.ver].forEach(k=>localStorage.removeItem(k)); seed(); },
  };
  seed();
})();
