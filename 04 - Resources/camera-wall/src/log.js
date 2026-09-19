// Every log line goes through redact(). Camera URLs carry passwords and this
// app is the kind of thing that ends up piping its output into a file.

const SECRETS = new Set();

export function registerSecret(value) {
  if (typeof value === 'string' && value.length >= 3) SECRETS.add(value);
}

export function redact(input) {
  let text = typeof input === 'string' ? input : String(input);
  // user:pass@host in any URL
  text = text.replace(/(\w+:\/\/)([^:/@\s]+):([^@\s]+)@/g, '$1$2:***@');
  // password=... / pwd=... / pass=... in query strings
  text = text.replace(/([?&](?:password|pwd|pass|token|auth)=)[^&\s]+/gi, '$1***');
  for (const secret of SECRETS) {
    if (secret) text = text.split(secret).join('***');
  }
  return text;
}

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let threshold = LEVELS[process.env.CAMERA_WALL_LOG || 'info'] ?? LEVELS.info;

export function setLevel(name) {
  if (name in LEVELS) threshold = LEVELS[name];
}

function emit(level, scope, args) {
  if (LEVELS[level] > threshold) return;
  const stamp = new Date().toTimeString().slice(0, 8);
  const line = args
    .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)))
    .join(' ');
  const out = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  out.write(`${stamp} ${level.toUpperCase().padEnd(5)} ${scope.padEnd(14)} ${redact(line)}\n`);
}

export function logger(scope) {
  return {
    error: (...a) => emit('error', scope, a),
    warn: (...a) => emit('warn', scope, a),
    info: (...a) => emit('info', scope, a),
    debug: (...a) => emit('debug', scope, a),
  };
}
