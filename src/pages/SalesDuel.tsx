import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Settings, Plus, Trash2, Upload, FileImage, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import spartaVsAguiaImage from "@/assets/sparta-vs-aguia.jpg";

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
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set Open Graph meta tags for social sharing
  useEffect(() => {
    const currentUrl = window.location.href;
    const previewImage = `${window.location.origin}/sparta-vs-aguia-preview.jpg`;
    
    // Update meta tags
    document.title = campaign ? `${campaign.campaign_name} - Gazin Assis Brasil` : 'Duelo de Vendas';
    
    const metaTags = [
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: currentUrl },
      { property: 'og:title', content: 'Duelo de Vendas - Sparta vs Águia Velozes' },
      { property: 'og:description', content: 'Acompanhe o duelo de vendas entre as equipes Sparta e Águia Velozes!' },
      { property: 'og:image', content: previewImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:url', content: currentUrl },
      { name: 'twitter:title', content: 'Duelo de Vendas - Sparta vs Águia Velozes' },
      { name: 'twitter:description', content: 'Acompanhe o duelo de vendas entre as equipes!' },
      { name: 'twitter:image', content: previewImage },
    ];

    metaTags.forEach(tag => {
      const attr = tag.property ? 'property' : 'name';
      const value = tag.property || tag.name;
      let element = document.querySelector(`meta[${attr}="${value}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value || '');
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', tag.content);
    });
  }, [campaign]);

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

  const handlePrint = () => {
    window.print();
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
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const valoresImportados = new Map<string, number>();

      for (let i = 1; i <= 10; i++) {
        const row = jsonData[i] as any[];
        if (row && row[3]) {
          const fullName = String(row[3]).trim();
          const nameParts = fullName.split(' - ');
          let extractedName = nameParts.length > 1 ? nameParts[1].trim().toUpperCase() : fullName.toUpperCase();
          const value = row[49] ? parseFloat(String(row[49]).replace(',', '.')) : 0;
          valoresImportados.set(extractedName, value);
        }
      }

      const updatedTeamA = teamAMembers.map(member => {
        const nomeMembro = member.name.toUpperCase().trim();
        let valorEncontrado = valoresImportados.get(nomeMembro);
        
        if (valorEncontrado === undefined) {
          for (const [nomeExcel, valor] of valoresImportados.entries()) {
            const palavrasMembro = nomeMembro.split(' ').filter(p => p.length > 2);
            const palavrasExcel = nomeExcel.split(' ').filter(p => p.length > 2);
            
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
        
        if (valorEncontrado === undefined) {
          for (const [nomeExcel, valor] of valoresImportados.entries()) {
            const palavrasMembro = nomeMembro.split(' ').filter(p => p.length > 2);
            const palavrasExcel = nomeExcel.split(' ').filter(p => p.length > 2);
            
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
      fetchCampaign();
      
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

  const sortedTeamA = [...campaign.team_a_members].sort((a, b) => b.value - a.value);
  const sortedTeamB = [...campaign.team_b_members].sort((a, b) => b.value - a.value);

  const allMembers = [
    ...campaign.team_a_members.map(m => ({ ...m, team: campaign.team_a_name })),
    ...campaign.team_b_members.map(m => ({ ...m, team: campaign.team_b_name }))
  ].sort((a, b) => b.value - a.value);

  return (
    <div id="duel-container" className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent text-center sm:text-left">
            {campaign.campaign_name}
          </h1>
          <div className="flex flex-wrap gap-2 justify-center">
            {user && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            {isAdmin && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handlePrint}
                  className="no-print"
                >
                  <FileImage className="mr-2 h-4 w-4" />
                  Capturar Tela
                </Button>
              
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
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Preview Image */}
        <div className="flex justify-center mb-4 sm:mb-8">
          <img 
            src={spartaVsAguiaImage} 
            alt="Sparta vs Águia Velozes" 
            className="w-full max-w-4xl rounded-lg shadow-2xl"
          />
        </div>

        {/* Progress Section */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-border">
          <div className="text-center mb-4">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">
              Progresso da Meta
            </h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              {totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm sm:text-base text-muted-foreground">
              de {campaign.goal_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <Progress value={progress} className="h-3 sm:h-4" />
          <p className="text-center mt-2 text-sm sm:text-base font-medium">
            {progress.toFixed(1)}% alcançado
          </p>
        </div>

        {/* Teams Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Team A */}
          <div className={`bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border-2 ${isTeamAWinning ? 'border-green-500' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl sm:text-2xl font-bold">{campaign.team_a_name}</h3>
              {isTeamAWinning && <span className="text-2xl">👑</span>}
            </div>
            {campaign.team_a_logo && (
              <img src={campaign.team_a_logo} alt={campaign.team_a_name} className="h-16 sm:h-20 mb-4 object-contain" />
            )}
            <p className="text-2xl sm:text-3xl font-bold text-primary mb-4">
              {teamATotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="space-y-2">
              {sortedTeamA.map((member, idx) => (
                <div key={idx} className="flex justify-between items-center bg-muted/50 rounded p-2">
                  <span className="text-sm sm:text-base font-medium">{member.name}</span>
                  <span className="text-sm sm:text-base font-bold">
                    {member.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B */}
          <div className={`bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border-2 ${!isTeamAWinning ? 'border-green-500' : 'border-border'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl sm:text-2xl font-bold">{campaign.team_b_name}</h3>
              {!isTeamAWinning && <span className="text-2xl">👑</span>}
            </div>
            {campaign.team_b_logo && (
              <img src={campaign.team_b_logo} alt={campaign.team_b_name} className="h-16 sm:h-20 mb-4 object-contain" />
            )}
            <p className="text-2xl sm:text-3xl font-bold text-primary mb-4">
              {teamBTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="space-y-2">
              {sortedTeamB.map((member, idx) => (
                <div key={idx} className="flex justify-between items-center bg-muted/50 rounded p-2">
                  <span className="text-sm sm:text-base font-medium">{member.name}</span>
                  <span className="text-sm sm:text-base font-bold">
                    {member.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking */}
        <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-border">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 text-center">🏆 Ranking Geral</h3>
          <div className="space-y-2">
            {allMembers.map((member, idx) => (
              <div key={idx} className="flex justify-between items-center bg-muted/50 rounded p-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg sm:text-xl font-bold text-muted-foreground w-8">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.team}</p>
                  </div>
                </div>
                <span className="text-base sm:text-lg font-bold text-primary">
                  {member.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SalesDuel;
