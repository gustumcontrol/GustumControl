export default function SistemaEnMantenimientoPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg, #F0F2F5)' }}
    >
      <div
        className="w-full max-w-sm rounded-lg p-8 text-center"
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Gustum Control" className="h-8 w-auto mx-auto mb-6" />
        <h1 className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>
          En mantenimiento
        </h1>
        <p className="text-sm" style={{ color: 'rgba(26,26,26,0.6)' }}>
          Estamos haciendo ajustes en el sistema. Vuelve a intentarlo en unos minutos.
        </p>
      </div>
    </div>
  );
}
