"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Shield, Zap, BarChart3, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-background" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              Swappers
            </span>
          </div>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              AI-Powered Vehicle Inspection
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
              Detect Car Defects
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                In Seconds
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload photos or use live camera to instantly detect scratches, dents, cracks, and other defects using advanced AI technology.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-full transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/dashboard/upload"
                className="flex items-center gap-2 px-8 py-4 bg-secondary hover:bg-secondary/80 font-semibold rounded-full transition-all border border-border hover:border-muted-foreground"
              >
                Try Upload
              </Link>
            </div>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 relative"
          >
            <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-border bg-card shadow-2xl shadow-black/50">
              <div className="p-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20">
                <div className="bg-card rounded-xl p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Preview Cards */}
                    <div className="p-6 rounded-xl bg-secondary/50 border border-border">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                        <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Live Detection</h3>
                      <p className="text-sm text-muted-foreground">Real-time defect detection using your camera</p>
                    </div>
                    <div className="p-6 rounded-xl bg-secondary/50 border border-border">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Analytics</h3>
                      <p className="text-sm text-muted-foreground">Track defect patterns and inspection history</p>
                    </div>
                    <div className="p-6 rounded-xl bg-secondary/50 border border-border">
                      <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Accurate</h3>
                      <p className="text-sm text-muted-foreground">99% detection accuracy with YOLO AI model</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Swappers?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our advanced AI technology makes vehicle inspection faster, more accurate, and easier than ever before.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Get results in under 2 seconds",
                color: "yellow"
              },
              {
                icon: Shield,
                title: "Highly Accurate",
                description: "Trained on thousands of defect images",
                color: "green"
              },
              {
                icon: Camera,
                title: "Multiple Modes",
                description: "Upload images or use live camera",
                color: "blue"
              },
              {
                icon: BarChart3,
                title: "Full Analytics",
                description: "Track and analyze inspection history",
                color: "purple"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-muted-foreground/50 transition-all hover:shadow-xl hover:shadow-black/20"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-border"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Start detecting car defects today with our powerful AI-powered inspection tool.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-full transition-all shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105"
          >
            Open Dashboard
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            <span>Swappers</span>
          </div>
          <p>© 2026 Swappers. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
