import { pool } from '../../db';
import { DailyReportQuery, WeeklyReportQuery, MonthlyReportQuery, LeaderboardQuery } from './schema';

export class ReportsService {
  async getDailyReport(userId: string, query: DailyReportQuery) {
    const { start, end } = query;
    
    const result = await pool.query(`
      SELECT
        to_char(te.date, 'YYYY-MM-DD') AS date,
        te.subject_id,
        s.name AS subject_name,
        SUM(te.duration_minutes)::int AS minutes
      FROM time_entries te
      JOIN subjects s ON s.id = te.subject_id
      WHERE te.user_id = $1
        AND te.date BETWEEN $2::date AND $3::date
      GROUP BY to_char(te.date, 'YYYY-MM-DD'), te.subject_id, s.name
      ORDER BY to_char(te.date, 'YYYY-MM-DD') ASC, s.name ASC
    `, [userId, start, end]);


    return result.rows;
  }

  async getWeeklyReport(userId: string, query: WeeklyReportQuery) {
    const { start, end } = query;
    
    const result = await pool.query(`
      SELECT
        to_char(date_trunc('week', (te.date::timestamp)), 'YYYY-MM-DD') AS week_start,
        te.subject_id,
        s.name AS subject_name,
        SUM(te.duration_minutes)::int AS minutes
      FROM time_entries te
      JOIN subjects s ON s.id = te.subject_id
      WHERE te.user_id = $1
        AND te.date BETWEEN $2::date AND $3::date
      GROUP BY to_char(date_trunc('week', (te.date::timestamp)), 'YYYY-MM-DD'), te.subject_id, s.name
      ORDER BY to_char(date_trunc('week', (te.date::timestamp)), 'YYYY-MM-DD') ASC, s.name ASC
    `, [userId, start, end]);

    return result.rows;
  }

  async getMonthlyReport(userId: string, query: MonthlyReportQuery) {
    const { start, end } = query;
    
    const result = await pool.query(`
      SELECT
        to_char(te.date, 'YYYY-MM') AS month,
        te.subject_id,
        s.name AS subject_name,
        SUM(te.duration_minutes)::int AS minutes
      FROM time_entries te
      JOIN subjects s ON s.id = te.subject_id
      WHERE te.user_id = $1
        AND te.date BETWEEN $2::date AND $3::date
      GROUP BY to_char(te.date, 'YYYY-MM'), te.subject_id, s.name
      ORDER BY to_char(te.date, 'YYYY-MM') ASC, s.name ASC
    `, [userId, start, end]);

    return result.rows;
  }

  async getSubjectLeaderboard(userId: string, query: LeaderboardQuery) {
    const { start, end, limit } = query;
    
    const result = await pool.query(`
      SELECT
        te.subject_id,
        s.name AS subject_name,
        SUM(te.duration_minutes)::int AS minutes
      FROM time_entries te
      JOIN subjects s ON s.id = te.subject_id
      WHERE te.user_id = $1
        AND te.date BETWEEN $2::date AND $3::date
      GROUP BY te.subject_id, s.name
      HAVING SUM(te.duration_minutes) > 0
      ORDER BY minutes DESC, s.name ASC
      LIMIT $4
    `, [userId, start, end, limit]);

    return result.rows;
  }
}
