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




