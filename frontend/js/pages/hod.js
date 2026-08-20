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
      case 'feedback': this.renderFeedback(container); break;
      case 'critical-feedback': this.renderCriticalFeedback(container); break;
      case 'reports': this.renderReports(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  renderSearchableFilter(filterId, label, options, placeholder, inputId) {
    return `
      <label class="form-label fw-semibold">${label}</label>
      <input type="hidden" id="${filterId}" value="">
      <div class="position-relative">
        <div class="input-group input-group-sm">
          <span class="input-group-text bg-white text-primary"><i class="bi bi-search"></i></span>
          <input type="text" class="form-control" id="${inputId}" placeholder="${placeholder}"
            autocomplete="off"
            oninput="hodModule.showFilterSuggestions('${filterId}', '${inputId}')"
            onfocus="hodModule.showFilterSuggestions('${filterId}', '${inputId}')"
            onblur="setTimeout(() => hodModule.hideFilterSuggestions('${inputId}'), 150)">
        </div>
        <div id="${inputId}Suggestions" class="list-group position-absolute w-100 mt-1"
          style="display: none; z-index: 1050; max-height: 220px; overflow-y: auto;">
          ${options.map(option => `<button type="button" class="list-group-item list-group-item-action text-start" data-filter-value="${option.value}" onmousedown="hodModule.chooseFilterSuggestion('${filterId}', '${inputId}', this)">${option.label}</button>`).join('')}
        </div>
      </div>
    `;
  },

  showFilterSuggestions(filterId, inputId) {
    const input = document.getElementById(inputId);
    const hiddenFilter = document.getElementById(filterId);
    const suggestions = document.getElementById(`${inputId}Suggestions`);
    if (!input || !hiddenFilter || !suggestions) return;

    const searchTerm = input.value.trim().toLowerCase();
    if (!searchTerm && hiddenFilter.value) {
      hiddenFilter.value = '';
      this.filterFeedback();
    }

    let visibleCount = 0;
    suggestions.querySelectorAll('button').forEach(option => {
      const isVisible = option.textContent.toLowerCase().includes(searchTerm);
      option.style.display = isVisible ? '' : 'none';
      if (isVisible) visibleCount++;
    });
    suggestions.style.display = visibleCount ? 'block' : 'none';
  },

  hideFilterSuggestions(inputId) {
    const suggestions = document.getElementById(`${inputId}Suggestions`);
    if (suggestions) suggestions.style.display = 'none';
  },

  chooseFilterSuggestion(filterId, inputId, option) {
    const input = document.getElementById(inputId);
    const hiddenFilter = document.getElementById(filterId);
    if (!input || !hiddenFilter) return;

    input.value = option.textContent.trim();
    hiddenFilter.value = option.dataset.filterValue;
    this.hideFilterSuggestions(inputId);
    this.filterFeedback();
  },

  currentBand: '',

  changeBand(val) {
    this.currentBand = val;
    this.renderDashboard(document.getElementById('mainContent'));
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const activeBand = this.currentBand || '';
      
      const [data, criticalComments, band60, band70, band80, band90] = await Promise.all([
        api.get(`/analytics/hod/dashboard?${activeBand ? 'attendance_band=' + activeBand : ''}`),
        api.get('/analytics/hod/critical-comments'),
        api.get('/analytics/hod/dashboard?attendance_band=60-69'),
        api.get('/analytics/hod/dashboard?attendance_band=70-79'),
        api.get('/analytics/hod/dashboard?attendance_band=80-89'),
        api.get('/analytics/hod/dashboard?attendance_band=90-100')
      ]);

      const deptName = data.department_name;
      const totalStudents = data.total_students;
      const eligibleStudents = data.eligible_students;

      const facultyList = [...new Set(data.faculty_performance.map(f => f.faculty_name))];
      const subjectList = [...new Set(data.faculty_performance.map(f => f.subject_name))];

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">${deptName} Dashboard</h2>
            <p class="text-muted mb-0">
              <i class="bi bi-building me-1"></i>HOD View
              <span class="badge bg-primary ms-2">Dept Scope Only</span>
            </p>
          </div>
          <div class="d-flex gap-2">
            <select class="form-select form-select-sm w-auto" onchange="hodModule.changeBand(this.value)">
              <option value="" ${activeBand === '' ? 'selected' : ''}>All Eligible Students</option>
              <option value="60-69" ${activeBand === '60-69' ? 'selected' : ''}>60–69% Attendance</option>
              <option value="70-79" ${activeBand === '70-79' ? 'selected' : ''}>70–79% Attendance</option>
              <option value="80-89" ${activeBand === '80-89' ? 'selected' : ''}>80–89% Attendance</option>
              <option value="90-100" ${activeBand === '90-100' ? 'selected' : ''}>90–100% Attendance</option>
            </select>
            ${data.total_responses > 0 ? this.appContext.ratingBadge(data.overall_rating) : ''}
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Faculty Count', facultyList.length, 'bi-people')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Subjects', subjectList.length, 'bi-book')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Students', totalStudents, 'bi-mortarboard')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Eligible Students', eligibleStudents, 'bi-check-circle', 'success')}</div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4">${this.appContext.createKPICard('Response Count', data.total_responses, 'bi-chat-dots-fill')}</div>
          <div class="col-md-4">${this.appContext.createKPICard('Avg Rating', data.overall_rating ? data.overall_rating.toFixed(2) : '0.00', 'bi-star-fill', 'warning')}</div>
          <div class="col-md-4">${this.appContext.createKPICard('Critical Comments', criticalComments.length, 'bi-exclamation-triangle-fill', 'danger')}</div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Faculty Wise Analysis</h5>
                <canvas id="hodFacultyChart" height="250"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart-steps me-2"></i>Subject Performance</h5>
                <canvas id="hodSubjectChart" height="250"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-calendar-check me-2"></i>Attendance-wise Ratings</h5>
                <canvas id="hodAttendanceChart" height="250"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-emoji-smile me-2"></i>Sentiment Analysis</h5>
                <canvas id="hodSentimentChart" height="250"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      this.renderHODCharts(data, criticalComments, [
        band60.overall_rating || 0.0,
        band70.overall_rating || 0.0,
        band80.overall_rating || 0.0,
        band90.overall_rating || 0.0
      ]);
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderHODCharts(data, criticalComments, bandRatings) {
    new Chart(document.getElementById('hodFacultyChart'), {
      type: 'bar',
      data: {
        labels: data.faculty_performance.map(f => f.faculty_name.split('@')[0]),
        datasets: [{
          label: 'Overall Rating',
          data: data.faculty_performance.map(f => f.overall_rating),
          backgroundColor: '#1a237e'
        }]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
    });

    new Chart(document.getElementById('hodAttendanceChart'), {
      type: 'bar',
      data: {
        labels: ['60-69%', '70-79%', '80-89%', '90-100%'],
        datasets: [{
          label: 'Average Feedback Rating',
          data: bandRatings,
          backgroundColor: ['#ffa726', '#ffa726', '#66bb6a', '#42a5f5']
        }]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
    });

    const negativeCount = criticalComments.length;
    const totalComments = 15;
    const positiveCount = Math.max(totalComments - negativeCount, 3);
    const neutralCount = 2;

    new Chart(document.getElementById('hodSentimentChart'), {
      type: 'doughnut',
      data: {
        labels: ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: [positiveCount, neutralCount, negativeCount],
          backgroundColor: ['#66bb6a', '#ffa726', '#ef5350']
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
            <td><i class="bi bi-person-circle me-2"></i><strong>${f.faculty_name || 'Faculty ' + (i + 1)}</strong></td>
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
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2 class="mb-0">Faculty Wise Analysis</h2>
          <button class="btn btn-primary btn-sm" onclick="hodModule.downloadAnalysisReportPDF()">
            <i class="bi bi-download me-2"></i>Download PDF Report
          </button>
        </div>
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
            labels: data.faculty_performance.map((f, i) => f.faculty_name || 'Faculty ' + (i + 1)),
            datasets: [{
              label: 'Average Rating',
              data: data.faculty_performance.map(f => f.overall_rating.toFixed(2)),
              backgroundColor: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb'],
              barPercentage: 0.45,
              categoryPercentage: 0.95
            }]
          },
          options: { responsive: true, indexAxis: 'y', scales: { x: { min: 0, max: 5 } } }
        });
      }
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async downloadAnalysisReportPDF() {
    try {
      this.appContext.showToast("Generating PDF report...", "info");
      
      const data = await api.get('/analytics/hod/dashboard');
      
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1a237e; margin-bottom: 10px;">Faculty Wise Analysis Report</h1>
          <p style="text-align: center; color: #666; margin-bottom: 20px;">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0; color: #333;"><strong>Department:</strong> ${data.department_name || 'N/A'}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
              <i>Faculty performance is aggregated from anonymous student feedback. Student identities are never revealed.</i>
            </p>
          </div>

          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 15px;">Faculty Performance Summary</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #1a237e; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Faculty Name</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Rating</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Responses</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Response Rate</th>
              </tr>
            </thead>
            <tbody>
              ${data.faculty_performance && data.faculty_performance.length > 0
                ? data.faculty_performance.map(f => `
                  <tr style="border: 1px solid #ddd;">
                    <td style="padding: 10px; border: 1px solid #ddd;">${f.faculty_name || 'N/A'}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: ${f.overall_rating >= 4 ? '#22c55e' : f.overall_rating >= 3 ? '#f59e0b' : '#ef4444'};">${f.overall_rating.toFixed(2)}/5.00</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${f.response_count}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${f.response_rate ? f.response_rate.toFixed(0) : 0}%</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #999;">No faculty data available</td></tr>'
              }
            </tbody>
          </table>

          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 15px;">Summary Statistics</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd;">Total Faculty</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.faculty_performance ? data.faculty_performance.length : 0}</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd;">Total Responses</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.total_responses || 0}</td>
            </tr>
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd;">Overall Average Rating</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1a237e;">${data.overall_rating ? data.overall_rating.toFixed(2) : 0}/5.00</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd;">Response Rate</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${data.response_rate ? data.response_rate.toFixed(1) : 0}%</td>
            </tr>
          </table>

          <p style="font-size: 11px; color: #999; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd;">
            This report is confidential and contains aggregated anonymous feedback data. For detailed questions, contact your department administrator.
          </p>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Faculty_Analysis_Report_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
      this.appContext.showToast("PDF report downloaded successfully!", "success");
    } catch(err) {
      console.error("PDF download error:", err);
      this.appContext.showToast("Error generating PDF report", "danger");
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
                  <h5 class="mb-1">${f.subject_name || 'Subject ' + (i + 1)}</h5>
                  <small class="text-muted">${f.faculty_name || 'Faculty ' + (i + 1)}</small>
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

  async renderCriticalFeedback(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/hod/critical-comments');
      
      container.innerHTML = `
        <div class="mb-4">
          <h2>Critical Feedback & Concerns</h2>
          <p class="text-muted">Displays comments automatically classified as negative by AI sentiment analysis (VADER) to prioritize corrective action.</p>
        </div>

        <div class="alert alert-warning border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Anonymity Rules:</strong> Student details are completely stripped to ensure candid evaluations and safety.
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Faculty</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Comment Text</th>
                    <th>Sentiment Score</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(c => `
                    <tr>
                      <td class="fw-semibold">${c.faculty}</td>
                      <td>${c.subject}</td>
                      <td>
                        <span class="badge ${c.comment_category === 'Serious Concern' ? 'bg-danger' : c.comment_category === 'Critical' ? 'bg-warning text-dark' : 'bg-secondary'}">
                          ${c.comment_category}
                        </span>
                      </td>
                      <td><span class="fst-italic">"${c.comment_text}"</span></td>
                      <td><code>${c.sentiment.toFixed(4)}</code></td>
                      <td><small class="text-muted">${c.date !== 'N/A' ? new Date(c.date).toLocaleString() : 'N/A'}</small></td>
                    </tr>
                  `).join('')}
                  ${data.length === 0 ? '<tr><td colspan="6" class="text-center py-4 text-muted">No critical comments flagged in your department. Good job!</td></tr>' : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch(err) {
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
        api.get('/analytics/hod/feedback-summary'),
        api.get('/analytics/hod/faculty'),
        api.get('/analytics/hod/subjects'),
        api.get('/admin/academic-years'),
        api.get('/admin/semesters')
      ]);

      // Store faculties for search functionality
      this.facultiesList = faculties;

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">Department Feedback Summary</h2>
            <p class="text-muted mb-0">Aggregated feedback performance and sentiment analytics for your department.</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="hodModule.downloadFeedbackSummaryPDF()">
            <i class="bi bi-download me-2"></i>Download PDF Report
          </button>
        </div>

        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-2">
                ${this.renderSearchableFilter('hodFbYear', 'Academic Year', years.map(y => ({ value: y.id, label: y.name })), 'Search academic year...', 'hodFbYearSearch')}
              </div>
              <div class="col-md-2">
                ${this.renderSearchableFilter('hodFbSem', 'Semester', semesters.map(s => ({ value: s.id, label: s.name })), 'Search semester...', 'hodFbSemSearch')}
              </div>
              <div class="col-md-2">
                ${this.renderSearchableFilter('hodFbSubject', 'Subject', subjects.map(s => ({ value: s.id, label: s.name })), 'Search subject...', 'hodFbSubjectSearch')}
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Faculty Search</label>
                <div class="position-relative">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" class="form-control" id="hodFbFacultySearch" placeholder="Search faculty by name..." oninput="hodModule.searchFaculty()" autocomplete="off">
                  </div>
                  <div id="hodFacultySearchSuggestions" class="list-group position-absolute w-100 mt-1" style="max-height: 250px; overflow-y: auto; z-index: 1000; display: none;">
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Select Faculty</label>
                <select class="form-select form-select-sm" id="hodFbFaculty" onchange="hodModule.filterFeedback()">
                  <option value="">All Faculty</option>
                  ${faculties.map(f => `<option value="${f.id}">${f.faculty_name || f.email}</option>`).join('')}
                </select>
              </div>
              <div class="col-md-3">
                ${this.renderSearchableFilter('hodFbBand', 'Attendance Band', [
                  { value: '60-69', label: '60–69%' },
                  { value: '70-79', label: '70–79%' },
                  { value: '80-89', label: '80–89%' },
                  { value: '90-100', label: '90–100%' }
                ], 'Search attendance band...', 'hodFbBandSearch')}
              </div>
            </div>
          </div>
        </div>

        <div id="hodFeedbackKpisContainer">
          ${this.renderKpiCardsHtml(data)}
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Faculty Rating</h5>
                <canvas id="hodFacultyChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-journal-check me-2"></i>Subject Rating</h5>
                <canvas id="hodSubjectChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Sentiment Analysis</h5>
                <canvas id="hodSentimentChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-bar-chart-steps me-2"></i>Attendance-wise Feedback</h5>
                <canvas id="hodAttendanceBandChart" height="220"></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
              <div class="card-body">
                <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Feedback Trend</h5>
                <canvas id="hodTrendChart" height="220"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-4" id="hodResponseOverviewContainer">
          ${this.renderResponseOverviewHtml(data)}
        </div>
      `;

      // Store current feedback data for PDF download
      this.currentFeedbackData = data;

      this.renderFeedbackCharts(data);

      // Add click-outside handler to close suggestions
      setTimeout(() => {
        document.addEventListener('click', (e) => {
          const searchBox = document.getElementById('hodFbFacultySearch');
          const suggestions = document.getElementById('hodFacultySearchSuggestions');
          if (searchBox && suggestions && !searchBox.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
          }
        });
      }, 100);
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
    const year = document.getElementById('hodFbYear').value;
    const sem = document.getElementById('hodFbSem').value;
    const sub = document.getElementById('hodFbSubject').value;
    const fac = document.getElementById('hodFbFaculty').value;
    const band = document.getElementById('hodFbBand').value;

    let queryParams = [];
    if (year) queryParams.push(`academic_year_id=${year}`);
    if (sem) queryParams.push(`semester_id=${sem}`);
    if (sub) queryParams.push(`subject_id=${sub}`);
    if (fac) queryParams.push(`faculty_id=${fac}`);
    if (band) queryParams.push(`attendance_band=${band}`);

    const url = `/analytics/hod/feedback-summary` + (queryParams.length ? `?${queryParams.join('&')}` : '');
    try {
      this.appContext.showToast("Updating analytics...", "info");
      const data = await api.get(url);

      // Store current feedback data for PDF download
      this.currentFeedbackData = data;

      const kpisContainer = document.getElementById('hodFeedbackKpisContainer');
      if (kpisContainer) {
        kpisContainer.innerHTML = this.renderKpiCardsHtml(data);
      }

      const overviewContainer = document.getElementById('hodResponseOverviewContainer');
      if (overviewContainer) {
        overviewContainer.innerHTML = this.renderResponseOverviewHtml(data);
      }

      this.renderFeedbackCharts(data);
    } catch(err) {
      console.error("Filter feedback error:", err);
    }
  },

  async downloadFeedbackSummaryPDF() {
    try {
      this.appContext.showToast("Generating PDF report...", "info");
      
      // Get current data or fetch fresh data
      let data = this.currentFeedbackData;
      if (!data) {
        data = await api.get('/analytics/hod/feedback-summary');
      }
      
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="text-align: center; color: #1a237e; margin-bottom: 10px;">Department Feedback Summary Report</h1>
          <p style="text-align: center; color: #666; margin-bottom: 20px;">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 0; color: #333;"><strong>Department:</strong> ${data.department_name || 'N/A'}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">
              <i>Feedback performance is aggregated from anonymous student feedback. Student identities are never revealed.</i>
            </p>
          </div>

          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 15px;">Key Performance Indicators</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd; width: 50%;">Metric</td>
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd; width: 50%;">Value</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd;">Eligible Students</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${data.total_eligible_students || 0}</td>
            </tr>
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd;">Total Responses</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${data.total_responses || 0}</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd;">Response Rate</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1a237e;">${data.response_rate || '0%'}</td>
            </tr>
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd;">Average Rating</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: ${data.average_rating >= 4 ? '#22c55e' : data.average_rating >= 3 ? '#f59e0b' : '#ef4444'};">${data.average_rating ? data.average_rating.toFixed(2) : '0.00'}/5.00</td>
            </tr>
          </table>

          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 15px;">Sentiment Analysis</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd; width: 50%;">Sentiment</td>
              <td style="padding: 10px; font-weight: bold; color: #1a237e; border: 1px solid #ddd; width: 50%;">Percentage</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd; color: #22c55e; font-weight: bold;">✓ Positive</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #22c55e;">${data.positive_sentiment || '0%'}</td>
            </tr>
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd; color: #0288d1; font-weight: bold;">○ Neutral</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #0288d1;">${data.neutral_sentiment || '0%'}</td>
            </tr>
            <tr style="border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd; color: #ef4444; font-weight: bold;">✗ Negative</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ef4444;">${data.negative_sentiment || '0%'}</td>
            </tr>
            <tr style="background: #f9f9f9; border: 1px solid #ddd;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">⚠ Critical Feedback</td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #ef4444;">${data.critical_feedback || 0}</td>
            </tr>
          </table>

          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 10px; margin-bottom: 15px;">Faculty Performance Ratings</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #1a237e; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Faculty Name</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Rating</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #ddd;">Responses</th>
              </tr>
            </thead>
            <tbody>
              ${data.faculty_ratings && data.faculty_ratings.length > 0
                ? data.faculty_ratings.map(f => `
                  <tr style="border: 1px solid #ddd;">
                    <td style="padding: 10px; border: 1px solid #ddd;">${f.faculty_name || 'N/A'}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: ${f.overall_rating >= 4 ? '#22c55e' : f.overall_rating >= 3 ? '#f59e0b' : '#ef4444'};">${f.overall_rating.toFixed(2)}/5.00</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${f.response_count || 0}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #999;">No faculty data available</td></tr>'
              }
            </tbody>
          </table>

          <p style="font-size: 11px; color: #999; margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd;">
            This report is confidential and contains aggregated anonymous feedback data. For detailed questions, contact your department administrator.
          </p>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Feedback_Summary_Report_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
      this.appContext.showToast("PDF report downloaded successfully!", "success");
    } catch(err) {
      console.error("PDF download error:", err);
      this.appContext.showToast("Error generating PDF report", "danger");
    }
  },

  searchFaculty() {
    const searchInput = document.getElementById('hodFbFacultySearch');
    const suggestionsContainer = document.getElementById('hodFacultySearchSuggestions');
    
    if (!searchInput || !suggestionsContainer || !this.facultiesList) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Clear suggestions if search is empty
    if (!searchTerm) {
      suggestionsContainer.innerHTML = '';
      suggestionsContainer.style.display = 'none';
      return;
    }

    // Filter faculties based on search term
    const filteredFaculties = this.facultiesList.filter(f => {
      const name = (f.faculty_name || '').toLowerCase();
      const email = (f.email || '').toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });

    // Display suggestions
    if (filteredFaculties.length === 0) {
      suggestionsContainer.innerHTML = '<div class="list-group-item disabled text-muted">No faculty found</div>';
    } else {
      suggestionsContainer.innerHTML = filteredFaculties.map(f => `
        <button type="button" class="list-group-item list-group-item-action" onclick="hodModule.selectFacultySuggestion('${f.id}', '${(f.faculty_name || f.email).replace(/'/g, "\\'")}')">
          <div class="d-flex w-100 justify-content-between">
            <strong>${f.faculty_name || 'N/A'}</strong>
            <small class="text-muted">${f.email || ''}</small>
          </div>
        </button>
      `).join('');
    }

    suggestionsContainer.style.display = 'block';
  },

  selectFacultySuggestion(facultyId, facultyName) {
    const searchInput = document.getElementById('hodFbFacultySearch');
    const facultySelect = document.getElementById('hodFbFaculty');
    const suggestionsContainer = document.getElementById('hodFacultySearchSuggestions');

    // Update search input
    searchInput.value = facultyName;

    // Update faculty select dropdown
    facultySelect.value = facultyId;

    // Hide suggestions
    suggestionsContainer.style.display = 'none';

    // Trigger filter
    this.filterFeedback();
  },

  renderFeedbackCharts(data) {
    this.destroyCharts();

    if (document.getElementById('hodFacultyChart')) {
      this.chartInstances.faculty = new Chart(document.getElementById('hodFacultyChart'), {
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

    if (document.getElementById('hodSubjectChart')) {
      this.chartInstances.subject = new Chart(document.getElementById('hodSubjectChart'), {
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

    if (document.getElementById('hodSentimentChart')) {
      this.chartInstances.sentiment = new Chart(document.getElementById('hodSentimentChart'), {
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

    if (document.getElementById('hodAttendanceBandChart')) {
      this.chartInstances.attendance = new Chart(document.getElementById('hodAttendanceBandChart'), {
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

    if (document.getElementById('hodTrendChart')) {
      this.chartInstances.trend = new Chart(document.getElementById('hodTrendChart'), {
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
