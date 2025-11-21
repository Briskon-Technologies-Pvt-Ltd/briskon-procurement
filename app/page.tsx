"use client";

import { motion } from "framer-motion";
import AuthForm from "./components/ui/AuthForm";
import {
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  DocumentCheckIcon,
  ChartPieIcon,
  PuzzlePieceIcon,
  ClockIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function HomePage() {
  return (
    <>
      <style>{`
        :root {
          --bg-deep: #020617;
          --bg-hero: #020617;
          --bg-hero-bottom: #0b1120;
          --indigo: #4f46e5;
          --indigo-soft: #818cf8;
          --indigo-light: #a5b4fc;
          --text-main: #e5e7eb;
          --text-muted: #9ca3af;
          --white: #ffffff;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
          background: radial-gradient(circle at top left, #1e293b 0, #020617 40%, #000 100%);
          color: var(--text-main);
        }

        a {
          color: inherit;
        }

        .homepage {
          min-height: 100vh;
        }

        .container {
          width: min(1200px, 92%);
          margin: 0 auto;
        }

        /* NAVBAR */
        .navbar {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(15,23,42,0.96);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(148,163,184,0.25);
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
        }

        .navbar-logo img {
          height: 40px;
        }

        .navbar-links {
          display: flex;
          align-items: center;
          gap: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .navbar-links a {
          text-decoration: none;
          color: var(--text-main);
          opacity: 0.85;
          transition: opacity 0.2s ease, color 0.2s ease;
        }

        .navbar-links a:hover {
          opacity: 1;
          color: var(--indigo-light);
        }

        /* HERO */
        .hero-section {
          background: linear-gradient(to bottom, var(--bg-hero), var(--bg-hero-bottom));
          padding: 96px 0 80px;
        }

        .hero-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 56px;
        }

        .hero-title {
          font-size: clamp(40px, 4vw + 16px, 54px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0;
        }

        .hero-title span {
          background: linear-gradient(90deg, #6366f1, #a855f7);
          -webkit-background-clip: text;
          color: transparent;
        }

        .hero-subtitle {
          margin-top: 20px;
          margin-bottom: 28px;
          font-size: 17px;
          max-width: 540px;
          color: var(--text-muted);
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }

        .cta-btn {
          padding: 12px 22px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
        }

        .cta-btn.primary {
          background: var(--indigo);
          color: var(--white);
          box-shadow: 0 16px 35px rgba(79,70,229,0.55);
        }

        .cta-btn.primary:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .cta-btn.secondary {
          background: transparent;
          border-color: rgba(148,163,184,0.6);
          color: var(--text-main);
        }

        .cta-btn.secondary:hover {
          background: rgba(15,23,42,0.85);
          box-shadow: 0 12px 24px rgba(15,23,42,0.6);
        }

        /* LOGIN PANEL (RIGHT HERO) */
        .login-panel {
          flex-shrink: 0;
          width: 380px;
          padding: 26px 26px 24px;
          border-radius: 22px;
          background: rgba(248,250,252,0.96);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(226,232,240,0.9);
          box-shadow:
            0 24px 60px rgba(15,23,42,0.85),
            0 0 0 1px rgba(148,163,184,0.35);
          color: #0f172a;
        }

        .login-header-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .login-logo {
          height: 30px;
        }

        .login-title {
          font-size: 15px;
          font-weight: 600;
          color: #0f172a;
        }

        .login-subtitle-panel {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 18px;
        }

        .login-panel form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .login-panel label {
          font-size: 13px;
          font-weight: 500;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .login-panel input[type="email"],
        .login-panel input[type="password"],
        .login-panel input[type="text"] {
          width: 100%;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          padding: 9px 11px;
          font-size: 14px;
          outline: none;
          background: #f9fafb;
          color: #111827;
        }

        .login-panel input:focus {
          border-color: var(--indigo);
          box-shadow: 0 0 0 1px rgba(79,70,229,0.35);
        }

        .login-panel button[type="submit"],
        .login-panel .btn-primary {
          width: 100%;
          border-radius: 999px;
          border: none;
          margin-top: 6px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 600;
          background: var(--indigo);
          color: var(--white);
          cursor: pointer;
          transition: background 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
        }

        .login-panel button[type="submit"]:hover,
        .login-panel .btn-primary:hover {
          background: #4338ca;
          box-shadow: 0 14px 30px rgba(79,70,229,0.5);
          transform: translateY(-1px);
        }

        .login-panel a {
          color: #4b5563;
          font-size: 12px;
        }

        /* GENERIC SECTION WRAPPER */
        .section {
          padding: 72px 0;
          background: radial-gradient(circle at top, rgba(30,64,175,0.45) 0, transparent 60%);
        }

        .section-surface {
          border-radius: 24px;
          padding: 44px 34px 46px;
          background: rgba(15,23,42,0.88);
          border: 1px solid rgba(148,163,184,0.35);
          box-shadow: 0 22px 45px rgba(15,23,42,0.8);
        }

        .section-header {
          margin-bottom: 26px;
        }

        .section-header h2 {
          font-size: 28px;
          margin: 0 0 10px;
          color:white;
        }

        .section-header p {
          margin: 0;
          color: var(--text-muted);
          font-size: 15px;
        }

        /* ABOUT */
        .about-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 32px;
          align-items: center;
        }

        .about-text p {
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 15px;
          color: var(--text-main);
        }

        .about-bullets {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px 18px;
        }

        .about-bullet {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 14px;
          color: var(--text-muted);
        }

        .about-bullet-icon {
          width: 18px;
          height: 18px;
          color: var(--indigo-light);
          flex-shrink: 0;
        }

        .about-graphic img {
          width: 100%;
          border-radius: 20px;
          object-fit: cover;
          box-shadow: 0 22px 50px rgba(15,23,42,0.9);
        }

        /* MODULES */
        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 20px;
          margin-top: 18px;
          
        }

        .module-card {
          padding: 20px 18px 20px;
          border-radius: 18px;
          background: radial-gradient(circle at top left, rgba(79,70,229,0.3), rgba(15,23,42,0.95));
          border: 1px solid rgba(165,180,252,0.7);
          box-shadow: 0 18px 36px rgba(79,70,229,0.6);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.2s ease;
        }

        .module-card h3 {
          font-size: 16px;
          margin: 0 0 6px;
        }

        .module-card p {
          margin: 0;
          font-size: 14px;
          color: #e5e7eb;
          opacity: 0.9;
        }

        .module-card:hover {
          transform: translateY(-4px);
          border-color: var(--indigo-light);
          box-shadow: 0 22px 44px rgba(129,140,248,0.7);
        }

        .module-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          background: radial-gradient(circle at top, #c7d2fe, #4f46e5);
          box-shadow: 0 0 18px rgba(129,140,248,0.9);
        }

        .module-icon {
          width: 18px;
          height: 18px;
          color: #020617;
        }

        /* OUTCOMES (ICON TILES) */
        .outcomes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 20px;
          margin-top: 22px;
        }

        .outcome-card {
          padding: 20px 18px 18px;
          border-radius: 18px;
          background: radial-gradient(circle at top left, rgba(56,189,248,0.25), rgba(15,23,42,0.96));
          border: 1px solid rgba(125,211,252,0.8);
          box-shadow: 0 18px 40px rgba(8,47,73,0.9);
        }

        .outcome-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: radial-gradient(circle at top, #e0f2fe, #0ea5e9);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          box-shadow: 0 0 18px rgba(56,189,248,0.8);
        }

        .outcome-icon {
          width: 18px;
          height: 18px;
          color: #0f172a;
        }

        .outcome-card h3 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .outcome-card p {
          margin: 0;
          font-size: 14px;
          color: #e5e7eb;
          opacity: 0.9;
        }

        /* CTA */
        .cta-section {
          padding: 70px 0 80px;
          text-align: center;
          background: radial-gradient(circle at center, rgba(79,70,229,0.4), transparent 55%);
        }

        .cta-inner {
          max-width: 620px;
          margin: 0 auto;
        }

        .cta-inner h2 {
          margin-bottom: 10px;
          font-size: 28px;
        }

        .cta-inner p {
          margin-top: 0;
          margin-bottom: 22px;
          font-size: 15px;
          color: var(--text-muted);
        }

        /* FOOTER */
        .homepage-footer {
          border-top: 1px solid rgba(148,163,184,0.35);
          padding: 22px 0 28px;
          text-align: center;
          font-size: 13px;
          color: #9ca3af;
          background: #020617;
        }

        /* RESPONSIVE */
        @media (max-width: 960px) {
          .hero-inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .login-panel {
            width: 100%;
            max-width: 420px;
            margin: 32px auto 0;
          }

          .about-layout {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 640px) {
          .navbar-inner {
            padding-inline: 4px;
          }

          .navbar-links {
            gap: 16px;
            font-size: 13px;
          }

          .section-surface {
            padding: 30px 20px 32px;
          }
        }
      `}</style>

      <div className="homepage">
        {/* ===== NAVBAR ===== */}
        <header className="navbar">
          <div className="navbar-inner container">
            <div className="navbar-logo">
              <img src="/briskon-logo-white.svg" alt="Briskon Logo" />
            </div>
            <nav className="navbar-links">
              <a href="#about">About</a>
              <a href="#features">Modules</a>
              <a href="#value">Outcomes</a>
              <a href="#login-block">Login</a>
            </nav>
          </div>
        </header>

        {/* ===== HERO WITH EMBEDDED LOGIN ===== */}
        <section className="hero-section">
          <div className="hero-inner container">
            <motion.div
              className="hero-content"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="hero-title">
                Transform procurement with{" "}
                <span>intelligent reverse auctions</span>
              </h1>
              <p className="hero-subtitle">
                Briskon’s enterprise-grade procurement suite empowers organizations to streamline sourcing, drive transparency, and achieve cost efficiency — powered by automation, collaboration, and data-driven insight.
              </p>
              <div className="hero-buttons">
                <a href="#login-block" className="cta-btn primary">
                  Quick Login
                </a>
                <a href="#features" className="cta-btn secondary">
                  Explore Solution
                </a>
              </div>
            </motion.div>

            <motion.div
              id="login-block"
              className="login-panel"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="login-header-row">
                <img src="/logo.png" alt="Briskon Logo" className="login-logo" />
                <div className="login-title">Sign in</div>
              </div>
              <p className="login-subtitle-panel">
                Sign in to continue to Briskon Procurement Suite
              </p>
              <AuthForm />
            </motion.div>
          </div>
        </section>

        {/* ===== ABOUT ===== */}
        <section id="about" className="section">
          <div className="container section-surface">
            <div className="section-header">
              <h2>Briskon Procurement Suite — built for the digital enterprise</h2>
              <p>
                Modern procurement teams need a unified, digital-first platform that connects requisitions, sourcing, auctions, suppliers, and approvals into one seamless experience.
              </p>
            </div>
            <div className="about-layout">
              <div className="about-text">
                <div className="about-bullets">
                  <div className="about-bullet">
                    <CheckCircleIcon className="about-bullet-icon" />
                    <span>Unified view across requisitions, RFQs, auctions, suppliers, and awards.</span>
                  </div>
                  <div className="about-bullet">
                    <CheckCircleIcon className="about-bullet-icon" />
                    <span>Real-time collaboration and approvals for faster decision-making.</span>
                  </div>
                  <div className="about-bullet">
                    <CheckCircleIcon className="about-bullet-icon" />
                    <span>Configurable workflows aligned to your procurement policies and governance.</span>
                  </div>
                  <div className="about-bullet">
                    <CheckCircleIcon className="about-bullet-icon" />
                    <span>Data-driven insights to track savings, supplier performance, and spend coverage.</span>
                  </div>
                  <div className="about-bullet">
                    <CheckCircleIcon className="about-bullet-icon" />
                    <span>Enterprise-ready security, auditability, and scalable architecture.</span>
                  </div>
                </div>
              </div>

              <div className="about-graphic">
                <img
                  src="/WF.png"
                  alt="Workflow diagram"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== MODULES ===== */}
        <section id="features" className="section">
          <div className="container section-surface">
            <div className="section-header">
              <h2>Core modules that power your procurement lifecycle</h2>
              <p>
                Orchestrate every step from requisition to award through tightly connected, configurable modules.
              </p>
            </div>

            <div className="modules-grid">
              {[
                {
                  title: "Requisition Management",
                  desc: "Create, approve, and manage purchase requests with complete visibility and audit trails.",
                  icon: ClipboardDocumentCheckIcon,
                },
                {
                  title: "RFQ / Tendering",
                  desc: "Send RFQs to suppliers, evaluate proposals, and maintain negotiation history centrally.",
                  icon: DocumentTextIcon,
                },
                {
                  title: "Reverse Auctions",
                  desc: "Drive competitive bidding in real time with rule-based automation and live visibility.",
                  icon: ArrowTrendingDownIcon,
                },
                {
                  title: "Supplier Management",
                  desc: "Onboard, qualify, and evaluate suppliers with structured performance analytics.",
                  icon: UsersIcon,
                },
                {
                  title: "Approvals & Workflow",
                  desc: "Automate conditional, role-based approval hierarchies with SLA-driven escalations.",
                  icon: ArrowsRightLeftIcon,
                },
                {
                  title: "Contracts & Awards",
                  desc: "Digitally issue awards, generate POs, and manage contract lifecycles seamlessly.",
                  icon: DocumentCheckIcon,
                },
                {
                  title: "Spend Analytics",
                  desc: "Track category-wise spend, savings, and trends to guide sourcing strategy.",
                  icon: ChartPieIcon,
                },
                {
                  title: "Integrations & APIs",
                  desc: "Connect with ERPs, finance, and external systems using secure APIs.",
                  icon: PuzzlePieceIcon,
                },
              ].map((mod, i) => {
                const IconComp = mod.icon;
                return (
                  <motion.div
                    key={i}
                    className="module-card"
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="module-icon-wrap">
                      <IconComp className="module-icon" />
                    </div>
                    <h3>{mod.title}</h3>
                    <p>{mod.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== VALUE / OUTCOMES (ICON TILES) ===== */}
        <section id="value" className="section">
          <div className="container section-surface">
            <div className="section-header">
              <h2>Deliver measurable procurement outcomes</h2>
              <p>
                Move beyond transactional buying to a transparent, data-driven procurement function with clear impact across time, cost, compliance, and control.
              </p>
            </div>

            <div className="outcomes-grid">
              {[
                {
                  title: "Faster sourcing cycles",
                  desc: "Digitized workflows, templates, and approvals significantly compress sourcing timelines from weeks to days.",
                  icon: ClockIcon,
                },
                {
                  title: "Real savings & margin impact",
                  desc: "Structured RFQs and reverse auctions help procurement consistently realize negotiated savings and improve margins.",
                  icon: BanknotesIcon,
                },
                {
                  title: "Stronger compliance & visibility",
                  desc: "End-to-end traceability of events, suppliers, and decisions strengthens governance and reduces maverick spend.",
                  icon: ShieldCheckIcon,
                },
                {
                  title: "Audit-ready decisions & insight",
                  desc: "Centralized history of events, approvals, and data makes audits and reporting faster, easier, and highly defensible.",
                  icon: DocumentMagnifyingGlassIcon,
                },
              ].map((item, i) => {
                const IconComp = item.icon;
                return (
                  <motion.div
                    key={i}
                    className="outcome-card"
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <div className="outcome-icon-wrap">
                      <IconComp className="outcome-icon" />
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="cta-section">
          <div className="cta-inner">
            <h2>Ready to transform your procurement process?</h2>
            <p>
              Experience Briskon’s unified platform for sourcing, supplier collaboration, and reverse auctions.
            </p>
            <div className="hero-buttons">
              <a href="#login-block" className="cta-btn primary">
                Login
              </a>
              <a href="#features" className="cta-btn secondary">
                Request a Demo
              </a>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="homepage-footer">
          © {new Date().getFullYear()} Briskon Procurement & Reverse Auction Suite. All rights reserved.
        </footer>
      </div>
    </>
  );
}
