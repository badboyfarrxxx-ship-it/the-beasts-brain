const form = document.getElementById('form');
const error = document.getElementById('error');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    location.href = '/';
    return;
  }
  const body = await res.json().catch(() => ({}));
  error.textContent = body.error || 'Sign in failed';
  error.hidden = false;
});
