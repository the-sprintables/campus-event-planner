import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user" | "">("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password || !role) {
      setError("Please fill all fields and select a role");
      return;
    }
    const res = await login(email, password, role as "admin" | "user");
    if (!res.ok) {
      setError(res.error ?? "Invalid credentials");
      return;
    }
    
    // Check if this is a new user's first login
    const isNewUser = localStorage.getItem(`is_new_user_${email}`) === 'true';
    if (isNewUser) {
      // Clear the flag and redirect to customize events
      localStorage.removeItem(`is_new_user_${email}`);
      navigate("/feed");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-4 rounded-lg glass shadow-2xl shadow-gray-600 bg-white">
      <h2 className="text-center text-primary font-bold text-2xl mt-4">Please Login!</h2>
      <div className="auth-page">
      <div className="auth-card card ">
        <form onSubmit={handleSubmit} className="auth-form ">
          <label>
            Email
            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div style={{ marginTop: 10 }}>
            <div style={{ marginBottom: 6 }}>Select role to login as</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={role === "user" ? "btn" : "btn ghost"}
                onClick={() => setRole("user")}
              >
                User
              </button>
              <button
                type="button"
                className={role === "admin" ? "btn" : "btn ghost"}
                onClick={() => setRole("admin")}
              >
                Admin
              </button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="auth-actions">
            <button type="submit" className="btn w-full">
              Login
            </button>
          </div>
          <p className="font-bold mt-2">New Here? Please <Link to="/register" className="text-primary underline">Register</Link></p>
        </form>
      </div>
    </div>
    </div>
  );
}
