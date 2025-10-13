import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Upload, LogOut, Swords } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import TVImageUpload from "@/components/TVImageUpload";
import gazinLogo from "@/assets/gazin-logo-new.png";

interface Collaborator {
  id: string;
  name: string;
  position: string;
  phone: string | null;
  instagram: string | null;
  observations: string | null;
  photo_url: string | null;
  on_vacation: boolean;
  pinned: boolean;
  status: string | null;
}

interface TVImage {
  id: string;
  name: string;
  image_url: string;
  display_order: number;
  active: boolean;
}

const Admin = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [tvImages, setTvImages] = useState<TVImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    phone: "",
    instagram: "",
    observations: "",
    on_vacation: false,
    pinned: false,
    status: null as string | null,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Redirect if not admin
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchCollaborators();
    fetchTVImages();
  }, []);

  const fetchCollaborators = async () => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('pinned', { ascending: false })
      .order('name');

    if (error) {
      toast({
        title: "Erro ao carregar colaboradores",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCollaborators(data || []);
    }
    setIsLoading(false);
  };

  const fetchTVImages = async () => {
    const { data, error } = await supabase
      .from('tv_images')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar imagens da TV",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTvImages(data || []);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('collaborator-photos')
      .upload(fileName, file);

    if (error) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('collaborator-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let photoUrl = editingCollaborator?.photo_url || null;

    if (selectedFile) {
      photoUrl = await uploadPhoto(selectedFile);
      if (!photoUrl) {
        setIsLoading(false);
        return;
      }
    }

    const collaboratorData = {
      ...formData,
      phone: formData.phone || null,
      instagram: formData.instagram || null,
      observations: formData.observations || null,
      photo_url: photoUrl,
    };

    let error;
    if (editingCollaborator) {
      const { error: updateError } = await supabase
        .from('collaborators')
        .update(collaboratorData)
        .eq('id', editingCollaborator.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('collaborators')
        .insert([collaboratorData]);
      error = insertError;
    }

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: editingCollaborator ? "Colaborador atualizado!" : "Colaborador adicionado!",
        description: "Operação realizada com sucesso.",
      });
      setDialogOpen(false);
      resetForm();
      fetchCollaborators();
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return;

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Colaborador excluído!",
        description: "Operação realizada com sucesso.",
      });
      fetchCollaborators();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      position: "",
      phone: "",
      instagram: "",
      observations: "",
      on_vacation: false,
      pinned: false,
      status: null,
    });
    setEditingCollaborator(null);
    setSelectedFile(null);
  };

  const openEditDialog = (collaborator: Collaborator) => {
    setFormData({
      name: collaborator.name,
      position: collaborator.position,
      phone: collaborator.phone || "",
      instagram: collaborator.instagram || "",
      observations: collaborator.observations || "",
      on_vacation: collaborator.on_vacation,
      pinned: collaborator.pinned,
      status: collaborator.status,
    });
    setEditingCollaborator(collaborator);
    setDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card shadow-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-4 flex-1">
              <img 
                src={gazinLogo} 
                alt="Gazin Logo" 
                className="w-20 h-auto rounded-lg shadow-md"
              />
              <div className="text-center">
                <h1 className="text-2xl font-bold text-primary">
                  Painel Administrativo
                </h1>
                <p className="text-muted-foreground text-sm">
                  Gerenciar Colaboradores
                </p>
              </div>
            </div>
            <div className="flex gap-2 self-start">
              <Button onClick={() => navigate('/duelo')} variant="default" size="sm">
                <Swords className="w-4 h-4 mr-2" />
                Duelo
              </Button>
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            Colaboradores ({collaborators.length})
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingCollaborator ? "Editar Colaborador" : "Novo Colaborador"}
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 pr-2">
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo/Função *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone/Ramal</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(67) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>
                 <div className="space-y-2">
                   <Label htmlFor="observations">Observações</Label>
                   <Textarea
                     id="observations"
                     value={formData.observations}
                     onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                     placeholder="Exemplo:&#10;* CAIXA&#10;* ENVIO DE PIX&#10;* ATENDIMENTO AO CLIENTE"
                     rows={4}
                   />
                   <p className="text-xs text-muted-foreground">
                     Use * para criar tópicos e quebre linhas para organizar as funções
                   </p>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="status">Status/Setor</Label>
                   <Select
                     value={formData.status || ""}
                     onValueChange={(value) => setFormData({ ...formData, status: value || null })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione um status (opcional)" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Recebimento">Recebimento</SelectItem>
                       <SelectItem value="Renegociação">Renegociação</SelectItem>
                       <SelectItem value="Cobranças">Cobranças</SelectItem>
                       <SelectItem value="Vendas">Vendas</SelectItem>
                       <SelectItem value="Entregas">Entregas</SelectItem>
                       <SelectItem value="Montagem">Montagem</SelectItem>
                       <SelectItem value="Gerencia">Gerencia</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="vacation"
                    checked={formData.on_vacation}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, on_vacation: checked as boolean })
                    }
                  />
                  <Label 
                    htmlFor="vacation" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Colaborador em férias
                  </Label>
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="pinned"
                    checked={formData.pinned}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, pinned: checked as boolean })
                    }
                  />
                  <Label 
                    htmlFor="pinned" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Fixar no topo
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Foto de Perfil</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
                  <DialogFooter className="mt-6">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* TV Images Section */}
        <div className="mb-8">
          <TVImageUpload 
            images={tvImages} 
            onImagesChange={fetchTVImages} 
          />
        </div>

        {/* Collaborators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collaborators.map((collaborator) => (
            <Card key={collaborator.id} className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={collaborator.photo_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(collaborator.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base text-card-foreground">
                        {collaborator.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {collaborator.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(collaborator)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(collaborator.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {collaborator.phone && (
                  <p className="text-sm text-muted-foreground mb-1">
                    📞 {collaborator.phone}
                  </p>
                )}
                {collaborator.instagram && (
                  <p className="text-sm text-muted-foreground mb-1">
                    📱 {collaborator.instagram}
                  </p>
                )}
                {collaborator.observations && (
                  <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded whitespace-pre-wrap">
                    {collaborator.observations}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Admin;