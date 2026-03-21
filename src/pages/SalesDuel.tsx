import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Settings, Plus, Trash2, Upload, Printer, LogOut } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import type { Json } from "@/integrations/supabase/types";

interface Member {
  name: string;
  value: number;
}

interface Team {
  id: string;
  name: string;
  logo?: string;
  members: Member[];
}

interface CampaignData {
  id: string;
  campaign_name: string;
  goal_value: number;
  teams: Team[];
}

interface MultiTeamPayload {
  teams?: Team[];
}

const createTeam = (index: number): Team => ({
  id: `team-${Date.now()}-${index}`,
  name: `Equipe ${index + 1}`,
  logo: "",
  members: [],
});

const isMultiTeamPayload = (value: Json | null): value is MultiTeamPayload => {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'teams' in value;
};

const normalizeTeams = (rawTeams: Team[]): Team[] => rawTeams.map((team, index) => ({
  id: team.id || `team-${index}`,
  name: team.name || `Equipe ${index + 1}`,
  logo: team.logo || "",
  members: Array.isArray(team.members)
    ? team.members.map((member) => ({ name: member.name || "", value: Number(member.value) || 0 }))
    : [],
}));

const mapCampaignData = (data: any): CampaignData => {
  if (isMultiTeamPayload(data.team_a_members) && Array.isArray(data.team_a_members.teams)) {
    return {
      id: data.id,
      campaign_name: data.campaign_name,
      goal_value: Number(data.goal_value),
      teams: normalizeTeams(data.team_a_members.teams),
    };
  }

  return {
    id: data.id,
    campaign_name: data.campaign_name,
    goal_value: Number(data.goal_value),
    teams: normalizeTeams([
      {
        id: 'team-a',
        name: data.team_a_name,
        logo: data.team_a_logo || "",
        members: (data.team_a_members as Member[]) || [],
      },
      {
        id: 'team-b',
        name: data.team_b_name,
        logo: data.team_b_logo || "",
        members: (data.team_b_members as Member[]) || [],
      },
    ]),
  };
};

