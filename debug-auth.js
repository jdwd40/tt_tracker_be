const request = require('supertest');
const app = require('./dist/app').default;

async function debugAuth() {
  try {
    console.log('Testing registration...');
    
    // Test registration
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        email: 'debug@example.com',
        password: 'password123'
      });
    
    console.log('Register status:', registerResponse.status);
    console.log('Register body:', JSON.stringify(registerResponse.body, null, 2));
    
    if (registerResponse.status === 201) {
      console.log('\nTesting login...');
      
      // Test login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'debug@example.com',
          password: 'password123'
        });
      
      console.log('Login status:', loginResponse.status);
      console.log('Login body:', JSON.stringify(loginResponse.body, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAuth();
