/* ============ RESET & BASE ============ */
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --primary: #1A77CC;
  --primary-dark: #12518f;
  --primary-light: #eaf3fc;
  --text: #22303f;
  --text-muted: #62727f;
  --border: #e2e8f0;
  --bg-alt: #f6f9fc;
  --radius: 12px;
  --shadow: 0 6px 20px rgba(20, 40, 70, 0.08);
  --shadow-hover: 0 12px 28px rgba(20, 40, 70, 0.14);
}

html { scroll-behavior: smooth; }

body {
  font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--text);
  line-height: 1.55;
  background: #fff;
}

img { max-width: 100%; display: block; }
a { text-decoration: none; color: inherit; }
ul { list-style: none; }

.container {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px;
}
.container-narrow { max-width: 820px; }

/* ============ TOP BAR ============ */
.topbar {
  background: var(--primary-dark);
  color: #fff;
  font-size: 0.82rem;
}
.topbar-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 20px;
  flex-wrap: wrap;
  gap: 6px;
}
.topbar-contact a { margin-right: 18px; opacity: 0.9; }
.topbar-contact a:hover { opacity: 1; text-decoration: underline; }
.topbar-social a {
  margin-left: 10px;
  font-weight: 700;
  opacity: 0.85;
}
.topbar-social a:hover { opacity: 1; }

/* ============ HEADER ============ */
.header {
  background: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  gap: 16px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.logo-badge {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
}
.logo-text { display: flex; flex-direction: column; line-height: 1.2; }
.logo-text strong { color: var(--primary-dark); font-size: 1.02rem; }
.logo-text small { color: var(--text-muted); font-size: 0.72rem; }

.nav { flex: 1; }
.nav > ul {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}
.nav > ul > li { position: relative; }
.nav > ul > li > a {
  display: block;
  padding: 10px 12px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text);
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.nav > ul > li > a.active,
.nav > ul > li > a:hover { color: var(--primary); background: var(--primary-light); }

.has-dropdown .dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 220px;
  background: #fff;
  border-radius: 10px;
  box-shadow: var(--shadow-hover);
  padding: 8px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: all 0.18s ease;
  z-index: 50;
}
.has-dropdown:hover .dropdown,
.has-dropdown.open .dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.dropdown li a {
  display: block;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 0.88rem;
}
.dropdown li a:hover { background: var(--primary-light); color: var(--primary); }

.header-cta { display: flex; gap: 10px; flex-shrink: 0; }

.btn {
  display: inline-block;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { border-color: var(--primary); color: var(--primary); }
.btn-outline:hover { background: var(--primary-light); }
.btn-light { background: #fff; color: var(--primary-dark); }
.btn-light:hover { background: var(--primary-light); }

.nav-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 28px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
}
.nav-toggle span {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--text);
}

/* ============ HERO / SLIDER ============ */
.hero {
  position: relative;
  height: 420px;
  overflow: hidden;
  background: #0d2c4a;
}
.slider { position: relative; width: 100%; height: 100%; }
.slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 0.6s ease;
}
.slide.active { opacity: 1; }
.slider-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.85);
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  color: var(--primary-dark);
  z-index: 5;
}
.slider-btn:hover { background: #fff; }
.slider-btn.prev { left: 16px; }
.slider-btn.next { right: 16px; }
.slider-dots {
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  z-index: 5;
}
.slider-dots span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  cursor: pointer;
  transition: background 0.2s;
}
.slider-dots span.active { background: #fff; }

/* ============ DOCTOR SEARCH ============ */
.doctor-search { margin-top: -50px; position: relative; z-index: 10; }
.doctor-search-card {
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow-hover);
  padding: 28px;
}
.doctor-search-card h2 {
  font-size: 1.3rem;
  color: var(--primary-dark);
  margin-bottom: 16px;
}
.doctor-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  align-items: end;
}
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.82rem; font-weight: 700; color: var(--text-muted); }
.form-field select {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  font-size: 0.9rem;
  background: #fff;
}
.form-field select:focus { outline: none; border-color: var(--primary); }
.doctor-form .btn { height: 42px; }
.form-result {
  margin-top: 14px;
  font-size: 0.9rem;
  color: var(--primary-dark);
  font-weight: 600;
}

/* ============ SECTIONS ============ */
.section { padding: 64px 0; }
.section-alt { background: var(--bg-alt); }
.section-title {
  text-align: center;
  font-size: 1.7rem;
  color: var(--primary-dark);
}
.section-subtitle {
  text-align: center;
  color: var(--text-muted);
  max-width: 640px;
  margin: 10px auto 34px;
  font-style: italic;
}

