import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import type { Variants } from 'framer-motion';

const LandingPage = () => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const features = [
    {
      title: "Real-time bidding",
      description: "Socket.IO powered auction flow with instant updates, timer sync, and live bidder pressure."
    },
    {
      title: "Role-based access",
      description: "Dedicated Admin and Team Owner dashboards with secure authentication and permissions."
    },
    {
      title: "Smart budget control",
      description: "Live purse tracking, squad rules, and bid validation built for a real auction experience."
    },
    {
      title: "Broadcast-style UI",
      description: "Premium visuals with live stats, player cards, auction feed, and TV-style presentation."
    }
  ];

  const stats = [
    { label: 'Live teams', value: '10+' },
    { label: 'Auction timer', value: '30s' },
    { label: 'Budget rules', value: 'Strict' },
    { label: 'Real-time sync', value: 'Socket.IO' },
  ];

  return (
    <main ref={targetRef} className="relative min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.20),_transparent_20%),radial-gradient(circle_at_top_right,_rgba(212,175,55,0.16),_transparent_22%),linear-gradient(180deg,_#fffdf8_0%,_#f8f3e5_45%,_#fffef9_100%)] font-sans text-slate-900">
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center bg-fixed opacity-[0.05] mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#facc15]/10 via-transparent to-[#d4af37]/10"></div>

        {/* Cricket stadium illustration */}
        <div className="absolute right-[-10rem] top-16 hidden h-[34rem] w-[34rem] xl:block">
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, 1, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,_#5d8f3d_0%,_#4c7a32_34%,_#2f5b1f_58%,_#183413_78%,_transparent_79%)] opacity-90 shadow-[0_0_120px_rgba(212,175,55,0.22)]"></div>
            <div className="absolute inset-[1.15rem] rounded-full border-[18px] border-[#f4e7c0] bg-[radial-gradient(circle_at_center,_#5fa34b_0%,_#4d8d3f_45%,_#38692d_78%,_#2a4f23_100%)] shadow-[inset_0_0_0_6px_rgba(255,250,240,0.5)]"></div>
            <div className="absolute inset-[4.4rem] rounded-full border-[2px] border-white/65"></div>
            <div className="absolute inset-[7rem] rounded-full border border-white/55"></div>
            <div className="absolute left-1/2 top-1/2 h-[15rem] w-[6rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[#d9bd7b] shadow-[0_0_0_8px_rgba(255,248,234,0.18)]"></div>
            <div className="absolute left-1/2 top-1/2 h-[11rem] w-[2.2rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f4e7c0]/90"></div>
            <div className="absolute left-6 top-6 h-10 w-10 rounded-full bg-[#fff6db] shadow-[0_0_30px_rgba(255,248,220,0.95)]"></div>
            <div className="absolute right-8 top-8 h-10 w-10 rounded-full bg-[#fff6db] shadow-[0_0_30px_rgba(255,248,220,0.95)]"></div>
            <div className="absolute left-3 top-2 h-28 w-28 rounded-full border border-[#f4e7c0] opacity-80"></div>
            <div className="absolute right-2 top-0 h-32 w-32 rounded-full border border-[#f4e7c0] opacity-70"></div>
            <div className="absolute left-10 top-32 h-12 w-2 rounded-full bg-[#f4e7c0] shadow-[0_0_18px_rgba(255,248,220,0.8)]"></div>
            <div className="absolute right-12 top-24 h-14 w-2 rounded-full bg-[#f4e7c0] shadow-[0_0_18px_rgba(255,248,220,0.8)]"></div>
            <div className="absolute left-9 top-28 h-3 w-16 rounded-full bg-[#fff6db] opacity-90 blur-sm"></div>
            <div className="absolute right-7 top-20 h-3 w-16 rounded-full bg-[#fff6db] opacity-90 blur-sm"></div>
          </motion.div>
        </div>
        
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#facc15]/25 blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -right-20 bottom-20 h-96 w-96 rounded-full bg-[#d4af37]/18 blur-[120px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-white/65"></div>
      </div>

      {/* Animated Particles Grid */}
      <div className="fixed inset-0 -z-5 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#93c5fd2e_1px,transparent_1px),linear-gradient(to_bottom,#93c5fd2e_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
      </div>

      <div className="relative z-10">
        {/* Parallax Hero Section */}
        <motion.div style={{ y, opacity }} className="relative">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 md:gap-16 md:px-10 lg:px-12">
            
            {/* Navigation */}
            <motion.nav 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1d4ed8] via-[#f4e7c0] to-[#d4af37] shadow-lg shadow-amber-200/60"></div>
                <h1 className="bg-gradient-to-r from-[#0f172a] via-[#b48a1e] to-[#d4af37] bg-clip-text font-serif text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                  IPL Auction Pro
                </h1>
              </div>
              <nav className="flex items-center gap-3 text-sm font-semibold">
                <Link 
                  className="group relative overflow-hidden rounded-full border border-[#d6c08a] bg-[#fffaf0]/90 px-5 py-2.5 text-slate-800 transition-all duration-300 hover:border-[#c8a646] hover:shadow-lg hover:shadow-amber-200/40"
                  to="/login"
                >
                  <span className="relative z-10">Login</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 bg-gradient-to-r from-[#fff7df] to-[#f4e7c0]"></div>
                </Link>
                <Link 
                  className="relative overflow-hidden rounded-full bg-gradient-to-r from-[#d4af37] via-[#f4e7c0] to-[#fffaf0] px-6 py-2.5 text-slate-900 shadow-lg shadow-amber-200/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                  to="/register"
                >
                  <span className="relative z-10 font-bold">Start Auction Setup →</span>
                </Link>
              </nav>
            </motion.nav>

            {/* Hero Content */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid gap-12 rounded-3xl border border-[#eadfbf] bg-[linear-gradient(180deg,_rgba(255,255,250,0.92),_rgba(250,243,225,0.88))] p-8 shadow-[0_24px_80px_rgba(92,64,17,0.08)] backdrop-blur-xl md:grid-cols-[1.4fr_1fr] md:p-12 lg:gap-16"
            >
              <div className="space-y-8">
                <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#fff8e3] px-4 py-1.5 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4af37] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#d4af37]"></span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a97e12]">
                    Live Auction Platform
                  </span>
                </motion.div>
                
                <motion.h2 variants={fadeInUp} className="font-serif text-4xl font-bold leading-tight text-slate-900 sm:text-5xl md:text-7xl lg:text-8xl">
                  Run Live
                  <span className="block bg-gradient-to-r from-[#b48a1e] via-[#d4af37] to-[#f4e7c0] bg-clip-text text-transparent animate-gradient">
                    Bidding Battles.
                  </span>
                </motion.h2>
                
                <motion.p variants={fadeInUp} className="max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                  From player pool management to real-time bid wars, experience the ultimate full-stack IPL auction simulation with production-grade architecture.
                </motion.p>
                
                <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
                  <Link 
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f4e7c0] to-[#fffaf0] px-8 py-4 text-sm font-bold text-slate-900 shadow-lg shadow-amber-200/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                    to="/register"
                  >
                    <span className="relative z-10">Register Team Owner →</span>
                  </Link>
                  <Link 
                    className="rounded-xl border border-[#d6c08a] bg-[#fffaf0] px-8 py-4 text-sm font-semibold text-slate-800 transition-all duration-300 hover:border-[#c8a646] hover:bg-[#fffef7] hover:shadow-lg"
                    to="/login"
                  >
                    Existing User Login
                  </Link>
                </motion.div>

                {/* Live Stats Badge */}
                <motion.div 
                  variants={fadeInUp}
                  className="flex items-center gap-6 pt-4"
                >
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-[#fffaf0] bg-gradient-to-br from-[#c8a646] to-[#f4e7c0] shadow-sm"></div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-[#b48a1e]">500+</span>
                    <span className="text-slate-600"> active users</span>
                    <div className="flex gap-1 text-xs text-slate-500">
                      <span>⚡</span> Live auction in progress
                    </div>
                  </div>
                </motion.div>

                <div className="grid gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-[#eadfbf] bg-[#fffdf5] p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Grid */}
              <motion.div variants={staggerContainer} className="grid gap-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="group relative overflow-hidden rounded-2xl border border-[#eadfbf] bg-[linear-gradient(180deg,_#fffef8,_#fff7df)] p-5 backdrop-blur-sm transition-all duration-300 hover:border-[#c8a646] hover:bg-white"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#fff9e8]/0 via-[#d4af37]/8 to-[#fff1cc]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">{feature.title}</h3>
                    <p className="text-sm leading-7 text-slate-600">{feature.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* How It Works Section */}
        <motion.section 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:px-10 md:py-20 lg:px-12"
        >
          <div className="text-center mb-12">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#b48a1e]">Simple Process</span>
            <h3 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">How IPL Auction Pro Works</h3>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">Get started in minutes and run your dream auction</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Setup Auction", desc: "Configure teams, player pool, and budget limits", icon: "⚙️" },
              { step: "02", title: "Start Bidding", desc: "Real-time bidding war with live updates", icon: "🔨" },
              { step: "03", title: "Build Squad", desc: "Track purchases and manage your dream team", icon: "🏆" }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="relative rounded-2xl border border-[#eadfbf] bg-[linear-gradient(180deg,_#fffdf7,_#fff8e8)] p-8 text-center shadow-sm backdrop-blur-sm"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#b48a1e] via-[#d4af37] to-[#f4e7c0] px-4 py-1 text-sm font-bold text-slate-900">
                  {item.step}
                </div>
                <div className="mt-6 text-4xl">{item.icon}</div>
                <h4 className="mt-4 text-xl font-bold text-slate-900">{item.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:px-10 md:pb-20 lg:px-12"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#eadfbf] bg-[linear-gradient(135deg,_#fffdf5,_#fff4d8_55%,_#fffdf7)] p-8 text-center shadow-sm backdrop-blur-sm md:p-12">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
            <h3 className="relative text-2xl font-bold text-slate-900 md:text-3xl">Ready to experience the thrill of IPL auction?</h3>
            <p className="relative mx-auto mt-2 max-w-md text-slate-600">Join thousands of cricket enthusiasts in building championship-winning squads.</p>
            <Link
              to="/register"
              className="relative mt-6 inline-block rounded-full bg-gradient-to-r from-[#b48a1e] via-[#d4af37] to-[#fff7df] px-8 py-3 font-bold text-slate-900 shadow-lg shadow-amber-200/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              Start Your Auction Now →
            </Link>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
};

export default LandingPage;