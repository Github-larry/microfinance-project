const API = 'http://localhost:3000';


const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    try {
      const res = await fetch(`${API}/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
      const users = await res.json();
      if (users.length === 0) {
        document.getElementById('login-error').textContent = 'Invalid username or password';
        return;
      }
       const user = users[0];
       
      localStorage.setItem('mfs_user', JSON.stringify({ id: user.id, username: user.username, 
        role: user.role, name: user.name, branchId: user.branchId }));
      window.location.href = 'dashboard.html';
    } catch (err) {
      document.getElementById('login-error').textContent = 'Network error';
      console.error(err);
    }
  });
}
const userInfoEl = document.getElementById('user-info');
if (userInfoEl) {
  const stored = localStorage.getItem('mfs_user');
  if (!stored) { window.location.href = 'index.html'; }
  const user = JSON.parse(stored);

  document.getElementById('user-info').textContent = `${user.name} • ${user.role}`;
  document.getElementById('role-tag').textContent = user.role;



  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      const section = link.dataset.section;
      showSection(section);
    });
  });

 


  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('mfs_user');
    window.location.href = 'index.html';
  });




  showSection('overview');
  loadOverview();
}




function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  const title = document.getElementById('page-title');
  title.textContent = id.charAt(0).toUpperCase() + id.slice(1);




  if (id === 'arrears') loadArrears();
  if (id === 'disbursements') loadDisbursements(); 
  if (id === 'dues') loadDues();
  if (id === 'clients') loadClients();
  if (id === 'overview') loadOverview();
}



function fmtKsh(n){ return 'Ksh ' + (Number(n) || 0).toLocaleString(); }



function daysLate(due) {
  const now = new Date();
  const dd = new Date(due);
  const diff = Math.floor((now - dd) / (1000*60*60*24));
  return diff;
}

async function getAllLoans(){ const r = await fetch(API + '/loans'); return r.json(); }
async function getAllClients(){ const r = await fetch(API + '/clients'); return r.json(); }
async function getBranches(){ const r = await fetch(API + '/branches'); return r.json(); }




async function loadOverview() {
  const loans = await getAllLoans();
  const clients = await getAllClients();

 
  const totalClients = clients.length;
  const totalDisbursed = loans.reduce((s,l) => s + Number(l.principal||0), 0);
  const arrearsCount = loans.filter(l => l.status === 'arrears').length;
  const outstanding = loans.reduce((s,l) => s + Number(l.principal||0) * (l.status === 'arrears' ? 1 : 0), 0); 


  const cards = document.getElementById('kpi-cards');
  cards.innerHTML = `
    <div class="card kpi"><div class="muted">Clients</div><div class="value">${totalClients}</div></div>
    <div class="card kpi"><div class="muted">Total Disbursed</div><div class="value">${fmtKsh(totalDisbursed)}</div></div>
    <div class="card kpi"><div class="muted">Loans in Arrears</div><div class="value">${arrearsCount}</div></div>
    <div class="card kpi"><div class="muted">Outstanding (sample)</div><div class="value">${fmtKsh(outstanding)}</div></div>
  `;

  const statusCounts = loans.reduce((acc, l) => { acc[l.status] = (acc[l.status]||0) + 1; return acc; }, {});
  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  const colors = ['#0b5ed7','#ff6b6b','#4caf50','#ffc107'];


  const ctx = document.getElementById('loanDoughnut').getContext('2d');
  if (window._loanChart) window._loanChart.destroy();
  window._loanChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, labels.length) }] },
    options: { responsive: true, maintainAspectRatio:false }
  });



  const months = {};
  loans.forEach(l => {
    const d = new Date(l.disbursedDate || l.date || new Date());
    const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    months[key] = (months[key] || 0) + Number(l.principal || 0);
  });
  const sortedKeys = Object.keys(months).sort();
  const lineCtx = document.getElementById('disburseLine').getContext('2d');
  if (window._disbLine) window._disbLine.destroy();
  window._disbLine = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: sortedKeys,
      datasets: [{ label: 'Ksh disbursed', data: sortedKeys.map(k => months[k]), tension:0.3, borderColor: '#0b9bd7', backgroundColor: 'rgba(11,155,215,0.08)', fill:true }]
    },
    options:{responsive:true,maintainAspectRatio:false}
  });
}





async function loadArrears() {
  const loans = await getAllLoans();
  const clients = await getAllClients();
  const arrears = loans.filter(l => l.status === 'arrears');
  const container = document.getElementById('arrears-list');
  container.innerHTML = '';
  if (arrears.length === 0){ container.innerHTML = '<p class="muted">No arrears</p>'; return; }

  arrears.sort((a,b)=> daysLate(b.dueDate) - daysLate(a.dueDate));
  arrears.forEach(l => {
    const client = clients.find(c => c.id === l.clientId) || { name: 'Unknown' };
    const late = daysLate(l.dueDate);
    const assigned = l.assignedTo || 'Unassigned';
  


    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="accordion">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${client.name}</strong>
            <div class="meta">${fmtKsh(l.principal)} • Due: ${l.dueDate}</div>
          </div>
          <div class="right small muted">${late} days late • <span class="muted">${assigned}</span></div>
        </div>
      </div>
      <div class="panel">
        <div>
          <p class="small">Loan ID: ${l.id} • Branch: ${l.branchId || '—'}</p>
          <button class="btn small-btn" data-action="assign" data-loan="${l.id}">Assign to me</button>
          <button class="btn small-btn" data-action="contact" data-loan="${l.id}">Mark contacted</button>
        </div>
      </div>
    `;
    container.appendChild(wrap);
  
    

    const acc = wrap.querySelector('.accordion');
    const panel = wrap.querySelector('.panel');
    acc.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
    });


    
    
    wrap.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const act = b.dataset.action;
        const loanId = b.dataset.loan;
        if (act === 'assign') await assignToMe(loanId);
        if (act === 'contact') alert('Marked as contacted (demo)');
      });
    });
  });
}


