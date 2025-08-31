import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from './setup';

describe('Reports Module', () => {
  let client: ReturnType<typeof createTestClient>;
  let accessToken: string;
  let subject1Id: string;
  let subject2Id: string;

  beforeEach(async () => {
    client = createTestClient();
    
    // Register and login a test user to get access token
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    // Register user
    await client
      .post('/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
      });

    // Login to get tokens
    const loginResponse = await client
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    accessToken = loginResponse.body.data.access_token;

    // Create test subjects
    const subject1Response = await client
      .post('/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Programming',
        color: '#FF5733'
      });

    const subject2Response = await client
      .post('/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Design',
        color: '#33FF57'
      });

    subject1Id = subject1Response.body.data.id;
    subject2Id = subject2Response.body.data.id;

    // Create time entries spanning multiple weeks and months
    // Week 1 (2024-01-01 to 2024-01-07) - crosses month boundary
    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-01-01',
        duration_minutes: 120
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-01-03',
        duration_minutes: 60
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject2Id,
        date: '2024-01-02',
        duration_minutes: 90
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-01-05',
        duration_minutes: 180
      });

    // Week 2 (2024-01-08 to 2024-01-14)
    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject2Id,
        date: '2024-01-08',
        duration_minutes: 150
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-01-10',
        duration_minutes: 200
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject2Id,
        date: '2024-01-12',
        duration_minutes: 75
      });

    // Week 3 (2024-01-15 to 2024-01-21)
    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-01-15',
        duration_minutes: 300
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject2Id,
        date: '2024-01-18',
        duration_minutes: 120
      });

    // February entries (different month)
    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject1Id,
        date: '2024-02-01',
        duration_minutes: 240
      });

    await client
      .post('/time-entries')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        subject_id: subject2Id,
        date: '2024-02-05',
        duration_minutes: 180
      });
  });

  describe('GET /reports/daily', () => {
    it('should return 400 when start parameter is missing', async () => {
      const response = await client
        .get('/reports/daily?end=2024-01-15')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('start')
        }
      });
    });

    it('should return 400 when end parameter is missing', async () => {
      const response = await client
        .get('/reports/daily?start=2024-01-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('end')
        }
      });
    });

    it('should return daily totals with correct structure and aggregation', async () => {
      const response = await client
        .get('/reports/daily?start=2024-01-01&end=2024-01-05')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            date: expect.any(String),
            subject_id: expect.any(String),
            subject_name: expect.any(String),
            minutes: expect.any(Number)
          })
        ])
      });

      // Should aggregate multiple entries per subject per day
      const day1Entries = response.body.data.filter((entry: any) => entry.date === '2024-01-01');
      const programmingDay1 = day1Entries.find((entry: any) => entry.subject_name === 'Programming');
      expect(programmingDay1.minutes).toBe(120); // Only one entry on 2024-01-01
    });

    it('should return entries sorted by date ASC, then subject_name ASC', async () => {
      const response = await client
        .get('/reports/daily?start=2024-01-01&end=2024-01-05')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = response.body.data;
      
      // Check dates are sorted ASC
      const dates = [...new Set(data.map((entry: any) => entry.date))];
      expect(dates).toEqual(dates.sort());

      // Check subjects are sorted alphabetically within each date
      for (const date of dates) {
        const entriesForDate = data.filter((entry: any) => entry.date === date);
        const subjectNames = entriesForDate.map((entry: any) => entry.subject_name);
        expect(subjectNames).toEqual(subjectNames.sort());
      }
    });

    it('should include range boundaries (inclusive on both ends)', async () => {
      const response = await client
        .get('/reports/daily?start=2024-01-01&end=2024-01-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const dates = response.body.data.map((entry: any) => entry.date);
      expect(dates).toContain('2024-01-01');
      expect(dates.every((date: string) => date === '2024-01-01')).toBe(true);
    });
  });

  describe('GET /reports/weekly', () => {
    it('should return weekly totals with ISO week format (Monday start)', async () => {
      const response = await client
        .get('/reports/weekly?start=2024-01-01&end=2024-01-21')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            week_start: expect.any(String),
            subject_id: expect.any(String),
            subject_name: expect.any(String),
            minutes: expect.any(Number)
          })
        ])
      });

      // Should have entries for multiple weeks
      const weekStarts = [...new Set(response.body.data.map((entry: any) => entry.week_start))];
      expect(weekStarts.length).toBeGreaterThan(1);
    });

    it('should aggregate correctly across week boundaries', async () => {
      const response = await client
        .get('/reports/weekly?start=2024-01-01&end=2024-01-07')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Week 1 should include entries from 2024-01-01 to 2024-01-07
      const week1Entries = response.body.data.filter((entry: any) => 
        entry.week_start === '2024-01-01'
      );
      
      const programmingWeek1 = week1Entries.find((entry: any) => entry.subject_name === 'Programming');
      expect(programmingWeek1.minutes).toBe(360); // 120 + 60 + 180
    });

    it('should return entries sorted by week_start ASC, then subject_name ASC', async () => {
      const response = await client
        .get('/reports/weekly?start=2024-01-01&end=2024-01-21')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = response.body.data;
      
      // Check week_starts are sorted ASC
      const weekStarts = [...new Set(data.map((entry: any) => entry.week_start))];
      expect(weekStarts).toEqual(weekStarts.sort());

      // Check subjects are sorted alphabetically within each week
      for (const weekStart of weekStarts) {
        const entriesForWeek = data.filter((entry: any) => entry.week_start === weekStart);
        const subjectNames = entriesForWeek.map((entry: any) => entry.subject_name);
        expect(subjectNames).toEqual(subjectNames.sort());
      }
    });
  });

  describe('GET /reports/monthly', () => {
    it('should return monthly totals with YYYY-MM format', async () => {
      const response = await client
        .get('/reports/monthly?start=2024-01-01&end=2024-02-29')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            month: expect.stringMatching(/^[0-9]{4}-[0-9]{2}$/),
            subject_id: expect.any(String),
            subject_name: expect.any(String),
            minutes: expect.any(Number)
          })
        ])
      });

      // Should have entries for multiple months
      const months = [...new Set(response.body.data.map((entry: any) => entry.month))];
      expect(months).toContain('2024-01');
      expect(months).toContain('2024-02');
    });

    it('should aggregate across month boundaries', async () => {
      const response = await client
        .get('/reports/monthly?start=2024-01-01&end=2024-01-31')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const januaryEntries = response.body.data.filter((entry: any) => entry.month === '2024-01');
      
      const programmingJanuary = januaryEntries.find((entry: any) => entry.subject_name === 'Programming');
      const designJanuary = januaryEntries.find((entry: any) => entry.subject_name === 'Design');
      
      expect(programmingJanuary.minutes).toBe(860); // All January programming minutes
      expect(designJanuary.minutes).toBe(435); // All January design minutes
    });

    it('should return entries sorted by month ASC, then subject_name ASC', async () => {
      const response = await client
        .get('/reports/monthly?start=2024-01-01&end=2024-02-29')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = response.body.data;
      
      // Check months are sorted ASC
      const months = [...new Set(data.map((entry: any) => entry.month))];
      expect(months).toEqual(months.sort());

      // Check subjects are sorted alphabetically within each month
      for (const month of months) {
        const entriesForMonth = data.filter((entry: any) => entry.month === month);
        const subjectNames = entriesForMonth.map((entry: any) => entry.subject_name);
        expect(subjectNames).toEqual(subjectNames.sort());
      }
    });
  });

  describe('GET /reports/subject-leaderboard', () => {
    it('should return subject leaderboard sorted by minutes DESC', async () => {
      const response = await client
        .get('/reports/subject-leaderboard?start=2024-01-01&end=2024-02-29')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            subject_id: expect.any(String),
            subject_name: expect.any(String),
            minutes: expect.any(Number)
          })
        ])
      });

      // Check sorting by minutes DESC
      const data = response.body.data;
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].minutes).toBeGreaterThanOrEqual(data[i + 1].minutes);
      }
    });

    it('should apply default limit of 10', async () => {
      const response = await client
        .get('/reports/subject-leaderboard?start=2024-01-01&end=2024-02-29')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it('should apply custom limit parameter', async () => {
      const response = await client
        .get('/reports/subject-leaderboard?start=2024-01-01&end=2024-02-29&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
    });

    it('should ignore subjects with 0 minutes', async () => {
      // Create a subject with no time entries
      const emptySubjectResponse = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Empty Subject',
          color: '#000000'
        });

      const response = await client
        .get('/reports/subject-leaderboard?start=2024-01-01&end=2024-02-29')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const emptySubjectInResults = response.body.data.find(
        (entry: any) => entry.subject_name === 'Empty Subject'
      );
      expect(emptySubjectInResults).toBeUndefined();
    });

    it('should return 400 when start parameter is missing', async () => {
      const response = await client
        .get('/reports/subject-leaderboard?end=2024-01-15')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('start')
        }
      });
    });

    it('should return 400 when end parameter is missing', async () => {
      const response = await client
        .get('/reports/subject-leaderboard?start=2024-01-01')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('end')
        }
      });
    });
  });
});
