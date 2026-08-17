// SAFAS Core Application Logic
const app = {
  user: null,
  
  init() {
    this.checkAuth();
    this.setupUI();
    this.loadRoleModule();
  },

  checkAuth() {
    const token = localStorage.getItem('safas_token');
    const userStr = localStorage.getItem('safas_user');
    
    if (!token || !userStr) {
      window.location.href = 'index.html';
      return;
    }

    try {
      this.user = JSON.parse(userStr);
      // Normalize role to lowercase for routing
      this.user.role = (this.user.role_name || this.user.role || 'student').toLowerCase();
      document.getElementById('userName').textContent = this.user.email;
      document.getElementById('userRole').textContent = this.user.role_name || this.user.role;
    } catch (e) {
      localStorage.clear();
      window.location.href = 'index.html';
    }
  },

  setupUI() {
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('safas_token');
      localStorage.removeItem('safas_user');
      window.location.href = 'index.html';
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('show');
      });
    }

    this.renderSidebarMenu();
  },

  renderSidebarMenu() {
    const menu = document.getElementById('sidebarMenu');
    menu.innerHTML = '';
    
    const role = this.user.role;
    let items = [];

    switch(role) {
      case 'student':
        items = [
          { name: 'Dashboard', icon: 'bi-house', path: 'dashboard' },
          { name: 'My Subjects', icon: 'bi-book', path: 'subjects' },
          { name: 'Provide Feedback', icon: 'bi-chat-left-text', path: 'feedback' }
        ];
        break;
      case 'faculty':
        items = [
          { name: 'My Dashboard', icon: 'bi-graph-up', path: 'dashboard' },
          { name: 'Subject Performance', icon: 'bi-book', path: 'subjects' },
          { name: 'Suggestions', icon: 'bi-chat-dots', path: 'suggestions' }
        ];
        break;
      case 'hod':
        items = [
          { name: 'Dept Dashboard', icon: 'bi-building', path: 'dashboard' },
          { name: 'Faculty Comparison', icon: 'bi-people', path: 'faculty' },
          { name: 'Subject Analysis', icon: 'bi-bar-chart', path: 'subjects' },
          { name: 'Reports', icon: 'bi-file-earmark-text', path: 'reports' }
        ];
        break;
      case 'dean':
        items = [
          { name: 'College Overview', icon: 'bi-globe', path: 'dashboard' },
          { name: 'Departments', icon: 'bi-diagram-3', path: 'departments' },
          { name: 'Faculty Summary', icon: 'bi-people', path: 'faculty' },
          { name: 'Reports', icon: 'bi-file-earmark-text', path: 'reports' }
        ];
        break;
      case 'admin':
        items = [
          { name: 'System Overview', icon: 'bi-speedometer2', path: 'dashboard' },
          { name: 'Users', icon: 'bi-person-gear', path: 'users' },
          { name: 'Departments', icon: 'bi-building', path: 'departments' },
          { name: 'Subjects', icon: 'bi-book', path: 'subjects-mgmt' },
          { name: 'Eval Cycles', icon: 'bi-calendar-event', path: 'cycles' },
          { name: 'Questionnaires', icon: 'bi-list-check', path: 'questionnaires' },
          { name: 'Audit Logs', icon: 'bi-shield-check', path: 'audit' }
        ];
        break;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="#${item.path}" class="nav-link" data-path="${item.path}"><i class="bi ${item.icon}"></i> ${item.name}</a>`;
      menu.appendChild(li);
    });

    // Handle nav clicks
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        menu.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const path = e.currentTarget.getAttribute('data-path');
        this.route(path);
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('show');
      });
    });

    // Set initial route
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const activeLink = menu.querySelector(`a[data-path="${hash}"]`) || menu.querySelector('a');
    if (activeLink) {
      activeLink.classList.add('active');
      this.initialRoute = activeLink.getAttribute('data-path');
    }
  },

  loadRoleModule() {
    const role = this.user.role;
    const script = document.createElement('script');
    script.src = `js/pages/${role}.js`;
    script.onload = () => {
      if (window[role + 'Module']) {
        window[role + 'Module'].init(this);
        if (this.initialRoute) {
          this.route(this.initialRoute);
        }
      }
    };
    script.onerror = () => {
      document.getElementById('mainContent').innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
          <h4 class="mt-3">Module Not Found</h4>
          <p class="text-muted">The dashboard module for role "${role}" could not be loaded.</p>
        </div>
      `;
    };
    document.body.appendChild(script);
  },

  route(path) {
    window.location.hash = path;
    const roleModule = window[this.user.role + 'Module'];
    if (roleModule && typeof roleModule.render === 'function') {
      roleModule.render(path);
    }
  },

  showLoading(containerId = 'mainContent') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="min-height: 300px;">
          <div class="text-center">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted">Loading data...</p>
          </div>
        </div>
      `;
    }
  },

  showEmpty(containerId, message = 'No data available') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-inbox text-muted" style="font-size: 3rem;"></i>
          <p class="text-muted mt-2">${message}</p>
        </div>
      `;
    }
  },

  showError(containerId, message = 'An error occurred') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="text-center py-5">
          <i class="bi bi-exclamation-circle text-danger" style="font-size: 3rem;"></i>
          <h5 class="mt-3">Error</h5>
          <p class="text-muted">${message}</p>
          <button class="btn btn-outline-primary" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  },

  showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const iconMap = {
      'success': 'bi-check-circle-fill',
      'danger': 'bi-exclamation-triangle-fill',
      'warning': 'bi-exclamation-circle-fill',
      'info': 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body"><i class="bi ${iconMap[type] || ''} me-2"></i>${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  },

  // Utility: Create a KPI card
  createKPICard(title, value, icon, color = 'primary') {
    return `
      <div class="kpi-card">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <p class="card-title-custom">${title}</p>
            <h3 class="card-value">${value}</h3>
          </div>
          <div class="kpi-icon" style="color: var(--${color === 'primary' ? 'primary-color' : color});">
            <i class="bi ${icon}"></i>
          </div>
        </div>
      </div>
    `;
  },

  // Utility: Rating badge
  ratingBadge(rating) {
    let cls = 'bg-success';
    let label = 'Good';
    if (rating < 3.0) { cls = 'bg-danger'; label = 'Needs Attention'; }
    else if (rating < 4.0) { cls = 'bg-warning text-dark'; label = 'Monitor'; }
    return `<span class="badge ${cls}">${Number(rating).toFixed(2)} - ${label}</span>`;
  }
};

// Start app on dashboard page
if (window.location.pathname.endsWith('dashboard.html')) {
  document.addEventListener('DOMContentLoaded', () => app.init());
}
