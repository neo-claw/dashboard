export default function Footer() {
  return (
    <footer className="mt-16 pt-6 border-t border-border/50 text-center text-muted text-sm">
      <p>Built by <span className="text-accent">Trinity</span> ◈ Data from <code className="px-2 py-1 bg-bg border border-border/50 rounded text-accent text-sm">neo-claw/brain</code></p>
      <p className="mt-2 text-xs opacity-60">Dashboard • {new Date().toLocaleDateString()}</p>
    </footer>
  );
}
