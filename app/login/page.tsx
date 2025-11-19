"use client";

import "../styles/login.css";
import AuthForm from "../components/ui/AuthForm";

export default function LoginPage() {
  return (
    <div className="login-container">
      <div className="login-card" >
        <img src="/logo.png" alt="Briskon Logo" />
        <p className="login-subtitle">
          Sign in to continue to Briskon Procurement Suite
        </p>
        <AuthForm />
      </div>
    </div>
  );
}
