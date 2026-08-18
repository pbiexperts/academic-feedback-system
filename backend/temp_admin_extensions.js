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
