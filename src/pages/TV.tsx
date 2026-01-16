import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TVImage {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
}

const TV = () => {
  const [images, setImages] = useState<TVImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const fetchTVImages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tv_images")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      // Update images and force refresh key to bust cache
      setImages(data || []);
      setRefreshKey(Date.now());
      
      // Reset to first image when new images are loaded
      if (data && data.length > 0) {
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error("Error fetching TV images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTVImages();
    
    // Set up real-time subscription to detect changes
    const channel = supabase
      .channel('tv_images_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tv_images' 
        }, 
        (payload) => {
          console.log('TV images changed:', payload);
          // Refetch images when there are changes
          fetchTVImages();
        }
      )
      .subscribe();

    // Also poll every 30 seconds as backup
    const pollInterval = setInterval(() => {
      fetchTVImages();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchTVImages]);

  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [images.length]);

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

  const currentImage = images[currentImageIndex];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <img
        key={`${currentImage.id}-${refreshKey}`}
        src={`${currentImage.image_url}?t=${refreshKey}`}
        alt={currentImage.name}
        className="max-w-full max-h-full object-contain transition-opacity duration-500"
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "contain"
        }}
      />
      
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
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