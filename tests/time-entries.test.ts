import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient, freezeTime, unfreezeTime } from './setup';

describe('Time Entries Module', () => {
  let client: ReturnType<typeof createTestClient>;
  let accessToken: string;
  let subjectId: string;

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

    // Create a test subject for time entries with unique name
    const subjectResponse = await client
      .post('/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Test Subject ${Date.now()}`,
        color: '#FF5733'
      });



    subjectId = subjectResponse.body.data.id;
  });

  describe('POST /time-entries', () => {
    it('should create entry with subject_id, date, duration_minutes, notes and return 201 with TimeEntry data', async () => {
      const entryData = {
        subject_id: subjectId,
        date: '2024-01-15',
        duration_minutes: 120,
        notes: 'Test time entry notes'
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(201);

      expect(response.body).toMatchObject({
        data: {
          id: expect.any(String),
          subject_id: subjectId,
          subject_name: expect.stringMatching(/^Test Subject \d+$/),
          date: '2024-01-15',
          duration_minutes: 120,
          notes: 'Test time entry notes',
          created_at: expect.any(String),
          updated_at: expect.any(String)
        }
      });
    });

    it('should create entry with subject_name and auto-create subject if new', async () => {
      const entryData = {
        subject_name: 'New Auto Subject',
        date: '2024-01-15',
        duration_minutes: 90
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(201);

      expect(response.body.data.subject_name).toBe('New Auto Subject');
      expect(response.body.data.subject_id).toBeDefined();

      // Verify subject was created
      const subjectsResponse = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const newSubject = subjectsResponse.body.data.find(
        (s: any) => s.name === 'New Auto Subject'
      );
      expect(newSubject).toBeDefined();
    });

    it('should default date to today in Europe/London timezone when not provided', async () => {
      // Freeze time to a specific date
      freezeTime('2024-01-15T10:00:00.000Z');

      const entryData = {
        subject_id: subjectId,
        duration_minutes: 60
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(201);

      // Should default to today's date in Europe/London timezone
      expect(response.body.data.date).toBe('2024-01-15');

      unfreezeTime();
    });

    it('should reject duration less than 1 minute with 400 error', async () => {
      const entryData = {
        subject_id: subjectId,
        date: '2024-01-15',
        duration_minutes: 0
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('duration')
        }
      });
    });

    it('should reject duration greater than 1440 minutes with 400 error', async () => {
      const entryData = {
        subject_id: subjectId,
        date: '2024-01-15',
        duration_minutes: 1441
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('duration')
        }
      });
    });

    it('should reject notes longer than 500 characters with 400 error', async () => {
      const longNotes = 'a'.repeat(501);
      const entryData = {
        subject_id: subjectId,
        date: '2024-01-15',
        duration_minutes: 60,
        notes: longNotes
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('notes')
        }
      });
    });

    it('should return 409 conflict when another entry exists on same date', async () => {
      const date = '2024-01-15';
      
      // Create first entry
      await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date,
          duration_minutes: 60
        })
        .expect(201);

      // Try to create second entry on same date
      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date,
          duration_minutes: 90
        })
        .expect(409);

      expect(response.body).toMatchObject({
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('entry exists')
        },
        latest_entry: {
          id: expect.any(String),
          subject_id: subjectId,
          date,
          duration_minutes: 60
        },
        hint: expect.stringContaining('overwrite_latest_overlap=true')
      });
    });

    it('should overwrite latest entry when overwrite_latest_overlap=true', async () => {
      const date = '2024-01-15';
      
      // Create first entry
      const firstEntry = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date,
          duration_minutes: 60,
          notes: 'Original entry'
        })
        .expect(201);

      // Overwrite with new entry
      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date,
          duration_minutes: 90,
          notes: 'Updated entry',
          overwrite_latest_overlap: true
        })
        .expect(201);

      expect(response.body.data.id).toBe(firstEntry.body.data.id);
      expect(response.body.data.duration_minutes).toBe(90);
      expect(response.body.data.notes).toBe('Updated entry');
    });

    it('should require either subject_id or subject_name', async () => {
      const entryData = {
        date: '2024-01-15',
        duration_minutes: 60
      };

      const response = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(entryData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('subject')
        }
      });
    });
  });

  describe('GET /time-entries', () => {
    beforeEach(async () => {
      // Create multiple test entries
      const entries = [
        { date: '2024-01-15', duration_minutes: 60, notes: 'Entry 1' },
        { date: '2024-01-16', duration_minutes: 90, notes: 'Entry 2' },
        { date: '2024-01-17', duration_minutes: 120, notes: 'Entry 3' },
        { date: '2024-01-18', duration_minutes: 45, notes: 'Entry 4' }
      ];

      for (const entry of entries) {
        await client
          .post('/time-entries')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            subject_id: subjectId,
            ...entry
          });
      }
    });

    it('should return paginated list of time entries', async () => {
      const response = await client
        .get('/time-entries?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.headers['x-total-count']).toBe('4');
    });

    it('should filter by date range', async () => {
      const response = await client
        .get('/time-entries?start=2024-01-16&end=2024-01-17')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].date).toBe('2024-01-16');
      expect(response.body.data[1].date).toBe('2024-01-17');
    });

    it('should filter by subject_id', async () => {
      // Create another subject and entry
      const subject2Response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Subject 2',
          color: '#00FF00'
        });

      await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subject2Response.body.data.id,
          date: '2024-01-15',
          duration_minutes: 30
        });

      const response = await client
        .get(`/time-entries?subject_id=${subjectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should only return entries for the first subject
      expect(response.body.data.every((entry: any) => entry.subject_id === subjectId)).toBe(true);
    });

    it('should return empty array for no entries', async () => {
      // Clear database and create new user
      const newEmail = `new-${Date.now()}@example.com`;
      await client
        .post('/auth/register')
        .send({
          email: newEmail,
          password: 'testpassword123',
        });

      const loginResponse = await client
        .post('/auth/login')
        .send({
          email: newEmail,
          password: 'testpassword123',
        });

      const newAccessToken = loginResponse.body.data.access_token;

      const response = await client
        .get('/time-entries')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.headers['x-total-count']).toBe('0');
    });

    it('should include X-Total-Count header', async () => {
      const response = await client
        .get('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.headers['x-total-count']).toBe('4');
    });
  });

  describe('PUT /time-entries/:id', () => {
    let timeEntryId: string;

    beforeEach(async () => {
      // Create a test time entry
      const entryResponse = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date: '2024-01-15',
          duration_minutes: 60,
          notes: 'Original notes'
        });

      timeEntryId = entryResponse.body.data.id;
    });

    it('should update duration, subject_id, and notes', async () => {
      // Create another subject for testing
      const subject2Response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Subject 2',
          color: '#00FF00'
        });

      const updateData = {
        duration_minutes: 90,
        subject_id: subject2Response.body.data.id,
        notes: 'Updated notes'
      };

      const response = await client
        .put(`/time-entries/${timeEntryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.duration_minutes).toBe(90);
      expect(response.body.data.subject_id).toBe(subject2Response.body.data.id);
      expect(response.body.data.subject_name).toBe('Subject 2');
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should move entry to another date', async () => {
      const updateData = {
        date: '2024-01-20'
      };

      const response = await client
        .put(`/time-entries/${timeEntryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.date).toBe('2024-01-20');
    });

    it('should return 404 if time entry not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client
        .put(`/time-entries/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          duration_minutes: 90
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('time entry')
        }
      });
    });

    it('should return 404 if time entry not owned by user', async () => {
      // Create another user and time entry
      const otherEmail = `other-${Date.now()}@example.com`;
      await client
        .post('/auth/register')
        .send({
          email: otherEmail,
          password: 'testpassword123',
        });

      const otherLoginResponse = await client
        .post('/auth/login')
        .send({
          email: otherEmail,
          password: 'testpassword123',
        });

      const otherAccessToken = otherLoginResponse.body.data.access_token;

      // Create subject for other user
      const otherSubjectResponse = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other Subject',
          color: '#FF0000'
        });

      const otherEntryResponse = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          subject_id: otherSubjectResponse.body.data.id,
          date: '2024-01-15',
          duration_minutes: 60
        });

      // Try to update other user's entry with first user's token
      const response = await client
        .put(`/time-entries/${otherEntryResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          duration_minutes: 90
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('time entry')
        }
      });
    });

    it('should validate duration range on update', async () => {
      const response = await client
        .put(`/time-entries/${timeEntryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          duration_minutes: 1441
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('duration')
        }
      });
    });

    it('should validate notes length on update', async () => {
      const longNotes = 'a'.repeat(501);
      
      const response = await client
        .put(`/time-entries/${timeEntryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          notes: longNotes
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('notes')
        }
      });
    });
  });

  describe('DELETE /time-entries/:id', () => {
    let timeEntryId: string;

    beforeEach(async () => {
      // Create a test time entry
      const entryResponse = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: subjectId,
          date: '2024-01-15',
          duration_minutes: 60
        });

      timeEntryId = entryResponse.body.data.id;
    });

    it('should hard delete entry and return 204', async () => {
      await client
        .delete(`/time-entries/${timeEntryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Verify entry is deleted
      const response = await client
        .get('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should return 404 if time entry not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client
        .delete(`/time-entries/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('time entry')
        }
      });
    });

    it('should return 404 if time entry not owned by user', async () => {
      // Create another user and time entry
      const otherEmail = `other-${Date.now()}@example.com`;
      await client
        .post('/auth/register')
        .send({
          email: otherEmail,
          password: 'testpassword123',
        });

      const otherLoginResponse = await client
        .post('/auth/login')
        .send({
          email: otherEmail,
          password: 'testpassword123',
        });

      const otherAccessToken = otherLoginResponse.body.data.access_token;

      // Create subject for other user
      const otherSubjectResponse = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          name: 'Other Subject',
          color: '#FF0000'
        });

      const otherEntryResponse = await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${otherAccessToken}`)
        .send({
          subject_id: otherSubjectResponse.body.data.id,
          date: '2024-01-15',
          duration_minutes: 60
        });

      // Try to delete other user's entry with first user's token
      const response = await client
        .delete(`/time-entries/${otherEntryResponse.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('time entry')
        }
      });
    });
  });
});
