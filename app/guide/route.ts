export const dynamic = "force-static";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fleet Tracker — How to Use</title>
<style>
  :root{
    --ink:#070E1F;
    --ink-2:#0d1830;
    --ink-3:#131f3d;
    --brand:#1365F2;
    --brand-light:#2CAEFC;
    --paper:#F5F8FF;
    --muted:#9AAAC9;
    --line:#22304f;
    --amber:#F2A413;
    --track:#1FB05C;
    --rust:#E0475A;
  }
  *{box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{
    margin:0;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:var(--ink);
    color:var(--paper);
    line-height:1.6;
  }
  a{color:var(--brand-light);}
  .wrap{max-width:960px;margin:0 auto;padding:0 24px;}

  /* Nav */
  header.site{
    position:sticky;top:0;z-index:50;
    background:rgba(7,14,31,0.92);
    backdrop-filter:blur(8px);
    border-bottom:1px solid var(--line);
  }
  .navbar{
    display:flex;align-items:center;justify-content:space-between;
    max-width:960px;margin:0 auto;padding:12px 24px;
  }
  .brand-lockup{display:flex;align-items:center;gap:10px;}
  .brand-lockup img{width:32px;height:32px;border-radius:8px;display:block;}
  .brand-lockup span{font-weight:700;font-size:15px;letter-spacing:0.02em;}
  nav.links{display:flex;gap:4px;}
  nav.links a{
    color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;
    padding:8px 12px;border-radius:8px;transition:color .15s, background .15s;
    white-space:nowrap;
  }
  nav.links a:hover{color:var(--paper);background:var(--ink-3);}
  .nav-toggle{display:none;background:none;border:1px solid var(--line);color:var(--paper);border-radius:8px;padding:8px 10px;font-size:14px;}

  @media (max-width:720px){
    nav.links{
      display:none;position:absolute;top:100%;left:0;right:0;
      flex-direction:column;background:var(--ink-2);border-bottom:1px solid var(--line);
      padding:8px;
    }
    nav.links.open{display:flex;}
    .nav-toggle{display:inline-block;}
  }

  /* Hero */
  .hero{
    text-align:center;padding:72px 24px 56px;
    background:radial-gradient(circle at 50% -10%, rgba(19,101,242,0.35), transparent 60%);
  }
  .hero img.logo{width:96px;height:96px;border-radius:22px;margin-bottom:24px;box-shadow:0 12px 40px rgba(19,101,242,0.35);}
  .hero h1{font-size:2.4rem;margin:0 0 12px;letter-spacing:-0.02em;}
  .hero p.lead{color:var(--muted);font-size:1.1rem;max-width:560px;margin:0 auto 28px;}
  .hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
  .btn{
    display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;
    font-weight:700;font-size:14px;transition:transform .12s, box-shadow .12s;
  }
  .btn:hover{transform:translateY(-1px);}
  .btn-primary{background:linear-gradient(135deg,var(--brand-light),var(--brand));color:#fff;box-shadow:0 8px 24px rgba(19,101,242,0.35);}
  .btn-ghost{background:var(--ink-3);color:var(--paper);border:1px solid var(--line);}

  /* Role cards */
  .role-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 8px;}
  @media (max-width:640px){.role-grid{grid-template-columns:1fr;}}
  .role-card{
    background:var(--ink-2);border:1px solid var(--line);border-radius:16px;padding:22px;
    text-decoration:none;color:var(--paper);transition:border-color .15s, transform .15s;
  }
  .role-card:hover{border-color:var(--brand);transform:translateY(-2px);}
  .role-card .tag{
    display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;
    color:var(--brand-light);margin-bottom:8px;
  }
  .role-card h3{margin:0 0 6px;font-size:1.15rem;}
  .role-card p{margin:0;color:var(--muted);font-size:14px;}

  /* Sections */
  section.block{padding:64px 0;border-top:1px solid var(--line);}
  section.block:first-of-type{border-top:none;}
  .eyebrow{
    color:var(--brand-light);font-weight:800;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;
  }
  h2{font-size:1.7rem;margin:0 0 8px;letter-spacing:-0.01em;}
  .section-intro{color:var(--muted);margin:0 0 32px;max-width:640px;}

  /* Steps */
  .steps{list-style:none;margin:0;padding:0;counter-reset:step;}
  .steps li{
    counter-increment:step;position:relative;padding:0 0 24px 44px;margin-bottom:0;
  }
  .steps li:last-child{padding-bottom:0;}
  .steps li::before{
    content:counter(step);position:absolute;left:0;top:0;width:30px;height:30px;
    background:var(--ink-3);border:1px solid var(--brand);color:var(--brand-light);
    border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:13px;font-weight:800;
  }
  .steps li::after{
    content:"";position:absolute;left:15px;top:30px;bottom:0;width:1px;background:var(--line);
  }
  .steps li:last-child::after{display:none;}
  .steps strong{color:var(--paper);}
  .steps p{margin:4px 0 0;color:var(--muted);}

  /* Tabs (install) */
  .tabs{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;}
  .tab-btn{
    background:var(--ink-3);border:1px solid var(--line);color:var(--muted);
    padding:10px 18px;border-radius:999px;font-weight:700;font-size:13px;cursor:pointer;
  }
  .tab-btn.active{background:var(--brand);border-color:var(--brand);color:#fff;}
  .tab-panel{display:none;}
  .tab-panel.active{display:block;}

  /* Feature cards */
  .card-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media (max-width:640px){.card-grid{grid-template-columns:1fr;}}
  .feature-card{
    background:var(--ink-2);border:1px solid var(--line);border-radius:14px;padding:20px;
  }
  .feature-card h4{margin:0 0 6px;font-size:15px;display:flex;align-items:center;gap:8px;}
  .feature-card p{margin:0;color:var(--muted);font-size:14px;}
  .dot{width:8px;height:8px;border-radius:50%;flex:none;}
  .dot.track{background:var(--track);}
  .dot.amber{background:var(--amber);}
  .dot.brand{background:var(--brand-light);}
  .dot.rust{background:var(--rust);}

  /* FAQ */
  details{
    background:var(--ink-2);border:1px solid var(--line);border-radius:12px;
    padding:16px 18px;margin-bottom:10px;
  }
  details summary{cursor:pointer;font-weight:700;font-size:14.5px;list-style:none;display:flex;justify-content:space-between;align-items:center;}
  details summary::-webkit-details-marker{display:none;}
  details summary::after{content:"+";color:var(--brand-light);font-size:20px;font-weight:400;}
  details[open] summary::after{content:"–";}
  details p{color:var(--muted);margin:12px 0 0;font-size:14px;}

  /* callout */
  .callout{
    background:rgba(19,101,242,0.1);border:1px solid rgba(19,101,242,0.35);
    border-radius:12px;padding:16px 18px;margin:20px 0;font-size:14px;color:var(--paper);
  }
  .callout strong{color:var(--brand-light);}

  /* footer */
  footer{
    border-top:1px solid var(--line);padding:36px 0;text-align:center;color:var(--muted);font-size:13px;
  }
  footer a{color:var(--brand-light);text-decoration:none;}

  code{background:var(--ink-3);padding:2px 6px;border-radius:5px;font-size:0.9em;color:var(--brand-light);}
</style>
</head>
<body>

<header class="site">
  <div class="navbar">
    <div class="brand-lockup">
      <img src="/icon-512.png" alt="Fleet Tracker logo">
      <span>Fleet Tracker</span>
    </div>
    <button class="nav-toggle" onclick="document.querySelector('nav.links').classList.toggle('open')">Menu</button>
    <nav class="links">
      <a href="#install">Install</a>
      <a href="#drivers">Driver Guide</a>
      <a href="#admins">Admin Guide</a>
      <a href="#faq">FAQ</a>
      <a href="https://fleet-tracker-liard.vercel.app" target="_blank" rel="noopener">Open App ↗</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <img class="logo" src="/icon-512.png" alt="Fleet Tracker">
    <h1>Getting the most out of Fleet Tracker</h1>
    <p class="lead">Your family's vehicle tracker: scan a QR code to start and finish trips, book vehicles ahead of time, and keep an eye on WOF, rego, and servicing. This guide covers everything you need, whether you're a driver or an admin.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#install">Install the app</a>
      <a class="btn btn-ghost" href="https://fleet-tracker-liard.vercel.app" target="_blank" rel="noopener">Open Fleet Tracker</a>
    </div>
  </div>
</section>

<section class="block" id="start">
  <div class="wrap">
    <div class="eyebrow">Start here</div>
    <h2>Pick your role</h2>
    <p class="section-intro">The same login screen works for everyone — what you see afterwards depends on whether you're set up as a Driver or an Admin.</p>
    <div class="role-grid">
      <a class="role-card" href="#drivers">
        <span class="tag">Driver</span>
        <h3>Day-to-day vehicle use</h3>
        <p>Scan to start/finish trips, book a vehicle ahead of time, run a vehicle check, and report incidents.</p>
      </a>
      <a class="role-card" href="#admins">
        <span class="tag">Admin</span>
        <h3>Managing the fleet</h3>
        <p>Everything a driver can do, plus adding vehicles and people, approving bookings, and compliance oversight.</p>
      </a>
    </div>
  </div>
</section>

<section class="block" id="install">
  <div class="wrap">
    <div class="eyebrow">Installation</div>
    <h2>Add Fleet Tracker to your phone or desktop</h2>
    <p class="section-intro">Fleet Tracker is a Progressive Web App — it installs like a normal app, with its own icon, and no browser address bar. Notifications also work better once it's installed, especially on iPhone.</p>

    <div class="tabs">
      <button class="tab-btn active" data-tab="iphone">iPhone</button>
      <button class="tab-btn" data-tab="android">Android</button>
      <button class="tab-btn" data-tab="desktop">Desktop</button>
    </div>

    <div class="tab-panel active" id="tab-iphone">
      <ol class="steps">
        <li><strong>Open the app in Safari.</strong><p>Installation on iPhone only works through Safari — not Chrome or another browser.</p></li>
        <li><strong>Tap the Share icon</strong> (the square with an arrow, in the address bar or bottom toolbar).<p></p></li>
        <li><strong>Choose "Add to Home Screen"</strong> and confirm.<p>Fleet Tracker now appears as its own icon on your Home Screen.</p></li>
      </ol>
      <div class="callout"><strong>Push notifications on iPhone</strong> only work once the app has been added to the Home Screen this way — a regular Safari tab can't receive them.</div>
    </div>

    <div class="tab-panel" id="tab-android">
      <ol class="steps">
        <li><strong>Open the app in Chrome.</strong><p></p></li>
        <li><strong>Look for the install icon</strong> at the right of the address bar, or open the three-dot menu.<p></p></li>
        <li><strong>Tap "Install Fleet Tracker..."</strong> and confirm.<p>It opens in its own window with a Home Screen icon, just like any other app.</p></li>
      </ol>
    </div>

    <div class="tab-panel" id="tab-desktop">
      <ol class="steps">
        <li><strong>Open the app in Chrome (or another Chromium browser).</strong><p></p></li>
        <li><strong>Click the install icon</strong> at the right of the address bar, or use the menu → "Install Fleet Tracker...".<p></p></li>
        <li><strong>Confirm the install.</strong><p>Fleet Tracker opens in its own window and gets a shortcut, like any desktop app.</p></li>
      </ol>
    </div>
  </div>
</section>

<section class="block" id="drivers">
  <div class="wrap">
    <div class="eyebrow">Driver Guide</div>
    <h2>Using Fleet Tracker day to day</h2>
    <p class="section-intro">Your navigation covers Dashboard, My Trips, Vehicles, Bookings, Vehicle Check, Report an Incident, and Account.</p>

    <h3 style="font-size:1.1rem;margin-top:0;">Starting and finishing a trip</h3>
    <ol class="steps">
      <li><strong>Scan the vehicle's QR code</strong> — tap "Scan Vehicle QR" on your dashboard, or the Scan tab, and point your camera at the code taped to the vehicle.<p></p></li>
      <li><strong>Enter the current odometer reading</strong> to start the trip.<p></p></li>
      <li><strong>Scan the same code again when you're done</strong> and enter the finishing odometer reading — Fleet Tracker works out the kilometres automatically.<p>If the vehicle is reserved by someone else's approved booking, scanning will flag that. An admin can override it if there's a genuine reason to proceed, and it's logged either way.</p></li>
    </ol>

    <div class="card-grid" style="margin-top:32px;">
      <div class="feature-card">
        <h4><span class="dot brand"></span>My Trips</h4>
        <p>A full history of your completed trips, with start/end odometer readings and kilometres used for each.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot track"></span>Vehicles</h4>
        <p>A read-only list of every active vehicle and whether it's currently available or in use.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot amber"></span>Booking a vehicle</h4>
        <p>Pick a vehicle (or "any vehicle"), a date, start/end time, and an admin to approve it. Recurring bookings are supported — weekly, fortnightly, or monthly.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot brand"></span>Vehicle Check</h4>
        <p>A standalone 9-item inspection you can run any time. Flag issues with a comment and optional photo, then sign off with your initials.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot rust"></span>Report an Incident</h4>
        <p>For anything that happened during a trip beyond a routine check — a bump, a mechanical issue, anything worth flagging directly.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot brand"></span>Account</h4>
        <p>Your name, email, and role; your licence details on file (read-only); the push notification toggle; and logout.</p>
      </div>
    </div>

    <div class="callout"><strong>Booking requests aren't automatic.</strong> Submitting a booking sends it to your chosen admin as pending — it doesn't reserve the vehicle until they approve it. You'll be notified either way. Editing an already-approved booking's vehicle, date, or time sends it back to pending automatically.</div>
  </div>
</section>

<section class="block" id="admins">
  <div class="wrap">
    <div class="eyebrow">Admin Guide</div>
    <h2>Managing the fleet</h2>
    <p class="section-intro">Everything a driver can do, plus the full admin navigation: Dashboard, Vehicles, Drivers, Admins, Bookings, Vehicle Checks, Incidents, Reports, Records, Sessions, Audit, Notifications, and Account.</p>

    <div class="card-grid">
      <div class="feature-card">
        <h4><span class="dot brand"></span>Dashboard</h4>
        <p>Vehicles in use vs. available, KM driven this week/month, a Vehicle Alerts list sorted by severity for WOF, rego, RUC, and service due dates.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot track"></span>Vehicles</h4>
        <p>Add a vehicle, set compliance fields, and generate/print its QR code. Download saves a PNG with the code and registration baked in.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot amber"></span>Drivers & Admins</h4>
        <p>Invite by email, view licence status and usage totals, deactivate/reactivate (no hard deletes — trip history is always preserved).</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot brand"></span>Bookings</h4>
        <p>Approve or decline requests (a decline needs a note), see confirmed upcoming bookings, and cancel if needed. Double-booking is blocked at the database level.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot rust"></span>Vehicle Checks & Incidents</h4>
        <p>Review submitted checks, and turn a flagged item straight into a proper incident report with one click.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot brand"></span>Reports & Records</h4>
        <p>Weekly/monthly/custom reports and full records, each with a live view and CSV export for bookkeeping.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot track"></span>Sessions</h4>
        <p>See any vehicle currently checked out, with the option to force-close a session if someone forgot to scan out.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot amber"></span>Audit & Notifications</h4>
        <p>A read-only log of admin actions for accountability, plus every alert addressed to you in one place.</p>
      </div>
    </div>
  </div>
</section>

<section class="block" id="faq">
  <div class="wrap">
    <div class="eyebrow">Help</div>
    <h2>Frequently asked questions</h2>

    <details open>
      <summary>I scanned a vehicle's QR code and it says the vehicle is reserved. What now?</summary>
      <p>That means it's currently reserved by someone else's approved booking. Check with them first — if there's a genuine reason you need it anyway, an admin can override the reservation from their side, and the override is logged.</p>
    </details>

    <details>
      <summary>How do I get push notifications on my iPhone?</summary>
      <p>Add Fleet Tracker to your Home Screen first (Settings → Share → Add to Home Screen in Safari), then go to Account and tap "Turn on" for notifications. A regular Safari tab can't receive push notifications on iOS — only the installed app can.</p>
    </details>

    <details>
      <summary>Can I edit a booking after it's been approved?</summary>
      <p>Yes. If you change the vehicle, date, or time, it's automatically sent back to Pending Approval and the same admin is notified again to re-approve it.</p>
    </details>

    <details>
      <summary>What's the difference between a Vehicle Check and Report an Incident?</summary>
      <p>A Vehicle Check is a standalone 9-item inspection you can run any time to formally record a vehicle's condition. Report an Incident is for anything that happened during a trip that isn't a routine check — a bump, a mechanical issue, or anything else worth flagging directly to an admin.</p>
    </details>

    <details>
      <summary>I'm a driver — can I update my own licence details?</summary>
      <p>No, licence details are read-only for drivers. You can see what's on file under Account, but only an admin can update it.</p>
    </details>

    <details>
      <summary>How do I get admin access?</summary>
      <p>An existing admin needs to invite you from Admin → Admins. If you don't have anyone with admin access yet, that's a setup step to sort out with whoever manages the app.</p>
    </details>

    <details>
      <summary>Something looks broken or a feature isn't working as described here.</summary>
      <p>Let whoever manages Fleet Tracker for your family know — they'll have the technical setup notes needed to look into it.</p>
    </details>
  </div>
</section>

<footer>
  <div class="wrap">
    <p>Fleet Tracker — a family vehicle tracker. <a href="https://fleet-tracker-liard.vercel.app" target="_blank" rel="noopener">Open the app ↗</a></p>
  </div>
</footer>

<script>
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });
  document.querySelectorAll('nav.links a').forEach(a=>{
    a.addEventListener('click', ()=>document.querySelector('nav.links').classList.remove('open'));
  });
</script>

</body>
</html>
`;

export async function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
