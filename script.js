/* js/app.js - Simple shared logic for EduVault prototype */
/* Data stored in localStorage keys:
   ev_resources, ev_notifications, ev_user, ev_downloads
*/

(function(){
  const LS_RES='ev_resources_v2', LS_NOTIF='ev_notif_v2', LS_USER='ev_user_v2', LS_DOWN='ev_downloads_v2';

  // sample data (from PDF)
  const sample = [
    {id:'r1', title:'Algorithm PPT', type:'pptx', size:'20 MB', uploader:'Sonam Pema', grade:'8', rating:3, saved:false, comments:['Good slides'], created:'2025-08-02'},
    {id:'r2', title:'Flowchart Guide', type:'pdf', size:'3.4 MB', uploader:'Thinley', grade:'9', rating:4, saved:true, comments:['Useful for lesson planning'], created:'2025-07-28'},
    {id:'r3', title:'Worksheet: Computer Ports', type:'docx', size:'0.4 MB', uploader:'Kuzu', grade:'10', rating:5, saved:false, comments:[], created:'2025-08-01'}
  ];

  // helpers
  function read(key, fallback){ try{ const s=localStorage.getItem(key); return s?JSON.parse(s):fallback }catch(e){return fallback}}
  function write(key, val){ localStorage.setItem(key, JSON.stringify(val)) }

  // init
  let resources = read(LS_RES, sample);
  let notifs = read(LS_NOTIF, []);
  let user = read(LS_USER, {name:'Guest', role:'Visitor'});
  let downloads = read(LS_DOWN, []);

  write(LS_RES, resources);
  write(LS_NOTIF, notifs);
  write(LS_USER, user);
  write(LS_DOWN, downloads);

  // DOM helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  // common init runs on every page
  function initCommon(){
    // show user
    $$('.user-area #userGreeting, #userGreeting2, #userGreeting3').forEach(el => { if(el) el.textContent = user.name || 'Guest' });
    $$('.user-area #userGreeting, #userGreeting2, #userGreeting3').forEach(el => { if(el) el.textContent = user.name || 'Guest' });

    // upload buttons open modal
    $$('#openUpload, #openUpload2, #openUpload3').forEach(b => { if(b) b.addEventListener('click', openUpload) });

    // logout
    $$('#logoutLink, #logoutLink2, #logoutLink3').forEach(b => { if(b) b.addEventListener('click', showLogout) });

    // notif buttons
    $$('#notifBtn, #notifBtnUploads, #notifBtnMy').forEach(b => { if(b) b.addEventListener('click', showNotifs) });

    // assistant
    if(byId('assistantBtn')) byId('assistantBtn').addEventListener('click', openAssistant);
    // close things
    $$('#closeDetail').forEach(b => b && b.addEventListener('click', closeDetails));
    $$('#closeUpload').forEach(b => b && b.addEventListener('click', closeUpload));
    $$('#closeAssistant').forEach(b => b && b.addEventListener('click', closeAssistant));
    if(byId('cancelLogout')) byId('cancelLogout').addEventListener('click', hideLogout);
    if(byId('confirmLogout')) byId('confirmLogout').addEventListener('click', doLogout);

    // upload form
    if(byId('uploadForm')) byId('uploadForm').addEventListener('submit', handleUpload);

    // login/register forms
    if(byId('registerForm')) byId('registerForm').addEventListener('submit', handleRegister);
    if(byId('loginFormPage')) byId('loginFormPage').addEventListener('submit', handleLoginPage);

    // assistant form
    if(byId('sendFeedback')) byId('sendFeedback').addEventListener('click', sendFeedback);
    if(byId('askAssistant')) byId('askAssistant').addEventListener('click', assistantAsk);

    // help page feedback
    if(byId('helpSendFeedback')) byId('helpSendFeedback').addEventListener('click', function(){
      const txt = byId('helpFeedback') ? byId('helpFeedback').value.trim() : '';
      if(!txt) return alert('Write feedback'); notifs.unshift({id:'n'+Date.now(), text:'Feedback sent', date:new Date().toISOString().slice(0,10), read:false}); write(LS_NOTIF, notifs); alert('Feedback saved (demo)');
    });

    // search handlers
    if(byId('searchMain')) byId('searchMain').addEventListener('input', renderRecent);
    if(byId('searchUploads')) byId('searchUploads').addEventListener('input', renderUploads);
    if(byId('searchMyUploads')) byId('searchMyUploads').addEventListener('input', renderMyUploads);
    if(byId('searchActivity')) byId('searchActivity').addEventListener('input', renderActivity);
    if(byId('searchTeachers')) byId('searchTeachers').addEventListener('input', renderTeachers);

    // filters
    if(byId('gradeFilter')) byId('gradeFilter').addEventListener('change', renderRecent);
    if(byId('typeFilter')) byId('typeFilter').addEventListener('change', renderUploads);
    if(byId('gradeFilterUploads')) byId('gradeFilterUploads').addEventListener('change', renderUploads);
    if(byId('typeFilter')) byId('typeFilter').addEventListener('change', renderUploads);
  }

  // Renders -------------------------------------------------
  function renderSummary(){
    if(byId('todayUploads')) byId('todayUploads').textContent = resources.filter(r=> r.created === (new Date()).toISOString().slice(0,10)).length;
    if(byId('totalUploads')) byId('totalUploads').textContent = resources.length;
    if(byId('totalSaved')) byId('totalSaved').textContent = resources.filter(r=>r.saved).length;
    if(byId('totalDownloaded')) byId('totalDownloaded').textContent = downloads.length;
    if(byId('notifCount')) byId('notifCount').textContent = notifs.filter(n=>!n.read).length;
    if(byId('notifCountUploads')) byId('notifCountUploads').textContent = notifs.filter(n=>!n.read).length;
    if(byId('notifCountMy')) byId('notifCountMy').textContent = notifs.filter(n=>!n.read).length;
  }

  function renderRecent(){
    const container = byId('recentList');
    if(!container) return;
    const q = byId('searchMain') ? byId('searchMain').value.trim().toLowerCase() : '';
    const gradeSel = byId('gradeFilter') ? byId('gradeFilter').value : 'all';
    container.innerHTML = '';
    let list = resources.slice().sort((a,b)=> new Date(b.created) - new Date(a.created));
    if(gradeSel !== 'all') list = list.filter(r => String(r.grade) === gradeSel);
    if(q) list = list.filter(r => (r.title + r.uploader + r.type).toLowerCase().includes(q));
    list.forEach(r => container.appendChild(renderResourceItem(r)));
  }

  function renderUploads(){
    const container = byId('uploadsTable');
    if(!container) return;
    container.innerHTML = '';
    const q = byId('searchUploads') ? byId('searchUploads').value.trim().toLowerCase() : '';
    const typeSel = byId('typeFilter') ? byId('typeFilter').value : 'all';
    const gradeSel = byId('gradeFilterUploads') ? byId('gradeFilterUploads').value : 'all';
    let list = resources.slice();
    if(typeSel !== 'all') list = list.filter(r => r.type === typeSel);
    if(gradeSel !== 'all') list = list.filter(r => String(r.grade) === gradeSel);
    if(q) list = list.filter(r => (r.title + r.uploader).toLowerCase().includes(q));
    if(list.length===0) { container.innerHTML = '<div class="item">No uploads found.</div>'; return; }
    list.forEach(r => container.appendChild(renderResourceRow(r)));
  }

  function renderMyUploads(){
    const container = byId('myUploadsList');
    if(!container) return;
    const uname = user.name || 'Guest';
    let list = resources.filter(r => r.uploader === uname);
    if(list.length===0) container.innerHTML = '<div class="item">No uploads yet.</div>';
    else container.innerHTML = '', list.forEach(r => container.appendChild(renderResourceItem(r)));
  }

  function renderActivity(){
    const containerSaved = byId('savedList'); if(containerSaved) containerSaved.innerHTML = '';
    const containerDown = byId('downloadedList'); if(containerDown) containerDown.innerHTML = '';
    const saved = resources.filter(r=> r.saved);
    saved.forEach(r=> containerSaved && containerSaved.appendChild(renderResourceItem(r)));
    downloads.forEach(id => {
      const r = resources.find(x=>x.id===id);
      if(r && containerDown) containerDown.appendChild(renderResourceItem(r));
    });
  }

  function renderTeachers(){
    const container = byId('teacherList'); if(!container) return;
    container.innerHTML = '';
    // create aggregated teacher cards from resources
    const teacherMap = {};
    resources.forEach(r => {
      if(!teacherMap[r.uploader]) teacherMap[r.uploader] = {name:r.uploader, uploads:0, ratingSum:0, ratingCount:0};
      teacherMap[r.uploader].uploads++;
      teacherMap[r.uploader].ratingSum += (r.rating||0);
      teacherMap[r.uploader].ratingCount++;
    });
    Object.values(teacherMap).forEach(t => {
      const el = document.createElement('div'); el.className='tile';
      const avg = t.ratingCount ? (t.ratingSum / t.ratingCount).toFixed(1) : '—';
      el.innerHTML = `<div style="font-weight:700">${t.name}</div><div class="meta">Grade(s): —</div><div style="margin-top:8px">Uploads: ${t.uploads} • Rating: ${avg}</div>
      <div style="margin-top:10px"><button class="btn small view-teacher" data-name="${t.name}">View profile</button></div>`;
      container.appendChild(el);
    });
    $$('.view-teacher').forEach(b => b.addEventListener('click', e => {
      const name = e.currentTarget.dataset.name;
      alert('Teacher profile (demo): ' + name);
    }));
  }

  // Render helpers: item (card) and row (table)
  function renderResourceItem(r){
    const el = document.createElement('div');
    el.className='item';
    el.innerHTML = `<div>
      <div style="font-weight:700">${r.title}</div>
      <div class="meta">${r.type} • ${r.size} • Grade ${r.grade} • ${r.uploader} • ${r.created}</div>
    </div>
    <div class="actions">
      <button class="btn small view" data-id="${r.id}">View</button>
      <button class="btn small save" data-id="${r.id}">${r.saved ? 'Saved' : 'Save'}</button>
      <button class="btn small download" data-id="${r.id}">Download</button>
    </div>`;
    // wire
    el.querySelector('.view').addEventListener('click', ()=> openDetails(r.id));
    el.querySelector('.save').addEventListener('click', ()=> { toggleSave(r.id); renderAll(); });
    el.querySelector('.download').addEventListener('click', ()=> { recordDownload(r.id); renderAll(); alert('Simulated download: ' + r.title); });
    return el;
  }

  function renderResourceRow(r){
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `<div style="flex:1">
      <div style="font-weight:700">${r.title}</div>
      <div class="meta">${r.type} • ${r.size} • Grade ${r.grade} • ${r.uploader}</div>
    </div>
    <div class="actions">
      <button class="btn small view" data-id="${r.id}">View</button>
      <button class="btn small save" data-id="${r.id}">${r.saved ? 'Saved':'Save'}</button>
      <button class="btn small" data-id="${r.id}">Rate (${r.rating||0})</button>
    </div>`;
    el.querySelector('.view').addEventListener('click', ()=> openDetails(r.id));
    el.querySelector('.save').addEventListener('click', ()=> { toggleSave(r.id); renderAll(); });
    // rating button can prompt
    el.querySelectorAll('.btn')[2].addEventListener('click', ()=> {
      const val = prompt('Enter rating 1-5', r.rating||3);
      const n = Number(val); if(n>=1 && n<=5){ r.rating = n; write(LS_RES, resources); renderAll(); }
    });
    return el;
  }

  // Actions -------------------------------------------------
  function openDetails(id){
    const r = resources.find(x=>x.id===id);
    if(!r) return;
    byId('detailTitle').textContent = r.title;
    byId('detailUploader').textContent = r.uploader;
    byId('detailType').textContent = r.type;
    byId('detailSize').textContent = r.size;
    byId('detailGrade').textContent = r.grade;
    byId('detailRating').textContent = (r.rating||0) + ' ★';
    // comments
    const com = byId('detailComments'); com.innerHTML = '';
    (r.comments||[]).forEach(c=> { const d=document.createElement('div'); d.className='comment'; d.textContent = c; com.appendChild(d); });
    // save state of save button
    byId('saveBtn').textContent = r.saved ? 'Saved' : 'Save';
    // attach handlers
    byId('saveBtn').onclick = ()=> { toggleSave(id); byId('saveBtn').textContent = resources.find(x=>x.id===id).saved ? 'Saved':'Save'; renderAll(); }
    byId('downloadBtn').onclick = ()=> { recordDownload(id); alert('Downloaded: '+r.title); renderAll(); }
    byId('reportBtn').onclick = ()=> { notifs.unshift({id:'n'+Date.now(), text:'Report: '+r.title, date:new Date().toISOString().slice(0,10), read:false}); write(LS_NOTIF, notifs); alert('Reported (demo)'); renderAll(); }
    byId('addComment').onclick = ()=> {
      const txt = byId('commentText').value.trim(); if(!txt) return alert('Write comment'); r.comments.push(txt); write(LS_RES, resources); byId('commentText').value=''; openDetails(id);
    }
    showModal('detailsModal');
  }

  function toggleSave(id){
    resources = resources.map(r => r.id===id ? {...r, saved: !r.saved} : r);
    write(LS_RES, resources);
  }

  function recordDownload(id){
    downloads.unshift(id); write(LS_DOWN, downloads);
  }

  function handleUpload(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get('title') || 'Untitled';
    const type = fd.get('type') || 'pdf';
    const grade = fd.get('grade') || '8';
    const uploader = fd.get('uploader') || (user.name || 'Guest');
    const size = fd.get('size') ? fd.get('size') + ' MB' : '1 MB';
    const rating = Number(fd.get('rating')) || 3;
    const id = 'r' + Date.now();
    const item = {id, title, type, size, uploader, grade, rating, saved:false, comments:[], created:new Date().toISOString().slice(0,10)};
    resources.unshift(item); write(LS_RES, resources);
    notifs.unshift({id:'n'+Date.now(), text:`New resource uploaded: ${title}`, date:new Date().toISOString().slice(0,10), read:false}); write(LS_NOTIF, notifs);
    e.target.reset(); closeUpload(); renderAll();
  }

  // auth simulation
  function handleRegister(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name'); const role = fd.get('role') || 'Student';
    user = {name, role}; write(LS_USER, user); alert('Registered as ' + name + ' ('+role+')'); location.href='index.html';
  }
  function handleLoginPage(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get('username') || 'Guest';
    user = {name:username, role:'Student'}; write(LS_USER, user); alert('Signed in as ' + username); location.href='index.html';
  }

  // assistant / feedback
  function openAssistant(){ showModal('assistantModal'); }
  function closeAssistant(){ hideModal('assistantModal'); }
  function sendFeedback(){ const txt = byId('feedbackText') ? byId('feedbackText').value.trim() : ''; if(!txt) return alert('Write feedback'); notifs.unshift({id:'n'+Date.now(), text:'Feedback sent', date:new Date().toISOString().slice(0,10), read:false}); write(LS_NOTIF, notifs); alert('Feedback received (demo)'); closeAssistant(); renderAll(); }
  function assistantAsk(){ const q = byId('assistantQuery').value.trim().toLowerCase(); const out = byId('assistantAnswer'); if(!q) return; if(q.includes('upload')) out.textContent = 'To upload: Click "Upload new file", fill details and press Upload.'; else if(q.includes('download')) out.textContent = 'Click View → Download; the demo simulates downloading.'; else out.textContent = 'Try searching or ask about upload/download.'; }

  // notifications and logout
  function showNotifs(){ if(notifs.length===0) alert('No notifications'); else alert(notifs.map(n => `${n.text} (${n.date})`).join('\n')); }
  function showLogout(){ showModal('logoutConfirm'); }
  function hideLogout(){ hideModal('logoutConfirm'); }
  function doLogout(){ user = {name:'Guest', role:'Visitor'}; write(LS_USER, user); hideModal('logoutConfirm'); alert('Logged out (demo)'); location.href='index.html'; }

  // modal helpers
  function showModal(id){ if(byId('overlay')) byId('overlay').classList.remove('hidden'); if(byId(id)) byId(id).classList.remove('hidden'); }
  function hideModal(id){ if(byId('overlay')) byId('overlay').classList.add('hidden'); if(byId(id)) byId(id).classList.add('hidden'); }
  function closeDetails(){ hideModal('detailsModal'); }
  function closeUpload(){ hideModal('uploadModal'); }
  // wire close overlay to hide
  document.addEventListener('click', function(e){ if(e.target.id === 'overlay'){ hideModal('detailsModal'); hideModal('uploadModal'); hideModal('assistantModal'); hideModal('logoutConfirm'); } });

  // render all visible parts depending on page
  function renderAll(){
    renderSummary(); renderRecent(); renderUploads(); renderMyUploads(); renderActivity(); renderTeachers();
  }

  // initial boot
  document.addEventListener('DOMContentLoaded', function(){
    initCommon();
    renderAll();
    // wire some dynamic buttons present only on index page
    if(byId('addComment')) byId('addComment').addEventListener('click', ()=>{ /* handled dynamically in openDetails */ });
    if(byId('confirmLogout')) byId('confirmLogout').addEventListener('click', doLogout);

    // search inputs pre-bound inside initCommon
  });
})();
