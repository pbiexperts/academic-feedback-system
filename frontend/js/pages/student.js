// Student Dashboard Module
window.studentModule = {
  appContext: null,

  init(app) {
    this.appContext = app;
  },

  render(path) {
    const container = document.getElementById('mainContent');
    switch(path) {
      case 'feedback': this.renderFeedbackForm(container); break;
      case 'subjects': this.renderSubjects(container); break;
      default: this.renderDashboard(container); break;
    }
  },

  async renderDashboard(container) {
    this.appContext.showLoading();
    try {
      const allStatus = await api.get('/student/feedback/status');
      const profile = await api.get('/student/profile');
      
      let pending = 0, completed = 0;
      if (allStatus && allStatus.length > 0) {
        allStatus.forEach(status => {
           status.subjects.forEach(s => s.is_submitted ? completed++ : pending++);
        });
      }

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">Welcome, ${profile.email}</h2>
            <p class="text-muted mb-0">${profile.department} &middot; ${profile.enrollment_no}</p>
          </div>
        </div>
        
        <div class="row g-4 mb-4">
          <div class="col-md-4">${this.appContext.createKPICard('Pending', pending, 'bi-clock-history', 'warning')}</div>
          <div class="col-md-4">${this.appContext.createKPICard('Completed', completed, 'bi-check-circle', '#198754')}</div>
          <div class="col-md-4">${this.appContext.createKPICard('Active Cycles', allStatus.length, 'bi-calendar-check', 'primary')}</div>
        </div>

        ${allStatus.length > 0 ? allStatus.map(status => `
          <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-white border-0 pt-3">
              <h5 class="mb-0"><i class="bi bi-list-task me-2"></i>Feedback Status: ${status.cycle_name}</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-info border-0 mb-4">
                <i class="bi bi-shield-lock me-2"></i>
                <strong>Confidentiality Notice:</strong> Your feedback is confidential. Your identity will not be displayed in faculty, HOD, or management analytics.
              </div>
              ${this.renderStatusTable(status)}
            </div>
          </div>
        `).join('') : '<div class="alert alert-warning">No active evaluation cycles.</div>'}
      `;
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  renderStatusTable(cycleStatus) {
    const rows = cycleStatus.subjects.map(s => {
      const eligibilityBadge = s.is_eligible 
        ? `<span class="badge bg-success">Eligible (${s.attendance_percentage.toFixed(1)}% Attendance)</span>` 
        : `<span class="badge bg-danger">Not Eligible (Attendance: ${s.attendance_percentage.toFixed(1)}% &middot; Min required: 60%)</span>`;

      return `
        <tr>
          <td>
            <strong>${s.subject_name}</strong>
            <div class="mt-1">${eligibilityBadge}</div>
          </td>
          <td>${s.is_submitted 
            ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Submitted</span>' 
            : '<span class="badge bg-warning text-dark"><i class="bi bi-clock me-1"></i>Pending</span>'}</td>
          <td>
            ${s.is_submitted 
              ? '<button class="btn btn-sm btn-outline-secondary" disabled>Done</button>'
              : s.is_eligible
                ? `<button class="btn btn-sm btn-primary" onclick="studentModule.startFeedback(${s.subject_id}, ${s.faculty_id}, ${cycleStatus.cycle_id})"><i class="bi bi-pencil me-1"></i>Give Feedback</button>`
                : `<button class="btn btn-sm btn-secondary" disabled title="Minimum attendance required: 60%"><i class="bi bi-lock me-1"></i>Give Feedback</button>`}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="table-responsive">
        <table class="table table-custom table-hover">
          <thead><tr><th>Subject</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  async renderSubjects(container) {
    this.appContext.showLoading();
    try {
      const subjects = await api.get('/student/subjects');
      container.innerHTML = `
        <h2 class="mb-4">My Subjects</h2>
        <div class="row g-3">
          ${subjects.map(s => `
            <div class="col-md-6">
              <div class="kpi-card">
                <h5>${s.subject_name}</h5>
                <p class="text-muted mb-1"><i class="bi bi-hash me-1"></i>${s.subject_code}</p>
                <p class="mb-1"><i class="bi bi-person me-1"></i>${s.faculty_name}</p>
                <p class="mb-0 fw-semibold text-primary"><i class="bi bi-calendar-check me-1"></i>Attendance: ${s.attendance_percentage.toFixed(2)}% (${s.is_eligible ? 'Eligible' : 'Not Eligible'})</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
      if (subjects.length === 0) this.appContext.showEmpty('mainContent', 'No subjects assigned yet.');
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  feedbackContext: null,

  startFeedback(subjectId, facultyId, cycleId) {
    this.feedbackContext = { subjectId, facultyId, cycleId };
    this.appContext.route('feedback');
  },

  async renderFeedbackForm(container) {
    this.appContext.showLoading();
    try {
      // Load questionnaire questions from active cycle
      const status = await api.get('/student/feedback/status');
      if (!status || status.length === 0) {
        this.appContext.showEmpty('mainContent', 'No active evaluation cycle.');
        return;
      }

      // Get the first pending subject if no context set
      let cycle;
      let ctx = this.feedbackContext;
      if (ctx) {
        cycle = status.find(c => c.cycle_id === ctx.cycleId);
      } else {
        cycle = status.find(c => c.subjects.some(s => !s.is_submitted));
        if (cycle) {
          const pendingSubject = cycle.subjects.find(s => !s.is_submitted);
          ctx = { subjectId: pendingSubject.subject_id, facultyId: pendingSubject.faculty_id, cycleId: cycle.cycle_id };
        } else {
          this.appContext.showEmpty('mainContent', 'All feedback has been submitted!');
          return;
        }
      }

      if (!cycle) {
        this.appContext.showEmpty('mainContent', 'Invalid evaluation cycle.');
        return;
      }

      const subjectInfo = cycle.subjects.find(s => s.subject_id === ctx.subjectId);
      const questions = cycle.questions || [];
      
      if (questions.length === 0) {
         this.appContext.showEmpty('mainContent', 'No questions configured for this evaluation cycle.');
         return;
      }

      const ratingLabels = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];

      container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 class="mb-1">Provide Feedback</h2>
            <p class="text-muted mb-0">${subjectInfo ? subjectInfo.subject_name : 'Subject'} &middot; ${cycle.cycle_name}</p>
          </div>
          <button class="btn btn-outline-secondary" onclick="app.route('dashboard')"><i class="bi bi-arrow-left me-1"></i>Back</button>
        </div>

        <div class="alert alert-info border-0 mb-4">
          <i class="bi bi-shield-lock me-2"></i>
          <strong>Your feedback is confidential.</strong> Your identity will not be displayed in faculty, HOD or management analytics.
        </div>

        <form id="feedbackForm">
          <div class="card shadow-sm border-0 mb-4">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-card-checklist me-2"></i>Questionnaire</h5>
              ${questions.map((q, i) => {
                if (q.question_type === 'rating') {
                  return `
                    <div class="mb-4 p-3 bg-light rounded">
                      <label class="form-label fw-semibold">${i + 1}. ${q.text}</label>
                      <small class="text-muted d-block mb-2">${q.category}</small>
                      <div class="d-flex flex-wrap gap-2">
                        ${[1,2,3,4,5].map(val => `
                          <label class="rating-option">
                            <input type="radio" name="q${q.id}" value="${val}" required class="btn-check">
                            <span class="btn btn-outline-primary btn-sm">${val} - ${ratingLabels[val-1]}</span>
                          </label>
                        `).join('')}
                      </div>
                    </div>
                  `;
                } else {
                  return `
                    <div class="mb-4 p-3 bg-light rounded">
                      <label class="form-label fw-semibold">${i + 1}. ${q.text}</label>
                      <small class="text-muted d-block mb-2">${q.category}</small>
                      <textarea class="form-control" name="q${q.id}" rows="2" ${q.is_required ? 'required' : ''}></textarea>
                    </div>
                  `;
                }
              }).join('')}
            </div>
          </div>

          <div class="card shadow-sm border-0 mb-4">
            <div class="card-body">
              <h5 class="mb-3"><i class="bi bi-chat-text me-2"></i>Comments (Optional)</h5>
              <div class="mb-3">
                <label class="form-label">What did you like about this course?</label>
                <textarea class="form-control" id="whatLiked" rows="2" placeholder="Share what you appreciated..."></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">What can be improved?</label>
                <textarea class="form-control" id="whatImproved" rows="2" placeholder="Constructive suggestions..."></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Additional comments</label>
                <textarea class="form-control" id="additionalComments" rows="2" placeholder="Any other thoughts..."></textarea>
              </div>
            </div>
          </div>

          <div class="text-end mb-4">
            <button type="submit" class="btn btn-primary-custom btn-lg px-5" id="submitFeedbackBtn">
              <i class="bi bi-send me-2"></i>Submit Feedback
            </button>
          </div>
        </form>
      `;

      document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleSubmitFeedback(ctx, questions);
      });
    } catch (err) {
      this.appContext.showError('mainContent', err.message);
    }
  },

  async handleSubmitFeedback(ctx, questions) {
    const btn = document.getElementById('submitFeedbackBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

    try {
      const answers = questions.map(q => {
        if (q.question_type === 'rating') {
           const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
           return {
             question_id: q.id,
             rating: selected ? parseInt(selected.value) : null,
             text_answer: null
           };
        } else {
           const textVal = document.querySelector(`textarea[name="q${q.id}"]`).value;
           return {
             question_id: q.id,
             rating: null,
             text_answer: textVal || null
           };
        }
      });

      const comments = [];
      const liked = document.getElementById('whatLiked').value.trim();
      const improved = document.getElementById('whatImproved').value.trim();
      const additional = document.getElementById('additionalComments').value.trim();
      if (liked) comments.push({ comment_type: 'what_liked', comment_text: liked });
      if (improved) comments.push({ comment_type: 'what_improved', comment_text: improved });
      if (additional) comments.push({ comment_type: 'additional', comment_text: additional });

      const profile = await api.get('/student/profile');
      
      await api.post('/student/feedback', {
        faculty_id: ctx.facultyId,
        subject_id: ctx.subjectId,
        department_id: profile.department_id || 1,
        evaluation_cycle_id: ctx.cycleId,
        answers,
        comments
      });

      this.appContext.showToast('Feedback submitted successfully!', 'success');
      this.feedbackContext = null;
      setTimeout(() => this.appContext.route('dashboard'), 1000);
    } catch (err) {
      this.appContext.showToast(err.message || 'Submission failed', 'danger');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send me-2"></i>Submit Feedback';
    }
  }
};
