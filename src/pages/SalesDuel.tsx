import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Settings, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  const [campaign, setCampaign] = useState<CampaignData | null>(null);

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
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuração
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configurações da Campanha</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="campaignName">Nome da Campanha</Label>
                    <Input
                      id="campaignName"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="🔥 Duelo de Vendas 🔥"
                    />
                  </div>

                  <div>
                    <Label htmlFor="goalValue">Meta da Campanha (R$)</Label>
                    <Input
                      id="goalValue"
                      type="number"
                      value={goalValue}
                      onChange={(e) => setGoalValue(Number(e.target.value))}
                      placeholder="50000"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teamAName">Nome da Equipe A</Label>
                      <Input
                        id="teamAName"
                        value={teamAName}
                        onChange={(e) => setTeamAName(e.target.value)}
                        placeholder="Equipe Fogo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="teamBName">Nome da Equipe B</Label>
                      <Input
                        id="teamBName"
                        value={teamBName}
                        onChange={(e) => setTeamBName(e.target.value)}
                        placeholder="Equipe Gelo"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Team A Members */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Integrantes - {teamAName}</Label>
                        <Button size="sm" variant="outline" onClick={() => addMember("A")}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {teamAMembers.map((member, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              placeholder="Nome"
                              value={member.name}
                              onChange={(e) => updateMember("A", idx, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Valor"
                              value={member.value}
                              onChange={(e) => updateMember("A", idx, "value", Number(e.target.value))}
                              className="w-32"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeMember("A", idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team B Members */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Integrantes - {teamBName}</Label>
                        <Button size="sm" variant="outline" onClick={() => addMember("B")}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {teamBMembers.map((member, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              placeholder="Nome"
                              value={member.name}
                              onChange={(e) => updateMember("B", idx, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Valor"
                              value={member.value}
                              onChange={(e) => updateMember("B", idx, "value", Number(e.target.value))}
                              className="w-32"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
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
                {campaign.team_a_members.map((member, idx) => (
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
                {campaign.team_b_members.map((member, idx) => (
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