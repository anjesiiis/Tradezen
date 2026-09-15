// Botão de tema claro/escuro. Aparece duas vezes no header (um botão do
// layout mobile e outro do desktop, alternados pelo CSS) — por isso a
// classe extra vem de fora.
export default function ThemeToggle({ tema, onToggle, className = "" }){
  return (
    <button
      className={`nav-ic ${className}`}
      title={tema==="dark" ? "Mudar pro tema claro" : "Mudar pro tema escuro"}
      onClick={onToggle}
    >
      {tema==="dark"
        ? <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        : <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      }
    </button>
  );
}
