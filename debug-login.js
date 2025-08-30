const request = require('supertest');
const app = require('./dist/app').default;

async function debugLogin() {
  try {
    // First register a user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'debug@example.com',
        password: 'password123'
      });
    
    console.log('Register response:', registerResponse.status, registerResponse.body);
    
    // Then try to login
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'debug@example.com',
        password: 'password123'
      });
    
    console.log('Login response:', loginResponse.status, loginResponse.body);
  } catch (error) {
    console.error('Error:', error);
  }
}

debugLogin();
