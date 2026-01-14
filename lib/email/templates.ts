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

  const success = '#66ac69';

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
      .btn { background:${success} !important; color:#ffffff !important; }
      .link { color:${success} !important; }
      .hr { border-top-color:#22304a !important; }
    }
    a { color:${success}; text-decoration:none; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f8fafc; color:#0c111b; font-family:-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.5;">
  <div style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; font-size:7px;">
    Your Plan4Host account is ready. Use the button below to sign in.
  </div>

  <div style="width:100%; padding:24px 0; background:#f8fafc;">
    <div class="card" style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 10px 40px rgba(15, 23, 42, 0.10); padding:24px;">
      <h1 style="margin:0 0 8px; font-size:22px; line-height:1.2; letter-spacing:-0.2px;">Welcome to Plan4Host</h1>
      <p class="muted" style="margin:0 0 14px; color:#475569;">An account was created for you as a team member. Use the credentials below to sign in.</p>

      <div class="panel" style="margin:14px 0 18px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:0 0 10px; width:140px; color:#475569; font-size:13px; font-weight:600;">Email:</td>
            <td style="padding:0 0 10px; font-size:14px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; color:#0c111b;">
              ${escapeHtml(safeEmail)}
            </td>
          </tr>
          <tr>
            <td style="padding:0; width:140px; color:#475569; font-size:13px; font-weight:600;">Temporary password:</td>
            <td style="padding:0; font-size:14px; font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; color:#0c111b;">
              ${escapeHtml(plainPass)}
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 10px;">
        <a class="btn" href="${loginUrl}" target="_blank" rel="noopener"
           style="display:inline-block; background:${success}; color:#ffffff; padding:12px 18px; border-radius:999px; font-weight:700;">
          Open Plan4Host
        </a>
      </p>

      <p class="muted" style="margin:0 0 14px; color:#475569; font-size:13px;">
        Having trouble with the button? Paste this link into your browser:
        <a class="link" href="${loginUrl}" target="_blank" rel="noopener" style="color:${success}; font-weight:600;">
          <span style="font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size:12px; word-break:break-all;">${escapeHtml(loginUrl)}</span>
        </a>
      </p>

      <hr class="hr" style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;" />

      <p class="muted" style="margin:0 0 6px; color:#475569;">You can change your password anytime from Settings.</p>
      <p class="muted" style="margin:0; color:#475569;">Need help? Reply to this email or contact
        <a class="link" href="mailto:office@plan4host.com" style="color:${success};">office@plan4host.com</a>
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
