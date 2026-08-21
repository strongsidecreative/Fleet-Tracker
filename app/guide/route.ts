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
  max-width:960px;margin:0 auto;padding:12px 24px;gap:12px;
}
.brand-lockup{display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;flex:none;}
.brand-lockup img{width:32px;height:32px;border-radius:8px;display:block;}
.brand-lockup span{font-weight:700;font-size:15px;letter-spacing:0.02em;}
nav.links{display:flex;gap:4px;align-items:center;}
nav.links a{
  color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;
  padding:8px 12px;border-radius:8px;transition:color .15s, background .15s;
  white-space:nowrap;
}
nav.links a:hover{color:var(--paper);background:var(--ink-3);}
nav.links a.current{color:var(--paper);background:var(--ink-3);}
.nav-toggle{display:none;background:none;border:1px solid var(--line);color:var(--paper);border-radius:8px;padding:8px 10px;font-size:14px;flex:none;}
.nav-open-app{
  background:linear-gradient(135deg,var(--brand-light),var(--brand));color:#fff !important;
  padding:9px 16px !important;border-radius:999px;font-weight:700 !important;margin-left:6px;
  box-shadow:0 4px 14px rgba(19,101,242,0.35);
}
.nav-open-app:hover{background:linear-gradient(135deg,var(--brand-light),var(--brand)) !important;filter:brightness(1.08);}

@media (max-width:760px){
  nav.links{
    display:none;position:absolute;top:100%;left:0;right:0;
    flex-direction:column;align-items:stretch;background:var(--ink-2);border-bottom:1px solid var(--line);
    padding:8px;
  }
  nav.links.open{display:flex;}
  nav.links a{width:100%;}
  .nav-open-app{margin-left:0;text-align:center;}
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

/* Page header (driver/admin pages) */
.page-header{
  padding:56px 24px 40px;text-align:center;
  background:radial-gradient(circle at 50% -10%, rgba(19,101,242,0.28), transparent 60%);
}
.page-header .eyebrow{justify-content:center;display:flex;}
.page-header h1{font-size:2.1rem;margin:0 0 10px;letter-spacing:-0.02em;}
.page-header p.lead{color:var(--muted);font-size:1.05rem;max-width:600px;margin:0 auto 24px;}

.btn{
  display:inline-block;padding:12px 22px;border-radius:10px;text-decoration:none;
  font-weight:700;font-size:14px;transition:transform .12s, box-shadow .12s;border:none;cursor:pointer;
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

.step-shot-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;}
.step-shot-grid.single{grid-template-columns:minmax(0,420px) 1fr;align-items:center;}
@media (max-width:720px){
  .step-shot-grid, .step-shot-grid.single{grid-template-columns:1fr;}
}
.step-shot img{
  width:100%;height:auto;border-radius:14px;border:1px solid var(--line);
  box-shadow:0 12px 32px rgba(0,0,0,0.35);margin-bottom:18px;
}
.step-shot .steps li{padding-bottom:18px;}

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
.guide-body{margin-top:12px;}
.guide-body > p{color:var(--muted);margin:0;font-size:14px;}
.guide-body .steps{margin-top:4px;}
.guide-body .steps li{font-size:14px;}

/* callout */
.callout{
  background:rgba(19,101,242,0.1);border:1px solid rgba(19,101,242,0.35);
  border-radius:12px;padding:16px 18px;margin:20px 0;font-size:14px;color:var(--paper);
}
.callout strong{color:var(--brand-light);}

/* cross-page link card */
.next-page{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  background:var(--ink-2);border:1px solid var(--line);border-radius:14px;padding:20px 24px;margin-top:40px;
}
.next-page div p{margin:2px 0 0;color:var(--muted);font-size:14px;}
.next-page div span.eyebrow{margin-bottom:4px;}

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
    <a class="brand-lockup" href="/guide">
      <img src="/icon-512.png" alt="Fleet Tracker logo">
      <span>Fleet Tracker</span>
    </a>
    <button class="nav-toggle" onclick="document.querySelector('nav.links').classList.toggle('open')">Menu</button>
    <nav class="links">
      <a href="/guide#install" class="current">Install</a>
      <a href="/guide/driver" >Driver Guide</a>
      <a href="/guide/admin" >Admin Guide</a>
      <a href="/guide#faq" >FAQ</a>
      
    </nav>
  </div>
</header>


<section class="hero">
  <div class="wrap">
    <img class="logo" src="/icon-512.png" alt="Fleet Tracker">
    <h1>Welcome to Fleet Tracker</h1>
    <p class="lead">Your organisation's vehicle tracker. Pick your guide below to get set up and installed.</p>
  </div>
</section>

<section class="block" id="benefits" style="border-top:none;">
  <div class="wrap">
    <div class="eyebrow">Why Fleet Tracker</div>
    <h2>Built for any organisation's fleet</h2>
    <p class="section-intro">A few reasons it beats a notebook on the dash or a group chat full of "who has the car?"</p>
    <div class="card-grid">
      <div class="feature-card">
        <h4><span class="dot brand"></span>Always know who has the car</h4>
        <p>A quick QR scan starts and finishes every trip, so it's always clear which vehicle is out, who has it, and for how long.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot track"></span>Never miss a WOF or rego renewal</h4>
        <p>Compliance dates are tracked automatically, with alerts before anything lapses — no more surprises at the pump or the checkpoint.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot amber"></span>No more booking mix-ups</h4>
        <p>Requesting a vehicle ahead of time goes through a proper approval flow, so two people can't accidentally book the same car.</p>
      </div>
      <div class="feature-card">
        <h4><span class="dot rust"></span>Issues get logged, not lost</h4>
        <p>Vehicle checks and incident reports capture problems with photos and comments, so nothing falls through the cracks between drivers.</p>
      </div>
    </div>
  </div>
</section>

<section class="block" id="start">
  <div class="wrap">
    <div class="eyebrow">Start here</div>
    <h2>Pick your role</h2>
    <p class="section-intro">The same login screen works for everyone — what you see afterwards depends on whether you're set up as a Driver or an Admin. Each guide below covers everything you need, including how to install the app.</p>
    <div class="role-grid">
      <a class="role-card" href="/guide/driver">
        <span class="tag">Driver</span>
        <h3>Day-to-day vehicle use</h3>
        <p>Scan to start/finish trips, book a vehicle ahead of time, run a vehicle check, and report incidents.</p>
      </a>
      <a class="role-card" href="/guide/admin">
        <span class="tag">Admin</span>
        <h3>Managing the fleet</h3>
        <p>Everything a driver can do, plus adding vehicles and people, approving bookings, and compliance oversight.</p>
      </a>
    </div>
  </div>
</section>


<footer>
  <div class="wrap">
    <p>Fleet Tracker — a vehicle tracker for your organisation. <a href="https://fleet-tracker-liard.vercel.app" target="_blank" rel="noopener">Open the app ↗</a></p>
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
