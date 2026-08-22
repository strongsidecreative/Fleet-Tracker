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

@media (max-width:760px){
  nav.links{
    display:none;position:absolute;top:100%;left:0;right:0;
    flex-direction:column;align-items:stretch;background:var(--ink-2);border-bottom:1px solid var(--line);
    padding:8px;
  }
  nav.links.open{display:flex;}
  nav.links a{width:100%;}
  .nav-toggle{display:inline-block;}
}

/* Hero */
.hero{
  text-align:center;padding:80px 24px 64px;
  background:radial-gradient(circle at 50% -10%, rgba(19,101,242,0.35), transparent 60%);
}
.hero img.logo{width:96px;height:96px;border-radius:22px;margin-bottom:24px;box-shadow:0 12px 40px rgba(19,101,242,0.35);}
.hero h1{font-size:2.4rem;margin:0 0 12px;letter-spacing:-0.02em;}
.hero p.lead{color:var(--muted);font-size:1.1rem;max-width:520px;margin:0 auto 8px;}

/* Role cards */
.role-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 8px;}
@media (max-width:640px){.role-grid{grid-template-columns:1fr;}}
.role-card{
  background:var(--ink-2);border:1px solid var(--line);border-radius:16px;padding:24px;
  text-decoration:none;color:var(--paper);transition:border-color .15s, transform .15s;
}
.role-card:hover{border-color:var(--brand);transform:translateY(-2px);}
.role-card .tag{
  display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;
  color:var(--brand-light);margin-bottom:8px;
}
.role-card h3{margin:0 0 6px;font-size:1.2rem;}
.role-card p{margin:0;color:var(--muted);font-size:14px;}

section.block{padding:0 24px 80px;}
.eyebrow{
  color:var(--brand-light);font-weight:800;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;
  text-align:center;
}

/* footer */
footer{
  border-top:1px solid var(--line);padding:36px 0;text-align:center;color:var(--muted);font-size:13px;
}
footer a{color:var(--brand-light);text-decoration:none;}

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
      <a href="/guide/driver">Driver Guide</a>
      <a href="/guide/admin">Admin Guide</a>
    </nav>
  </div>
</header>


<section class="hero">
  <div class="wrap">
    <img class="logo" src="/icon-512.png" alt="Fleet Tracker">
    <h1>Welcome to Fleet Tracker</h1>
    <p class="lead">Your organisation's vehicle tracker. Pick your role below to get set up and installed.</p>
  </div>
</section>

<section class="block">
  <div class="wrap">
    <div class="eyebrow">Pick your role</div>
    <div class="role-grid">
      <a class="role-card" href="/guide/driver">
        <span class="tag">Driver</span>
        <h3>Day-to-day vehicle use</h3>
        <p>Scan to start/finish trips, book a vehicle ahead of time, run a vehicle check, and report incidents.</p>
      </a>
      <a class="role-card" href="/guide/admin">
        <span class="tag">Admin</span>
        <h3>Managing the fleet</h3>
        <p>Everything a driver can do, plus adding vehicles and people, approving bookings, and compliance oversight — including why Fleet Tracker is worth setting up.</p>
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
