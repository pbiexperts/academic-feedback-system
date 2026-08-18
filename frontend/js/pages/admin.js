// Admin Dashboard Module
window.adminModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'users': this.renderUsers(container); break;
      case 'students': this.renderStudents(container); break;
      case 'faculty': this.renderFaculty(container); break;
      case 'hods-mgmt': this.renderHODs(container); break;
      case 'pcs-mgmt': this.renderPCs(container); break;
      case 'faculty-assignments': this.renderFacultyAssignments(container); break;
      case 'departments': this.renderDepartments(container); break;
      case 'subjects-mgmt': this.renderSubjects(container); break;
      case 'cycles': this.renderCycles(container); break;
      case 'questionnaires': this.renderQuestionnaires(container); break;
      case 'audit': this.renderAuditLogs(container); break;
      case 'calendar': this.renderFeedbackCalendar(container); break;
      case 'detailed-feedback': this.renderDetailedFeedback(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const stats = await api.get('/admin/dashboard-stats');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>System Administration</h2>
          <span class="badge bg-danger fs-6"><i class="bi bi-shield-lock me-1"></i>Admin Only</span>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Total Departments', stats.total_departments, 'bi-building')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Students', stats.total_students, 'bi-mortarboard')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Faculty', stats.total_faculty, 'bi-people')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total HODs', stats.total_hods, 'bi-person-badge')}</div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Total Coordinators', stats.total_pcs, 'bi-person-gear')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Active Cycles', stats.active_cycles, 'bi-calendar-check')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Response Rate', stats.response_rate, 'bi-percent')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Avg Rating', stats.avg_rating, 'bi-star-fill', 'warning')}</div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-white border-0 pt-3"><h5 class="mb-0">Master Data</h5></div>
              <div class="card-body">
                <div class="list-group list-group-flush">
                  <a href="#users" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('users')">
                    <span><i class="bi bi-person-gear me-2"></i>Users</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#students" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('students')">
                    <span><i class="bi bi-mortarboard me-2"></i>Students</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#faculty" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('faculty')">
                    <span><i class="bi bi-person-video3 me-2"></i>Faculty</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#faculty-assignments" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('faculty-assignments')">
                    <span><i class="bi bi-link-45deg me-2"></i>Faculty Assignments</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#departments" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('departments')">
                    <span><i class="bi bi-building me-2"></i>Departments</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#subjects-mgmt" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('subjects-mgmt')">
                    <span><i class="bi bi-book me-2"></i>Subjects</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-white border-0 pt-3"><h5 class="mb-0">Academic Configuration</h5></div>
              <div class="card-body">
                <div class="list-group list-group-flush">
                  <a href="#cycles" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('cycles')">
                    <span><i class="bi bi-calendar-event me-2"></i>Evaluation Cycles</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#questionnaires" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('questionnaires')">
                    <span><i class="bi bi-list-check me-2"></i>Questionnaires</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                  <a href="#audit" class="list-group-item list-group-item-action d-flex justify-content-between" onclick="adminModule.render('audit')">
                    <span><i class="bi bi-shield-check me-2"></i>Audit Logs</span>
                    <i class="bi bi-chevron-right"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mt-2">
          <div class="col-12">
            <div class="card shadow-sm border-0 border-primary" style="border-left: 4px solid var(--bs-primary) !important;">
              <div class="card-body">
                <h5 class="card-title text-primary"><i class="bi bi-file-earmark-excel me-2"></i>Bulk Data Import</h5>
                <p class="card-text text-muted small mb-3">Upload the master Excel file to completely replace the system's current database records (Students, Faculty, Subjects, and Simulated Feedback). This action is destructive and will clear existing non-admin data.</p>
                <div class="d-flex align-items-center gap-3">
                  <input type="file" id="masterDataUpload" class="form-control w-auto" accept=".xlsx, .xls">
                  <button class="btn btn-primary px-4" onclick="adminModule.handleMasterUpload()">
                    <i class="bi bi-cloud-upload me-2"></i>Upload & Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async handleMasterUpload() {
    const fileInput = document.getElementById('masterDataUpload');
    if (!fileInput.files.length) {
      this.appContext.showToast('Please select an Excel file to upload.', 'warning');
      return;
    }
    
    if (!confirm('WARNING: This will wipe all current departments, faculty, students, and feedback data and replace it with the Excel data. Are you sure you want to proceed?')) {
      return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    const btn = document.querySelector('button[onclick="adminModule.handleMasterUpload()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Uploading...';
    
    try {
      const response = await fetch(api.baseUrl + '/admin/upload-master-data', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('safas_token')
        },
        body: formData
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Upload failed');
      
      this.appContext.showToast('Master data uploaded successfully. Refreshing dashboard...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async renderUsers(container) {
    this.appContext.showLoading();
    try {
      const users = await api.get('/admin/users');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>User Management</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateUserModal()">
            <i class="bi bi-plus-circle me-2"></i>Add User
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead>
                  <tr><th>ID</th><th>Email</th><th>Role ID</th><th>Active</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  ${users.map(u => `
                    <tr>
                      <td>${u.id}</td>
                      <td>${u.email}</td>
                      <td><span class="badge bg-primary">${u.role_id}</span></td>
                      <td>${u.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td>
                      <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminModule.deleteUser(${u.id})">
                          <i class="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      this.appContext.showToast('User deleted', 'success');
      this.renderUsers(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  showCreateUserModal() {
    document.getElementById('globalModalTitle').textContent = 'Create User';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="createUserForm">
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="newUserEmail" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" class="form-control" id="newUserPassword" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Role</label>
          <select class="form-select" id="newUserRole">
            <option value="1">Admin</option>
            <option value="2">Dean</option>
            <option value="3">HOD</option>
            <option value="4">Faculty</option>
            <option value="5" selected>Student</option>
          </select>
        </div>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.createUser()">Create</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  async createUser() {
    try {
      await api.post('/admin/users', {
        email: document.getElementById('newUserEmail').value,
        password: document.getElementById('newUserPassword').value,
        role_id: parseInt(document.getElementById('newUserRole').value),
        is_active: true
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('User created successfully!', 'success');
      this.renderUsers(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderDepartments(container) {
    this.appContext.showLoading();
    try {
      const depts = await api.get('/admin/departments');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Departments</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateDeptModal()">
            <i class="bi bi-plus-circle me-2"></i>Add Department
          </button>
        </div>
        <div class="row g-3">
          ${depts.map(d => `
            <div class="col-md-4">
              <div class="kpi-card">
                <h5>${d.name}</h5>
                <span class="badge bg-primary">${d.code}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showCreateDeptModal() {
    document.getElementById('globalModalTitle').textContent = 'Create Department';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="createDeptForm">
        <div class="mb-3">
          <label class="form-label">Department Name</label>
          <input type="text" class="form-control" id="newDeptName" placeholder="e.g. Information Technology" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Department Code</label>
          <input type="text" class="form-control" id="newDeptCode" placeholder="e.g. IT" required>
        </div>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.createDept()">Create</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  async createDept() {
    try {
      await api.post('/admin/departments', {
        name: document.getElementById('newDeptName').value,
        code: document.getElementById('newDeptCode').value
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Department created successfully!', 'success');
      this.renderDepartments(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderSubjects(container) {
    this.appContext.showLoading();
    try {
      const [subjects, depts, semesters] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/departments'),
        api.get('/admin/semesters')
      ]);
      this._depts = depts;
      this._semesters = semesters;

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Subjects</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateSubjectModal()">
            <i class="bi bi-plus-circle me-2"></i>Add Subject
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <table class="table table-custom table-hover">
              <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Semester</th></tr></thead>
              <tbody>
                ${subjects.map(s => {
                  const dept = depts.find(d => d.id === s.department_id);
                  const sem = semesters.find(sm => sm.id === s.semester_id);
                  return `<tr><td><code>${s.code}</code></td><td>${s.name}</td><td>${dept ? dept.name : s.department_id}</td><td>${sem ? sem.name : s.semester_id}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showCreateSubjectModal() {
    const deptOptions = (this._depts || []).map(d => `<option value="${d.id}">${d.name} (${d.code})</option>`).join('');
    const semOptions = (this._semesters || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    document.getElementById('globalModalTitle').textContent = 'Create Subject';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="createSubjectForm">
        <div class="mb-3">
          <label class="form-label">Subject Name</label>
          <input type="text" class="form-control" id="newSubName" placeholder="e.g. Machine Learning" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Subject Code</label>
          <input type="text" class="form-control" id="newSubCode" placeholder="e.g. CS201" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Department</label>
          <select class="form-select" id="newSubDept">${deptOptions}</select>
        </div>
        <div class="mb-3">
          <label class="form-label">Semester</label>
          <select class="form-select" id="newSubSem">${semOptions}</select>
        </div>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.createSubject()">Create</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  async createSubject() {
    try {
      await api.post('/admin/subjects', {
        name: document.getElementById('newSubName').value,
        code: document.getElementById('newSubCode').value,
        department_id: parseInt(document.getElementById('newSubDept').value),
        semester_id: parseInt(document.getElementById('newSubSem').value)
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Subject created successfully!', 'success');
      this.renderSubjects(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderCycles(container) {
    this.appContext.showLoading();
    try {
      const [cycles, academicYears, semesters, questionnaires] = await Promise.all([
        api.get('/admin/evaluation-cycles'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters'),
        api.get('/admin/questionnaires')
      ]);
      this._academicYears = academicYears;
      this._semesters = semesters;
      this._questionnaires = questionnaires;
      this._cycles = cycles;

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Evaluation Cycles</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateCycleModal()">
            <i class="bi bi-plus-circle me-2"></i>Add Cycle
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <table class="table table-custom table-hover">
              <thead><tr><th>Name</th><th>Status</th><th>Start</th><th>End</th><th>Threshold</th><th>Actions</th></tr></thead>
              <tbody>
                ${cycles.map(c => {
                  const statusCls = c.status === 'ACTIVE' ? 'bg-success' : c.status === 'CLOSED' ? 'bg-secondary' : 'bg-info';
                  return `<tr>
                    <td>${c.name}</td>
                    <td><span class="badge ${statusCls}">${c.status}</span></td>
                    <td>${c.start_date}</td>
                    <td>${c.end_date}</td>
                    <td>${c.minimum_response_threshold}</td>
                    <td>
                      <button class="btn btn-sm btn-outline-primary me-1" onclick="adminModule.showEditCycleModal(${c.id})"><i class="bi bi-pencil"></i></button>
                      <button class="btn btn-sm btn-outline-danger" onclick="adminModule.deleteCycle(${c.id})"><i class="bi bi-trash"></i></button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showCreateCycleModal() {
    const ayOptions = (this._academicYears || []).map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    const semOptions = (this._semesters || []).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const qOptions = (this._questionnaires || []).map(q => `<option value="${q.id}">${q.name}</option>`).join('');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

    document.getElementById('globalModalTitle').textContent = 'Create Evaluation Cycle';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="createCycleForm">
        <div class="mb-3">
          <label class="form-label">Cycle Name</label>
          <input type="text" class="form-control" id="newCycleName" placeholder="e.g. End-Sem Feedback 2025" required>
        </div>
        <div class="row mb-3">
          <div class="col-6">
            <label class="form-label">Start Date</label>
            <input type="date" class="form-control" id="newCycleStart" value="${today}" required>
          </div>
          <div class="col-6">
            <label class="form-label">End Date</label>
            <input type="date" class="form-control" id="newCycleEnd" value="${nextMonth}" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Academic Year</label>
          <select class="form-select" id="newCycleAY">${ayOptions}</select>
        </div>
        <div class="mb-3">
          <label class="form-label">Semester</label>
          <select class="form-select" id="newCycleSem">${semOptions}</select>
        </div>
        <div class="mb-3">
          <label class="form-label">Questionnaire</label>
          <select class="form-select" id="newCycleQ">${qOptions}</select>
        </div>
        <div class="mb-3">
          <label class="form-label">Status</label>
          <select class="form-select" id="newCycleStatus">
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Minimum Response Threshold</label>
          <input type="number" class="form-control" id="newCycleThreshold" value="5" min="1">
        </div>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.createCycle()">Create</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  async createCycle() {
    try {
      await api.post('/admin/evaluation-cycles', {
        name: document.getElementById('newCycleName').value,
        start_date: document.getElementById('newCycleStart').value,
        end_date: document.getElementById('newCycleEnd').value,
        academic_year_id: parseInt(document.getElementById('newCycleAY').value),
        semester_id: parseInt(document.getElementById('newCycleSem').value),
        questionnaire_id: parseInt(document.getElementById('newCycleQ').value),
        status: document.getElementById('newCycleStatus').value,
        minimum_response_threshold: parseInt(document.getElementById('newCycleThreshold').value)
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Evaluation Cycle created successfully!', 'success');
      this.renderCycles(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async deleteCycle(cycleId) {
    if (!confirm('Are you sure you want to delete this evaluation cycle?')) return;
    try {
      await api.delete(`/admin/evaluation-cycles/${cycleId}`);
      this.appContext.showToast('Evaluation Cycle deleted', 'success');
      this.renderCycles(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  showEditCycleModal(id) {
    const cycle = this._cycles.find(c => c.id === id);
    if (!cycle) return;

    document.getElementById('globalModalTitle').textContent = 'Edit Evaluation Cycle';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="editCycleForm">
        <div class="mb-3">
          <label class="form-label">Cycle Name</label>
          <input type="text" class="form-control" id="editCycleName" value="${cycle.name}" required>
        </div>
        <div class="row mb-3">
          <div class="col-6">
            <label class="form-label">Start Date</label>
            <input type="date" class="form-control" id="editCycleStart" value="${cycle.start_date}" required>
          </div>
          <div class="col-6">
            <label class="form-label">End Date</label>
            <input type="date" class="form-control" id="editCycleEnd" value="${cycle.end_date}" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Status</label>
          <select class="form-select" id="editCycleStatus">
            <option value="ACTIVE" ${cycle.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
            <option value="DRAFT" ${cycle.status === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
            <option value="CLOSED" ${cycle.status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Minimum Response Threshold</label>
          <input type="number" class="form-control" id="editCycleThreshold" value="${cycle.minimum_response_threshold}" min="1">
        </div>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.updateCycle(${id})">Save Changes</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  async updateCycle(id) {
    try {
      await api.patch(`/admin/evaluation-cycles/${id}`, {
        name: document.getElementById('editCycleName').value,
        start_date: document.getElementById('editCycleStart').value,
        end_date: document.getElementById('editCycleEnd').value,
        status: document.getElementById('editCycleStatus').value,
        minimum_response_threshold: parseInt(document.getElementById('editCycleThreshold').value)
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Evaluation Cycle updated successfully!', 'success');
      this.renderCycles(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderQuestionnaires(container) {
    this.appContext.showLoading();
    try {
      const questionnaires = await api.get('/admin/questionnaires');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Questionnaires</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateQuestionnaireModal()">
            <i class="bi bi-plus-circle me-2"></i>Create Questionnaire
          </button>
        </div>
        <div class="row g-3">
          ${questionnaires.map(q => `
            <div class="col-md-6">
              <div class="kpi-card">
                <div class="d-flex justify-content-between">
                  <h5>${q.name}</h5>
                  ${q.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}
                </div>
                <p class="text-muted mt-2 mb-2">${q.questions ? q.questions.length : 0} questions</p>
                ${q.questions && q.questions.length > 0 ? `
                  <div class="mt-2">
                    ${q.questions.map((qu, i) => `
                      <div class="d-flex align-items-start mb-1">
                        <small class="badge bg-light text-dark me-2">${i + 1}</small>
                        <small>${qu.text}</small>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  questionCount: 1,

  showCreateQuestionnaireModal() {
    this.questionCount = 1;
    document.getElementById('globalModalTitle').textContent = 'Create Questionnaire';
    document.getElementById('globalModalBody').innerHTML = `
      <form id="createQForm">
        <div class="mb-3">
          <label class="form-label">Questionnaire Name</label>
          <input type="text" class="form-control" id="newQName" placeholder="e.g. End-Sem Feedback Form" required>
        </div>
        <div class="form-check mb-3">
          <input class="form-check-input" type="checkbox" id="newQActive" checked>
          <label class="form-check-label" for="newQActive">Active</label>
        </div>
        <hr>
        <h6>Questions</h6>
        <div id="questionsContainer">
          <div class="card border mb-2 p-2 question-item">
            <div class="row g-2">
              <div class="col-7"><input type="text" class="form-control form-control-sm q-text" placeholder="Question text" required></div>
              <div class="col-3">
                <select class="form-select form-select-sm q-type">
                  <option value="rating">Rating (1-5)</option>
                  <option value="long_text">Text</option>
                </select>
              </div>
              <div class="col-2"><input type="text" class="form-control form-control-sm q-category" placeholder="Category"></div>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-outline-primary btn-sm mt-2" onclick="adminModule.addQuestionField()">
          <i class="bi bi-plus me-1"></i>Add Question
        </button>
      </form>
    `;
    document.getElementById('globalModalFooter').innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.createQuestionnaire()">Create Questionnaire</button>
    `;
    new bootstrap.Modal(document.getElementById('globalModal')).show();
  },

  addQuestionField() {
    this.questionCount++;
    const div = document.createElement('div');
    div.className = 'card border mb-2 p-2 question-item';
    div.innerHTML = `
      <div class="row g-2">
        <div class="col-7"><input type="text" class="form-control form-control-sm q-text" placeholder="Question text" required></div>
        <div class="col-3">
          <select class="form-select form-select-sm q-type">
            <option value="rating">Rating (1-5)</option>
            <option value="long_text">Text</option>
          </select>
        </div>
        <div class="col-2"><input type="text" class="form-control form-control-sm q-category" placeholder="Category"></div>
      </div>
    `;
    document.getElementById('questionsContainer').appendChild(div);
  },

  async createQuestionnaire() {
    try {
      const items = document.querySelectorAll('.question-item');
      const questions = [];
      items.forEach((item, i) => {
        const text = item.querySelector('.q-text').value.trim();
        if (text) {
          questions.push({
            text: text,
            question_type: item.querySelector('.q-type').value,
            category: item.querySelector('.q-category').value || 'General',
            is_required: item.querySelector('.q-type').value === 'rating',
            order_index: i + 1
          });
        }
      });

      await api.post('/admin/questionnaires', {
        name: document.getElementById('newQName').value,
        is_active: document.getElementById('newQActive').checked,
        questions: questions
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Questionnaire created successfully!', 'success');
      this.renderQuestionnaires(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderAuditLogs(container) {
    this.appContext.showLoading();
    try {
      const logs = await api.get('/admin/audit-logs');

      const actionIcons = {
        'LOGIN_SUCCESS': 'bi-box-arrow-in-right text-success',
        'USER_CREATED': 'bi-person-plus text-primary',
        'EVALUATION_CYCLE_CREATED': 'bi-calendar-plus text-info',
        'EVALUATION_CYCLE_DELETED': 'bi-calendar-x text-danger',
        'FEEDBACK_SUBMITTED': 'bi-chat-check text-success',
        'REPORT_GENERATED': 'bi-file-earmark-arrow-down text-warning',
        'SYSTEM_INITIALIZED': 'bi-gear text-secondary'
      };

      const rows = logs.length > 0
        ? logs.map(log => {
          const icon = actionIcons[log.action] || 'bi-activity text-muted';
          const time = log.created_at ? new Date(log.created_at).toLocaleString() : '—';
          let details = log.details || '';
          try {
            const parsed = JSON.parse(log.details);
            if (typeof parsed === 'object' && parsed !== null) {
              details = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
            }
          } catch(e) {
            // Keep raw string if it's not valid JSON
          }
          return `
            <tr>
              <td><small class="text-muted">${log.id}</small></td>
              <td><small>${time}</small></td>
              <td><strong><i class="bi ${icon} me-2"></i>${log.action.replace(/_/g, ' ')}</strong></td>
              <td><span class="badge bg-light text-dark">${log.resource_type || '—'}</span></td>
              <td>${log.resource_id || '—'}</td>
              <td><small class="text-muted">${details}</small></td>
              <td><small>${log.user_email || log.user_id}</small></td>
            </tr>
          `;
        }).join('')
        : '<tr><td colspan="7" class="text-center text-muted">No audit logs recorded yet.</td></tr>';

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Audit Logs</h2>
          <span class="badge bg-secondary fs-6"><i class="bi bi-shield-check me-1"></i>${logs.length} entries</span>
        </div>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-info-circle me-2"></i>
          Audit logs track all administrative actions including user creation, evaluation cycle changes, login events, and feedback submissions.
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Resource ID</th>
                    <th>Details</th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async sendReminders() {
    if (!confirm('Are you sure you want to send email reminders to all students with pending feedback?')) return;
    
    try {
      const btn = document.querySelector('button[onclick="adminModule.sendReminders()"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
      }
      
      const res = await api.post('/admin/reminders/trigger');
      this.appContext.showToast(res.message || 'Reminders triggered successfully', 'success');
      
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-envelope-paper me-1"></i>Send Reminders';
      }
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
      const btn = document.querySelector('button[onclick="adminModule.sendReminders()"]');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-envelope-paper me-1"></i>Send Reminders';
      }
    }
  }
,
  async renderStudents(container) {
    this.appContext.showLoading();
    try {
      const students = await api.get('/admin/students');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Student Management</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateStudentModal()">
            <i class="bi bi-plus-circle me-2"></i>Add Student Profile
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead>
                  <tr><th>ID</th><th>User ID</th><th>Enrollment No</th><th>Dept ID</th><th>Div ID</th></tr>
                </thead>
                <tbody>
                  ${students.map(s => `
                    <tr>
                      <td>${s.id}</td>
                      <td>${s.user_id}</td>
                      <td>${s.enrollment_no}</td>
                      <td><span class="badge bg-primary">${s.department_id}</span></td>
                      <td>${s.division_id}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async showCreateStudentModal() {
    try {
      const [users, depts, divs] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/departments'),
        api.get('/admin/divisions')
      ]);
      const studentUsers = users.filter(u => u.role_id === 5); // Assuming 5 is Student role
      
      document.getElementById('globalModalTitle').textContent = 'Create Student Profile';
      document.getElementById('globalModalBody').innerHTML = `
        <form id="createStudentForm">
          <div class="mb-3">
            <label class="form-label">User Account (Must exist first)</label>
            <select class="form-select" id="newStudentUserId" required>
              ${studentUsers.map(u => `<option value="${u.id}">${u.email}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Enrollment Number</label>
            <input type="text" class="form-control" id="newStudentEnrollment" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Department</label>
            <select class="form-select" id="newStudentDept" required>
              ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Division</label>
            <select class="form-select" id="newStudentDiv" required>
              ${divs.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
        </form>
      `;
      document.getElementById('globalModalFooter').innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="adminModule.createStudent()">Create</button>
      `;
      new bootstrap.Modal(document.getElementById('globalModal')).show();
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async createStudent() {
    try {
      await api.post('/admin/students', {
        user_id: parseInt(document.getElementById('newStudentUserId').value),
        enrollment_no: document.getElementById('newStudentEnrollment').value,
        department_id: parseInt(document.getElementById('newStudentDept').value),
        division_id: parseInt(document.getElementById('newStudentDiv').value)
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Student profile created successfully!', 'success');
      this.renderStudents(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderFaculty(container) {
    this.appContext.showLoading();
    try {
      const faculty = await api.get('/admin/faculty');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Faculty Management</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateFacultyModal()">
            <i class="bi bi-plus-circle me-2"></i>Add Faculty Profile
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead>
                  <tr><th>ID</th><th>User ID</th><th>Employee ID</th><th>Designation</th><th>Dept ID</th></tr>
                </thead>
                <tbody>
                  ${faculty.map(f => `
                    <tr>
                      <td>${f.id}</td>
                      <td>${f.user_id}</td>
                      <td>${f.employee_id}</td>
                      <td>${f.designation || 'N/A'}</td>
                      <td><span class="badge bg-primary">${f.department_id}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async showCreateFacultyModal() {
    try {
      const [users, depts] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/departments')
      ]);
      const facultyUsers = users.filter(u => [2, 3, 4].includes(u.role_id)); // Dean, HOD, Faculty
      
      document.getElementById('globalModalTitle').textContent = 'Create Faculty Profile';
      document.getElementById('globalModalBody').innerHTML = `
        <form id="createFacultyForm">
          <div class="mb-3">
            <label class="form-label">User Account (Must exist first)</label>
            <select class="form-select" id="newFacultyUserId" required>
              ${facultyUsers.map(u => `<option value="${u.id}">${u.email}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Employee ID</label>
            <input type="text" class="form-control" id="newFacultyEmpId" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Designation</label>
            <input type="text" class="form-control" id="newFacultyDesignation" placeholder="e.g. Assistant Professor">
          </div>
          <div class="mb-3">
            <label class="form-label">Department</label>
            <select class="form-select" id="newFacultyDept" required>
              ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
            </select>
          </div>
        </form>
      `;
      document.getElementById('globalModalFooter').innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="adminModule.createFaculty()">Create</button>
      `;
      new bootstrap.Modal(document.getElementById('globalModal')).show();
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async createFaculty() {
    try {
      await api.post('/admin/faculty', {
        user_id: parseInt(document.getElementById('newFacultyUserId').value),
        employee_id: document.getElementById('newFacultyEmpId').value,
        department_id: parseInt(document.getElementById('newFacultyDept').value),
        designation: document.getElementById('newFacultyDesignation').value || null
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Faculty profile created successfully!', 'success');
      this.renderFaculty(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderFacultyAssignments(container) {
    this.appContext.showLoading();
    try {
      const assignments = await api.get('/admin/faculty-subjects');
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Faculty Assignments</h2>
          <button class="btn btn-primary-custom" onclick="adminModule.showCreateFacultyAssignmentModal()">
            <i class="bi bi-plus-circle me-2"></i>Assign Subject
          </button>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead>
                  <tr><th>ID</th><th>Faculty ID</th><th>Subject ID</th><th>Academic Year ID</th><th>Divisions</th></tr>
                </thead>
                <tbody>
                  ${assignments.map(a => `
                    <tr>
                      <td>${a.id}</td>
                      <td>${a.faculty_id}</td>
                      <td>${a.subject_id}</td>
                      <td>${a.academic_year_id}</td>
                      <td>${a.division_ids ? a.division_ids.join(', ') : 'All'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async showCreateFacultyAssignmentModal() {
    try {
      const [faculties, subjects, ays, divs] = await Promise.all([
        api.get('/admin/faculty'),
        api.get('/admin/subjects'),
        api.get('/admin/academic-years'),
        api.get('/admin/divisions')
      ]);
      
      document.getElementById('globalModalTitle').textContent = 'Assign Subject to Faculty';
      document.getElementById('globalModalBody').innerHTML = `
        <form id="createAssignmentForm">
          <div class="mb-3">
            <label class="form-label">Faculty</label>
            <select class="form-select" id="newAssignFaculty" required>
              ${faculties.map(f => `<option value="${f.id}">ID: ${f.id} (Emp: ${f.employee_id})</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Subject</label>
            <select class="form-select" id="newAssignSubject" required>
              ${subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Academic Year</label>
            <select class="form-select" id="newAssignAy" required>
              ${ays.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
        </form>
      `;
      document.getElementById('globalModalFooter').innerHTML = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="adminModule.createFacultyAssignment()">Assign</button>
      `;
      new bootstrap.Modal(document.getElementById('globalModal')).show();
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async createFacultyAssignment() {
    try {
      await api.post('/admin/faculty-subjects', {
        faculty_id: parseInt(document.getElementById('newAssignFaculty').value),
        subject_id: parseInt(document.getElementById('newAssignSubject').value),
        academic_year_id: parseInt(document.getElementById('newAssignAy').value),
        division_ids: []
      });
      bootstrap.Modal.getInstance(document.getElementById('globalModal')).hide();
      this.appContext.showToast('Faculty assigned successfully!', 'success');
      this.renderFacultyAssignments(document.getElementById('mainContent'));
    } catch (err) {
      this.appContext.showToast(err.message, 'danger');
    }
  },

  async renderFeedbackCalendar(container) {
    this.appContext.showLoading();
    try {
      const [events, questionnaires, years, semesters] = await Promise.all([
        api.get('/admin/feedback-calendar'),
        api.get('/admin/questionnaires'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters')
      ]);

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Evaluation & Feedback Calendar</h2>
          <button class="btn btn-primary" onclick="adminModule.showCreateFeedbackEventModal()"><i class="bi bi-calendar-plus me-1"></i>Create Event</button>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Event Name</th>
                    <th>Academic Year / Semester</th>
                    <th>Start Date & Time</th>
                    <th>End Date & Time</th>
                    <th>Min Threshold</th>
                    <th>Status</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${events.map(e => {
                    let statusClass = 'bg-secondary';
                    if (e.status === 'ACTIVE') statusClass = 'bg-success';
                    if (e.status === 'SCHEDULED' || e.status === 'UPCOMING') statusClass = 'bg-info text-dark';
                    if (e.status === 'CLOSED') statusClass = 'bg-danger';

                    return `
                      <tr>
                        <td><strong>${e.name}</strong></td>
                        <td>Year: ${e.academic_year_id} / Sem: ${e.semester_id}</td>
                        <td><small>${e.start_datetime ? new Date(e.start_datetime).toLocaleString() : 'N/A'}</small></td>
                        <td><small>${e.end_datetime ? new Date(e.end_datetime).toLocaleString() : 'N/A'}</small></td>
                        <td><span class="badge bg-light text-dark">${e.minimum_response_threshold}</span></td>
                        <td><span class="badge ${statusClass}">${e.status}</span></td>
                        <td class="text-end">
                          ${e.status === 'SCHEDULED' || e.status === 'UPCOMING' ? `<button class="btn btn-sm btn-success me-1" onclick="adminModule.activateCalendarEvent(${e.id})">Activate Now</button>` : ''}
                          ${e.status === 'ACTIVE' ? `<button class="btn btn-sm btn-warning text-dark me-1" onclick="adminModule.closeCalendarEvent(${e.id})">Close Now</button>` : ''}
                          <button class="btn btn-sm btn-outline-danger" onclick="adminModule.deleteCalendarEvent(${e.id})"><i class="bi bi-trash"></i></button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                  ${events.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No feedback calendar events scheduled.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.questionnaires = questionnaires;
      this.years = years;
      this.semesters = semesters;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showCreateFeedbackEventModal() {
    const qnaires = this.questionnaires || [];
    const years = this.years || [];
    const semesters = this.semesters || [];

    const modalBody = document.getElementById('globalModalBody');
    const modalTitle = document.getElementById('globalModalTitle');
    const modalFooter = document.getElementById('globalModalFooter');

    modalTitle.textContent = "Schedule Feedback Event";
    modalBody.innerHTML = `
      <form id="createEventForm">
        <div class="mb-3">
          <label class="form-label">Event Name</label>
          <input type="text" class="form-control" id="evtName" placeholder="e.g. Semester 1 Mid-Term Feedback" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Academic Year</label>
          <select class="form-select" id="evtYear" required>
            ${years.map(y => `<option value="${y.id}" ${y.is_active === 1 ? 'selected' : ''}>${y.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Semester</label>
          <select class="form-select" id="evtSemester" required>
            ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Questionnaire</label>
          <select class="form-select" id="evtQuestionnaire" required>
            ${qnaires.map(q => `<option value="${q.id}">${q.name}</option>`).join('')}
          </select>
        </div>
        <div class="row g-2 mb-3">
          <div class="col-md-6">
            <label class="form-label">Start Date & Time (UTC/ISO)</label>
            <input type="datetime-local" class="form-control" id="evtStart" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">End Date & Time (UTC/ISO)</label>
            <input type="datetime-local" class="form-control" id="evtEnd" required>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label">Min Responses Threshold</label>
          <input type="number" class="form-control" id="evtThreshold" value="5" min="1" required>
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.submitFeedbackEvent()">Schedule</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('globalModal'));
    modal.show();
    this.eventModalInstance = modal;
  },

  async submitFeedbackEvent() {
    const name = document.getElementById('evtName').value.trim();
    const yearId = parseInt(document.getElementById('evtYear').value);
    const semesterId = parseInt(document.getElementById('evtSemester').value);
    const questionnaireId = parseInt(document.getElementById('evtQuestionnaire').value);
    const start = document.getElementById('evtStart').value;
    const end = document.getElementById('evtEnd').value;
    const threshold = parseInt(document.getElementById('evtThreshold').value);

    if (!name || !start || !end) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      await api.post('/admin/feedback-calendar', {
        name,
        academic_year_id: yearId,
        semester_id: semesterId,
        questionnaire_id: questionnaireId,
        start_date: start.split('T')[0],
        end_date: end.split('T')[0],
        start_datetime: new Date(start).toISOString(),
        end_datetime: new Date(end).toISOString(),
        minimum_response_threshold: threshold,
        status: "UPCOMING"
      });

      this.appContext.showToast("Feedback event scheduled successfully!");
      this.eventModalInstance.hide();
      this.renderFeedbackCalendar(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to schedule event");
    }
  },

  async activateCalendarEvent(id) {
    try {
      await api.post(`/admin/feedback-calendar/${id}/activate`);
      this.appContext.showToast("Feedback cycle activated!");
      this.renderFeedbackCalendar(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to activate cycle");
    }
  },

  async closeCalendarEvent(id) {
    try {
      await api.post(`/admin/feedback-calendar/${id}/close`);
      this.appContext.showToast("Feedback cycle closed!");
      this.renderFeedbackCalendar(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to close cycle");
    }
  },

  async deleteCalendarEvent(id) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/admin/feedback-calendar/${id}`);
      this.appContext.showToast("Event deleted successfully!");
      this.renderFeedbackCalendar(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to delete event");
    }
  },

  async renderDetailedFeedback(container) {
    this.appContext.showLoading();
    try {
      const [submissions, depts, subjects, faculties] = await Promise.all([
        api.get('/admin/detailed-feedback'),
        api.get('/admin/departments'),
        api.get('/admin/subjects'),
        api.get('/admin/users')
      ]);

      const facultyUsers = faculties.filter(u => u.role_name === 'Faculty');

      container.innerHTML = `
        <div class="mb-4">
          <h2>Detailed Feedback Records Audit</h2>
          <span class="badge bg-danger fs-6"><i class="bi bi-shield-lock me-1"></i>Audit Logged Access</span>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white border-0 pt-3"><h5 class="mb-0"><i class="bi bi-funnel me-2"></i>Filter Records</h5></div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-3">
                <select class="form-select" id="filtDept" onchange="adminModule.filterDetailedFeedback()">
                  <option value="">All Departments</option>
                  ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                <select class="form-select" id="filtSub" onchange="adminModule.filterDetailedFeedback()">
                  <option value="">All Subjects</option>
                  ${subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                <select class="form-select" id="filtFac" onchange="adminModule.filterDetailedFeedback()">
                  <option value="">All Faculty</option>
                  ${facultyUsers.map(f => `<option value="${f.id}">${f.email}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0" id="detailedTable">
                <thead class="table-light">
                  <tr>
                    <th>Student Details</th>
                    <th>Faculty</th>
                    <th>Subject</th>
                    <th>Department</th>
                    <th>Overall Rating</th>
                    <th>Submitted At</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  ${submissions.map(s => {
                    const commentsText = s.comments.map(c => `
                      <div class="p-2 mb-1 border-bottom">
                        <span class="badge ${c.sentiment === 'Positive' ? 'bg-success' : c.sentiment === 'Negative' ? 'bg-danger' : 'bg-secondary'} me-2">
                          ${c.sentiment}
                        </span>
                        <small><strong>${c.comment_type}:</strong> ${c.comment_text}</small>
                      </div>
                    `).join('');

                    return `
                      <tr>
                        <td>
                          <strong>${s.student.email}</strong><br>
                          <small class="text-muted">Enrollment: ${s.student.enrollment_no}</small>
                        </td>
                        <td>${s.faculty.email}</td>
                        <td><strong>${s.subject.name}</strong><br><small class="text-muted">${s.subject.code}</small></td>
                        <td>${s.department}</td>
                        <td>${this.appContext.ratingBadge(s.overall_rating)}</td>
                        <td><small>${s.submitted_at ? new Date(s.submitted_at).toLocaleString() : 'N/A'}</small></td>
                        <td>${commentsText || '<small class="text-muted">No text comments</small>'}</td>
                      </tr>
                    `;
                  }).join('')}
                  ${submissions.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No detailed feedback submissions found.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.rawSubmissions = submissions;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async filterDetailedFeedback() {
    const deptId = document.getElementById('filtDept').value;
    const subId = document.getElementById('filtSub').value;
    const facId = document.getElementById('filtFac').value;

    const container = document.getElementById('mainContent');
    this.appContext.showLoading();

    try {
      const submissions = await api.get(`/admin/detailed-feedback?${deptId ? 'department_id=' + deptId + '&' : ''}${subId ? 'subject_id=' + subId + '&' : ''}${facId ? 'faculty_id=' + facId : ''}`);
      this.renderDetailedFeedback(container);
    } catch(err) {
      alert(err.message);
    }
  },

  async renderHODs(container) {
    this.appContext.showLoading();
    try {
      const [hods, users, depts] = await Promise.all([
        api.get('/admin/hods'),
        api.get('/admin/users'),
        api.get('/admin/departments')
      ]);

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>HOD Management</h2>
          <button class="btn btn-primary" onclick="adminModule.showAssignHODModal()"><i class="bi bi-plus-circle me-1"></i>Assign HOD</button>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Employee ID</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${hods.map(h => `
                    <tr>
                      <td class="fw-semibold">${h.email}</td>
                      <td>${h.department_name}</td>
                      <td><code>${h.employee_id}</code></td>
                      <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="adminModule.deleteHODAssignment(${h.id})">Unassign</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${hods.length === 0 ? '<tr><td colspan="4" class="text-center py-4 text-muted">No HODs assigned.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.potentialHODUsers = users.filter(u => u.role_id === 3 || u.role_id === 4); // HOD or Faculty roles
      this.departments = depts;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showAssignHODModal() {
    const users = this.potentialHODUsers || [];
    const depts = this.departments || [];

    const modalBody = document.getElementById('globalModalBody');
    const modalTitle = document.getElementById('globalModalTitle');
    const modalFooter = document.getElementById('globalModalFooter');

    modalTitle.textContent = "Assign Department HOD";
    modalBody.innerHTML = `
      <form id="assignHodForm">
        <div class="mb-3">
          <label class="form-label">User Account</label>
          <select class="form-select" id="hodUser" required>
            <option value="">Select User</option>
            ${users.map(u => `<option value="${u.id}">${u.email}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Department</label>
          <select class="form-select" id="hodDept" required>
            <option value="">Select Department</option>
            ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.submitHODAssignment()">Assign</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('globalModal'));
    modal.show();
    this.assignHodModalInstance = modal;
  },

  async submitHODAssignment() {
    const userId = document.getElementById('hodUser').value;
    const deptId = document.getElementById('hodDept').value;

    if (!userId || !deptId) {
      alert("Please select both a user and a department.");
      return;
    }

    try {
      await api.post('/admin/hods', {
        user_id: parseInt(userId),
        department_id: parseInt(deptId)
      });
      this.appContext.showToast("HOD assigned successfully!");
      this.assignHodModalInstance.hide();
      this.renderHODs(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to assign HOD");
    }
  },

  async deleteHODAssignment(id) {
    if (!confirm("Are you sure you want to unassign this HOD?")) return;
    try {
      await api.delete(`/admin/hods/${id}`);
      this.appContext.showToast("HOD unassigned successfully!");
      this.renderHODs(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to unassign HOD");
    }
  },

  async renderPCs(container) {
    this.appContext.showLoading();
    try {
      const [pcs, users, depts] = await Promise.all([
        api.get('/admin/program-coordinators'),
        api.get('/admin/users'),
        api.get('/admin/departments')
      ]);

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Program Coordinator Management</h2>
          <button class="btn btn-primary" onclick="adminModule.showAssignPCModal()"><i class="bi bi-plus-circle me-1"></i>Assign Coordinator</button>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Employee ID</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${pcs.map(p => `
                    <tr>
                      <td class="fw-semibold">${p.email}</td>
                      <td>${p.department_name}</td>
                      <td><code>${p.employee_id}</code></td>
                      <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="adminModule.deletePCAssignment(${p.id})">Unassign</button>
                      </td>
                    </tr>
                  `).join('')}
                  ${pcs.length === 0 ? '<tr><td colspan="4" class="text-center py-4 text-muted">No program coordinators assigned.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // PC Role id is 6 in roles seed
      this.potentialPCUsers = users.filter(u => u.role_id === 6 || u.role_id === 4); // Coordinator or Faculty
      this.departments = depts;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  showAssignPCModal() {
    const users = this.potentialPCUsers || [];
    const depts = this.departments || [];

    const modalBody = document.getElementById('globalModalBody');
    const modalTitle = document.getElementById('globalModalTitle');
    const modalFooter = document.getElementById('globalModalFooter');

    modalTitle.textContent = "Assign Program Coordinator";
    modalBody.innerHTML = `
      <form id="assignPcForm">
        <div class="mb-3">
          <label class="form-label">User Account</label>
          <select class="form-select" id="pcUser" required>
            <option value="">Select User</option>
            ${users.map(u => `<option value="${u.id}">${u.email}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Department</label>
          <select class="form-select" id="pcDept" required>
            <option value="">Select Department</option>
            ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Employee ID</label>
          <input type="text" class="form-control" id="pcEmpId" required placeholder="e.g. PC_CS">
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="adminModule.submitPCAssignment()">Assign</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('globalModal'));
    modal.show();
    this.assignPcModalInstance = modal;
  },

  async submitPCAssignment() {
    const userId = document.getElementById('pcUser').value;
    const deptId = document.getElementById('pcDept').value;
    const empId = document.getElementById('pcEmpId').value.trim();

    if (!userId || !deptId || !empId) {
      alert("Please check your inputs.");
      return;
    }

    try {
      await api.post('/admin/program-coordinators', {
        user_id: parseInt(userId),
        department_id: parseInt(deptId),
        employee_id: empId
      });
      this.appContext.showToast("Program Coordinator assigned successfully!");
      this.assignPcModalInstance.hide();
      this.renderPCs(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to assign Program Coordinator");
    }
  },

  async deletePCAssignment(id) {
    if (!confirm("Are you sure you want to unassign this Program Coordinator?")) return;
    try {
      await api.delete(`/admin/program-coordinators/${id}`);
      this.appContext.showToast("Program Coordinator unassigned successfully!");
      this.renderPCs(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to unassign coordinator");
    }
  }

};

