import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { categoryService } from "@/services/categoryService";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function RoadmapGeneratorWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    scope: "corporate",
    horizon: 24 as 12 | 24 | 36,
    filters: {
      device_type: ""
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  });

  const generatorMutation = useMutation({
    mutationFn: (data: typeof formData) => roadmapGeneratorService.generateAuto(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      toast.success("Roadmap gerado com sucesso!");
      setIsOpen(false);
      navigate(`/roadmap-timeline?projectId=${data.project.id}`);
    },
    onError: () => {
      toast.error("Erro ao gerar roadmap.");
      setLoading(false);
    }
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    generatorMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Wand2 className="h-4 w-4 mr-2" /> Gerar Roadmap Automático
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerador de Roadmap Automático</DialogTitle>
          <DialogDescription>
            Crie um plano completo de migração baseado em seu inventário em poucos cliques.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Roadmap</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Renovação Global de Servidores 2025" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label>Categoria de Foco</Label>
                <Select onValueChange={v => setFormData({...formData, category: v})} defaultValue={formData.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Horizonte de Planejamento (Meses)</Label>
                <Select onValueChange={(v: string) => setFormData({...formData, horizon: parseInt(v) as 12 | 24 | 36})} defaultValue={String(formData.horizon)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses (Recomendado)</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label>Filtrar por Tipo de Dispositivo</Label>
                <Select onValueChange={v => setFormData({...formData, filters: {...formData.filters, device_type: v}})} defaultValue={formData.filters.device_type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="server">Servidores</SelectItem>
                    <SelectItem value="workstation">Estações de Trabalho</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center py-8 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold">Tudo Pronto!</h3>
              <p className="text-muted-foreground">
                O sistema irá processar os ativos elegíveis e criar os planos de migração com prioridade automática.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleBack} disabled={step === 1 || loading}>
            Voltar
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!formData.name && step === 1}>
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
