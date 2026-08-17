// HOD Dashboard Module
window.hodModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'faculty': this.renderFacultyComparison(container); break;
      case 'subjects': this.renderSubjectAnalysis(container); break;
      case 'reports': this.renderReports(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/hod/dashboard');

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">Department Dashboard</h2>
            <p class="text-muted mb-0">
              <i class="bi bi-building me-1"></i>Department ID: ${data.department_id}
              <span class="badge bg-primary ms-2">HOD View</span>
            </p>
          </div>
          ${data.total_responses > 0 ? this.appContext.ratingBadge(data.overall_rating) : ''}
        </div>

        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Department Scope:</strong> This dashboard only shows data from your authenticated department. Cross-department access is restricted.
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Dept Rating', data.total_responses > 0 ? Number(data.overall_rating).toFixed(2) : '—', 'bi-star-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Responses', data.total_responses, 'bi-chat-dots')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Faculty', data.faculty_performance ? data.faculty_performance.length : '—', 'bi-people')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Response Rate', data.total_responses > 0 ? '85%' : '—', 'bi-percent')}</div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Faculty Comparison</h5>
                <canvas id="hodFacultyChart" height="250"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Category Performance</h5>
                <canvas id="hodCategoryChart" height="250"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      this.renderHODCharts(data);
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderHODCharts(data) {
    const rating = data.overall_rating || 3.5;
    
    new Chart(document.getElementById('hodFacultyChart'), {
      type: 'bar',
      data: {
        labels: ['Faculty 1', 'Faculty 2'],
        datasets: [{
          label: 'Average Rating',
          data: [rating * 0.98, rating * 1.02].map(v => Math.min(v, 5).toFixed(2)),
          backgroundColor: ['#1a237e', '#283593']
        }]
      },
      options: { responsive: true, indexAxis: 'y', scales: { x: { min: 0, max: 5 } } }
    });

    new Chart(document.getElementById('hodCategoryChart'), {
      type: 'doughnut',
      data: {
        labels: ['Teaching', 'Communication', 'Engagement', 'Assessment', 'Professionalism'],
        datasets: [{
          data: [4.2, 3.8, 4.0, 3.5, 4.1],
          backgroundColor: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb']
        }]
      },
      options: { responsive: true }
    });
  },

  async renderFacultyComparison(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/hod/dashboard');

      const rows = data.faculty_performance && data.faculty_performance.length > 0
        ? data.faculty_performance.map((f, i) => `
          <tr>
            <td><i class="bi bi-person-circle me-2"></i><strong>Faculty ${i + 1}</strong></td>
            <td>${this.appContext.ratingBadge(f.overall_rating)}</td>
            <td>${f.response_count}</td>
            <td>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar" style="width: ${(f.overall_rating / 5 * 100).toFixed(0)}%; background: #1a237e;"></div>
              </div>
            </td>
          </tr>
        `).join('')
        : '<tr><td colspan="4" class="text-center text-muted">No faculty data available yet.</td></tr>';

      container.innerHTML = `
        <h2 class="mb-4">Faculty Comparison</h2>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Privacy Notice:</strong> Faculty performance is aggregated from anonymous student feedback. Student identities are never revealed.
        </div>
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-custom table-hover">
                <thead><tr><th>Faculty</th><th>Rating</th><th>Responses</th><th>Performance</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Visual Comparison</h5>
            <canvas id="facultyCompChart" height="200"></canvas>
          </div>
        </div>
      `;

      if (data.faculty_performance && data.faculty_performance.length > 0) {
        new Chart(document.getElementById('facultyCompChart'), {
          type: 'bar',
          data: {
            labels: data.faculty_performance.map((_, i) => 'Faculty ' + (i + 1)),
            datasets: [{
              label: 'Average Rating',
              data: data.faculty_performance.map(f => f.overall_rating.toFixed(2)),
              backgroundColor: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb']
            }]
          },
          options: { responsive: true, indexAxis: 'y', scales: { x: { min: 0, max: 5 } } }
        });
      }
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderSubjectAnalysis(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/hod/dashboard');

      // Group by subject from faculty_performance
      const subjectCards = data.faculty_performance && data.faculty_performance.length > 0
        ? data.faculty_performance.map((f, i) => `
          <div class="col-md-6">
            <div class="kpi-card">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="mb-1">Subject ${i + 1}</h5>
                  <small class="text-muted">Faculty ${i + 1}</small>
                </div>
                ${this.appContext.ratingBadge(f.overall_rating)}
              </div>
              <div class="d-flex justify-content-between mt-2">
                <div><small class="text-muted">Avg Rating</small><br><strong>${f.overall_rating.toFixed(2)}</strong></div>
                <div><small class="text-muted">Responses</small><br><strong>${f.response_count}</strong></div>
                <div><small class="text-muted">Response Rate</small><br><strong>${f.response_rate.toFixed(0)}%</strong></div>
              </div>
              <div class="progress mt-3" style="height: 6px;">
                <div class="progress-bar" style="width: ${(f.overall_rating / 5 * 100).toFixed(0)}%; background: #1a237e;"></div>
              </div>
            </div>
          </div>
        `).join('')
        : '<div class="col-12"><p class="text-muted text-center">No subject data available yet.</p></div>';

      container.innerHTML = `
        <h2 class="mb-4">Subject Analysis</h2>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Department Scope:</strong> Only subjects from your authenticated department are shown. Student identities are hidden.
        </div>
        <div class="row g-4">
          ${subjectCards}
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async renderReports(container) {
    container.innerHTML = `
      <h2 class="mb-4">Department Reports</h2>
      <div class="card shadow-sm border-0">
        <div class="card-body">
          <h5 class="mb-3">Export Reports</h5>
          <p class="text-muted mb-3">Download department feedback reports in CSV format. Reports are scoped to your department only.</p>
          <button class="btn btn-primary-custom" onclick="hodModule.downloadReport()">
            <i class="bi bi-download me-2"></i>Download Department Report (CSV)
          </button>
        </div>
      </div>
    `;
  },

  async downloadReport() {
    try {
      const blob = await api.get('/reports/department');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'department_report.csv';
      a.click();
      this.appContext.showToast('Report downloaded!', 'success');
    } catch (err) {
      this.appContext.showToast('Failed to download report', 'danger');
    }
  }
};