const SalesDuel = () => {
  const { isDuelAdmin, user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [campaignName, setCampaignName] = useState("");
  const [goalValue, setGoalValue] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);

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
        const campaignData = mapCampaignData(data);
        setCampaign(campaignData);
        setCampaignName(campaignData.campaign_name);
        setGoalValue(campaignData.goal_value);
        setTeams(campaignData.teams);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast.error("Erro ao carregar campanha");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File, teamId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}_logo_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('tv-images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('tv-images')
        .getPublicUrl(fileName);

      setTeams((current) => current.map((team) => (
        team.id === teamId ? { ...team, logo: publicUrl } : team
      )));
      toast.success(`Logo carregada com sucesso!`);
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao carregar logo");
    }
  };

  const handleSave = async () => {
    if (!isDuelAdmin) {
      toast.error("Apenas administradores podem salvar configurações");
      return;
    }

    if (!campaign || teams.length < 2) {
      toast.error("Cadastre pelo menos duas equipes");
      return;
    }

    try {
      const normalizedTeams = normalizeTeams(teams);
      const [teamA, teamB] = normalizedTeams;
      const payload = { teams: normalizedTeams };

      const { error } = await supabase
        .from("sales_duel")
        .update({
          campaign_name: campaignName,
          goal_value: goalValue,
          team_a_name: teamA.name,
          team_b_name: teamB?.name || "Equipe 2",
          team_a_logo: teamA.logo || null,
          team_b_logo: teamB?.logo || null,
          team_a_members: payload as unknown as Json,
          team_b_members: (teamB?.members || []) as unknown as Json,
        })
        .eq("id", campaign.id);
      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      setConfigOpen(false);
      fetchCampaign();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const addTeam = () => {
    setTeams((current) => [...current, createTeam(current.length)]);
  };

  const removeTeam = (teamId: string) => {
    setTeams((current) => current.length <= 2 ? current : current.filter((team) => team.id !== teamId));
  };

  const updateTeam = (teamId: string, field: keyof Omit<Team, 'members'>, value: string) => {
    setTeams((current) => current.map((team) => (
      team.id === teamId ? { ...team, [field]: value } : team
    )));
  };

  const addMember = (teamId: string) => {
    setTeams((current) => current.map((team) => (
      team.id === teamId ? { ...team, members: [...team.members, { name: "", value: 0 }] } : team
    )));
  };

  const removeMember = (teamId: string, index: number) => {
    setTeams((current) => current.map((team) => (
      team.id === teamId ? { ...team, members: team.members.filter((_, memberIndex) => memberIndex !== index) } : team
    )));
  };

  const updateMember = (teamId: string, index: number, field: keyof Member, value: string | number) => {
    setTeams((current) => current.map((team) => {
      if (team.id !== teamId) return team;
      const updatedMembers = [...team.members];
      updatedMembers[index] = { ...updatedMembers[index], [field]: value };
      return { ...team, members: updatedMembers };
    }));
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isDuelAdmin) {
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
          const extractedName = nameParts.length > 1 ? nameParts[1].trim().toUpperCase() : fullName.toUpperCase();
          const value = row[49] ? parseFloat(String(row[49]).replace(',', '.')) : 0;
          valoresImportados.set(extractedName, value);
        }
      }

      const updatedTeams = teams.map((team) => ({
        ...team,
        members: team.members.map((member) => {
          const memberName = member.name.toUpperCase().trim();
          let foundValue = valoresImportados.get(memberName);

          if (foundValue === undefined) {
            for (const [excelName, importedValue] of valoresImportados.entries()) {
              const memberWords = memberName.split(' ').filter((word) => word.length > 2);
              const excelWords = excelName.split(' ').filter((word) => word.length > 2);
              const hasMatch = memberWords.some((memberWord) =>
                excelWords.some((excelWord) => excelWord.includes(memberWord) || memberWord.includes(excelWord))
              );

              if (hasMatch) {
                foundValue = importedValue;
                break;
              }
            }
          }

          return {
            ...member,
            value: foundValue !== undefined ? foundValue : member.value,
          };
        }),
      }));

      setTeams(updatedTeams);

      if (campaign) {
        const [teamA, teamB] = updatedTeams;
        const { error } = await supabase
          .from("sales_duel")
          .update({
            team_a_name: teamA?.name || "Equipe 1",
            team_b_name: teamB?.name || "Equipe 2",
            team_a_logo: teamA?.logo || null,
            team_b_logo: teamB?.logo || null,
            team_a_members: { teams: updatedTeams } as unknown as Json,
            team_b_members: (teamB?.members || []) as unknown as Json,
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

  const handlePrint = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsPrinting(true);
      toast.info("Capturando tela...");
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
      });
      const link = document.createElement("a");
      link.download = `duelo-${campaign?.campaign_name || "campanha"}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Captura realizada com sucesso!");
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Erro ao capturar tela");
    } finally {
      setIsPrinting(false);
    }
  };

  const getBusinessDaysInMonth = () => {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    let businessDays = 0;
    for (let d = new Date(today); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const isWeekday = d.getDay() >= 1 && d.getDay() <= 6;
      if (isWeekday) {
        businessDays++;
      }
    }
    return businessDays;
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

  const teamsWithTotals = campaign.teams.map((team) => ({
    ...team,
    total: team.members.reduce((sum, member) => sum + member.value, 0),
    sortedMembers: [...team.members].sort((a, b) => b.value - a.value),
  }));
  const totalSales = teamsWithTotals.reduce((sum, team) => sum + team.total, 0);
  const progress = Math.min((totalSales / campaign.goal_value) * 100, 100);
  const isActive = totalSales >= campaign.goal_value;
  const leader = [...teamsWithTotals].sort((a, b) => b.total - a.total)[0];
  const secondPlace = [...teamsWithTotals].sort((a, b) => b.total - a.total)[1];
  const teamDifference = leader && secondPlace ? Math.abs(leader.total - secondPlace.total) : 0;
  const allMembers = teamsWithTotals
    .flatMap((team) => team.members.map((member) => ({ ...member, team: team.name })))
    .sort((a, b) => b.value - a.value);

  const remainingValue = Math.max(0, campaign.goal_value - totalSales);
  const businessDays = getBusinessDaysInMonth();
  const valuePerDay = businessDays > 0 ? remainingValue / businessDays : 0;

  return (
    <div ref={printAreaRef} className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <Helmet>
        <title>{campaign.campaign_name}</title>
      </Helmet>
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            {campaign.campaign_name}
          </h1>
          {isDuelAdmin && (
            <div className={`flex gap-2 flex-wrap justify-end ${isPrinting ? "hidden" : ""}`}>
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
                      <br />• Nomes devem estar na coluna D (D2:D11)
                      <br />• Valores devem estar na coluna AX (AX2:AX11)
                    </p>
                    <Input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} />
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
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuração da Campanha</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome da Campanha</Label>
                        <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Meta do Gatilho (R$)</Label>
                        <Input type="number" value={goalValue} onChange={(e) => setGoalValue(Number(e.target.value))} />
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Equipes participantes</h3>
                        <p className="text-sm text-muted-foreground">Adicione quantas equipes precisar.</p>
                      </div>
                      <Button type="button" onClick={addTeam}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar equipe
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {teams.map((team, teamIndex) => (
                        <div key={team.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="grid md:grid-cols-2 gap-4 flex-1">
                              <div>
                                <Label>Nome da Equipe</Label>
                                <Input value={team.name} onChange={(e) => updateTeam(team.id, 'name', e.target.value)} />
                              </div>
                              <div>
                                <Label>Logo da Equipe</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleLogoUpload(file, team.id);
                                  }}
                                />
                                {team.logo && (
                                  <div className="mt-2">
                                    <img src={team.logo} alt={team.name} className="h-16 object-contain" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button type="button" variant="destructive" size="icon" disabled={teams.length <= 2} onClick={() => removeTeam(team.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <Label>Integrantes da {team.name || `Equipe ${teamIndex + 1}`}</Label>
                              <Button type="button" size="sm" onClick={() => addMember(team.id)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {team.members.map((member, memberIndex) => (
                                <div key={`${team.id}-${memberIndex}`} className="flex gap-2 items-end">
                                  <div className="flex-1">
                                    <Label className="text-xs">Nome</Label>
                                    <Input
                                      value={member.name}
                                      onChange={(e) => updateMember(team.id, memberIndex, 'name', e.target.value)}
                                      placeholder="Nome do vendedor"
                                    />
                                  </div>
                                  <div className="w-32">
                                    <Label className="text-xs">Valor (R$)</Label>
                                    <Input
                                      type="number"
                                      value={member.value}
                                      onChange={(e) => updateMember(team.id, memberIndex, 'value', Number(e.target.value))}
                                      placeholder="0"
                                    />
                                  </div>
                                  <Button type="button" variant="destructive" size="icon" onClick={() => removeMember(team.id, memberIndex)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={handleSave} className="w-full">Salvar Configurações</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                PRINT
              </Button>
            </div>
          )}
          {user && (
            <Button onClick={signOut} variant="outline" size="sm" className={isPrinting ? "hidden" : ""}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border">
            <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold mb-3">Meta da Campanha</h2>
                <p className="text-5xl font-bold text-primary">R$ {campaign.goal_value.toLocaleString("pt-BR")}</p>
              </div>
              <div className={`text-lg font-semibold px-4 py-2 rounded-full ${
                isActive ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              }`}>
                {isActive ? "✅ Campanha Ativa" : "❌ Aguardando Gatilho"}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-center">
                <p className="text-2xl font-bold text-blue-600">{progress.toFixed(1)}%</p>
              </div>
              <Progress value={progress} className="h-6" />
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <p className="text-3xl font-bold">R$ {totalSales.toLocaleString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Faltam</p>
                  <p className="text-3xl font-bold text-orange-500">
                    R$ {remainingValue.toLocaleString("pt-BR")}/<span className="text-sm">{businessDays}</span>
                  </p>
                  <p className="text-sm font-semibold text-orange-500">
                    R$ {valuePerDay.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Equipes</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teamsWithTotals.map((team) => {
              const isLeader = leader?.id === team.id && team.total > 0;
              return (
                <div key={team.id} className={`bg-card rounded-lg p-6 shadow-lg border-2 transition-all ${
                  isLeader ? "border-yellow-500 shadow-yellow-500/50 ring-2 ring-yellow-500/20" : "border-border"
                }`}>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {team.logo && <img src={team.logo} alt={team.name} className="h-20 w-20 object-contain" />}
                      <h3 className="text-xl font-bold">{team.name}</h3>
                    </div>
                    {isLeader && <span className="text-2xl">🏆</span>}
                  </div>
                  <div className="space-y-2 mb-4">
                    {team.sortedMembers.map((member, idx) => {
                      const membersWithSales = team.sortedMembers.filter((sortedMember) => sortedMember.value > 0);
                      const position = membersWithSales.findIndex((sortedMember) => sortedMember.name === member.name && sortedMember.value === member.value);
                      const hasRanking = member.value > 0;
                      return (
                        <div key={idx} className="flex justify-between items-center p-2 bg-background rounded gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm w-6">{hasRanking ? `${position + 1}º` : "-"}</span>
                            <span className="truncate">{member.name}</span>
                          </div>
                          <span className="font-semibold whitespace-nowrap">R$ {member.value.toLocaleString("pt-BR")}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">R$ {team.total.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border text-center">
            <h3 className="text-lg font-semibold mb-2">Diferença entre equipes líderes</h3>
            <p className="text-3xl font-bold text-primary">R$ {teamDifference.toLocaleString("pt-BR")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {leader ? `${leader.name} está na frente` : 'Sem líder definido'}
            </p>
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold mb-4">🏅 Ranking Geral</h2>
          <div className="bg-card rounded-lg p-6 shadow-lg border">
            <div className="space-y-3">
              {allMembers.map((member, idx) => {
                const membersWithSales = allMembers.filter((rankedMember) => rankedMember.value > 0);
                const position = membersWithSales.findIndex((rankedMember) => rankedMember.name === member.name && rankedMember.value === member.value);
                const hasRanking = member.value > 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg transition-all gap-4 ${
                      position === 0 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50" :
                      position === 1 ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50" :
                      position === 2 ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/50" :
                      "bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-2xl font-bold w-8">
                        {hasRanking ? (position === 0 ? "🥇" : position === 1 ? "🥈" : position === 2 ? "🥉" : `${position + 1}º`) : "-"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.team}</p>
                      </div>
                    </div>
                    <span className="text-xl font-bold text-primary whitespace-nowrap">R$ {member.value.toLocaleString("pt-BR")}</span>
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
