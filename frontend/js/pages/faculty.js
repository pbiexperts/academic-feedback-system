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
      case 'subjects': this.renderSubjects(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/faculty/dashboard');

      if (data.total_responses === 0) {
        container.innerHTML = `
          <h2 class="mb-4">Faculty Dashboard</h2>
          <div class="alert alert-info border-0">
            <i class="bi bi-info-circle me-2"></i>No feedback received yet.
          </div>
        `;
        return;
      }

      const belowThreshold = data.overall_rating === 0 && data.subjects_evaluated === 0;
      
      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Faculty Dashboard</h2>
          ${belowThreshold ? '' : this.appContext.ratingBadge(data.overall_rating)}
        </div>

        ${belowThreshold ? `
          <div class="alert alert-warning border-0 mb-4">
            <i class="bi bi-shield-lock me-2"></i>
            <strong>Insufficient responses to display detailed analysis.</strong>
            At least 5 responses are required per subject for detailed analytics.
          </div>
        ` : ''}

        <div class="row g-4 mb-4">
          <div class="col-md-3">${this.appContext.createKPICard('Overall Rating', belowThreshold ? '—' : Number(data.overall_rating).toFixed(2), 'bi-star-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Total Responses', data.total_responses, 'bi-people-fill')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Subjects Evaluated', data.subjects_evaluated, 'bi-book')}</div>
          <div class="col-md-3">${this.appContext.createKPICard('Status', belowThreshold ? 'Awaiting Data' : 'Active', 'bi-activity')}</div>
        </div>

        ${!belowThreshold ? `
          <div class="row g-4">
            <div class="col-md-6">
              <div class="card shadow-sm border-0 h-100">
                <div class="card-body">
                  <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>Rating Distribution</h5>
                  <canvas id="ratingDistChart" height="250"></canvas>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card shadow-sm border-0 h-100">
                <div class="card-body">
                  <h5 class="mb-3"><i class="bi bi-graph-up me-2"></i>Category Performance</h5>
                  <canvas id="categoryChart" height="250"></canvas>
                </div>
              </div>
            </div>
          </div>
        ` : ''}
      `;

      if (!belowThreshold) {
        this.renderCharts(data);
      }
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderCharts(data) {
    // Rating distribution chart (demo data based on overall rating)
    const rating = data.overall_rating;
    new Chart(document.getElementById('ratingDistChart'), {
      type: 'bar',
      data: {
        labels: ['1 - Very Poor', '2 - Poor', '3 - Average', '4 - Good', '5 - Excellent'],
        datasets: [{
          label: 'Responses',
          data: [
            Math.round(data.total_responses * 0.02),
            Math.round(data.total_responses * 0.08),
            Math.round(data.total_responses * 0.20),
            Math.round(data.total_responses * 0.35),
            Math.round(data.total_responses * 0.35)
          ],
          backgroundColor: ['#ef5350', '#ff7043', '#ffa726', '#66bb6a', '#42a5f5']
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    // Category performance radar
    new Chart(document.getElementById('categoryChart'), {
      type: 'radar',
      data: {
        labels: ['Teaching', 'Communication', 'Engagement', 'Assessment', 'Professionalism'],
        datasets: [{
          label: 'Rating',
          data: [rating * 0.95, rating * 1.02, rating * 0.90, rating * 0.98, rating * 1.05].map(v => Math.min(v, 5).toFixed(2)),
          backgroundColor: 'rgba(26, 35, 126, 0.2)',
          borderColor: '#1a237e',
          pointBackgroundColor: '#1a237e'
        }]
      },
      options: { responsive: true, scales: { r: { min: 0, max: 5 } } }
    });
  },

  async renderSubjects(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/faculty/dashboard');
      
      if (!data.performance || data.performance.length === 0) {
        container.innerHTML = `
          <h2 class="mb-4">Subject Performance</h2>
          <div class="alert alert-info border-0">
            <i class="bi bi-info-circle me-2"></i>Detailed subject-wise breakdown will appear here when enough data is collected.
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <h2 class="mb-4">Subject Performance</h2>
        <div class="row g-4">
          ${data.performance.map(subject => `
            <div class="col-md-6 col-lg-4">
              <div class="card shadow-sm border-0 h-100 kpi-card">
                <div class="card-body">
                  <h5 class="card-title mb-1">${subject.subject_name || 'Subject ' + subject.subject_id}</h5>
                  <p class="text-muted small mb-3">ID: ${subject.subject_id}</p>
                  
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="text-muted">Overall Rating:</span>
                    <strong>${this.appContext.ratingBadge(subject.overall_rating)}</strong>
                  </div>
                  
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="text-muted">Responses:</span>
                    <span class="badge bg-secondary rounded-pill">${subject.response_count}</span>
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

  async renderSuggestions(container) {
    this.appContext.showLoading();
    try {
      const data = await api.get('/analytics/faculty/suggestions');
      
      container.innerHTML = `
        <h2 class="mb-4">Anonymous Suggestions</h2>
        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>All suggestions are displayed anonymously. Student identity is never revealed.
        </div>
      `;
      
      if (data.is_masked) {
         container.innerHTML += `
           <div class="card shadow-sm border-0">
             <div class="card-body">
               <p class="text-muted text-center my-4">
                 <i class="bi bi-lock fs-1 d-block mb-3"></i>
                 Suggestions are currently hidden to protect student anonymity.<br>
                 They will become visible once the minimum response threshold is met.
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
      
      const getIcon = (type) => {
         if (type === 'what_liked') return '<i class="bi bi-hand-thumbs-up text-success"></i>';
         if (type === 'what_improved') return '<i class="bi bi-graph-up-arrow text-warning"></i>';
         return '<i class="bi bi-chat-text text-primary"></i>';
      };
      
      const getLabel = (type) => {
         if (type === 'what_liked') return 'Appreciation';
         if (type === 'what_improved') return 'Improvement';
         if (type === 'text_answer') return 'Questionnaire Answer';
         return 'General Comment';
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
                      <span class="badge bg-light text-dark border">${s.subject_name}</span>
                      ${getSentimentBadge(s.sentiment)}
                    </div>
                    <span class="small text-muted">${getIcon(s.suggestion_type)} ${getLabel(s.suggestion_type)}</span>
                  </div>
                  <p class="mb-0 mt-3 fst-italic">"${s.text}"</p>
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
