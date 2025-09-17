import { useState, useMemo, useEffect } from "react";
import { CollaboratorCard, Collaborator } from "@/components/CollaboratorCard";
import { SearchBar } from "@/components/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Building2, Settings, LogIn, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import gazinLogo from "@/assets/gazin-logo-new.png";

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .order('name');

    if (!error && data) {
      setCollaborators(data);
    }
    setIsLoading(false);
  };

  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  };

  const filteredCollaborators = useMemo(() => {
    if (!searchTerm) return collaborators;
    
    const normalizedTerm = normalizeText(searchTerm);
    return collaborators.filter(collaborator => {
      const normalizedName = normalizeText(collaborator.name);
      const normalizedPosition = normalizeText(collaborator.position);
      const normalizedObservations = normalizeText(collaborator.observations || '');
      
      return normalizedName.includes(normalizedTerm) ||
             normalizedPosition.includes(normalizedTerm) ||
             normalizedObservations.includes(normalizedTerm);
    });
  }, [searchTerm, collaborators]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card shadow-card sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col items-center gap-2 sm:gap-4 flex-1">
              <img 
                src={gazinLogo} 
                alt="Gazin Logo" 
                className="w-32 sm:w-40 md:w-48 h-auto rounded-lg shadow-md"
              />
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1">
                  Gazin Assis Brasil
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2 justify-center">
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  Diretório de Colaboradores
                </p>
              </div>
            </div>
            
            {/* Auth Actions - Only show for authenticated users */}
            {user && (
              <div className="flex items-center gap-2 justify-center sm:self-start">
                {isAdmin && (
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin">
                      <Settings className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  </Button>
                )}
                <Button onClick={signOut} variant="ghost" size="sm">
                  Sair
                </Button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, cargo ou observações..."
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Stats */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-card px-3 sm:px-4 py-2 rounded-lg shadow-sm border border-border/40">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {filteredCollaborators.length} colaborador{filteredCollaborators.length !== 1 ? 'es' : ''} 
              {searchTerm && ` encontrado${filteredCollaborators.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Collaborators Grid */}
        {isLoading ? (
          <div className="text-center py-8 sm:py-16">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-muted-foreground">Carregando colaboradores...</p>
          </div>
        ) : filteredCollaborators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredCollaborators.map((collaborator) => (
              <CollaboratorCard
                key={collaborator.id}
                collaborator={collaborator}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-16">
            <div className="bg-card rounded-lg shadow-card p-4 sm:p-8 max-w-md mx-auto">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-card-foreground mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tente ajustar sua busca ou remover os filtros.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 sm:mt-16 text-center py-6 sm:py-8 border-t border-border/40">
          <div className="space-y-2 sm:space-y-3 px-2">
            <p className="text-muted-foreground text-xs sm:text-sm">
              © 2025 Gazin Assis Brasil - AC - Todos os direitos reservados.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Desenvolvido por: Renato Almeida</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-2 text-muted-foreground hover:text-primary"
                onClick={() => window.open('https://instagram.com/renato_alme1da', '_blank')}
                title="@renato_alme1da"
              >
                <Instagram className="w-4 h-4" />
              </Button>
            </div>
            {!user && (
              <div className="mt-4 pt-2 border-t border-border/20">
                <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
                  <Link to="/auth">
                    <LogIn className="w-3 h-3 mr-1" />
                    Acesso Restrito
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;