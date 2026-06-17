export default function Grades() {
  // Mock ledger data for visual prototyping
  const academicRecords = [
    { code: "MATH301", name: "Advanced Calculus", credits: 4, gradePoint: 9.0, marks: "88/100" },
    { code: "CS202", name: "Data Structures", credits: 3, gradePoint: 8.0, marks: "79/100" },
  ];

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Academic Ledger</h1>
        <p className="text-slate-500">Calculate your semester grade distributions and running CGPA.</p>
      </header>

      {/* Aggregate Metrics Header Row */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-center">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Current Semester GPA</span>
          <span className="text-3xl font-black text-indigo-600">8.57</span>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-center">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Cumulative CGPA</span>
          <span className="text-3xl font-black text-slate-800">8.42</span>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-center col-span-2 md:col-span-1">
          <span className="text-xs font-semibold uppercase text-slate-400 block mb-1">Total Earned Credits</span>
          <span className="text-3xl font-black text-emerald-600">7 Credits</span>
        </div>
      </section>

      {/* Grade Ledger Table Card */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-700">Enrolled Course Scores</h2>
          <button className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition">
            + Add New Score
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-100">
                <th className="p-4">Course Info</th>
                <th className="p-4 text-center">Credits</th>
                <th className="p-4 text-center">Marks</th>
                <th className="p-4 text-center">Grade Point</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 text-slate-600">
              {academicRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{record.name}</div>
                    <div className="text-xs text-slate-400">{record.code}</div>
                  </td>
                  <td className="p-4 text-center font-medium">{record.credits}</td>
                  <td className="p-4 text-center">{record.marks}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md font-bold text-xs">
                      {record.gradePoint.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}