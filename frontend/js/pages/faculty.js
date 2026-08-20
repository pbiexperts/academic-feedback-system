// Faculty Dashboard Module
window.facultyModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'suggestions': this.renderSuggestions(container); break;
      case 'subjects': this.renderSubjectPerformance(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  currentBand: '',
  currentSubjectData: null,

  changeBand(val) {
    this.currentBand = val;
    this.renderDashboard(document.getElementById('mainContent'));
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const activeBand = this.currentBand || '';
      const data = await api.get(`/analytics/faculty/dashboard?${activeBand ? 'attendance_band=' + activeBand : ''}`);

      const ratingStr = data.overall_rating ? Number(data.overall_rating).toFixed(2) : '0.00';

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">Faculty Dashboard</h2>
            <p class="text-muted mb-0"><i class="bi bi-person-workspace me-1"></i>Personal Performance Overview</p>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <select class="form-select form-select-sm w-auto" onchange="facultyModule.changeBand(this.value)">
              <option value="" ${activeBand === '' ? 'selected' : ''}>All Eligible Students</option>
              <option value="60-69" ${activeBand === '60-69' ? 'selected' : ''}>60–69% Attendance</option>
              <option value="70-79" ${activeBand === '70-79' ? 'selected' : ''}>70–79% Attendance</option>
              <option value="80-89" ${activeBand === '80-89' ? 'selected' : ''}>80–89% Attendance</option>
              <option value="90-100" ${activeBand === '90-100' ? 'selected' : ''}>90–100% Attendance</option>
            </select>
            ${this.appContext.ratingBadge(data.overall_rating)}
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Assigned Subjects', data.assigned_subjects_count || 0, 'bi-book-half')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Eligible Students', data.eligible_students || 0, 'bi-mortarboard')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Responses', data.total_responses || 0, 'bi-chat-left-text-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Response Rate', data.response_rate || '0%', 'bi-percent')}</div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Average Rating', ratingStr, 'bi-star-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Positive Sentiment', data.positive_sentiment_pct || '0%', 'bi-emoji-smile', 'success')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Negative Sentiment', data.negative_sentiment_pct || '0%', 'bi-emoji-frown', 'warning')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Critical Feedback', data.critical_feedback_count || 0, 'bi-exclamation-triangle', 'danger')}</div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white border-0 pt-3">
            <h5 class="mb-0"><i class="bi bi-journal-text me-2"></i>Subject Wise Performance Summary</h5>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th>Subject Name</th>
                    <th>Rating</th>
                    <th>Responses</th>
                    <th>Response Rate</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.performance && data.performance.length > 0 ? data.performance.map(p => `
                    <tr>
                      <td class="fw-semibold">${p.subject_name}</td>
                      <td>${this.appContext.ratingBadge(p.overall_rating)}</td>
                      <td>${p.response_count}</td>
                      <td>${p.response_rate}%</td>
                    </tr>
                  `).join('') : '<tr><td colspan="4" class="text-center py-4 text-muted">No subject evaluations collected yet.</td></tr>'}
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

  async renderSubjectPerformance(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/faculty/subject-performance');

      if (!data.subjects || data.subjects.length === 0) {
        container.innerHTML = `
          <h2 class="mb-4">Subject Performance</h2>
          <div class="alert alert-info border-0">
            <i class="bi bi-info-circle me-2"></i>No subjects currently assigned to you.
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Subject Performance</h2>
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-primary-custom btn-sm" onclick="facultyModule.downloadSubjectReportPDF()">
              <i class="bi bi-download me-1"></i>Download Report
            </button>
            <label class="fw-semibold mb-0">Select Subject:</label>
            <select class="form-select form-select-sm w-auto" id="facSubjectSelect" onchange="facultyModule.loadSubjectDetails(this.value)">
              ${data.subjects.map(s => `<option value="${s.id}" ${data.selected_subject && s.id === data.selected_subject.id ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="subjectDetailsContainer">
          <!-- Dynamically populated -->
        </div>
      `;

      this.renderSubjectOverview(data);
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async loadSubjectDetails(subjectId) {
    try {
      const data = await api.get(`/analytics/faculty/subject-performance?subject_id=${subjectId}`);
      this.renderSubjectOverview(data);
    } catch(err) {
      console.error("Error loading subject details:", err);
    }
  },

  renderSubjectOverview(data) {
    const detailContainer = document.getElementById('subjectDetailsContainer');
    if (!detailContainer) return;

    this.currentSubjectData = data;
    const subj = data.selected_subject;
    if (!subj) {
      detailContainer.innerHTML = '<div class="alert alert-info">No details available.</div>';
      return;
    }

    const formatQuestionLabel = question => {
      const words = String(question || '').trim().split(/\s+/);
      const lines = [];
      let line = '';

      words.forEach(word => {
        if (!line) {
          line = word;
        } else if (`${line} ${word}`.length <= 42) {
          line += ` ${word}`;
        } else {
          lines.push(line);
          line = word;
        }
      });

      if (line) lines.push(line);
      return lines.length ? lines : ['Question'];
    };
    const questionRatings = data.question_ratings || [];
    const questionChartHeight = Math.max(300, questionRatings.length * 55);

    detailContainer.innerHTML = `
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-header bg-white border-0 pt-3">
          <h5 class="mb-0"><i class="bi bi-card-checklist me-2 text-primary"></i>Subject Overview</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4"><span class="text-muted">Subject Name:</span> <strong class="d-block">${subj.name}</strong></div>
            <div class="col-md-2"><span class="text-muted">Code:</span> <strong class="d-block"><code>${subj.code}</code></strong></div>
            <div class="col-md-2"><span class="text-muted">Semester:</span> <strong class="d-block">${subj.semester}</strong></div>
            <div class="col-md-2"><span class="text-muted">Academic Year:</span> <strong class="d-block">${subj.academic_year}</strong></div>
            <div class="col-md-2"><span class="text-muted">Faculty:</span> <strong class="d-block">${subj.faculty}</strong></div>
          </div>
          <hr>
          <div class="row g-3 text-center">
            <div class="col-md-3">
              <span class="text-muted small">Eligible Students</span>
              <h4 class="mb-0 text-primary">${subj.eligible_students}</h4>
            </div>
            <div class="col-md-3">
              <span class="text-muted small">Responses</span>
              <h4 class="mb-0 text-success">${subj.responses}</h4>
            </div>
            <div class="col-md-3">
              <span class="text-muted small">Response Rate</span>
              <h4 class="mb-0 text-info">${subj.response_rate}</h4>
            </div>
            <div class="col-md-3">
              <span class="text-muted small">Average Rating</span>
              <h4 class="mb-0 text-warning">${this.appContext.ratingBadge(subj.average_rating)}</h4>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-0">
        <div class="col-md-8">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-bar-chart-line me-2"></i>Chart 1 — Question-wise Rating</h5>
              <div style="height: 300px; overflow-y: auto; overflow-x: hidden;">
                <div style="height: ${questionChartHeight}px;">
                  <canvas id="chartQuestionRatings"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-bar-chart-steps me-2"></i>Chart 2 — Attendance-wise Feedback</h5>
              <canvas id="chartAttendanceBands" height="300"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-md-4">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-pie-chart me-2"></i>Chart 3 — Sentiment</h5>
              <canvas id="chartSentiment" height="230"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Chart 4 — Rating Trend</h5>
              <canvas id="chartRatingTrend" height="230"></canvas>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card shadow-sm border-0 h-100">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-person-check me-2"></i>Chart 5 — Response Rate</h5>
              <canvas id="chartResponseRate" height="230"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Chart 1: Question-wise
    new Chart(document.getElementById('chartQuestionRatings'), {
      type: 'bar',
      data: {
        labels: questionRatings.map(q => formatQuestionLabel(q.question)),
        datasets: [{
          label: 'Rating',
          data: questionRatings.map(q => q.rating),
          backgroundColor: '#1a237e',
          barPercentage: 0.55,
          categoryPercentage: 0.95
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { min: 0, max: 5 } } }
    });

    // Render Chart 2: Attendance-wise
    new Chart(document.getElementById('chartAttendanceBands'), {
      type: 'bar',
      data: {
        labels: data.attendance_ratings ? data.attendance_ratings.map(b => b.band) : ['60-69%', '70-79%', '80-89%', '90-100%'],
        datasets: [{
          label: 'Avg Rating',
          data: data.attendance_ratings ? data.attendance_ratings.map(b => b.rating) : [0, 0, 0, 0],
          backgroundColor: '#0288d1'
        }]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
    });

    // Render Chart 3: Sentiment
    new Chart(document.getElementById('chartSentiment'), {
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

    // Render Chart 4: Rating Trend
    new Chart(document.getElementById('chartRatingTrend'), {
      type: 'line',
      data: {
        labels: data.rating_trend ? data.rating_trend.map(t => t.cycle) : ['Current'],
        datasets: [{
          label: 'Rating',
          data: data.rating_trend ? data.rating_trend.map(t => t.rating) : [subj.average_rating],
          borderColor: '#1a237e',
          fill: false
        }]
      },
      options: { responsive: true, scales: { y: { min: 0, max: 5 } } }
    });

    // Render Chart 5: Response Rate
    new Chart(document.getElementById('chartResponseRate'), {
      type: 'bar',
      data: {
        labels: ['Eligible Students', 'Submitted Responses'],
        datasets: [{
          label: 'Count',
          data: [data.response_rate_data ? data.response_rate_data.eligible : 0, data.response_rate_data ? data.response_rate_data.responses : 0],
          backgroundColor: ['#7986cb', '#4caf50']
        }]
      },
      options: { responsive: true }
    });
  },

  async downloadSubjectReportPDF() {
    try {
      this.appContext.showToast('Generating PDF report...', 'info');

      let data = this.currentSubjectData;
      if (!data || !data.selected_subject) {
        data = await api.get('/analytics/faculty/subject-performance');
      }

      const subject = data.selected_subject;
      const sentiment = data.sentiment_distribution || {};
      const responseRate = data.response_rate_data || {};
      const questionRatings = data.question_ratings || [];
      const attendanceRatings = data.attendance_ratings || [];
      const averageRating = Number(subject.average_rating || 0);
      const performanceCategory = averageRating >= 4.5
        ? 'Excellent'
        : averageRating >= 4
          ? 'Good'
          : averageRating >= 3
            ? 'Average'
            : 'Needs Attention';
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #222;">
          <h1 style="text-align: center; color: #1a237e; margin-bottom: 8px;">Faculty Feedback Summary Report</h1>
          <p style="text-align: center; color: #666; margin: 0 0 20px;">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <div style="background: #f5f7fa; padding: 14px; margin-bottom: 20px;">
            <p style="margin: 0 0 6px;"><strong>Subject:</strong> ${subject.name || 'N/A'} (${subject.code || 'N/A'})</p>
            <p style="margin: 0 0 6px;"><strong>Faculty:</strong> ${subject.faculty || 'N/A'}</p>
            <p style="margin: 0;"><strong>Semester:</strong> ${subject.semester || 'N/A'} | <strong>Academic Year:</strong> ${subject.academic_year || 'N/A'}</p>
          </div>

          <div style="page-break-inside: avoid; break-inside: avoid;">
          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 8px;">Performance Summary</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tbody>
              ${[
                ['Eligible Students', responseRate.eligible || subject.eligible_students || 0],
                ['Responses', responseRate.responses || subject.responses || 0],
                ['Response Rate', subject.response_rate || '0%'],
                ['Average Rating', `${averageRating.toFixed(2)} / 5.00`],
                ['Faculty Performance', performanceCategory]
              ].map(row => `<tr><td style="padding: 9px; border: 1px solid #ddd; font-weight: bold; width: 50%;">${row[0]}</td><td style="padding: 9px; border: 1px solid #ddd;">${row[1]}</td></tr>`).join('')}
            </tbody>
          </table>
          </div>

          <div style="page-break-inside: avoid; break-inside: avoid;">
          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 8px;">Question-wise Ratings</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead><tr style="background: #1a237e; color: white;"><th style="padding: 9px; text-align: left;">Question</th><th style="padding: 9px; text-align: center;">Rating</th></tr></thead>
            <tbody>${questionRatings.length ? questionRatings.map(q => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${q.question}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${Number(q.rating || 0).toFixed(2)} / 5.00</td></tr>`).join('') : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #777;">No question ratings available</td></tr>'}</tbody>
          </table>
          </div>

          <div style="page-break-inside: avoid; break-inside: avoid;">
          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 8px;">Attendance-wise Feedback</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead><tr style="background: #1a237e; color: white;"><th style="padding: 9px; text-align: left;">Attendance Band</th><th style="padding: 9px; text-align: center;">Average Rating</th></tr></thead>
            <tbody>${attendanceRatings.length ? attendanceRatings.map(row => `<tr><td style="padding: 8px; border: 1px solid #ddd;">${row.band}</td><td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${Number(row.rating || 0).toFixed(2)} / 5.00</td></tr>`).join('') : '<tr><td colspan="2" style="padding: 8px; text-align: center; color: #777;">No attendance data available</td></tr>'}</tbody>
          </table>
          </div>

          <div style="page-break-inside: avoid; break-inside: avoid;">
          <h2 style="color: #1a237e; font-size: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 8px;">Feedback Sentiment</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tbody>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Positive</td><td style="padding: 8px; border: 1px solid #ddd;">${sentiment.positive || 0}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Neutral</td><td style="padding: 8px; border: 1px solid #ddd;">${sentiment.neutral || 0}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #ddd;">Negative</td><td style="padding: 8px; border: 1px solid #ddd;">${sentiment.negative || 0}</td></tr>
            </tbody>
          </table>
          </div>

          <p style="font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 25px;">
            This report contains aggregated anonymous student feedback. Student identities are not included.
          </p>
        </div>
      `;

      const options = {
        margin: 10,
        filename: `Faculty_Feedback_Summary_${(subject.code || 'Report').replace(/[^a-z0-9-_]/gi, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        pagebreak: { mode: ['css', 'legacy'] },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      await html2pdf().set(options).from(element).save();
      this.appContext.showToast('PDF report downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      this.appContext.showToast('Error generating PDF report', 'danger');
    }
  },

  async renderSuggestions(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/faculty/suggestions');
      
      container.innerHTML = `
        <h2 class="mb-4">Anonymous Student Suggestions</h2>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Privacy Rule:</strong> Detailed feedback is displayed completely anonymously. Student identity (name, ID, enrollment, email) is never disclosed.
        </div>
      `;
      
      if (data.is_masked) {
         container.innerHTML += `
           <div class="card shadow-sm border-0">
             <div class="card-body">
               <p class="text-muted text-center my-4">
                 <i class="bi bi-lock fs-1 d-block mb-3 text-warning"></i>
                 <strong>Detailed feedback is hidden because the minimum response threshold has not been reached.</strong>
               </p>
             </div>
           </div>
         `;
         return;
      }
      
      if (!data.suggestions || data.suggestions.length === 0) {
         container.innerHTML += `
           <div class="card shadow-sm border-0">
             <div class="card-body">
               <p class="text-muted text-center my-4">No suggestions have been submitted yet.</p>
             </div>
           </div>
         `;
         return;
      }
      
      const getCategoryBadge = (cat) => {
         if (cat === 'Critical') return '<span class="badge bg-danger">Critical</span>';
         if (cat === 'Needs Improvement') return '<span class="badge bg-warning text-dark">Needs Improvement</span>';
         if (cat === 'Positive') return '<span class="badge bg-success">Positive</span>';
         return '<span class="badge bg-info text-dark">General Suggestion</span>';
      };

      const getSentimentBadge = (sentiment) => {
          if (!sentiment) return '';
          if (sentiment === 'Positive') return '<span class="badge bg-success-subtle text-success ms-2"><i class="bi bi-emoji-smile me-1"></i>Positive</span>';
          if (sentiment === 'Negative') return '<span class="badge bg-danger-subtle text-danger ms-2"><i class="bi bi-emoji-frown me-1"></i>Negative</span>';
          return '<span class="badge bg-secondary-subtle text-secondary ms-2"><i class="bi bi-emoji-neutral me-1"></i>Neutral</span>';
      };

      container.innerHTML += `
        <div class="row g-4">
          ${data.suggestions.map(s => `
            <div class="col-md-6">
              <div class="card shadow-sm border-0 h-100">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span class="badge bg-light text-dark border me-1">${s.subject_name}</span>
                      ${getCategoryBadge(s.category)}
                      ${getSentimentBadge(s.sentiment)}
                    </div>
                    <span class="small text-muted">${s.cycle_name || ''}</span>
                  </div>
                  <p class="mb-0 mt-3 fst-italic">"${s.comment_text || s.text}"</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  }
};
