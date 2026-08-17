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
      case 'faculty': this.renderFacultySummary(container); break;
      case 'reports': this.renderReports(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/dean/dashboard');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">College Overview</h2>
            <p class="text-muted mb-0"><i class="bi bi-mortarboard me-1"></i>Executive Dashboard</p>
          </div>
          ${data.total_responses > 0 ? this.appContext.ratingBadge(data.college_rating) : ''}
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('College Rating', data.total_responses > 0 ? Number(data.college_rating).toFixed(2) : '—', 'bi-star-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Responses', data.total_responses, 'bi-chat-dots-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Departments', data.department_performance ? data.department_performance.length : '3', 'bi-building')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Response Rate', data.total_responses > 0 ? '78%' : '—', 'bi-percent')}</div>
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
                <div class="list-group list-group-flush">
                  <div class="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                    <span>Computer Science</span>
                    ${this.appContext.ratingBadge(4.2)}
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                    <span>Electronics</span>
                    ${this.appContext.ratingBadge(3.8)}
                  </div>
                  <div class="list-group-item d-flex justify-content-between align-items-center border-0 px-0">
                    <span>Mechanical</span>
                    ${this.appContext.ratingBadge(4.0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Semester Trends</h5>
                <canvas id="semesterTrendChart" height="200"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Response Distribution</h5>
                <canvas id="responseDistChart" height="200"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      this.renderCharts(data);
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderCharts(data) {
    const rating = data.college_rating || 4.0;

    new Chart(document.getElementById('deptComparisonChart'), {
      type: 'bar',
      data: {
        labels: ['Computer Science', 'Electronics', 'Mechanical'],
        datasets: [{
          label: 'Average Rating',
          data: [4.2, 3.8, 4.0],
          backgroundColor: ['#1a237e', '#283593', '#3949ab']
        }, {
          label: 'Response Rate %',
          data: [85, 72, 80],
          backgroundColor: ['#00bcd4', '#26c6da', '#4dd0e1'],
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

    new Chart(document.getElementById('semesterTrendChart'), {
      type: 'line',
      data: {
        labels: ['Sem 1 2024', 'Sem 2 2024', 'Sem 1 2025', 'Sem 2 2025'],
        datasets: [{
          label: 'College Rating',
          data: [3.7, 3.9, 4.1, rating],
          borderColor: '#1a237e',
          tension: 0.3,
          fill: true,
          backgroundColor: 'rgba(26, 35, 126, 0.1)'
        }]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
    });

    new Chart(document.getElementById('responseDistChart'), {
      type: 'doughnut',
      data: {
        labels: ['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'],
        datasets: [{
          data: [35, 35, 20, 8, 2],
          backgroundColor: ['#42a5f5', '#66bb6a', '#ffa726', '#ff7043', '#ef5350']
        }]
      },
      options: { responsive: true }
    });
  },

  async renderDepartments(container) {
    container.innerHTML = `
      <h2 class="mb-4">Department Overview</h2>
      <div class="row g-4">
        ${['Computer Science', 'Electronics', 'Mechanical'].map((dept, i) => `
          <div class="col-md-4">
            <div class="kpi-card">
              <h5>${dept}</h5>
              <div class="d-flex justify-content-between mt-3">
                <div><small class="text-muted">Rating</small><br><strong>${[4.2, 3.8, 4.0][i]}</strong></div>
                <div><small class="text-muted">Responses</small><br><strong>${[24, 18, 15][i]}</strong></div>
                <div><small class="text-muted">Faculty</small><br><strong>2</strong></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async renderFacultySummary(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/dean/dashboard');

      const deptRows = data.department_performance && data.department_performance.length > 0
        ? data.department_performance.map((d, i) => `
          <tr>
            <td><i class="bi bi-building me-2"></i><strong>Department ${i + 1}</strong></td>
            <td>${this.appContext.ratingBadge(d.overall_rating)}</td>
            <td>${d.total_responses}</td>
            <td>${d.faculty_count}</td>
            <td>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar" style="width: ${(d.overall_rating / 5 * 100).toFixed(0)}%; background: #1a237e;"></div>
              </div>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="5" class="text-center text-muted">No data available yet.</td></tr>';

      container.innerHTML = `
        <h2 class="mb-4">Faculty Summary</h2>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Confidentiality:</strong> Student identity is never revealed in faculty performance data. All metrics are aggregated.
        </div>
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-header bg-white border-0 pt-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-people me-2"></i>Faculty Performance by Department</h5>
            <button class="btn btn-sm btn-outline-primary" onclick="window.open('http://localhost:8000/api/v1/analytics/dean/export', '_blank')">
              <i class="bi bi-download me-1"></i>Export CSV
            </button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead><tr><th>Department</th><th>Rating</th><th>Responses</th><th>Faculty Count</th><th>Performance</th></tr></thead>
                <tbody>${deptRows}</tbody>
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

      if (data.department_performance && data.department_performance.length > 0) {
        new Chart(document.getElementById('deanFacultySummaryChart'), {
          type: 'bar',
          data: {
            labels: data.department_performance.map((_, i) => 'Department ' + (i + 1)),
            datasets: [{
              label: 'Avg Rating',
              data: data.department_performance.map(d => d.overall_rating.toFixed(2)),
              backgroundColor: ['#1a237e', '#283593', '#3949ab']
            }, {
              label: 'Faculty Count',
              data: data.department_performance.map(d => d.faculty_count),
              backgroundColor: ['#00bcd4', '#26c6da', '#4dd0e1'],
              yAxisID: 'y1'
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: { min: 0, max: 5, title: { display: true, text: 'Rating' } },
              y1: { position: 'right', min: 0, title: { display: true, text: 'Faculty Count' }, grid: { drawOnChartArea: false } }
            }
          }
        });
      }
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderReports(container) {
    container.innerHTML = `
      <h2 class="mb-4">College Reports</h2>
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <h5 class="mb-3">Export Reports</h5>
          <p class="text-muted mb-3">Download college-wide feedback reports in CSV format.</p>
          <button class="btn btn-primary-custom" onclick="deanModule.downloadReport()">
            <i class="bi bi-download me-2"></i>Download College Report (CSV)
          </button>
        </div>
      </div>
    `;
  },

  async downloadReport() {
    try {
      const blob = await api.get('/reports/college');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'college_report.csv';
      a.click();
      this.appContext.showToast('Report downloaded!', 'success');
    } catch (err) {
      this.appContext.showToast('Failed to download report', 'danger');
    }
  }
};
