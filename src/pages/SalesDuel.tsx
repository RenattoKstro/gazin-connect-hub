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
          team_a_members: (data.team_a_members as unknown as Member[]) || [],
          team_b_members: (data.team_b_members as unknown as Member[]) || [],
        };
        setCampaign(campaignData);
        setCampaignName(campaignData.campaign_name);
        setGoalValue(campaignData.goal_value);
        setTeamAName(campaignData.team_a_name);
        setTeamBName(campaignData.team_b_name);
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

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Extract names from column D (D2:D11)
      const names: string[] = [];
      for (let i = 2; i <= 11; i++) {
        const cellAddress = `D${i}`;
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          names.push(String(cell.v).trim());
        }
      }

      // Extract values from column AX (AX2:AX11)
      const values: number[] = [];
      for (let i = 2; i <= 11; i++) {
        const cellAddress = `AX${i}`;
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          // Convert value (e.g., 1834.7) to proper number
          const value = typeof cell.v === 'number' ? cell.v : parseFloat(String(cell.v).replace(',', '.'));
          values.push(value);
        }
      }

      // Create members array
      const importedMembers: Member[] = names.map((name, index) => ({
        name,
        value: values[index] || 0
      }));

      // Split members between teams (first half to team A, second half to team B)
      const midPoint = Math.ceil(importedMembers.length / 2);
      setTeamAMembers(importedMembers.slice(0, midPoint));
      setTeamBMembers(importedMembers.slice(midPoint));

      toast.success(`${importedMembers.length} vendedores importados com sucesso!`);
      setImportOpen(false);
      
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
...
              </Dialog>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Campaign Goal */}
        <section className="mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">Meta da Campanha</h2>
                <p className="text-3xl font-bold">
                  R$ {campaign.goal_value.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className={`text-lg font-semibold px-4 py-2 rounded-full ${
                isActive ? "bg-green-500/20 text-green-600" : "bg-red-500/20 text-red-600"
              }`}>
                {isActive ? "✅ Campanha Ativa" : "❌ Aguardando Gatilho"}
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-4" />
              <p className="text-sm text-muted-foreground text-right">
                R$ {totalSales.toLocaleString("pt-BR")} de R$ {campaign.goal_value.toLocaleString("pt-BR")} ({progress.toFixed(1)}%)
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
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                {campaign.team_a_name}
                {isTeamAWinning && <span className="text-2xl">🏆</span>}
              </h3>
              <div className="space-y-2 mb-4">
                {sortedTeamA.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-background rounded">
                    <span>{member.name}</span>
                    <span className="font-semibold">R$ {member.value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
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
              <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                {campaign.team_b_name}
                {!isTeamAWinning && teamBTotal > 0 && <span className="text-2xl">🏆</span>}
              </h3>
              <div className="space-y-2 mb-4">
                {sortedTeamB.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-background rounded">
                    <span>{member.name}</span>
                    <span className="font-semibold">R$ {member.value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
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
              {allMembers.map((member, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    idx === 0 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/50" :
                    idx === 1 ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50" :
                    idx === 2 ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/50" :
                    "bg-background"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-8">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}º`}
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
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default SalesDuel;