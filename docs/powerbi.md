# Power BI Integration

## Data Source
Connect Power BI to MySQL Database using the `MySQL Database` connector.
Server: `mysql:3306`
Database: `safas`

## Views
Use the provided views instead of raw tables:
- `vw_fact_feedback`
- `vw_fact_feedback_answers`
- `vw_dim_faculty`
- `vw_dim_subject`
- `vw_dim_department`

## Row-Level Security (RLS)
RLS MUST be implemented in the Power BI model:
1. Create a `Faculty` role: `[email] = USERPRINCIPALNAME()`
2. Create an `HOD` role: Filter department dimension where HOD email matches.
3. Dean and Admin do not require RLS filtering.
