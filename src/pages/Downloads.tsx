import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  Image as ImageIcon, 
  FileDown, 
  Trash2, 
  Upload, 
  Link as LinkIcon,
  Home,
  LogOut
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import gazinLogo from "@/assets/gazin-logo-new.png";

interface Download {
  id: string;
  name: string;
  file_type: string;
  file_url: string | null;
  external_link: string | null;
  file_size: number | null;
  created_at: string;
}

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  image: ImageIcon,
  apk: FileDown,
};

const Downloads = () => {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form states
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState("");

  useEffect(() => {
    fetchDownloads();
  }, []);

  const fetchDownloads = async () => {
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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileName || !fileType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e tipo do arquivo",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile && !externalLink) {
      toast({
        title: "Arquivo ou link necessário",
        description: "Selecione um arquivo ou adicione um link externo",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let fileSize = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${Date.now()}_${fileName}.${fileExt}`;

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

      // Insert into database
      const { error: insertError } = await supabase.from("downloads").insert({
        name: fileName,
        file_type: fileType,
        file_url: fileUrl,
        external_link: externalLink || null,
        file_size: fileSize,
      });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso!",
        description: "Download adicionado com sucesso",
      });

      // Reset form
      setFileName("");
      setFileType("");
      setSelectedFile(null);
      setExternalLink("");
      setDialogOpen(false);
      fetchDownloads();
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar download",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string | null) => {
    try {
      // Delete from storage if file exists
      if (fileUrl) {
        const filePath = fileUrl.split("/downloads/")[1];
        if (filePath) {
          await supabase.storage.from("downloads").remove([filePath]);
        }
      }

      // Delete from database
      const { error } = await supabase.from("downloads").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
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

  const getFileIcon = (fileType: string) => {
    const Icon = fileTypeIcons[fileType.toLowerCase()] || FileDown;
    return <Icon className="w-12 h-12 text-primary" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Link externo";
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  const handleDownloadClick = (download: Download) => {
    const url = download.file_url || download.external_link;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={gazinLogo} alt="Gazin Logo" className="h-12" />
            <h1 className="text-2xl font-bold">Downloads</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Home className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Admin Upload Section */}
        {isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Adicionar Download</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Novo Download
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Adicionar Download</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <Label htmlFor="fileName">Nome do Arquivo</Label>
                      <Input
                        id="fileName"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Ex: Manual de Instruções"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="fileType">Tipo de Arquivo</Label>
                      <Select value={fileType} onValueChange={setFileType} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="doc">DOC</SelectItem>
                          <SelectItem value="docx">DOCX</SelectItem>
                          <SelectItem value="image">Imagem</SelectItem>
                          <SelectItem value="apk">APK</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="file">
                        Arquivo (até 50MB)
                      </Label>
                      <Input
                        id="file"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.apk"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Para arquivos maiores, use o link externo abaixo
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="externalLink">Link Externo (opcional)</Label>
                      <Input
                        id="externalLink"
                        type="url"
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={uploading}>
                      {uploading ? "Enviando..." : "Adicionar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Downloads Grid */}
        {isLoading ? (
          <div className="text-center py-12">Carregando downloads...</div>
        ) : downloads.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileDown className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum download disponível</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((download) => (
              <Card key={download.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {getFileIcon(download.file_type)}
                    <div className="space-y-1 w-full">
                      <h3 className="font-semibold text-lg">{download.name}</h3>
                      <p className="text-sm text-muted-foreground uppercase">
                        {download.file_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(download.file_size)}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <Button
                        onClick={() => handleDownloadClick(download)}
                        className="flex-1"
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(download.id, download.file_url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Downloads;
