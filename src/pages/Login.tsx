import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder login logic
    if (email === 'admin@example.com' && password === 'admin') {
      navigate('/admin');
    } else if (email === 'client@example.com' && password === 'client') {
      navigate('/client');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card space-y-8">
          <div>
            <h1 className="text-center text-3xl font-sansation text-black">
              Welcome to Bauhinia Brewery
            </h1>
            <h2 className="mt-2 text-center text-xl font-gotham-bold text-gray-600">
              Sign in to your account
            </h2>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="form-label">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-primary w-full flex justify-center"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 