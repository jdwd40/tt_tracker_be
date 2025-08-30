import { describe, it, expect, beforeEach } from 'vitest';
import { createTestClient } from './setup';

describe('Subjects Module', () => {
  let client: ReturnType<typeof createTestClient>;
  let accessToken: string;

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
  });

  describe('GET /subjects', () => {
    it('should return 200 and an empty array for a new user', async () => {
      const response = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: []
      });
    });

    it('should return subjects sorted by name (case-insensitive) after creating subjects', async () => {
      // Create subjects in random order
      const subject1 = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Zebra', color: '#FF0000' })
        .expect(201);

      const subject2 = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'apple', color: '#00FF00' })
        .expect(201);

      const subject3 = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Banana', color: '#0000FF' })
        .expect(201);

      // Get all subjects
      const response = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      
      // Should be sorted case-insensitively: apple, Banana, Zebra
      expect(response.body.data[0].name).toBe('apple');
      expect(response.body.data[1].name).toBe('Banana');
      expect(response.body.data[2].name).toBe('Zebra');
    });
  });

  describe('POST /subjects', () => {
    it('should create a subject with name and optional color, returns 201 with Subject data', async () => {
      const subjectData = {
        name: 'Test Subject',
        color: '#FF5733'
      };

      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(subjectData)
        .expect(201);

      expect(response.body).toMatchObject({
        data: {
          id: expect.any(String),
          name: 'Test Subject',
          color: '#FF5733',
          created_at: expect.any(String),
          updated_at: expect.any(String)
        }
      });

      // Verify the subject was actually created
      const getResponse = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(1);
      expect(getResponse.body.data[0].name).toBe('Test Subject');
    });

    it('should create a subject with only name (no color)', async () => {
      const subjectData = {
        name: 'Subject Without Color'
      };

      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(subjectData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        name: 'Subject Without Color',
        created_at: expect.any(String),
        updated_at: expect.any(String)
      });
    });

    it('should reject duplicate names for same user (case-insensitive) with 409 error', async () => {
      // Create first subject
      await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Subject' })
        .expect(201);

      // Try to create duplicate with different case
      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'test subject' })
        .expect(409);

      expect(response.body).toMatchObject({
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('subject name already exists')
        }
      });
    });

    it('should reject empty name with 400 error', async () => {
      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('name')
        }
      });
    });

    it('should reject name longer than 60 characters with 400 error', async () => {
      const longName = 'a'.repeat(61);
      
      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: longName })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('name')
        }
      });
    });

    it('should reject missing name with 400 error', async () => {
      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ color: '#FF0000' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('name')
        }
      });
    });
  });

  describe('PUT /subjects/:id/rename', () => {
    let subjectId: string;

    beforeEach(async () => {
      // Create a test subject
      const response = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Original Name', color: '#FF0000' })
        .expect(201);

      subjectId = response.body.data.id;
    });

    it('should rename subject and return 200 with updated Subject data', async () => {
      const renameData = {
        new_name: 'Updated Name'
      };

      const response = await client
        .put(`/subjects/${subjectId}/rename`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(renameData)
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          id: subjectId,
          name: 'Updated Name',
          color: '#FF0000',
          created_at: expect.any(String),
          updated_at: expect.any(String)
        }
      });

      // Verify the subject was actually renamed
      const getResponse = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(1);
      expect(getResponse.body.data[0].name).toBe('Updated Name');
    });

    it('should reject case-insensitive collision on rename with 409 error', async () => {
      // Create another subject with different case
      await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'EXISTING SUBJECT' })
        .expect(201);

      // Try to rename to existing name with different case
      const response = await client
        .put(`/subjects/${subjectId}/rename`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_name: 'existing subject' })
        .expect(409);

      expect(response.body).toMatchObject({
        error: {
          code: 'CONFLICT',
          message: expect.stringContaining('subject name already exists')
        }
      });
    });

    it('should return 404 for non-existent subject id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client
        .put(`/subjects/${nonExistentId}/rename`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_name: 'New Name' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('subject not found')
        }
      });
    });

    it('should reject empty new_name with 400 error', async () => {
      const response = await client
        .put(`/subjects/${subjectId}/rename`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_name: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('new_name')
        }
      });
    });

    it('should reject new_name longer than 60 characters with 400 error', async () => {
      const longName = 'a'.repeat(61);
      
      const response = await client
        .put(`/subjects/${subjectId}/rename`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ new_name: longName })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('new_name')
        }
      });
    });
  });

  describe('POST /subjects/join', () => {
    let sourceSubjectId: string;
    let targetSubjectId: string;

    beforeEach(async () => {
      // Create source and target subjects
      const sourceResponse = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Source Subject', color: '#FF0000' })
        .expect(201);

      const targetResponse = await client
        .post('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Target Subject', color: '#00FF00' })
        .expect(201);

      sourceSubjectId = sourceResponse.body.data.id;
      targetSubjectId = targetResponse.body.data.id;

      // Create time entries for both subjects
      await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: sourceSubjectId,
          date: '2024-01-01',
          duration_minutes: 60,
          notes: 'Source entry 1'
        })
        .expect(201);

      await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: sourceSubjectId,
          date: '2024-01-02',
          duration_minutes: 120,
          notes: 'Source entry 2'
        })
        .expect(201);

      await client
        .post('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          subject_id: targetSubjectId,
          date: '2024-01-03',
          duration_minutes: 90,
          notes: 'Target entry 1'
        })
        .expect(201);
    });

    it('should join subjects, move time entries, delete source, and return 200 with summary', async () => {
      const joinData = {
        source_subject_id: sourceSubjectId,
        target_subject_id: targetSubjectId,
        delete_source: true
      };

      const response = await client
        .post('/subjects/join')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(joinData)
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          moved_count: 2
        }
      });

      // Verify source subject is deleted
      const subjectsResponse = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(subjectsResponse.body.data).toHaveLength(1);
      expect(subjectsResponse.body.data[0].id).toBe(targetSubjectId);

      // Verify time entries are moved to target subject
      const timeEntriesResponse = await client
        .get('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(timeEntriesResponse.body.data).toHaveLength(3);
      
      // All entries should now have target subject id
      timeEntriesResponse.body.data.forEach((entry: any) => {
        expect(entry.subject_id).toBe(targetSubjectId);
        expect(entry.subject_name).toBe('Target Subject');
      });
    });

    it('should return 404 for invalid source subject id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client
        .post('/subjects/join')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          source_subject_id: nonExistentId,
          target_subject_id: targetSubjectId,
          delete_source: true
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('source subject not found')
        }
      });
    });

    it('should return 404 for invalid target subject id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await client
        .post('/subjects/join')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          source_subject_id: sourceSubjectId,
          target_subject_id: nonExistentId,
          delete_source: true
        })
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'NOT_FOUND',
          message: expect.stringContaining('target subject not found')
        }
      });
    });

    it('should return 400 when source equals target', async () => {
      const response = await client
        .post('/subjects/join')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          source_subject_id: sourceSubjectId,
          target_subject_id: sourceSubjectId,
          delete_source: true
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: {
          code: 'BAD_REQUEST',
          message: expect.stringContaining('source and target cannot be the same')
        }
      });
    });

    it('should handle join without deleting source when delete_source is false', async () => {
      const joinData = {
        source_subject_id: sourceSubjectId,
        target_subject_id: targetSubjectId,
        delete_source: false
      };

      const response = await client
        .post('/subjects/join')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(joinData)
        .expect(200);

      expect(response.body).toMatchObject({
        data: {
          moved_count: 2
        }
      });

      // Verify both subjects still exist
      const subjectsResponse = await client
        .get('/subjects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(subjectsResponse.body.data).toHaveLength(2);
      
      // Verify time entries are moved to target subject
      const timeEntriesResponse = await client
        .get('/time-entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(timeEntriesResponse.body.data).toHaveLength(3);
      
      // All entries should now have target subject id
      timeEntriesResponse.body.data.forEach((entry: any) => {
        expect(entry.subject_id).toBe(targetSubjectId);
        expect(entry.subject_name).toBe('Target Subject');
      });
    });
  });
});
