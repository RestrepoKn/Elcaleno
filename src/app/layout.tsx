import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Elcaleno",
  description: "Sistema fullstack TypeScript con motor de datos JSON.",
};

// Aplica el tema guardado (botón sol/luna) antes de dibujar la página, para que no parpadee en claro.
const SCRIPT_TEMA = `try{if(localStorage.getItem("tema")==="oscuro")document.documentElement.dataset.theme="oscuro"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // El script cambia data-theme en el navegador antes de hidratar: es intencional.
    <html lang="es" className={`${spaceGrotesk.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        {children}
      </body>
    </html>
  );
}
