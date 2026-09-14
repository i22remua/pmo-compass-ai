import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { themeScript } from '@/lib/theme-init';

export const metadata: Metadata = {
  title: {
    default: 'PMO Compass AI · From project noise to executive clarity',
    template: '%s · PMO Compass AI',
  },
  description:
    'Transforma notas de proyectos en documentación profesional. Un workspace bilingüe para Project Managers, creado por Álvaro Redondo Muñoz.',
  applicationName: 'PMO Compass AI',
  authors: [{ name: 'Álvaro Redondo Muñoz' }],
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
