import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiOrchestratorService } from "@/services/aiOrchestratorService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TechGroup {
  key: string;
  vendor: string;
  product_name: string;
  version: string;
  count: number;
}

export function RoadmapGeneratorWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Conectando à IA...");

  const [projectName, setProjectName] = useState("");
  const [techGroups, setTechGroups] = useState<TechGroup[]>([]);
  const [adoptionDates, setAdoptionDates] = useState<Record<string, string>>({});

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setProjectName("");
      setAdoptionDates({});
      loadInventory();
    }
  }, [isOpen]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const assets = await aiOrchestratorService.fetchInventory();
      const groups = aiOrchestratorService.groupAssetsByTechnology(assets);
      setTechGroups(groups.map(g => ({
        key: `${g.vendor} ${g.product_name} ${g.version}`.toLowerCase().replace(/\s+/g, '_'), // matching normalizeKey roughly, or just use it as UI key
        vendor: g.vendor,
        product_name: g.product_name,
        version: g.version,
        count: g.count
      })));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar inventário.");
    } finally {
      setLoading(false);
    }
  };

  const generatorMutation = useMutation({
    mutationFn: async () => {
      // 1. Convert adoption dates to the expected format (Record<string, string | null>)
      const datesToPass: Record<string, string | null> = {};
      Object.keys(adoptionDates).forEach(k => {
        datesToPass[k] = adoptionDates[k] || null;
      });

      // 2. Generate Review Data via AI
      setLoadingMessage("Conectando à IA...");
      const orchestratorResult = await aiOrchestratorService.orchestrateFromInventory(datesToPass, undefined, (status) => {
        setLoadingMessage(status);
      });
      
      // Override project name if provided
      if (projectName.trim()) {
        orchestratorResult.reviewData.project_name = projectName;
      }

      // 3. Save to DB
      const result = await aiRoadmapGeneratorService.generateRoadmapFromAIReview(orchestratorResult.reviewData);
      
      if (!result.success || !result.roadmapProjectId) {
        throw new Error(result.errors.join(", "));
      }
      
      return result.roadmapProjectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      toast.success("Roadmap estratégico gerado com sucesso!");
      setIsOpen(false);
      navigate(`/roadmap-timeline?projectId=${projectId}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao gerar roadmap.");
      setLoading(false);
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    generatorMutation.mutate();
  };

  const handleDateChange = (key: string, value: string) => {
    setAdoptionDates(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Wand2 className="h-4 w-4 mr-2" /> Smart Lifecycle AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gerar Roadmap Inteligente</DialogTitle>
          <DialogDescription>
            A IA analisará seu inventário automaticamente para criar um planejamento executivo.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 min-h-[300px] max-h-[60vh] overflow-y-auto pr-2">
          {loading && step === 1 && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Analisando inventário...</p>
            </div>
          )}

          {!loading && step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2 mb-6">
                <Label htmlFor="name">Nome do Projeto (Opcional)</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Roadmap de Infraestrutura 2025" 
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-blue-500" />
                  {techGroups.length} Tecnologias Detectadas
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Informe a data aproximada de implantação de cada tecnologia (opcional). Isso ajuda a IA a calcular com mais precisão a urgência e as janelas de migração.
                </p>

                <div className="space-y-3">
                  {techGroups.map((group, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {group.vendor} {group.product_name} {group.version}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {group.count} ativo(s)
                        </div>
                      </div>
                      <div className="w-full sm:w-40 relative">
                        <Input
                          type="date"
                          className="h-8 text-sm"
                          value={adoptionDates[group.key] || ""}
                          onChange={(e) => handleDateChange(group.key, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 text-center py-8 animate-in zoom-in-95 duration-300">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4 animate-in fade-in duration-300">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-md font-semibold text-foreground">{loadingMessage}</p>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Aguarde enquanto a IA consolida o ciclo de vida e planeja as migrações dos ativos.
                  </p>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold">Iniciando Geração via IA</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    A IA irá cruzar o inventário, as datas fornecidas e o ciclo de vida oficial para gerar a timeline executiva. Isso pode levar alguns segundos.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading}>
            Voltar
          </Button>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={loading}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar Roadmap
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

