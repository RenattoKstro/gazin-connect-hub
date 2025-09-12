import { useState, useMemo } from "react";
import { CollaboratorCard, Collaborator } from "@/components/CollaboratorCard";
import { SearchBar } from "@/components/SearchBar";
import { mockCollaborators } from "@/data/mockCollaborators";
import { Users, Building2 } from "lucide-react";
import gazinLogo from "@/assets/gazin-logo.png";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCollaborators = useMemo(() => {
    if (!searchTerm) return mockCollaborators;
    
    const term = searchTerm.toLowerCase();
    return mockCollaborators.filter(collaborator =>
      collaborator.name.toLowerCase().includes(term) ||
      collaborator.position.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card shadow-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img 
              src={gazinLogo} 
              alt="Gazin Logo" 
              className="w-12 h-12 rounded-full shadow-md"
            />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-primary mb-1">
                Gazin Assis Brasil
              </h1>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4" />
                Diretório de Colaboradores
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou cargo..."
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-card px-4 py-2 rounded-lg shadow-sm border border-border/40">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {filteredCollaborators.length} colaborador{filteredCollaborators.length !== 1 ? 'es' : ''} 
              {searchTerm && ` encontrado${filteredCollaborators.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Collaborators Grid */}
        {filteredCollaborators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollaborators.map((collaborator) => (
              <CollaboratorCard
                key={collaborator.id}
                collaborator={collaborator}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-card rounded-lg shadow-card p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                Nenhum colaborador encontrado
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar sua busca ou remover os filtros.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center py-8 border-t border-border/40">
          <p className="text-muted-foreground text-sm">
            © 2024 Gazin Assis Brasil - Todos os direitos reservados
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;