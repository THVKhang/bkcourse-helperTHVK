import "../styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div style={{maxWidth: 1100, margin: "0 auto", padding: 16}}>
          <header style={{display:"flex", gap:12, alignItems:"center", marginBottom: 16}}>
            <a href="/" style={{fontWeight:700, textDecoration:"none"}}>BKCourse Helper</a>
            <nav style={{display:"flex", gap:12}}>
              <a href="/import">Import</a>
              <a href="/planner">Planner</a>
              <a href="/curriculum">Curriculum</a>
              <a href="/recommendations">Recommendations</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
