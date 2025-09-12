import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import gazinLogo from "@/assets/gazin-logo.jpg";
import { createClient } from "@supabase/supabase-js";

// Inicializar Supabase (substitua com suas credenciais)
const supabase = createClient(
  "https://your-supabase-url.supabase.co",
  "your-supabase-anon-key"
);

const Auth = () => {
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Redirecionar se já autenticado
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Autenticar usuário
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Verificar papel de administrador
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .single();

      if (roleError || userRole?.role !== "admin") {
        throw new Error("Acesso restrito a administradores.");
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo, administrador.",
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Erro no login",
        description: error.message || "Falha ao autenticar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <img 
            src={gazinLogo} 
            alt="Gazin Logo" 
            className="w-20 h-auto mx-auto mb-4 rounded-lg"
          />
          <CardTitle className="text-2xl font-bold text-primary">
            Gazin Assis Brasil
          </CardTitle>
          <p className="text-muted-foreground">
            Acesso ao sistema de administradores
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full flex items-center gap-2" 
              disabled={isLoading}
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
