import { useState } from "react";
import { useNavigate } from "react-router-dom"; // <-- import useNavigate

export default function LoginPage() {
  const [email, setEmail] = useState("admin"); // for MVP
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate(); // <-- hook for navigation

  const handleLogin = async () => {
    try {
      const res = await fetch("https://realestate-crm-cfdg.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        console.log("JWT Token:", data.access_token);
        localStorage.setItem("token", data.access_token);

        // Redirect to Admin Dashboard
        navigate("/admindashboard"); // <-- route path
      } else {
        setError(data.msg);
      }
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div>
      <h1>Admin Login</h1>
      <input
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleLogin}>Login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