async function assignToMe(loanId) {
  const user = JSON.parse(localStorage.getItem('mfs_user'));
  if (!user || !user.username) return alert('No user');
  try {
    const r = await fetch(API + '/loans/' + loanId);
    const loan = await r.json();



    loan.assignedTo = user.username;
    await fetch(API + '/loans/' + loanId, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(loan) });
    alert('Assigned to you');
    loadArrears();
  } catch (err) { console.error(err); alert('Error assigning'); }
}


async function loadDisbursements(range='all') {
  const loans = await getAllLoans();
  let filtered = loans;
  if (range !== 'all') {
    const days = Number(range);
    const cutoff = Date.now() - (days * 24*60*60*1000);
    filtered = loans.filter(l => new Date(l.disbursedDate).getTime() >= cutoff);
  }
  const total = filtered.reduce((s,l)=> s + Number(l.principal||0), 0);
  const stats = document.getElementById('disbursement-stats');
  stats.innerHTML = `<h4>Disbursement total (${range==='all'?'all-time':range+' days'}): ${fmtKsh(total)}</h4>
    <p class="muted">${filtered.length} loans</p>`;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-range]');
  if (!btn) return;
  const r = btn.dataset.range;
  loadDisbursements(r);
});



async function loadDues() {
  const loans = await getAllLoans();
  const today = new Date().toISOString().slice(0,10);
  const dueToday = loans.filter(l => l.dueDate === today);
  const el = document.getElementById('dues-list');
  el.innerHTML = '';
  if (dueToday.length === 0) { el.innerHTML = '<p class="muted">No dues today</p>'; return; }
  for (const l of dueToday) {
    el.innerHTML += `<div class="item"><div><strong>Loan ${l.id}</strong> • ${fmtKsh(l.principal)}</div><div class="meta">${l.assignedTo || 'Unassigned'}</div></div>`;
  }
}




