import "./globals.css";

export const metadata = {
  title: "Student Attendance Vault",
  description: "Advanced Glassmorphic Attendance Management Matrix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        
        {/* Hardware-Accelerated Ambient Vector Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]" aria-hidden="true">
          <div 
            className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-rose-500/40 blur-[90px] animate-blob-vector"
            style={{ transform: "translate3d(0,0,0)" }}
          />
          <div 
            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-500/30 blur-[100px] animate-blob-vector"
            style={{ animationDelay: "-5s", animationDuration: "25s", transform: "translate3d(0,0,0)" }}
          />
          <div 
            className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-amber-400/20 blur-[80px] animate-blob-vector"
            style={{ animationDelay: "-10s", animationDuration: "18s", transform: "translate3d(0,0,0)" }}
          />
        </div>

        {/* Dynamic Page Mounting Layer */}
        <div className="relative z-10 w-full max-w-[1000px] mx-auto px-4 md:px-6">
          {children}
        </div>

      </body>
    </html>
  );
}