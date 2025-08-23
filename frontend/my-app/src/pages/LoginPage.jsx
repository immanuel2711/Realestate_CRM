import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

export default function LoginPage() {
  // Pre-fill both with "admin"
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("https://realestate-crm-cfdg.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        navigate("/admindashboard");
      } else {
        setError(data.msg || "Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-grid" />

      <div className="auth-card" role="group" aria-labelledby="auth-title">
        <div className="brand">
          <div className="brand-mark">🏢</div>
          <h1 id="auth-title">RealEstate CRM</h1>
          <p className="subtitle">Admin Console Access</p>
        </div>

        {error ? (
          <div className="error-banner" role="alert">
            <span className="error-dot" />
            {error}
          </div>
        ) : null}

        <div className="form">
          <label className="field">
            <span className="field-label">Email</span>
            <div className="input-wrap">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onEnter}
                placeholder="Enter email"
                autoComplete="username"
              />
              <span className="input-icon">@</span>
            </div>
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <div className="input-wrap">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onEnter}
                placeholder="Enter password"
                autoComplete="current-password"
              />
              <span className="input-icon">•••</span>
            </div>
          </label>

          <button className="btn-primary" onClick={handleLogin}>
            Sign in
            <svg
              className="btn-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className="helper">
            <span className="muted">Demo creds auto-filled:</span>
            <code>admin / admin</code>
          </div>
        </div>

        <div className="footer-note">
          <span className="lock-dot" /> Secure area — authorized users only
        </div>
      </div>
    </div>
  );
}
