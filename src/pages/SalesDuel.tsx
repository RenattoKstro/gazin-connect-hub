import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Settings, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Member {
  name: string;
  value: number;
}

interface CampaignData {
  id: string;
  campaign_name: string;
  goal_value: number;
  team_a_name: string;
  team_b_name: string;
  team_a_logo?: string;
  team_b_logo?: string;
  team_a_members: Member[];
  team_b_members: Member[];
}

const SalesDuel = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [campaignName, setCampaignName] = useState("");
  const [goalValue, setGoalValue] = useState(0);
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [teamALogo, setTeamALogo] = useState("");
  const [teamBLogo, setTeamBLogo] = useState("");
  const [teamAMembers, setTeamAMembers] = useState<Member[]>([]);
  const [teamBMembers, setTeamBMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchCampaign();
  }, []);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("sales_duel")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const campaignData: CampaignData = {
          id: data.id,
          campaign_name: data.campaign_name,
          goal_value: Number(data.goal_value),
          team_a_name: data.team_a_name,
          team_b_name: data.team_b_name,
          team_a_logo: data.team_a_logo,
          team_b_logo: data.team_b_logo,
          team_a_members: (data.team_a_members as unknown as Member[]) || [],
          team_b_members: (data.team_b_members as unknown as Member[]) || [],
        };
        setCampaign(campaignData);
        setCampaignName(campaignData.campaign_name);
        setGoalValue(campaignData.goal_value);
        setTeamAName(campaignData.team_a_name);
        setTeamBName(campaignData.team_b_name);
        setTeamALogo(campaignData.team_a_logo || "");
        setTeamBLogo(campaignData.team_b_logo || "");
        setTeamAMembers(campaignData.team_a_members);
        setTeamBMembers(campaignData.team_b_members);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Erro ao carregar campanha");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File, team: "A" | "B") => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team_${team.toLowerCase()}_logo_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('tv-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tv-images')
        .getPublicUrl(filePath);

      if (team === "A") {
        setTeamALogo(publicUrl);
      } else {
        setTeamBLogo(publicUrl);
      }

      toast.success(`Logo da Equipe ${team} carregada com sucesso!`);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao carregar logo");
    }
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error("Apenas administradores podem salvar configurações");
      return;
    }

    try {
      if (campaign) {
        const { error } = await supabase
          .from("sales_duel")
          .update({
            campaign_name: campaignName,
            goal_value: goalValue,
            team_a_name: teamAName,
            team_b_name: teamBName,
            team_a_logo: teamALogo,
            team_b_logo: teamBLogo,
            team_a_members: teamAMembers as unknown as any,
            team_b_members: teamBMembers as unknown as any,
          })
          .eq("id", campaign.id);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      setConfigOpen(false);
      fetchCampaign();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const addMember = (team: "A" | "B") => {
    const newMember = { name: "", value: 0 };
    if (team === "A") {
      setTeamAMembers([...teamAMembers, newMember]);
    } else {
      setTeamBMembers([...teamBMembers, newMember]);
    }
  };

  const removeMember = (team: "A" | "B", index: number) => {
    if (team === "A") {
      setTeamAMembers(teamAMembers.filter((_, i) => i !== index));
    } else {
      setTeamBMembers(teamBMembers.filter((_, i) => i !== index));
    }
  };

  const updateMember = (team: "A" | "B", index: number, field: keyof Member, value: string | number) => {
    if (team === "A") {
      const updated = [...teamAMembers];
      updated[index] = { ...updated[index], [field]: value };
      setTeamAMembers(updated);
    } else {
      const updated = [...teamBMembers];
      updated[index] = { ...updated[index], [field]: value };
      setTeamBMembers(updated);
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      toast.error("Apenas administradores podem importar dados");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert sheet to JSON to access data more easily
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Mapa de valores importados por nome
      const valoresImportados = new Map<string, number>();

      // Processar linhas 1 a 10 (índices 1 a 10, pois 0 é o cabeçalho)
      for (let i = 1; i <= 10; i++) {
        const row = jsonData[i] as any[];
        if (row && row[3]) { // Coluna D (índice 3)
          // Extrair nome da coluna D (formato: "ID - NOME - Tipo")
          const fullName = String(row[3]).trim();
          const nameParts = fullName.split(' - ');
          let extractedName = nameParts.length > 1 ? nameParts[1].trim().toUpperCase() : fullName.toUpperCase();
          
          // Extrair valor da coluna AX "vendaservicos" (índice 49)
          const value = row[49] ? parseFloat(String(row[49]).replace(',', '.')) : 0;
          
          // Salvar o nome completo extraído do Excel
          valoresImportados.set(extractedName, value);
        }
      }

      // Atualizar valores das equipes mantendo a estrutura atual
      const updatedTeamA = teamAMembers.map(member => {
        const nomeMembro = member.name.toUpperCase().trim();
        let valorEncontrado = valoresImportados.get(nomeMembro);
        
        // Tentar encontrar por correspondência parcial se não encontrou exato
        if (valorEncontrado === undefined) {
          for (const [nomeExcel, valor] of valoresImportados.entries()) {
            // Verificar se o nome do Excel contém o nome do membro ou vice-versa
            // Também verifica palavras-chave principais
            const palavrasMembro = nomeMembro.split(' ').filter(p => p.length > 2);
            const palavrasExcel = nomeExcel.split(' ').filter(p => p.length > 2);
            
            // Verifica se há correspondência de palavras significativas
            const hasMatch = palavrasMembro.some(pm => 
              palavrasExcel.some(pe => pe.includes(pm) || pm.includes(pe))
            );
            
            if (hasMatch) {
              valorEncontrado = valor;
              console.log(`Match encontrado: "${nomeMembro}" <-> "${nomeExcel}" = R$ ${valor}`);
              break;
            }
          }
        }
        
        return {
          ...member,
          value: valorEncontrado !== undefined ? valorEncontrado : member.value
        };
      });

      const updatedTeamB = teamBMembers.map(member => {
        const nomeMembro = member.name.toUpperCase().trim();
        let valorEncontrado = valoresImportados.get(nomeMembro);
        
        // Tentar encontrar por correspondência parcial se não encontrou exato
        if (valorEncontrado === undefined) {
          for (const [nomeExcel, valor] of valoresImportados.entries()) {
            // Verificar se o nome do Excel contém o nome do membro ou vice-versa
            // Também verifica palavras-chave principais
            const palavrasMembro = nomeMembro.split(' ').filter(p => p.length > 2);
            const palavrasExcel = nomeExcel.split(' ').filter(p => p.length > 2);
            
            // Verifica se há correspondência de palavras significativas
            const hasMatch = palavrasMembro.some(pm => 
              palavrasExcel.some(pe => pe.includes(pm) || pm.includes(pe))
            );
            
            if (hasMatch) {
              valorEncontrado = valor;
              console.log(`Match encontrado: "${nomeMembro}" <-> "${nomeExcel}" = R$ ${valor}`);
              break;
            }
          }
        }
        
        return {
          ...member,
          value: valorEncontrado !== undefined ? valorEncontrado : member.value
        };
      });

      setTeamAMembers(updatedTeamA);
      setTeamBMembers(updatedTeamB);

      // Salvar no banco de dados
      if (campaign) {
        const { error } = await supabase
          .from("sales_duel")
          .update({
            team_a_members: updatedTeamA as unknown as any,
            team_b_members: updatedTeamB as unknown as any,
          })
          .eq("id", campaign.id);

        if (error) throw error;
      }
      
      toast.success(`Valores importados e atualizados com sucesso!`);
      setImportOpen(false);
      fetchCampaign(); // Recarregar dados
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error importing Excel:", error);
      toast.error("Erro ao importar planilha. Verifique o formato do arquivo.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center">
        <p className="text-lg">Carregando...</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center">
        <p className="text-lg">Nenhuma campanha encontrada</p>
      </div>
    );
  }

  const teamATotal = campaign.team_a_members.reduce((sum, m) => sum + m.value, 0);
  const teamBTotal = campaign.team_b_members.reduce((sum, m) => sum + m.value, 0);
  const totalSales = teamATotal + teamBTotal;
  const progress = Math.min((totalSales / campaign.goal_value) * 100, 100);
  const isActive = totalSales >= campaign.goal_value;
  const isTeamAWinning = teamATotal > teamBTotal;
  const teamDifference = Math.abs(teamATotal - teamBTotal);

  // Sort team members by value (descending)
  const sortedTeamA = [...campaign.team_a_members].sort((a, b) => b.value - a.value);
  const sortedTeamB = [...campaign.team_b_members].sort((a, b) => b.value - a.value);

  const allMembers = [
    ...campaign.team_a_members.map(m => ({ ...m, team: campaign.team_a_name })),
    ...campaign.team_b_members.map(m => ({ ...m, team: campaign.team_b_name }))
  ].sort((a, b) => b.value - a.value);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            {campaign.campaign_name}
          </h1>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar do CCG
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Importar Planilha do CCG</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecione a planilha Excel com os dados dos vendedores.
                      <br />
                      • Nomes devem estar na coluna D (D2:D11)
                      <br />
                      • Valores devem estar na coluna AX (AX2:AX11)
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleImportExcel}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuração
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuração da Campanha</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Campanha</Label>
                        <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Meta do Gatilho (R$)</Label>
                        <Input type="number" value={goalValue} onChange={(e) => setGoalValue(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <Label>Nome da Equipe A</Label>
                          <Input value={teamAName} onChange={(e) => setTeamAName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Logo da Equipe A</Label>
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file, "A");
                            }}
                          />
                          {teamALogo && (
                            <div className="mt-2">
                              <img src={teamALogo} alt="Logo Equipe A" className="h-16 object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label>Nome da Equipe B</Label>
                          <Input value={teamBName} onChange={(e) => setTeamBName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Logo da Equipe B</Label>
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file, "B");
                            }}
                          />
                          {teamBLogo && (
                            <div className="mt-2">
                              <img src={teamBLogo} alt="Logo Equipe B" className="h-16 object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Integrantes da Equipe A</Label>
                          <Button type="button" size="sm" onClick={() => addMember("A")}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {teamAMembers.map((member, idx) => (
                            <div key={idx} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label className="text-xs">Nome</Label>
                                <Input
                                  value={member.name}
                                  onChange={(e) => updateMember("A", idx, "name", e.target.value)}
                                  placeholder="Nome do vendedor"
                                />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs">Valor (R$)</Label>
                                <Input
                                  type="number"
                                  value={member.value}
                                  onChange={(e) => updateMember("A", idx, "value", Number(e.target.value))}
                                  placeholder="0"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeMember("A", idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label>Integrantes da Equipe B</Label>
                          <Button type="button" size="sm" onClick={() => addMember("B")}>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {teamBMembers.map((member, idx) => (
                            <div key={idx} className="flex gap-2 items-end">
                              <div className="flex-1">
                                <Label className="text-xs">Nome</Label>
                                <Input
                                  value={member.name}
                                  onChange={(e) => updateMember("B", idx, "name", e.target.value)}
                                  placeholder="Nome do vendedor"
                                />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs">Valor (R$)</Label>
                                <Input
                                  type="number"
                                  value={member.value}
                                  onChange={(e) => updateMember("B", idx, "value", Number(e.target.value))}
                                  placeholder="0"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeMember("B", idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleSave} className="w-full">
                      Salvar Configurações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Campaign Goal */}
        <section className="mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold mb-3">Meta da Campanha</h2>
                <p className="text-5xl font-bold text-primary mb-2">
                  R$ {campaign.goal_value.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className={`text-lg font-semibold px-4 py-2 rounded-full ${
                isActive ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              }`}>
                {isActive ? "✅ Campanha Ativa" : "❌ Aguardando Gatilho"}
              </div>
            </div>
            <div className="space-y-3">
              <Progress value={progress} className="h-6" />
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <p className="text-3xl font-bold">
                    R$ {totalSales.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className="text-3xl font-bold text-orange-500">
                    R$ {Math.max(0, campaign.goal_value - totalSales).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center pt-2">
                Progresso: {progress.toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        {/* Teams */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Equipes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className={`bg-card rounded-lg p-6 shadow-lg border-2 transition-all ${
              isTeamAWinning ? "border-yellow-500 shadow-yellow-500/50 ring-2 ring-yellow-500/20" : "border-border"
            }`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {campaign.team_a_logo && (
                    <img src={campaign.team_a_logo} alt={campaign.team_a_name} className="h-20 w-20 object-contain" />
                  )}
                  <h3 className="text-xl font-bold">
                    {campaign.team_a_name}
                  </h3>
                </div>
                {isTeamAWinning && <span className="text-2xl">🏆</span>}
              </div>
              <div className="space-y-2 mb-4">
                {sortedTeamA.map((member, idx) => {
                  const membersWithSales = sortedTeamA.filter(m => m.value > 0);
                  const position = membersWithSales.findIndex(m => m.name === member.name && m.value === member.value);
                  const hasRanking = member.value > 0;
                  
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 bg-background rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm w-6">
                          {hasRanking ? `${position + 1}º` : "-"}
                        </span>
                        <span>{member.name}</span>
                      </div>
                      <span className="font-semibold">R$ {member.value.toLocaleString("pt-BR")}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">R$ {teamATotal.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>

            {/* Team B */}
            <div className={`bg-card rounded-lg p-6 shadow-lg border-2 transition-all ${
              !isTeamAWinning && teamBTotal > 0 ? "border-yellow-500 shadow-yellow-500/50 ring-2 ring-yellow-500/20" : "border-border"
            }`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {campaign.team_b_logo && (
                    <img src={campaign.team_b_logo} alt={campaign.team_b_name} className="h-20 w-20 object-contain" />
                  )}
                  <h3 className="text-xl font-bold">
                    {campaign.team_b_name}
                  </h3>
                </div>
                {!isTeamAWinning && teamBTotal > 0 && <span className="text-2xl">🏆</span>}
              </div>
              <div className="space-y-2 mb-4">
                {sortedTeamB.map((member, idx) => {
                  const membersWithSales = sortedTeamB.filter(m => m.value > 0);
                  const position = membersWithSales.findIndex(m => m.name === member.name && m.value === member.value);
                  const hasRanking = member.value > 0;
                  
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 bg-background rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm w-6">
                          {hasRanking ? `${position + 1}º` : "-"}
                        </span>
                        <span>{member.name}</span>
                      </div>
                      <span className="font-semibold">R$ {member.value.toLocaleString("pt-BR")}</span>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">R$ {teamBTotal.toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Difference */}
        <section className="mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border text-center">
            <h3 className="text-lg font-semibold mb-2">Diferença entre Equipes</h3>
            <p className="text-3xl font-bold text-primary">
              R$ {teamDifference.toLocaleString("pt-BR")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isTeamAWinning ? campaign.team_a_name : campaign.team_b_name} está na frente
            </p>
          </div>
        </section>

        {/* Ranking */}
        <section>
          <h2 className="text-2xl font-bold mb-4">🏅 Ranking Geral</h2>
          <div className="bg-card rounded-lg p-6 shadow-lg border">
            <div className="space-y-3">
              {allMembers.map((member, idx) => {
                // Calcular posição apenas para quem tem vendas
                const membersWithSales = allMembers.filter(m => m.value > 0);
                const position = membersWithSales.findIndex(m => m.name === member.name && m.value === member.value);
                const hasRanking = member.value > 0;
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                      position === 0 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50" :
                      position === 1 ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50" :
                      position === 2 ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/50" :
                      "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold w-8">
                        {hasRanking ? (
                          position === 0 ? "🥇" : position === 1 ? "🥈" : position === 2 ? "🥉" : `${position + 1}º`
                        ) : (
                          "-"
                        )}
                      </span>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.team}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      R$ {member.value.toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SalesDuel;