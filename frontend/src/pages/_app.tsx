import type { AppProps } from 'next/app';
import Head from 'next/head';

// CRITICAL: MapLibre CSS replaces the dead Mapbox import
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>AEGIS NEXA | Tactical Command</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="bg-black text-white min-h-screen font-sans selection:bg-cyan-500/30">
        <Component {...pageProps} />
      </main>
    </>
  );
}