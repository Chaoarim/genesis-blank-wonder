import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

const CACHE_KEY = 'app_offline_cache';

function cacheRecentData() {
  try {
    // Cache current route and timestamp
    const cached = {
      timestamp: new Date().toISOString(),
      route: window.location.pathname,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Storage full or unavailable
  }
}

export const OfflineIndicator = () => {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setOffline(true);
      cacheRecentData();
    };
    const goOnline = () => {
      setOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Periodically cache data while online
    const cacheInterval = setInterval(() => {
      if (navigator.onLine) cacheRecentData();
    }, 60_000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(cacheInterval);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-green-500 text-white text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 animate-in slide-in-from-top">
        <Wifi className="w-4 h-4" />
        Conexão restabelecida!
      </div>
    );
  }

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-yellow-950 text-center text-sm font-medium py-2 px-4 flex items-center justify-center gap-2 animate-in slide-in-from-top">
      <WifiOff className="w-4 h-4" />
      Sem conexão — os dados exibidos podem estar desatualizados.
    </div>
  );
};
