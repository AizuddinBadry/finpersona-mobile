import Providers from '@/app/Providers';
import AppRoutes from '@/app/Routes';
import { PhoneShell } from '@/components/PhoneShell';

export default function App() {
  return (
    <Providers>
      <PhoneShell>
        <AppRoutes />
      </PhoneShell>
    </Providers>
  );
}
