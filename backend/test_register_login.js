const fetch = require('node-fetch');
(async () => {
  try {
    const uniqueEmail = `user${Date.now()}@example.com`;
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        first_name: 'Test',
        last_name: 'User',
        password: 'Password1!'
      })
    });
    const data = await res.json();
    console.log('Register Status:', res.status);
    console.log('Register Response:', data);
    if (res.status === 201) {
      // attempt login
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail, password: 'Password1!' })
      });
      const loginData = await loginRes.json();
      console.log('Login Status:', loginRes.status);
      console.log('Login Response:', loginData);
    }
  } catch (e) {
    console.error('Error:', e);
  }
})();
