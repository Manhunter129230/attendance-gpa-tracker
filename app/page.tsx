import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-2xl space-y-8 animate-reveal-up">

        {/* Badge */}
        <div className="flex justify-center">
          <span className="bg-white/5 border border-white/10 text-white/60 text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
            100% Free · Open Worldwide
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight bg-gradient-to-r from-[#f9d423] to-[#ff4e50] bg-clip-text text-transparent drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
            Attendance Vault
          </h1>
          <p className="text-white/50 text-lg font-medium max-w-lg mx-auto leading-relaxed">
            A precision-built system to keep your attendance above 75% and your GPA on track — completely free.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
          <div className="glass-panel p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-[#f9d423]">75%</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-0.5">Threshold</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-emerald-400">9</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-0.5">Slots</p>
          </div>
          <div className="glass-panel p-4 rounded-2xl text-center">
            <p className="text-2xl font-black text-rose-400">∞</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-0.5">Subjects</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link
            href="/login"
            className="cyber-btn-primary text-black font-extrabold px-10 py-3.5 rounded-xl text-sm shadow-lg animate-glow-loop uppercase tracking-wider"
          >
            Get Started Free →
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-white/20 text-xs font-mono tracking-widest uppercase">
          CS &amp; Data Science · Academic Management Matrix
        </p>

      </div>
    </main>
  );
}