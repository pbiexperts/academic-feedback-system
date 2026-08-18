// Dean Dashboard Module
window.deanModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'departments': this.renderDepartments(container); break;
      case 'hod-performance': this.renderHODPerformance(container); break;
      case 'faculty': this.renderFacultySummary(container); break;
      case 'feedback': this.renderFeedback(container); break;
      case 'reports': this.renderReports(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const [data, comparison] = await Promise.all([
        api.get('/analytics/dean/dashboard'),
        api.get('/analytics/dean/department-comparison')
      ]);

      const deptCount = data.departments_count !== undefined ? data.departments_count : (data.departments !== undefined ? data.departments : (comparison ? comparison.length : 0));
      const ratingStr = data.college_rating ? Number(data.college_rating).toFixed(2) : '—';

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">College Overview</h2>
            <p class="text-muted mb-0"><i class="bi bi-mortarboard me-1"></i>Executive Dashboard</p>
          </div>
          ${data.total_responses > 0 ? this.appContext.ratingBadge(data.college_rating) : ''}
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('College Rating', ratingStr, 'bi-star-fill')}</div>
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('Total Responses', data.total_responses, 'bi-chat-dots-fill')}</div>
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('Departments', deptCount, 'bi-building')}</div>
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('Response Rate', data.response_rate || '0%', 'bi-percent')}</div>
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('Positive Sentiment', data.positive_sentiment || '0%', 'bi-emoji-smile', 'success')}</div>
          <div class="col-md-4 col-lg-2">${this.appContext.createKPICard('Critical Feedback', data.critical_feedback || '0%', 'bi-exclamation-triangle', 'danger')}</div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-8">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Department Comparison</h5>
                <canvas id="deptComparisonChart" height="250"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-trophy me-2"></i>Performance Summary</h5>
                <div class="table-responsive">
                  <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                      <tr>
                        <th>Rank</th>
                        <th>Department</th>
                        <th>Rating</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${data.performance_summary && data.performance_summary.length > 0 ? data.performance_summary.map(p => `
                        <tr>
                          <td><strong>#${p.rank}</strong></td>
                          <td class="fw-semibold">${p.department}</td>
                          <td>${this.appContext.ratingBadge(p.rating)}</td>
                          <td>
                            <span class="badge ${p.status === 'Excellent' ? 'bg-success' : p.status === 'Good' ? 'bg-primary' : p.status === 'Monitor' ? 'bg-warning text-dark' : 'bg-danger'}">
                              ${p.status}
                            </span>
                          </td>
                        </tr>
                      `).join('') : '<tr><td colspan="4" class="text-center text-muted">No data available</td></tr>'}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white border-0 pt-3">
            <h5 class="mb-0"><i class="bi bi-building me-2"></i>Department Comparative Analytics</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Department</th>
                    <th>Average Rating</th>
                    <th>Response Rate</th>
                    <th>Positive Sentiment</th>
                    <th>Critical Comments</th>
                  </tr>
                </thead>
                <tbody>
                  ${comparison.map(c => `
                    <tr>
                      <td class="fw-semibold">${c.department_name}</td>
                      <td>${this.appContext.ratingBadge(c.average_rating)}</td>
                      <td>${c.response_rate}</td>
                      <td><span class="text-success fw-bold">${c.positive_sentiment}</span></td>
                      <td><span class="text-danger fw-bold">${c.critical_feedback}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      this.renderDashboardCharts(data, comparison);
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderDashboardCharts(data, comparison) {
    if (!document.getElementById('deptComparisonChart')) return;

    new Chart(document.getElementById('deptComparisonChart'), {
      type: 'bar',
      data: {
        labels: comparison ? comparison.map(d => d.department_name) : [],
        datasets: [{
          label: 'Average Rating',
          data: comparison ? comparison.map(d => d.average_rating) : [],
          backgroundColor: '#1a237e'
        }, {
          label: 'Response Rate %',
          data: comparison ? comparison.map(d => parseInt(d.response_rate.replace('%', '') || '0')) : [],
          backgroundColor: '#00bcd4',
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { min: 0, max: 5, title: { display: true, text: 'Rating' } },
          y1: { position: 'right', min: 0, max: 100, title: { display: true, text: 'Response Rate %' }, grid: { drawOnChartArea: false } }
        }
      }
    });
  },

  async renderDepartments(container) {
    this.appContext.showLoading();
    try {
      const departments = await api.get('/analytics/dean/departments');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Department Overview</h2>
          <span class="badge bg-primary fs-6"><i class="bi bi-building me-1"></i>${departments.length} Departments</span>
        </div>

        <div class="row g-4 mb-4">
          ${departments.map(d => `
            <div class="col-md-6 col-lg-4">
              <div class="card shadow-sm border-0 h-100">
                <div class="card-body d-flex flex-column">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="card-title mb-0 text-primary">${d.name} (${d.code})</h4>
                    ${this.appContext.ratingBadge(d.average_rating)}
                  </div>
                  <div class="mb-3 text-muted small">
                    <div><strong>HOD:</strong> ${d.hod}</div>
                    <div><strong>Program Coordinator:</strong> ${d.program_coordinator}</div>
                  </div>
                  <div class="row g-2 mb-3 text-center bg-light p-2 rounded">
                    <div class="col-4">
                      <span class="text-muted small">Faculty</span>
                      <strong class="d-block">${d.faculty_count}</strong>
                    </div>
                    <div class="col-4">
                      <span class="text-muted small">Students</span>
                      <strong class="d-block">${d.student_count}</strong>
                    </div>
                    <div class="col-4">
                      <span class="text-muted small">Subjects</span>
                      <strong class="d-block">${d.subject_count}</strong>
                    </div>
                  </div>
                  <div class="row g-2 mb-3 text-center">
                    <div class="col-6">
                      <span class="text-muted small">Response Rate</span>
                      <strong class="d-block text-success">${d.response_rate}</strong>
                    </div>
                    <div class="col-6">
                      <span class="text-muted small">Positive Sentiment</span>
                      <strong class="d-block text-info">${d.positive_sentiment}</strong>
                    </div>
                  </div>
                  <div class="mt-auto">
                    <button class="btn btn-outline-primary w-100" onclick="deanModule.viewDepartmentDetails(${d.id})">
                      <i class="bi bi-eye me-1"></i>View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async viewDepartmentDetails(deptId) {
    try {
      const data = await api.get(`/analytics/dean/department-details/${deptId}`);

      const modalTitle = document.getElementById('globalModalTitle');
      const modalBody = document.getElementById('globalModalBody');
      const modalFooter = document.getElementById('globalModalFooter');

      modalTitle.textContent = `${data.department_name} — Department Analytics Details`;
      modalBody.innerHTML = `
        <div class="row g-3 mb-4 text-center">
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Average Rating</span><h5 class="mb-0 text-primary">${data.average_rating}</h5></div></div>
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Response Rate</span><h5 class="mb-0 text-success">${data.response_rate}</h5></div></div>
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Faculty</span><h5 class="mb-0 text-dark">${data.faculty_count}</h5></div></div>
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Students</span><h5 class="mb-0 text-dark">${data.student_count}</h5></div></div>
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Subjects</span><h5 class="mb-0 text-dark">${data.subject_count}</h5></div></div>
          <div class="col-md-2"><div class="p-2 bg-light rounded"><span class="text-muted small">Critical Feedback</span><h5 class="mb-0 text-danger">${data.critical_feedback}</h5></div></div>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h6><i class="bi bi-person-badge me-1"></i>Faculty Performance</h6>
                <canvas id="modalDeptFacultyChart" height="180"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h6><i class="bi bi-book me-1"></i>Subject Performance</h6>
                <canvas id="modalDeptSubjectChart" height="180"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h6><i class="bi bi-emoji-smile me-1"></i>Sentiment Distribution</h6>
                <canvas id="modalDeptSentimentChart" height="180"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h6><i class="bi bi-bar-chart-steps me-1"></i>Attendance-wise Feedback</h6>
                <canvas id="modalDeptAttendanceChart" height="180"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <h6><i class="bi bi-graph-up me-1"></i>Rating Trend</h6>
                <canvas id="modalDeptTrendChart" height="180"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';

      const modal = new bootstrap.Modal(document.getElementById('globalModal'));
      modal.show();

      setTimeout(() => {
        new Chart(document.getElementById('modalDeptFacultyChart'), {
          type: 'bar',
          data: {
            labels: data.faculty_performance ? data.faculty_performance.map(f => f.faculty_name.split('@')[0]) : [],
            datasets: [{ label: 'Avg Rating', data: data.faculty_performance ? data.faculty_performance.map(f => f.average_rating) : [], backgroundColor: '#1a237e' }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });

        new Chart(document.getElementById('modalDeptSubjectChart'), {
          type: 'bar',
          data: {
            labels: data.subject_performance ? data.subject_performance.map(s => s.subject_name) : [],
            datasets: [{ label: 'Avg Rating', data: data.subject_performance ? data.subject_performance.map(s => s.average_rating) : [], backgroundColor: '#0288d1' }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });

        new Chart(document.getElementById('modalDeptSentimentChart'), {
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

        new Chart(document.getElementById('modalDeptAttendanceChart'), {
          type: 'bar',
          data: {
            labels: data.attendance_ratings ? data.attendance_ratings.map(b => b.band) : ['60-69%', '70-79%', '80-89%', '90-100%'],
            datasets: [{ label: 'Avg Rating', data: data.attendance_ratings ? data.attendance_ratings.map(b => b.rating) : [0, 0, 0, 0], backgroundColor: '#7b1fa2' }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });

        new Chart(document.getElementById('modalDeptTrendChart'), {
          type: 'line',
          data: {
            labels: data.trend ? data.trend.map(t => t.cycle) : ['Current'],
            datasets: [{ label: 'Rating', data: data.trend ? data.trend.map(t => t.rating) : [data.average_rating], borderColor: '#1a237e', fill: false }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });
      }, 300);

    } catch (err) {
      alert(err.message || "Failed to load department details");
    }
  },

  async renderHODPerformance(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/dean/hod-performance');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>HOD Performance Audit</h2>
          <span class="badge bg-secondary fs-6"><i class="bi bi-person-badge me-1"></i>HOD Review</span>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>HOD Email</th>
                    <th>Department</th>
                    <th>Department Avg Rating</th>
                    <th>Response Rate</th>
                    <th>Faculty Coverage</th>
                    <th>Positive Sentiment</th>
                    <th>Critical Comments</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(h => `
                    <tr>
                      <td class="fw-semibold">${h.hod_name}</td>
                      <td>${h.department_name}</td>
                      <td>${this.appContext.ratingBadge(h.average_rating)}</td>
                      <td>${h.response_rate}</td>
                      <td><strong>${h.faculty_coverage}</strong></td>
                      <td><span class="text-success fw-bold">${h.positive_sentiment}</span></td>
                      <td><span class="text-danger fw-bold">${h.critical_feedback}</span></td>
                    </tr>
                  `).join('')}
                  ${data.length === 0 ? '<tr><td colspan="7" class="text-center py-4 text-muted">No HOD performance records found.</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mt-4">
          <div class="card-body">
            <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>HOD Department Rating Comparison</h5>
            <canvas id="deanHODChart" height="200"></canvas>
          </div>
        </div>
      `;

      if (data.length > 0 && document.getElementById('deanHODChart')) {
        new Chart(document.getElementById('deanHODChart'), {
          type: 'bar',
          data: {
            labels: data.map(h => `${h.department_name} (${h.hod_name.split('@')[0]})`),
            datasets: [{
              label: 'Average Rating',
              data: data.map(h => h.average_rating),
              backgroundColor: '#1a237e'
            }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });
      }
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderFacultySummary(container) {
    this.appContext.showLoading();
    try {
      const [departments, years, semesters] = await Promise.all([
        api.get('/analytics/dean/departments'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters')
      ]);

      container.innerHTML = `
        <h2 class="mb-4">Faculty Summary</h2>
        
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label fw-semibold">Department</label>
                <select class="form-select" id="facSumDept" onchange="deanModule.filterFacultySummary()">
                  <option value="">All Departments</option>
                  ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Academic Year</label>
                <select class="form-select" id="facSumYear" onchange="deanModule.filterFacultySummary()">
                  <option value="">All Academic Years</option>
                  ${years.map(y => `<option value="${y.id}">${y.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold">Semester</label>
                <select class="form-select" id="facSumSem" onchange="deanModule.filterFacultySummary()">
                  <option value="">All Semesters</option>
                  ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-4">
          <div class="card-header bg-white border-0 pt-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-people me-2"></i>Faculty Performance by Department</h5>
            <button class="btn btn-sm btn-outline-primary" onclick="window.open('http://localhost:8000/api/v1/analytics/dean/export', '_blank')">
              <i class="bi bi-download me-1"></i>Export CSV
            </button>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Department</th>
                    <th>Rating</th>
                    <th>Responses</th>
                    <th>Faculty Count</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody id="facSumTableBody">
                  <!-- Dynamically rendered -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Department-wise Faculty Rating</h5>
            <canvas id="deanFacultySummaryChart" height="200"></canvas>
          </div>
        </div>
      `;

      this.filterFacultySummary();
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async filterFacultySummary() {
    const deptId = document.getElementById('facSumDept').value;
    const yearId = document.getElementById('facSumYear').value;
    const semId = document.getElementById('facSumSem').value;

    let queryParams = [];
    if (deptId) queryParams.push(`department_id=${deptId}`);
    if (yearId) queryParams.push(`academic_year_id=${yearId}`);
    if (semId) queryParams.push(`semester_id=${semId}`);

    const url = `/analytics/dean/faculty-summary` + (queryParams.length ? `?${queryParams.join('&')}` : '');
    try {
      const data = await api.get(url);
      const tbody = document.getElementById('facSumTableBody');
      if (!tbody) return;

      tbody.innerHTML = data.map(d => `
        <tr>
          <td><strong>${d.department_name}</strong></td>
          <td>${this.appContext.ratingBadge(d.overall_rating)}</td>
          <td>${d.total_responses}</td>
          <td>${d.faculty_count}</td>
          <td>
            <span class="badge ${d.performance === 'Excellent' ? 'bg-success' : d.performance === 'Good' ? 'bg-primary' : d.performance === 'Monitor' ? 'bg-warning text-dark' : 'bg-danger'}">
              ${d.performance}
            </span>
          </td>
        </tr>
      `).join('');

      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No data available for selected filters.</td></tr>';
      }

      if (document.getElementById('deanFacultySummaryChart')) {
        new Chart(document.getElementById('deanFacultySummaryChart'), {
          type: 'bar',
          data: {
            labels: data.map(d => d.department_name),
            datasets: [{
              label: 'Avg Rating',
              data: data.map(d => d.overall_rating),
              backgroundColor: '#1a237e'
            }]
          },
          options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
        });
      }
    } catch(err) {
      console.error("Filter faculty summary error:", err);
    }
  },

  async renderReports(container) {
    container.innerHTML = `
      <h2 class="mb-4">College Reports</h2>
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <h5 class="mb-3">Export Reports</h5>
          <p class="text-muted mb-3">Download college-wide feedback reports in CSV format.</p>
          <button class="btn btn-primary" onclick="window.open('http://localhost:8000/api/v1/analytics/dean/export', '_blank')">
            <i class="bi bi-download me-2"></i>Download College Report (CSV)
          </button>
        </div>
      </div>
    `;
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
      const [data, depts, faculties, subjects, years, semesters] = await Promise.all([
        api.get('/analytics/dean/feedback-summary'),
        api.get('/analytics/dean/departments'),
        api.get('/analytics/dean/faculty'),
        api.get('/analytics/dean/subjects'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters')
      ]);

      const deptList = Array.isArray(depts) ? depts : (depts.departments || []);

      container.innerHTML = `
        <div class="mb-4">
          <h2>College Feedback Summary</h2>
          <p class="text-muted">Institution-wide feedback performance, department comparison, and sentiment analytics.</p>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-2">
                <label class="form-label fw-semibold">Department</label>
                <select class="form-select form-select-sm" id="deanFbDept" onchange="deanModule.onDepartmentFilterChange()">
                  <option value="">All Departments</option>
                  ${deptList.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Academic Year</label>
                <select class="form-select form-select-sm" id="deanFbYear" onchange="deanModule.filterFeedback()">
                  <option value="">All Years</option>
                  ${years.map(y => `<option value="${y.id}">${y.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Semester</label>
                <select class="form-select form-select-sm" id="deanFbSem" onchange="deanModule.filterFeedback()">
                  <option value="">All Semesters</option>
                  ${semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Subject</label>
                <select class="form-select form-select-sm" id="deanFbSubject" onchange="deanModule.filterFeedback()">
                  <option value="">All Subjects</option>
                  ${subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Faculty</label>
                <select class="form-select form-select-sm" id="deanFbFaculty" onchange="deanModule.filterFeedback()">
                  <option value="">All Faculty</option>
                  ${faculties.map(f => `<option value="${f.id}">${f.faculty_name || f.email}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Attendance Band</label>
                <select class="form-select form-select-sm" id="deanFbBand" onchange="deanModule.filterFeedback()">
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

        <div id="deanFeedbackKpisContainer">
          ${this.renderKpiCardsHtml(data)}
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-building me-2"></i>Department Rating</h5>
                <canvas id="deanDeptChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Faculty Rating</h5>
                <canvas id="deanFacultyChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-journal-check me-2"></i>Subject Rating</h5>
                <canvas id="deanSubjectChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Sentiment Analysis</h5>
                <canvas id="deanSentimentChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart-steps me-2"></i>Attendance-wise Feedback</h5>
                <canvas id="deanAttendanceBandChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Feedback Trend</h5>
                <canvas id="deanTrendChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-4" id="deanResponseOverviewContainer">
          ${this.renderResponseOverviewHtml(data)}
        </div>
      `;

      this.renderFeedbackCharts(data);
    } catch(err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async onDepartmentFilterChange() {
    const deptId = document.getElementById('deanFbDept').value;
    try {
      const urlSuffix = deptId ? `?department_id=${deptId}` : '';
      const [subjects, faculties] = await Promise.all([
        api.get(`/analytics/dean/subjects${urlSuffix}`),
        api.get(`/analytics/dean/faculty${urlSuffix}`)
      ]);

      const subSelect = document.getElementById('deanFbSubject');
      if (subSelect) {
        subSelect.innerHTML = `<option value="">All Subjects</option>` + 
          subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }

      const facSelect = document.getElementById('deanFbFaculty');
      if (facSelect) {
        facSelect.innerHTML = `<option value="">All Faculty</option>` + 
          faculties.map(f => `<option value="${f.id}">${f.faculty_name || f.email}</option>`).join('');
      }

      this.filterFeedback();
    } catch (err) {
      console.error("Dept filter change error:", err);
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
    const dept = document.getElementById('deanFbDept').value;
    const year = document.getElementById('deanFbYear').value;
    const sem = document.getElementById('deanFbSem').value;
    const sub = document.getElementById('deanFbSubject').value;
    const fac = document.getElementById('deanFbFaculty').value;
    const band = document.getElementById('deanFbBand').value;

    let queryParams = [];
    if (dept) queryParams.push(`department_id=${dept}`);
    if (year) queryParams.push(`academic_year_id=${year}`);
    if (sem) queryParams.push(`semester_id=${sem}`);
    if (sub) queryParams.push(`subject_id=${sub}`);
    if (fac) queryParams.push(`faculty_id=${fac}`);
    if (band) queryParams.push(`attendance_band=${band}`);

    const url = `/analytics/dean/feedback-summary` + (queryParams.length ? `?${queryParams.join('&')}` : '');
    try {
      this.appContext.showToast("Updating analytics...", "info");
      const data = await api.get(url);

      const kpisContainer = document.getElementById('deanFeedbackKpisContainer');
      if (kpisContainer) {
        kpisContainer.innerHTML = this.renderKpiCardsHtml(data);
      }

      const overviewContainer = document.getElementById('deanResponseOverviewContainer');
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

    if (document.getElementById('deanDeptChart')) {
      this.chartInstances.dept = new Chart(document.getElementById('deanDeptChart'), {
        type: 'bar',
        data: {
          labels: data.department_ratings ? data.department_ratings.map(d => d.department_name) : [],
          datasets: [{
            label: 'Avg Rating',
            data: data.department_ratings ? data.department_ratings.map(d => d.overall_rating) : [],
            backgroundColor: '#2e7d32'
          }]
        },
        options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
      });
    }

    if (document.getElementById('deanFacultyChart')) {
      this.chartInstances.faculty = new Chart(document.getElementById('deanFacultyChart'), {
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

    if (document.getElementById('deanSubjectChart')) {
      this.chartInstances.subject = new Chart(document.getElementById('deanSubjectChart'), {
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

    if (document.getElementById('deanSentimentChart')) {
      this.chartInstances.sentiment = new Chart(document.getElementById('deanSentimentChart'), {
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

    if (document.getElementById('deanAttendanceBandChart')) {
      this.chartInstances.attendance = new Chart(document.getElementById('deanAttendanceBandChart'), {
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

    if (document.getElementById('deanTrendChart')) {
      this.chartInstances.trend = new Chart(document.getElementById('deanTrendChart'), {
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