/* ============ CARD GRID ============ */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}
.card {
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}
.card:hover { transform: translateY(-5px); box-shadow: var(--shadow-hover); }
.card img { height: 170px; object-fit: cover; width: 100%; }
.card-body { padding: 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.card-body h3 { font-size: 1.05rem; color: var(--primary-dark); }
.card-body p { font-size: 0.88rem; color: var(--text-muted); flex: 1; }
.card-body .btn { align-self: flex-start; margin-top: 6px; }
.card-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* ============ TABS (FASILITAS) ============ */
.tabs-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 28px;
}
.tab-btn {
  padding: 9px 16px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.15s ease;
}
.tab-btn.active, .tab-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.tab-panel {
  display: none;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  align-items: stretch;
}
.tab-panel.active { display: grid; grid-template-columns: 1fr 1fr; }
.tab-panel img { height: 100%; min-height: 260px; object-fit: cover; }
.tab-panel-text { padding: 32px; display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.tab-panel-text h3 { color: var(--primary-dark); font-size: 1.3rem; }
.tab-panel-text p { color: var(--text-muted); }
.tab-panel-text .btn { align-self: flex-start; }

@media (max-width: 700px) {
  .tab-panel.active { grid-template-columns: 1fr; }
  .tab-panel img { min-height: 180px; }
}

/* ============ ACCORDION (FAQ) ============ */
.accordion-item {
  border-bottom: 1px solid var(--border);
}
.accordion-item:first-child { border-top: 1px solid var(--border); }
.accordion-question {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 18px 4px;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.accordion-question .icon { transition: transform 0.2s ease; color: var(--primary); font-size: 1.2rem; }
.accordion-item.open .accordion-question .icon { transform: rotate(45deg); }
.accordion-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease;
  color: var(--text-muted);
  font-size: 0.92rem;
  padding: 0 4px;
}
.accordion-item.open .accordion-answer { padding-bottom: 16px; }

/* ============ CTA ============ */
.section-cta {
  background: linear-gradient(120deg, var(--primary), var(--primary-dark));
  color: #fff;
  padding: 44px 0;
}
.cta-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}
.cta-inner h2 { font-size: 1.4rem; margin-bottom: 6px; }
.cta-inner p { opacity: 0.9; font-size: 0.92rem; }
.cta-buttons { display: flex; gap: 10px; flex-wrap: wrap; }

/* ============ FOOTER ============ */
.footer { background: #0f2438; color: #cfd9e3; padding: 48px 0 0; }
.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 28px;
  padding-bottom: 32px;
}
.footer h3 { color: #fff; margin-bottom: 12px; font-size: 1.1rem; }
.footer h4 { color: #fff; margin-bottom: 12px; font-size: 0.95rem; }
.footer p { font-size: 0.85rem; margin-bottom: 8px; line-height: 1.6; }
.footer-links li { margin-bottom: 8px; }
.footer-links a { font-size: 0.85rem; }
.footer-links a:hover { color: #fff; text-decoration: underline; }
.footer-social { display: flex; flex-direction: column; gap: 8px; }
.footer-social a { font-size: 0.85rem; }
.footer-social a:hover { color: #fff; text-decoration: underline; }
.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 16px 0;
  text-align: center;
  font-size: 0.8rem;
}

/* ============ BACK TO TOP ============ */
.back-to-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: var(--shadow-hover);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.25s ease;
  z-index: 200;
}
.back-to-top.show { opacity: 1; visibility: visible; transform: translateY(0); }
.back-to-top:hover { background: var(--primary-dark); }

/* ============ RESPONSIVE NAV ============ */
@media (max-width: 960px) {
  .nav-toggle { display: flex; }
  .header-cta { display: none; }
  .nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #fff;
    box-shadow: var(--shadow);
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.25s ease;
  }
  .nav.open { max-height: 80vh; overflow-y: auto; }
  .nav > ul { flex-direction: column; padding: 10px; gap: 0; }
  .nav > ul > li > a { padding: 12px; }
  .has-dropdown .dropdown {
    position: static;
    opacity: 1;
    visibility: visible;
    transform: none;
    box-shadow: none;
    display: none;
    padding-left: 12px;
  }
  .has-dropdown.open .dropdown { display: block; }
  .hero { height: 300px; }
}