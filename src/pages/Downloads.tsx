import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { FileText, Download, Trash2, Plus, Image, FileIcon, Smartphone, ExternalLink, LogOut, Home } from "lucide-react";
import gazinLogo from "@/assets/gazin-logo-new.png";

interface DownloadFile {
  id: string;
  name: string;
  file_type: string;
  file_url: string | null;
  external_link: string | null;
  file_size: number | null;
  created_at: string;
}

const Downloads = () => {
  const { isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [downloads, setDownloads] = useState<DownloadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    file_type: "",
    external_link: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("downloads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar downloads",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDownloads(data || []);
    }
    setIsLoading(false);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="w-12 h-12 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-12 h-12 text-blue-500" />;
      case "apk":
        return <Smartphone className="w-12 h-12 text-green-500" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "webp":
        return <Image className="w-12 h-12 text-purple-500" />;
      default:
        return <FileIcon className="w-12 h-12 text-gray-500" />;
    }
  };

  const handleFileUpload = async () => {
    if (!formData.name || !formData.file_type) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o tipo do arquivo",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !formData.external_link) {
      toast({
        title: "Arquivo ou link necessário",
        description: "Selecione um arquivo ou adicione um link externo",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      let fileUrl = null;
      let fileSize = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("downloads")
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("downloads")
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileSize = selectedFile.size;
      }

      const { error: insertError } = await supabase.from("downloads").insert({
        name: formData.name,
        file_type: formData.file_type,
        file_url: fileUrl,
        external_link: formData.external_link || null,
        file_size: fileSize,
      });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Download adicionado com sucesso",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchDownloads();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar download",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string | null) => {
    try {
      if (fileUrl) {
        const filePath = fileUrl.split("/downloads/")[1];
        if (filePath) {
          await supabase.storage.from("downloads").remove([filePath]);
        }
      }

      const { error } = await supabase.from("downloads").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Download removido com sucesso",
      });

      fetchDownloads();
    } catch (error: any) {
      toast({
        title: "Erro ao remover download",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      file_type: "",
      external_link: "",
    });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Link externo";
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={gazinLogo} alt="Gazin Logo" className="h-12" />
              <h1 className="text-2xl font-bold">Downloads</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Início
                </Link>
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAdmin && (
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Download
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Arquivo para Download</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Arquivo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Manual do Usuário"
                    />
                  </div>

                  <div>
                    <Label htmlFor="file_type">Tipo de Arquivo *</Label>
                    <Select
                      value={formData.file_type}
                      onValueChange={(value) => setFormData({ ...formData, file_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="doc">DOC</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="apk">APK</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WEBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="file">Arquivo (até 50MB)</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.apk,.jpg,.jpeg,.png,.webp"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Para arquivos maiores de 50MB, use o link externo abaixo
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="external_link">Link Externo (opcional)</Label>
                    <Input
                      id="external_link"
                      value={formData.external_link}
                      onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <Button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? "Enviando..." : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Carregando downloads...</div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum arquivo disponível para download
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((download) => (
              <Card key={download.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    {getFileIcon(download.file_type)}
                  </div>
                  <CardTitle className="text-center">{download.name}</CardTitle>
                  <CardDescription className="text-center">
                    {download.file_type.toUpperCase()} • {formatFileSize(download.file_size)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const url = download.external_link || download.file_url;
                      if (url) window.open(url, "_blank");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {download.external_link ? "Abrir Link" : "Baixar"}
                    {download.external_link && <ExternalLink className="w-4 h-4 ml-2" />}
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleDelete(download.id, download.file_url)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-card/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Gazin Assis Brasil. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a
              href="/termos_uso_politica_privacidade.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Termos de Uso e Política de Privacidade
            </a>
            <span>•</span>
            <a
              href="mailto:contato@gazinassisbrasil.shop"
              className="hover:text-primary transition-colors"
            >
              contato@gazinassisbrasil.shop
            </a>
          </div>
          <div className="flex justify-center items-center gap-2 mt-3">
            <span>Desenvolvido por:</span>
            <a
              href="https://instagram.com/renato_alme1da"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Renato Almeida
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Downloads;
