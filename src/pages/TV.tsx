import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TVImage {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
}

const isVideo = (url: string, name: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
  const lowerUrl = url.split('?')[0].toLowerCase();
  const lowerName = name.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.endsWith(ext) || lowerName.endsWith(ext));
};

const TV = () => {
  const [images, setImages] = useState<TVImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTVImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tv_images")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      setImages(prevImages => {
        const newData = data || [];
        const prevIds = prevImages.map(img => img.id).sort().join(',');
        const newIds = newData.map(img => img.id).sort().join(',');
        
        if (prevIds !== newIds) {
          setRefreshKey(Date.now());
          return newData;
        }
        return prevImages;
      });
    } catch (error) {
      console.error("Error fetching TV images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTVImages();
    
    const channel = supabase
      .channel('tv_images_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tv_images' }, 
        (payload) => {
          console.log('TV images changed:', payload);
          fetchTVImages();
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchTVImages();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchTVImages]);

  const goToNext = useCallback(() => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  }, [images.length]);

  // Handle slideshow timing - for images use 20s, for videos wait until they end
  useEffect(() => {
    if (images.length <= 1) return;

    const current = images[currentImageIndex];
    if (!current) return;

    if (isVideo(current.image_url, current.name)) {
      // For videos, the onEnded handler will advance to next
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // For images, use 20 second timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(goToNext, 20000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentImageIndex, images, goToNext]);

  const handleVideoEnded = useCallback(() => {
    goToNext();
  }, [goToNext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl text-center">
          <div className="mb-4">📺</div>
          <div>Nenhuma imagem configurada</div>
        </div>
      </div>
    );
  }

  const currentItem = images[currentImageIndex];
  const isCurrentVideo = currentItem && isVideo(currentItem.image_url, currentItem.name);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      {isCurrentVideo ? (
        <video
          key={`${currentItem.id}-${refreshKey}`}
          ref={videoRef}
          src={`${currentItem.image_url}?t=${refreshKey}`}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className="transition-opacity duration-500"
          style={{
            width: "100vw",
            height: "100vh",
            objectFit: "contain"
          }}
        />
      ) : (
        <img
          key={`${currentItem.id}-${refreshKey}`}
          src={`${currentItem.image_url}?t=${refreshKey}`}
          alt={currentItem.name}
          className="max-w-full max-h-full object-contain transition-opacity duration-500"
          style={{
            width: "100vw",
            height: "100vh",
            objectFit: "contain"
          }}
        />
      )}
      
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((item, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentImageIndex ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TV;
