const form = document.getElementById('form');
const error = document.getElementById('error');

function fail(message) {
  error.textContent = message;
  error.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  error.hidden = true;
  const password = document.getElementById('password').value;
  if (password !== document.getElementById('confirm').value) return fail('The two passwords do not match');
  if (password.length < 8) return fail('Use at least 8 characters');

  const res = await fetch('/api/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    location.href = '/';
    return;
  }
  const body = await res.json().catch(() => ({}));
  fail(body.error || 'Could not save the password');
});
