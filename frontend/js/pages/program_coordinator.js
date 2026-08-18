// Program Coordinator Page Module
window.program_coordinatorModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'allocation': this.renderAllocation(container); break;
      case 'subjects': this.renderSubjects(container); break;
      case 'attendance': this.renderAttendance(container); break;
      case 'feedback': this.renderFeedback(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/program-coordinator/dashboard');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Program Coordinator Dashboard</h2>
          <span class="badge bg-primary fs-6"><i class="bi bi-person-badge me-1"></i>Dept Coordinator</span>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6 col-lg-3">${this.appContext.createKPICard('Faculty Count', data.total_faculty, 'bi-people')}</div>
          <div class="col-md-6 col-lg-3">${this.appContext.createKPICard('Enrolled Students', data.total_students, 'bi-mortarboard')}</div>
          <div class="col-md-6 col-lg-3">${this.appContext.createKPICard('Dept Subjects', data.total_subjects, 'bi-book')}</div>
          <div class="col-md-6 col-lg-3">${this.appContext.createKPICard('Avg Attendance', data.attendance_summary, 'bi-calendar-check', 'success')}</div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-header bg-white border-0 pt-3"><h5 class="mb-0"><i class="bi bi-building me-2 text-primary"></i>Department Details</h5></div>
              <div class="card-body">
                <table class="table table-borderless">
                  <tbody>
                    <tr><td class="text-muted fw-semibold">Department:</td><td>${data.department_name} (${data.department_code})</td></tr>
                    <tr><td class="text-muted fw-semibold">Academic Year:</td><td>${data.current_academic_year}</td></tr>
                    <tr><td class="text-muted fw-semibold">Current Semester:</td><td>${data.current_semester}</td></tr>
                    <tr><td class="text-muted fw-semibold">Allocation Status:</td><td><span class="badge bg-info text-dark">${data.subject_allocation_status}</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-header bg-white border-0 pt-3"><h5 class="mb-0"><i class="bi bi-chat-left-heart me-2 text-success"></i>Evaluation Progress</h5></div>
              <div class="card-body d-flex flex-column justify-content-center align-items-center">
                <h4 class="mb-1">${data.feedback_performance_summary}</h4>
                <p class="text-muted mb-3">Overall Performance Rating</p>
                <div class="alert alert-success w-100 text-center mb-0">
                  <i class="bi bi-info-circle me-1"></i>Collected <strong>${data.feedback_completion_status}</strong> in the active cycle.
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderAllocation(container) {
    this.appContext.showLoading();
    try {
      const [faculties, subjects, assignments, years, semesters, divisions] = await Promise.all([
        api.get('/program-coordinator/faculty'),
        api.get('/program-coordinator/subjects'),
        api.get('/program-coordinator/assignments'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters'),
        api.get('/admin/divisions')
      ]);

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Faculty Subject Allocation</h2>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-semibold">Academic Year</label>
                <select class="form-select" id="allocFilterYear" onchange="program_coordinatorModule.filterAllocations()">
                  ${years.map(y => `<option value="${y.id}" ${y.is_active === 1 ? 'selected' : ''}>${y.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Semester</label>
                <select class="form-select" id="allocFilterSem" onchange="program_coordinatorModule.filterAllocations()">
                  ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Division</label>
                <select class="form-select" id="allocFilterDiv" onchange="program_coordinatorModule.filterAllocations()">
                  ${divisions.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Faculty Member</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Division</th>
                    <th>Status</th>
                    <th class="text-end">Action</th>
                  </tr>
                </thead>
                <tbody id="allocationTableBody">
                  <!-- Dynamically populated -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.faculties = faculties;
      this.subjects = subjects;
      this.assignments = assignments;
      this.years = years;
      this.semesters = semesters;
      this.divisions = divisions;
      this.filterAllocations();
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  filterAllocations() {
    const yearId = parseInt(document.getElementById('allocFilterYear').value);
    const semId = parseInt(document.getElementById('allocFilterSem').value);
    const divId = parseInt(document.getElementById('allocFilterDiv').value);

    const selectedYear = this.years ? this.years.find(y => y.id === yearId) : null;
    const selectedSem = this.semesters ? this.semesters.find(s => s.id === semId) : null;
    const selectedDiv = this.divisions ? this.divisions.find(d => d.id === divId) : null;

    const yearName = selectedYear ? selectedYear.name : 'N/A';
    const semName = selectedSem ? selectedSem.name : 'N/A';
    const divName = selectedDiv ? selectedDiv.name : 'N/A';

    const deptSubs = this.subjects.filter(s => s.semester_id === semId);
    const tbody = document.getElementById('allocationTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    deptSubs.forEach(sub => {
      const assign = this.assignments.find(a => 
        a.subject_id === sub.id && 
        a.academic_year_id === yearId &&
        (a.division_id === divId || !a.division_id)
      );

      const assignedFacultyId = assign ? assign.faculty_id : '';
      const statusBadge = assign 
        ? `<span class="badge bg-success">Allocated</span>` 
        : `<span class="badge bg-warning text-dark">Unallocated</span>`;

      const options = this.faculties.map(f => `
        <option value="${f.id}" ${f.id === assignedFacultyId ? 'selected' : ''}>
          ${f.faculty_name || f.email}
        </option>
      `).join('');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="fw-semibold">${sub.name}</td>
        <td><code>${sub.code}</code></td>
        <td>
          <select class="form-select form-select-sm w-auto" id="select-fac-${sub.id}">
            <option value="">[ Select Faculty ▼ ]</option>
            ${options}
          </select>
        </td>
        <td>${yearName}</td>
        <td>${semName}</td>
        <td>${divName}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-primary" onclick="program_coordinatorModule.saveInlineAllocation(${sub.id}, ${assign ? assign.id : 'null'})">
            ${assign ? 'Change' : 'Allocate'}
          </button>
          ${assign ? `
            <button class="btn btn-sm btn-outline-danger ms-1" onclick="program_coordinatorModule.deleteAllocation(${assign.id})">
              <i class="bi bi-trash"></i>
            </button>
          ` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (deptSubs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">No subjects found for this semester.</td></tr>';
    }
  },

  async saveInlineAllocation(subjectId, assignmentId) {
    const facultyId = document.getElementById(`select-fac-${subjectId}`).value;
    const yearId = parseInt(document.getElementById('allocFilterYear').value);
    const divId = parseInt(document.getElementById('allocFilterDiv').value);

    if (!facultyId) {
      alert("Please select a faculty member first.");
      return;
    }

    try {
      if (assignmentId) {
        await api.delete(`/program-coordinator/assignments/${assignmentId}`);
      }
      
      await api.post('/program-coordinator/assignments', {
        faculty_id: parseInt(facultyId),
        subject_id: parseInt(subjectId),
        academic_year_id: yearId,
        division_id: divId
      });

      this.appContext.showToast("Faculty allocated successfully!");
      this.assignments = await api.get('/program-coordinator/assignments');
      this.filterAllocations();
    } catch(err) {
      alert(err.message || "Failed to create assignment");
    }
  },

  async deleteAllocation(id) {
    if (!confirm("Are you sure you want to delete this allocation?")) return;
    try {
      await api.delete(`/program-coordinator/assignments/${id}`);
      this.appContext.showToast("Allocation removed successfully!");
      this.assignments = await api.get('/program-coordinator/assignments');
      this.filterAllocations();
    } catch(err) {
      alert(err.message || "Failed to delete allocation");
    }
  },

  async renderSubjects(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/program-coordinator/subjects');
      container.innerHTML = `
        <div class="mb-4"><h2>Department Subjects</h2></div>
        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr><th>Code</th><th>Name</th><th>Semester</th></tr>
              </thead>
              <tbody>
                ${data.map(s => `
                  <tr><td><code>${s.code}</code></td><td class="fw-semibold">${s.name}</td><td>${s.semester}</td></tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderAttendance(container) {
    this.appContext.showLoading();
    try {
      const [subjects, students, attendance, years, semesters, divisions] = await Promise.all([
        api.get('/program-coordinator/subjects'),
        api.get('/program-coordinator/students'),
        api.get('/attendance'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters'),
        api.get('/admin/divisions')
      ]);

      const deptData = await api.get('/program-coordinator/dashboard');
      const filteredStudents = students.filter(s => s.department === deptData.department_name || s.department_id === deptData.department_id);

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Attendance Management</h2>
          <button class="btn btn-success" onclick="program_coordinatorModule.showAddAttendanceModal()"><i class="bi bi-plus-circle me-1"></i>Add Attendance</button>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-3">
                <label class="form-label fw-semibold">Academic Year</label>
                <select class="form-select" id="attFilterYear" onchange="program_coordinatorModule.filterAttendanceTable()">
                  <option value="">All Academic Years</option>
                  ${years.map(y => `<option value="${y.id}" ${y.is_active === 1 ? 'selected' : ''}>${y.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Semester</label>
                <select class="form-select" id="attFilterSem" onchange="program_coordinatorModule.filterAttendanceTable()">
                  <option value="">All Semesters</option>
                  ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Division</label>
                <select class="form-select" id="attFilterDiv" onchange="program_coordinatorModule.filterAttendanceTable()">
                  <option value="">All Divisions</option>
                  ${divisions.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Subject</label>
                <select class="form-select" id="attFilterSubject" onchange="program_coordinatorModule.filterAttendanceTable()">
                  <option value="">All Subjects</option>
                  ${subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Search Student</label>
                <input type="text" class="form-control" id="attFilterSearch" placeholder="Name or ENR..." oninput="program_coordinatorModule.filterAttendanceTable()">
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Student Email</th>
                    <th>Enrollment No</th>
                    <th>Subject</th>
                    <th>Division</th>
                    <th>Attended Classes</th>
                    <th>Total Classes</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                    <th class="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody id="attendanceTableBody">
                  <!-- Dynamically rendered -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.subjects = subjects;
      this.filteredStudents = filteredStudents;
      this.years = years;
      this.semesters = semesters;
      this.divisions = divisions;
      this.deptData = deptData;
      this.rawAttendance = attendance;

      this.filterAttendanceTable();
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  filterAttendanceTable() {
    const yearId = document.getElementById('attFilterYear').value;
    const semId = document.getElementById('attFilterSem').value;
    const divId = document.getElementById('attFilterDiv').value;
    const subId = document.getElementById('attFilterSubject').value;
    const search = document.getElementById('attFilterSearch').value.toLowerCase();

    let records = this.rawAttendance || [];
    if (yearId) records = records.filter(a => a.academic_year_id == yearId);
    if (semId) records = records.filter(a => a.semester_id == semId);
    if (divId) records = records.filter(a => a.division_id == divId);
    if (subId) records = records.filter(a => a.subject_id == subId);
    if (search) {
      records = records.filter(a => 
        (a.student_email && a.student_email.toLowerCase().includes(search)) ||
        (a.enrollment_no && a.enrollment_no.toLowerCase().includes(search))
      );
    }

    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    tbody.innerHTML = records.map(a => {
      const pct = a.attendance_percentage;
      const isEligible = pct >= 60.0;
      return `
        <tr>
          <td class="fw-semibold">${a.student_email}</td>
          <td><code>${a.enrollment_no}</code></td>
          <td>${a.subject_name}</td>
          <td>${a.division_name}</td>
          <td>${a.classes_attended}</td>
          <td>${a.total_classes}</td>
          <td><strong>${pct.toFixed(2)}%</strong></td>
          <td>
            <span class="badge ${isEligible ? 'bg-success' : 'bg-danger'}">
              ${isEligible ? 'Eligible' : 'Not Eligible'}
            </span>
          </td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="program_coordinatorModule.showEditAttendanceModal(${a.id}, ${a.classes_attended}, ${a.total_classes})"><i class="bi bi-pencil"></i> Edit</button>
          </td>
        </tr>
      `;
    }).join('');

    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No attendance records found matching filters.</td></tr>';
    }
  },

  async showAddAttendanceModal() {
    const subjects = this.subjects || [];
    const students = this.filteredStudents || [];

    const modalBody = document.getElementById('globalModalBody');
    const modalTitle = document.getElementById('globalModalTitle');
    const modalFooter = document.getElementById('globalModalFooter');

    modalTitle.textContent = "Add Attendance Record";
    modalBody.innerHTML = `
      <form id="attendanceForm">
        <div class="mb-3">
          <label class="form-label">Student</label>
          <select class="form-select" id="attStudent" required>
            <option value="">Select Student</option>
            ${students.map(s => `<option value="${s.id}">${s.email} (${s.enrollment_no})</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Subject</label>
          <select class="form-select" id="attSubject" required>
            <option value="">Select Subject</option>
            ${subjects.map(s => `<option value="${s.id}">${s.code} - ${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-3">
          <label class="form-label">Total Classes</label>
          <input type="number" class="form-control" id="attTotal" min="1" required value="40">
        </div>
        <div class="mb-3">
          <label class="form-label">Classes Attended</label>
          <input type="number" class="form-control" id="attAttended" min="0" required value="30">
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="program_coordinatorModule.submitAttendance()">Add</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('globalModal'));
    modal.show();
    this.attendanceModalInstance = modal;
  },

  async submitAttendance() {
    const studentId = document.getElementById('attStudent').value;
    const subjectId = document.getElementById('attSubject').value;
    const total = parseInt(document.getElementById('attTotal').value);
    const attended = parseInt(document.getElementById('attAttended').value);

    if (!studentId || !subjectId || isNaN(total) || isNaN(attended)) {
      alert("Please select student and subject, and provide valid class counts.");
      return;
    }
    if (attended < 0 || total <= 0) {
      alert("Classes cannot be negative, and total classes must be greater than zero.");
      return;
    }
    if (attended > total) {
      alert("Attended classes cannot exceed total classes.");
      return;
    }

    try {
      const activeYear = (this.years && this.years.find(y => y.is_active === 1)) || (this.years && this.years[0]) || { id: 1 };
      const student = this.filteredStudents.find(s => s.id == studentId);
      const divisionId = (student && student.division_id) ? student.division_id : 1;

      const facultyAlloc = await api.get('/program-coordinator/assignments');
      const allocation = facultyAlloc.find(a => a.subject_id == subjectId);
      const facultyId = allocation ? allocation.faculty_id : 1;

      await api.post('/attendance', {
        student_id: parseInt(studentId),
        subject_id: parseInt(subjectId),
        faculty_id: facultyId,
        department_id: this.deptData.department_id || (student ? student.department_id : 1),
        academic_year_id: activeYear.id,
        semester_id: 1,
        division_id: divisionId,
        total_classes: total,
        classes_attended: attended
      });

      this.appContext.showToast("Attendance record added successfully!");
      this.attendanceModalInstance.hide();
      this.renderAttendance(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to create attendance record");
    }
  },

  showEditAttendanceModal(id, attended, total) {
    const modalBody = document.getElementById('globalModalBody');
    const modalTitle = document.getElementById('globalModalTitle');
    const modalFooter = document.getElementById('globalModalFooter');

    modalTitle.textContent = "Edit Attendance Record";
    modalBody.innerHTML = `
      <form id="editAttendanceForm">
        <div class="mb-3">
          <label class="form-label">Total Classes</label>
          <input type="number" class="form-control" id="editTotal" min="1" required value="${total}">
        </div>
        <div class="mb-3">
          <label class="form-label">Classes Attended</label>
          <input type="number" class="form-control" id="editAttended" min="0" required value="${attended}">
        </div>
      </form>
    `;

    modalFooter.innerHTML = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="program_coordinatorModule.updateAttendance(${id})">Save Changes</button>
    `;

    const modal = new bootstrap.Modal(document.getElementById('globalModal'));
    modal.show();
    this.editAttendanceModalInstance = modal;
  },

  async updateAttendance(id) {
    const total = parseInt(document.getElementById('editTotal').value);
    const attended = parseInt(document.getElementById('editAttended').value);

    if (isNaN(total) || isNaN(attended)) {
      alert("Invalid input.");
      return;
    }
    if (attended < 0 || total <= 0) {
      alert("Classes cannot be negative, and total classes must be greater than zero.");
      return;
    }
    if (attended > total) {
      alert("Attended classes cannot exceed total classes.");
      return;
    }

    try {
      await api.put(`/attendance/${id}`, {
        total_classes: total,
        classes_attended: attended
      });
      this.appContext.showToast("Attendance updated successfully!");
      this.editAttendanceModalInstance.hide();
      this.renderAttendance(document.getElementById('mainContent'));
    } catch(err) {
      alert(err.message || "Failed to update attendance");
    }
  },

  chartInstances: {},

  destroyCharts() {
    Object.keys(this.chartInstances).forEach(key => {
      if (this.chartInstances[key]) {
        this.chartInstances[key].destroy();
        this.chartInstances[key] = null;
      }
    });
  },

  async renderFeedback(container) {
    this.appContext.showLoading();
    try {
      const [data, faculties, subjects, years, semesters] = await Promise.all([
        api.get('/analytics/program-coordinator/feedback-summary'),
        api.get('/program-coordinator/faculty'),
        api.get('/program-coordinator/subjects'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters')
      ]);

      container.innerHTML = `
        <div class="mb-4">
          <h2>Department Feedback Summary</h2>
          <p class="text-muted">Aggregated feedback performance and sentiment analytics for your department.</p>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-2">
                <label class="form-label fw-semibold">Academic Year</label>
                <select class="form-select form-select-sm" id="pcFbYear" onchange="program_coordinatorModule.filterFeedback()">
                  <option value="">All Years</option>
                  ${years.map(y => `<option value="${y.id}">${y.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Semester</label>
                <select class="form-select form-select-sm" id="pcFbSem" onchange="program_coordinatorModule.filterFeedback()">
                  <option value="">All Semesters</option>
                  ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Subject</label>
                <select class="form-select form-select-sm" id="pcFbSubject" onchange="program_coordinatorModule.filterFeedback()">
                  <option value="">All Subjects</option>
                  ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Faculty</label>
                <select class="form-select form-select-sm" id="pcFbFaculty" onchange="program_coordinatorModule.filterFeedback()">
                  <option value="">All Faculty</option>
                  ${faculties.map(f => `<option value="${f.id}">${f.faculty_name || f.email}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Attendance Band</label>
                <select class="form-select form-select-sm" id="pcFbBand" onchange="program_coordinatorModule.filterFeedback()">
                  <option value="">All Attendance Bands</option>
                  <option value="60-69">60–69%</option>
                  <option value="70-79">70–79%</option>
                  <option value="80-89">80–89%</option>
                  <option value="90-100">90–100%</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div id="pcFeedbackKpisContainer">
          ${this.renderKpiCardsHtml(data)}
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Faculty Rating</h5>
                <canvas id="pcFacultyChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-journal-check me-2"></i>Subject Rating</h5>
                <canvas id="pcSubjectChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Sentiment Analysis</h5>
                <canvas id="pcSentimentChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart-steps me-2"></i>Attendance-wise Feedback</h5>
                <canvas id="pcAttendanceBandChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Feedback Trend</h5>
                <canvas id="pcTrendChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-4" id="pcResponseOverviewContainer">
          ${this.renderResponseOverviewHtml(data)}
        </div>
      `;

      this.renderFeedbackCharts(data);
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderKpiCardsHtml(data) {
    return `
      <div class="row g-4 mb-4">
        <div class="col-md-3">${this.appContext.createKPICard('Eligible Students', data.total_eligible_students || 0, 'bi-mortarboard')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Total Responses', data.total_responses || 0, 'bi-chat-left-text')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Response Rate', data.response_rate || '0%', 'bi-percent')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Average Rating', data.average_rating ? data.average_rating.toFixed(2) : '0.00', 'bi-star-fill')}</div>
      </div>
      <div class="row g-4 mb-4">
        <div class="col-md-3">${this.appContext.createKPICard('Positive Sentiment', data.positive_sentiment || '0%', 'bi-emoji-smile', 'success')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Neutral Sentiment', data.neutral_sentiment || '0%', 'bi-emoji-neutral', 'info')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Negative Sentiment', data.negative_sentiment || '0%', 'bi-emoji-frown', 'warning')}</div>
        <div class="col-md-3">${this.appContext.createKPICard('Critical Feedback', data.critical_feedback || 0, 'bi-exclamation-triangle', 'danger')}</div>
      </div>
    `;
  },

  renderResponseOverviewHtml(data) {
    const rate = data.response_rate || '0%';
    return `
      <div class="card-body">
        <h5 class="mb-3"><i class="bi bi-people me-2"></i>Response Rate Overview</h5>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span>Submitted Responses vs Total Eligible Students</span>
          <strong>${data.total_responses || 0} / ${data.total_eligible_students || 0} (${rate})</strong>
        </div>
        <div class="progress" style="height: 16px;">
          <div class="progress-bar bg-success" style="width: ${rate};"></div>
        </div>
      </div>
    `;
  },

  async filterFeedback() {
    const year = document.getElementById('pcFbYear').value;
    const sem = document.getElementById('pcFbSem').value;
    const sub = document.getElementById('pcFbSubject').value;
    const fac = document.getElementById('pcFbFaculty').value;
    const band = document.getElementById('pcFbBand').value;

    let queryParams = [];
    if (year) queryParams.push(`academic_year_id=${year}`);
    if (sem) queryParams.push(`semester_id=${sem}`);
    if (sub) queryParams.push(`subject_id=${sub}`);
    if (fac) queryParams.push(`faculty_id=${fac}`);
    if (band) queryParams.push(`attendance_band=${band}`);

    const url = `/analytics/program-coordinator/feedback-summary` + (queryParams.length ? `?${queryParams.join('&')}` : '');
    try {
      this.appContext.showToast("Updating analytics...", "info");
      const data = await api.get(url);

      const kpisContainer = document.getElementById('pcFeedbackKpisContainer');
      if (kpisContainer) {
        kpisContainer.innerHTML = this.renderKpiCardsHtml(data);
      }

      const overviewContainer = document.getElementById('pcResponseOverviewContainer');
      if (overviewContainer) {
        overviewContainer.innerHTML = this.renderResponseOverviewHtml(data);
      }

      this.renderFeedbackCharts(data);
    } catch(err) {
      console.error("Filter feedback error:", err);
    }
  },

  renderFeedbackCharts(data) {
    this.destroyCharts();

    if (document.getElementById('pcFacultyChart')) {
      this.chartInstances.faculty = new Chart(document.getElementById('pcFacultyChart'), {
        type: 'bar',
        data: {
          labels: data.faculty_ratings ? data.faculty_ratings.map(f => (f.faculty_name || f.faculty_email).split('@')[0]) : [],
          datasets: [{
            label: 'Avg Rating',
            data: data.faculty_ratings ? data.faculty_ratings.map(f => f.overall_rating) : [],
            backgroundColor: '#1a237e'
          }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
      });
    }

    if (document.getElementById('pcSubjectChart')) {
      this.chartInstances.subject = new Chart(document.getElementById('pcSubjectChart'), {
        type: 'bar',
        data: {
          labels: data.subject_ratings ? data.subject_ratings.map(s => s.subject_name) : [],
          datasets: [{
            label: 'Avg Rating',
            data: data.subject_ratings ? data.subject_ratings.map(s => s.overall_rating) : [],
            backgroundColor: '#0288d1'
          }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
      });
    }

    if (document.getElementById('pcSentimentChart')) {
      this.chartInstances.sentiment = new Chart(document.getElementById('pcSentimentChart'), {
        type: 'doughnut',
        data: {
          labels: ['Positive', 'Neutral', 'Negative'],
          datasets: [{
            data: [
              data.sentiment_distribution ? data.sentiment_distribution.positive : 0,
              data.sentiment_distribution ? data.sentiment_distribution.neutral : 0,
              data.sentiment_distribution ? data.sentiment_distribution.negative : 0
            ],
            backgroundColor: ['#2e7d32', '#0288d1', '#d32f2f']
          }]
        },
        options: { responsive: true }
      });
    }

    if (document.getElementById('pcAttendanceBandChart')) {
      this.chartInstances.attendance = new Chart(document.getElementById('pcAttendanceBandChart'), {
        type: 'bar',
        data: {
          labels: data.attendance_band_ratings ? data.attendance_band_ratings.map(b => b.band) : ['60-69%', '70-79%', '80-89%', '90-100%'],
          datasets: [{
            label: 'Avg Rating',
            data: data.attendance_band_ratings ? data.attendance_band_ratings.map(b => b.average_rating) : [0, 0, 0, 0],
            backgroundColor: '#7b1fa2'
          }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
      });
    }

    if (document.getElementById('pcTrendChart')) {
      this.chartInstances.trend = new Chart(document.getElementById('pcTrendChart'), {
        type: 'line',
        data: {
          labels: data.trend ? data.trend.map(t => t.cycle) : ['Current'],
          datasets: [{
            label: 'Avg Rating',
            data: data.trend ? data.trend.map(t => t.rating) : [data.average_rating || 0],
            borderColor: '#1a237e',
            fill: false
          }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
      });
    }
  }
};

