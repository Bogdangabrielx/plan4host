export function buildTeamWelcomeEmail(opts: {
  email: string;
  password: string;
  appBase: string;
  loginPath?: string;
}) {
  const subject = 'Welcome at Plan4Host';
  const base = (opts.appBase || 'https://plan4host.com').replace(/\/+$/, '');
  const loginUrl = `${base}${opts.loginPath ?? '/auth/login'}`;
  const safeEmail = String(opts.email || '');
  const plainPass = String(opts.password || '');

  const text = [
    'Welcome to Plan4Host',
    '',
    'This email was generated because an account was created for you as a team member.',
    '',
    'You can access the app using the credentials below:',
    `Email: ${safeEmail}`,
    `Password: ${plainPass}`,
    '',
    `Login here: ${loginUrl}`,
    '',
    'You can change your password anytime from the platform settings.',
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#0c111b;">
      <h2 style="margin:0 0 12px;">Welcome to Plan4Host</h2>
      <p style="margin:8px 0;">This email was generated because an account was created for you as a team member.</p>
      <p style="margin:8px 0;">You can access the app using the credentials below:</p>
      <div style="margin:12px 0; padding:12px; background:#f3f4f6; border-radius:8px;">
        <div><strong>Email:</strong> ${escapeHtml(safeEmail)}</div>
        <div><strong>Password:</strong> ${escapeHtml(plainPass)}</div>
      </div>
      <p style="margin:12px 0;">Login here:</p>
      <p style="margin:12px 0;">
        <a href="${loginUrl}" style="display:inline-block; padding:10px 14px; background:#0ea5e9; color:#0c111b; font-weight:800; border-radius:10px; text-decoration:none;">Open Plan4Host</a>
      </p>
      <p style="margin:12px 0; color:#475569;">You can change your password anytime from the platform settings.</p>
    </div>
  `;

  return { subject, html, text };
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

