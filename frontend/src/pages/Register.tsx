import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../auth";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError("Please fill all fields");
      return;
    }
    const res = await register(email, password);
    if (!res.ok) {
      setError(res.error ?? "Registration error");
      return;
    }
    // successful registration -> go to login
    navigate("/feed");
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-lg glass shadow-2xl shadow-gray-600 bg-white">
      <h2 className="text-center text-primary font-bold text-2xl mt-4">Please Register!</h2>
      <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Name
          <input value={name} placeholder="Enter your name" onChange={(e) => setName(e.target.value)} />
        </label>
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
            placeholder="Enter your password"
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn w-full">Register</button>
        <p className="mt-2 font-bold">Already have an account? Please <Link to="/login" className="text-primary underline">Login</Link></p>
      </form>
    </div>
    </div>
  );
}
