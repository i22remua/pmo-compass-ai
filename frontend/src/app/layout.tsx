import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { themeScript } from '@/lib/theme-init';

export const metadata: Metadata = {
  metadataBase: new URL('https://pmo-compass-ai.vercel.app'),
  title: {
    default: 'PMO Compass AI · Your project, in order.',
    template: '%s · PMO Compass AI',
  },
  description:
    'Transforma notas de proyectos en documentación profesional. Un workspace bilingüe para Project Managers, creado por Álvaro Redondo Muñoz.',
  applicationName: 'PMO Compass AI',
  authors: [{ name: 'Álvaro Redondo Muñoz' }],
  openGraph: {
    type: 'website',
    siteName: 'PMO Compass AI',
    title: 'PMO Compass AI · AI-powered PMO workspace',
    description:
      'Documentación PMO, análisis de riesgos y Copilot. Español / English. Explora sin cuenta y guarda tus proyectos con login.',
    locale: 'es_ES',
    alternateLocale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PMO Compass AI · AI-powered PMO workspace',
    description: 'PMO documents, risk intelligence and a focused Copilot. Español / English.',
    images: ['/opengraph-image'],
  },
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
