import { useAuth } from '@/hooks/useAuth';

export default function Placeholder({ label }: { label: string }) {
  const { user, signOut } = useAuth();
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-2xl font-bold text-ink">{label}</div>
      <div className="text-muted">
        Phase 1 placeholder. Real screens land in Phase 2.
      </div>
      {user && (
        <div className="text-sm text-muted">Signed in as {user.email}</div>
      )}
      <button
        onClick={() => signOut()}
        className="rounded-md bg-purple px-4 py-2 text-sm font-semibold text-white shadow-purpleGlow"
      >
        Sign out
      </button>
    </div>
  );
}
