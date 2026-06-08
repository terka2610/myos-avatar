'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Play, Users, BookOpen, TrendingUp, ArrowRight, Zap } from 'lucide-react'

export default function Home() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-accent">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold font-heading text-white">GovLearn</div>
          <div className="flex gap-4">
            <button className="px-4 py-2 text-white hover:text-white/90 transition">
              Learn More
            </button>
            <button className="px-6 py-2 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition">
              Start Learning
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-block px-4 py-2 bg-white/20 text-white border border-white/30 rounded-full mb-4 text-sm font-semibold">
              AI-Powered Learning Platform
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold font-heading text-white mb-6 leading-tight">
              Learn from Your Personal AI Avatar
            </h1>

            <p className="text-xl text-white/90 mb-8 leading-relaxed">
              Interactive, personalized training for government professionals. Our AI-driven avatars adapt to your learning pace and style, making professional development engaging and effective.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button className="px-8 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition flex items-center justify-center gap-2">
                <Play size={20} />
                Start Free Trial
              </button>
              <button className="px-8 py-3 text-white border border-white/30 rounded-lg font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2">
                <Users size={20} />
                Watch Demo
              </button>
            </div>

            <div className="flex gap-8 text-white">
              <div>
                <p className="text-3xl font-bold">10K+</p>
                <p className="text-white/80">Government Professionals</p>
              </div>
              <div>
                <p className="text-3xl font-bold">500+</p>
                <p className="text-white/80">Training Modules</p>
              </div>
              <div>
                <p className="text-3xl font-bold">95%</p>
                <p className="text-white/80">Satisfaction Rate</p>
              </div>
            </div>
          </div>

          {/* Right: Avatar Preview */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="text-white" size={64} />
              </div>
              <p className="text-white/80">Interactive Avatar Interface</p>
              <p className="text-white/60 text-sm mt-2">Real-time adaptive learning experience</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold font-heading text-white text-center mb-16">
            Why Government Professionals Choose GovLearn
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'AI-Powered Avatars',
                description: 'Intelligent avatars that adapt to your learning style and pace, providing personalized instruction.',
              },
              {
                icon: BookOpen,
                title: 'Comprehensive Modules',
                description: 'Covering policy, administration, compliance, and professional development for all government sectors.',
              },
              {
                icon: TrendingUp,
                title: 'Track Progress',
                description: 'Real-time analytics and insights showing your learning progress and skill development.',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-xl rounded-xl p-8 border border-white/20 hover:border-white/40 transition-all"
                >
                  <Icon className="text-accent mb-4" size={40} />
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-white/80">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 text-center">
          <h2 className="text-4xl font-bold font-heading text-white mb-6">
            Ready to Transform Your Learning?
          </h2>

          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of government professionals already learning with our AI avatars. Start your free trial today—no credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-white/90 transition">
              Start Learning Today
            </button>
            <button className="px-8 py-3 text-white border border-white/30 rounded-lg font-semibold hover:bg-white/10 transition">
              Schedule Demo
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-bold text-white mb-4">GovLearn</p>
              <p className="text-white/60 text-sm">AI-powered learning for government professionals.</p>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Product</p>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Company</p>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-4">Legal</p>
              <ul className="space-y-2 text-white/60 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-white/60 text-sm">
            <p>&copy; 2026 GovLearn. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Twitter</a>
              <a href="#" className="hover:text-white">LinkedIn</a>
              <a href="#" className="hover:text-white">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

