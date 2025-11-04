export function buildTeamWelcomeEmail(opts: {
  email: string;
  password: string;
  appBase: string;
  loginPath?: string;
}) {
  const subject = 'Welcome to Plan4Host';
  const base = (opts.appBase || 'https://plan4host.com').replace(/\/+$/, '');
  const loginUrl = `${base}${opts.loginPath ?? '/auth/login'}`;
  const safeEmail = String(opts.email || '');
  const plainPass = String(opts.password || '');

  const text = [
    'Welcome to Plan4Host',
    '',
    'You were added as a team member. Use the credentials below to sign in:',
    `Email: ${safeEmail}`,
    `Temporary password: ${plainPass}`,
    '',
    `Open Plan4Host: ${loginUrl}`,
    '',
    'Tip: You can change your password anytime from Settings.',
  ].join('\n');

  const primary = '#3ECF8E';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Plan4Host</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background:#0c111b !important; color:#f8fafc !important; }
      .card { background:#111827 !important; border-color:#22304a !important; }
      .muted { color:#9aa4af !important; }
      .panel { background:#0f172a !important; border-color:#22304a !important; }
      .btn { background:${primary} !important; color:#0c111b !important; }
      .link { color:#60a5fa !important; }
    }
    a { color:${primary}; text-decoration:none; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f8fafc; color:#0c111b; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5;">
  <div style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; font-size:7px;">
    Your Plan4Host account is ready. Use the button below to sign in.
  </div>

  <div style="width:100%; padding:24px 0; background:#f8fafc;">
    <div class="card" style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; box-shadow:0 6px 24px rgba(0,0,0,0.06); padding:24px;">
      <h1 style="margin:0 0 8px; font-size:22px; line-height:1.2;">Welcome to Plan4Host</h1>
      <p class="muted" style="margin:0 0 14px; color:#475569;">An account was created for you as a team member. Use the credentials below to sign in.</p>

      <div class="panel" style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;">
        <div style="display:grid; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="margin-right:6px;">Email:</strong>
            <span>${escapeHtml(safeEmail)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="margin-right:6px;">Temporary password:</strong>
            <span>${escapeHtml(plainPass)}</span>
          </div>
        </div>
      </div>

      <p style="margin:20px 0 12px;">
        <a class="btn" href="${loginUrl}" target="_blank" rel="noopener"
           style="display:inline-block; background:${primary}; color:#0c111b; padding:12px 20px; border-radius:10px; font-weight:800;">
          Open Plan4Host
        </a>
      </p>

      <div class="panel" style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; text-align:center;">
        <p class="muted" style="margin:0 0 8px; color:#475569;">Having trouble with the button? Paste this link into your browser:</p>
        <div style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size:14px; line-height:1.4; background:#ffffff; padding:10px 14px; border:1px solid #e2e8f0; border-radius:8px; display:inline-block; max-width:100%; word-break:break-all;">
          <a class="link" href="${loginUrl}" target="_blank" rel="noopener" style="color:${primary}; font-size:12px">${escapeHtml(loginUrl)}</a>
        </div>
      </div>

      <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;" />

      <p class="muted" style="margin:0 0 6px; color:#475569;">You can change your password anytime from Settings.</p>
      <p class="muted" style="margin:0; color:#475569;">Need help? Reply to this email or contact
        <a class="link" href="mailto:office@plan4host.com" style="color:${primary};">office@plan4host.com</a>
      </p>
    </div>

    <div class="footer" style="max-width:600px; margin:12px auto 0; color:#475569; font-size:12px; text-align:center;">
      <p style="margin:6px 0;">Plan4Host · Bucharest, RO</p>
    </div>
  </div>
</body>
</html>`;

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
