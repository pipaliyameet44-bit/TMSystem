const fetch = require('node-fetch');
(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Password1!'
      })
    });
    const data = await res.json();
    console.log('Login Status:', res.status);
    console.log('Login Response:', data);
  } catch (e) {
    console.error('Error:', e);
  }
})();
