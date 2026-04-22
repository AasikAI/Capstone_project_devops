import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const features = [
  { icon: '🔒', title: 'Secure Auth', desc: 'JWT-based authentication with refresh tokens and rate limiting.' },
  { icon: '📦', title: 'Product Catalog', desc: 'Browse products by category with search, sort and price filters.' },
  { icon: '🛒', title: 'Smart Cart', desc: 'Real-time cart synced with live product stock validation.' },
  { icon: '📋', title: 'Order Tracking', desc: 'Place orders and track their status from pending to delivered.' },
  { icon: '👤', title: 'User Profile', desc: 'Manage your personal info and multiple saved addresses.' },
  { icon: '📧', title: 'Email Alerts', desc: 'Automatic email notifications for order confirmations and updates.' },
];

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Microservices Architecture Demo
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Welcome to <span className="text-blue-200">ShopEase</span>
          </h1>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            A production-grade mini e-commerce platform showcasing 6 decoupled microservices,
            Docker orchestration, and Kubernetes-ready deployment.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/products" id="browse-products-btn" className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              Browse Products →
            </Link>
            {!isAuthenticated && (
              <Link to="/register" id="get-started-btn" className="inline-flex items-center gap-2 bg-blue-500/30 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-500/50 transition-colors">
                Get Started
              </Link>
            )}
            {isAuthenticated && (
              <p className="text-blue-200 self-center text-sm">Welcome back, <span className="font-bold text-white">{user.firstName}</span>! 👋</p>
            )}
          </div>
        </div>
      </section>

      {/* Services Badge */}
      <section className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-3">
          {['Auth :4001', 'Products :4002', 'Orders :4003', 'Cart :4004', 'Profile :4005', 'Notifications :4006'].map((s) => (
            <span key={s} className="badge-blue font-mono text-xs">{s}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">Platform Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-blue-200 hover:shadow-md transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-50 border-t border-blue-100 py-12 text-center px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to explore?</h2>
        <p className="text-gray-500 mb-6">Check out the product catalog or create an account to start shopping.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/products" className="btn-primary">View Products</Link>
          {!isAuthenticated && <Link to="/register" className="btn-secondary">Create Account</Link>}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
