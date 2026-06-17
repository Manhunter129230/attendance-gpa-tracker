import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 text-center">
      <header className="max-w-2xl">
        <span className="bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full border border-indigo-100">
          100% Free & Open Worldwide
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight mt-6 mb-4">
          Track Your College <span className="text-indigo-600">Attendance & Grades</span>
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
          A minimalist system built to keep your criteria above 75% while tracking your GPA, completely free of charge.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-none justify-center">
        <Link 
          href="/login" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-3 rounded-xl shadow-md transition"
        >
          Create Free Account
        </Link>
        <Link 
          href="/dashboard" 
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium px-8 py-3 rounded-xl transition"
        >
          Explore Demo Dashboard
        </Link>
      </div>
    </main>
  );
}