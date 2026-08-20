-- Smart Academic Feedback & Analytics System (SAFAS)
-- Power BI Analytics SQL Views

-- 1. Dimension: Faculty
CREATE OR REPLACE VIEW vw_dim_faculty AS
SELECT 
    f.id AS faculty_id,
    u.email,
    f.employee_id,
    d.name AS department_name,
    d.code AS department_code
FROM faculty f
JOIN users u ON f.user_id = u.id
JOIN departments d ON f.department_id = d.id;

-- 2. Dimension: Subject
CREATE OR REPLACE VIEW vw_dim_subject AS
SELECT 
    s.id AS subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    d.name AS department_name,
    sem.name AS semester_name
FROM subjects s
JOIN departments d ON s.department_id = d.id
JOIN semesters sem ON s.semester_id = sem.id;

-- 3. Dimension: Department
CREATE OR REPLACE VIEW vw_dim_department AS
SELECT 
    id AS department_id,
    name AS department_name,
    code AS department_code
FROM departments;

-- 4. Fact: Feedback (Strictly NO student identity)
-- RLS (Row Level Security) in Power BI should be applied here using USERPRINCIPALNAME() mapped to email.
CREATE OR REPLACE VIEW vw_fact_feedback AS
SELECT 
    fs.id AS submission_id,
    fs.faculty_id,
    fs.subject_id,
    fs.department_id,
    fs.evaluation_cycle_id,
    DATE(fs.submitted_at) AS submission_date,
    fs.overall_faculty_rating,
    fs.overall_subject_rating
FROM feedback_submissions fs
WHERE fs.status = 'SUBMITTED';

-- 5. Fact: Feedback Answers (Granular level)
CREATE OR REPLACE VIEW vw_fact_feedback_answers AS
SELECT 
    fa.id AS answer_id,
    fs.faculty_id,
    fs.subject_id,
    fs.department_id,
    fs.evaluation_cycle_id,
    fa.question_id,
    q.category,
    q.question_type,
    fa.rating
FROM feedback_answers fa
JOIN feedback_submissions fs ON fa.submission_id = fs.id
JOIN questions q ON fa.question_id = q.id
WHERE fs.status = 'SUBMITTED' AND fa.rating IS NOT NULL;
