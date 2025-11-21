import { Button } from "@/components/ui/button";
import { UserPlus, RefreshCw } from "lucide-react";
import gazinLogo from "@/assets/gazin-logo-new.png";

const Cadastro = () => {
  const handleRedirect = () => {
    window.open("https://cadastrodigital.gazin.com.br/login", "_blank");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#003366] via-[#004080] to-[#002147] flex items-center justify-center p-4">
      {/* Background Logo with Fade */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <img 
          src={gazinLogo} 
          alt="Gazin Background" 
          className="w-[800px] h-auto object-contain"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <img 
            src={gazinLogo} 
            alt="Gazin Logo" 
            className="w-48 h-auto mx-auto mb-8"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Portal de Cadastro
          </h1>
          <p className="text-xl text-white/80">
            Escolha uma opção para continuar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Button
            onClick={handleRedirect}
            size="lg"
            className="h-32 flex flex-col gap-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white backdrop-blur-sm transition-all duration-300"
          >
            <UserPlus className="w-12 h-12" />
            <span className="text-xl font-semibold">Novo Cadastro</span>
          </Button>

          <Button
            onClick={handleRedirect}
            size="lg"
            className="h-32 flex flex-col gap-4 bg-white/10 hover:bg-white/20 border-2 border-white/30 text-white backdrop-blur-sm transition-all duration-300"
          >
            <RefreshCw className="w-12 h-12" />
            <span className="text-xl font-semibold">Atualizar Cadastro</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cadastro;
