'use client';

import { useEffect, useState } from 'react';

interface GoogleMapsLoaderProps {
  apiKey: string;
  children: React.ReactNode;
}

export default function GoogleMapsLoader({ apiKey, children }: GoogleMapsLoaderProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof google !== 'undefined') {
      setLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      // Script already added, wait for it
      const check = setInterval(() => {
        if (typeof google !== 'undefined') {
          setLoaded(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  if (!loaded) {
    return (
      <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ height: '450px' }}>
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    );
  }

  return <>{children}</>;
}
