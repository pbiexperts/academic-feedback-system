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
      case 'departments': this.renderDepartments(container); break;
      case 'subjects-mgmt': this.renderSubjects(container); break;
      case 'cycles': this.renderCycles(container); break;
      case 'questionnaires': this.renderQuestionnaires(container); break;
      case 'audit': this.renderAuditLogs(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const [users, depts, subjects, cycles] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/departments'),
        api.get('/admin/subjects'),
        api.get('/admin/evaluation-cycles')
      ]);

      const activeCycles = cycles.filter(c => c.status === 'ACTIVE').length;

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>System Administration</h2>
          <span class="badge bg-danger fs-6"><i class="bi bi-shield-lock me-1"></i>Admin Only</span>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Users', users.length, 'bi-people-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Departments', depts.length, 'bi-building')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Subjects', subjects.length, 'bi-book')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Active Cycles', activeCycles, 'bi-calendar-check')}</div>
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
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
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
          let details = '';
          try { details = log.details ? JSON.parse(log.details).email || JSON.parse(log.details).message || JSON.parse(log.details).name || '' : ''; } catch(e) { details = log.details || ''; }
          return `
            <tr>
              <td><small class="text-muted">${log.id}</small></td>
              <td><small>${time}</small></td>
              <td><i class="bi ${icon} me-2"></i><strong>${log.action.replace(/_/g, ' ')}</strong></td>
              <td><span class="badge bg-light text-dark">${log.resource_type || '—'}</span></td>
              <td>${log.resource_id || '—'}</td>
              <td><small class="text-muted">${details}</small></td>
              <td>${log.user_id || '—'}</td>
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
};
