# Smart Academic Feedback & Analytics System (SAFAS) 🎓

SAFAS is a secure, intelligent, and highly scalable role-based academic feedback platform. It empowers institutions to collect confidential student feedback, automatically analyze sentiment using Artificial Intelligence, and deliver real-time, actionable insights to Faculty, HODs, and the Dean.

## 🚀 Key Enterprise Features

*   **🤖 AI Sentiment Analysis**: Automatically analyzes open-ended student comments using the **Vader NLP Engine**, tagging feedback as `Positive`, `Neutral`, or `Negative` to help faculty instantly gauge the tone of responses.
*   **⚡ Lightning-Fast Analytics**: Implements an in-memory caching layer (`fastapi-cache2`) that drops Dean and HOD dashboard load times from hundreds of milliseconds to under `5ms`, allowing the system to scale to millions of records.
*   **🛡️ Absolute Privacy Guarantee**: Features a strict `MINIMUM_RESPONSES_FOR_ANALYTICS` threshold. If a faculty member does not receive enough responses, their detailed analytics and text suggestions are completely masked to protect student anonymity.
*   **📊 One-Click CSV Export**: Allows management to instantly download college-wide performance metrics for external accreditation reporting (NBA, NAAC).
*   **📝 Dynamic Questionnaire Builder**: Administrators can build completely custom evaluation cycles with flexible rating (1-5) and free-text questions.
*   **📧 Asynchronous Email Reminders**: Uses background worker tasks to send email reminders to pending students without blocking the main web server.
*   **🔒 Comprehensive Audit Logging**: Every configuration change made by an Admin is meticulously logged for full system traceability.

## 🛠️ Technology Stack

*   **Frontend**: HTML5, CSS3, Vanilla JS, Bootstrap 5, Chart.js
*   **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic, Alembic
*   **AI Engine**: VaderSentiment (NLP)
*   **Database**: MySQL 8.0+
*   **Caching**: In-Memory (FastAPI Cache)

## 👥 Role-Based Access Control (RBAC)

The system enforces strict data separation across 5 distinct roles:
1.  **Admin**: Manages users, evaluation cycles, questionnaires, and system audit logs.
2.  **Dean**: Views aggregated college-wide analytics and performance across all departments.
3.  **HOD (Head of Department)**: Views aggregated analytics strictly for their assigned department and its faculty.
4.  **Faculty**: Views feedback for their specific subjects and reads anonymized AI-scored suggestions.
5.  **Student**: Submits confidential feedback for their enrolled subjects based on active evaluation cycles.

## ⚙️ Installation & Setup (Local Environment)

This project is configured to run natively without Docker for maximum performance on local Windows environments.

1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd "Smart Academic Feedback & Analytics System"
   ```

2. **Database Setup**:
   - Ensure you have MySQL running locally (`root` / `Mysql@123`).
   - Create a database named `safas_db` (or as defined in your `.env`).

3. **Install Dependencies**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Initialize Database**:
   ```bash
   alembic upgrade head
   python -m app.database.seed
   ```

5. **Run the Application**:
   Simply double-click the `start_app.bat` script in the root directory! This will automatically start the FastAPI backend server and launch the Vanilla JS frontend.
