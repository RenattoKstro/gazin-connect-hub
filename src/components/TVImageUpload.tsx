import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TVImage {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
  active: boolean;
}

interface TVImageUploadProps {
  images: TVImage[];
  onImagesChange: () => void;
}

const TVImageUpload = ({ images, onImagesChange }: TVImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione apenas arquivos de imagem");
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('tv-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tv-images')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('tv_images')
        .insert({
          name: file.name,
          image_url: publicUrl,
          display_order: images.length,
          active: true
        });

      if (dbError) throw dbError;

      toast.success("Imagem enviada com sucesso!");
      onImagesChange();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('tv-images')
        .remove([fileName]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('tv_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      toast.success("Imagem removida com sucesso!");
      onImagesChange();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error("Erro ao remover imagem");
    }
  };

  const handleToggleActive = async (imageId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tv_images')
        .update({ active: !currentActive })
        .eq('id', imageId);

      if (error) throw error;

      toast.success(currentActive ? "Imagem desativada" : "Imagem ativada");
      onImagesChange();
    } catch (error) {
      console.error('Error toggling image:', error);
      toast.error("Erro ao alterar status da imagem");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Imagens da TV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <Label htmlFor="tv-image-upload" className="cursor-pointer">
            <span className="text-sm font-medium">
              Clique para selecionar uma imagem
            </span>
            <Input
              id="tv-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPG, WEBP até 20MB
          </p>
        </div>

        {uploading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Enviando imagem...</p>
          </div>
        )}

        {/* Images List */}
        {images.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Imagens ({images.length})</h3>
            <div className="grid gap-3">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    image.active ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <img
                    src={image.image_url}
                    alt={image.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <p className="text-xs text-gray-500">
                      Ordem: {index + 1} • {image.active ? 'Ativa' : 'Inativa'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(image.id, image.active)}
                    >
                      {image.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteImage(image.id, image.image_url)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TV Link Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Link da TV</h4>
          <p className="text-sm text-blue-700">
            Acesse: <strong>{window.location.origin}/tv</strong>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {images.filter(img => img.active).length > 1 
              ? `Slideshow com ${images.filter(img => img.active).length} imagens (5s cada)`
              : images.filter(img => img.active).length === 1
              ? "Imagem estática"
              : "Nenhuma imagem ativa"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TVImageUpload;