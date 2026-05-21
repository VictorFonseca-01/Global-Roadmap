import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { categoryService } from "@/services/categoryService";
import { roadmapWorkflowService } from "@/services/roadmapWorkflowService";
import { roadmapService } from "@/services/roadmapService";
import { migrationPlanService } from "@/services/migrationPlanService";
import { pdfService } from "@/services/pdfService";
import { deterministicEngineService } from "@/services/deterministicEngineService";
import { aiOrchestratorService } from "@/services/aiOrchestratorService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";

import type { RoadmapProject, AIReviewData } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Map as MapIcon, 
  Loader2, 
  Zap, 
  Sparkles, 
  Download, 
  AlertTriangle, 
  ClipboardCheck, 
  ShieldAlert, 
  ChevronDown,
  CalendarDays
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { GanttView } from "@/components/roadmap/GanttView";
import { ExecutivePresentation } from "@/components/roadmap/ExecutivePresentation";
import { AIChatGenerator } from "@/components/roadmap/AIChatGenerator";
import { AIReviewPreview } from "@/components/roadmap/AIReviewPreview";
import { differenceInDays } from "date-fns";

const projectSchema = z.object({
  name: z.string().min(3, "Nome do projeto deve ter pelo menos 3 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  scope: z.string().optional(),
  status: z.enum(['draft', 'review', 'approved', 'scheduled', 'in_progress', 'completed', 'blocked', 'cancelled']),
  description: z.string().optional(),
  owner: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export default function RoadmapsPage() {
  const queryClient = useQueryClient();
  
  // States
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<RoadmapProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gantt" | "executive">("gantt");

  // Auto AI Generation States
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [autoGeneratingStep, setAutoGeneratingStep] = useState("");
  const [autoReviewData, setAutoReviewData] = useState<AIReviewData | null>(null);
  const [showAutoReview, setShowAutoReview] = useState(false);

  // Queries
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  // Formulário de Criação/Edição de Projeto
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      category: "",
      scope: "corporate",
      status: "draft",
      description: "",
      owner: "",
      start_date: "",
      end_date: "",
    },
  });

  // Mutações
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof projectSchema>) => roadmapService.create(data),
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      setSelectedProjectId(newProj.id);
      toast.success("Projeto de Roadmap criado!");
      setIsCreateOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, oldStatus }: { id: string; data: Partial<RoadmapProject>, oldStatus: string }) => {
      const result = await roadmapService.update(id, data);
      if (data.status && data.status !== oldStatus) {
        await roadmapWorkflowService.transitionStatus(id, data.status, "Status alterado via formulário");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Projeto atualizado!");
      setIsCreateOpen(false);
      setEditingProject(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roadmapService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      toast.success("Projeto excluído com sucesso!");
      setProjectToDelete(null);
      setSelectedProjectId(null);
    },
    onError: (error: Error) => {
      toast.error("Falha ao excluir item", { description: error.message });
      setProjectToDelete(null);
    }
  });

  // Inicialização automática de um Roadmap se o banco estiver vazio (Zero-friction onboarding)
  useEffect(() => {
    if (!isProjectsLoading && projects.length === 0 && categories.length > 0) {
      createMutation.mutate({
        name: "Roadmap Geral de Infraestrutura",
        category: categories[0]?.name || "Geral",
        scope: "corporate",
        status: "in_progress",
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        owner: "Departamento de TI",
        description: "Planejamento inicial auto-gerado contendo ativos e sistemas do inventário."
      });
    }
  }, [projects, isProjectsLoading, categories]);

  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Planos correspondentes ao projeto ativo
  const projectPlans = useMemo(() => {
    if (!selectedProjectId) return [];
    return allPlans.filter(p => p.roadmap_project_id === selectedProjectId);
  }, [allPlans, selectedProjectId]);

  // Métricas financeiras e de conformidade baseadas nos planos atuais
  const stats = useMemo(() => {
    const total = projectPlans.length;
    const critical = projectPlans.filter((p: any) => p.priority === 'critical').length;
    const outOfSupport = projectPlans.filter((p: any) => {
      const eol = p.assets?.lifecycle_catalog?.end_of_support;
      return eol && new Date(eol) < new Date();
    }).length;
    const next180Days = projectPlans.filter((p: any) => {
      const eol = p.assets?.lifecycle_catalog?.end_of_support;
      if (!eol) return false;
      const days = differenceInDays(new Date(eol), new Date());
      return days >= 0 && days <= 180;
    }).length;
    const estimatedBudget = projectPlans.reduce((sum: number, p: any) => sum + (p.estimated_cost || 0), 0);

    return {
      totalAssets: total,
      critical,
      outOfSupport,
      next180Days,
      estimatedBudget
    };
  }, [projectPlans]);

  // Ação de Geração/Otimização do Roadmap (Determinístico)
  const handleGenerateRoadmap = async () => {
    if (!selectedProjectId) {
      toast.error("Por favor, selecione ou crie um projeto de roadmap primeiro.");
      return;
    }

    setIsGenerating(true);
    toast.loading("Otimizando roadmap e calculando janelas de ciclo de vida...", { id: "generate-roadmap" });

    try {
      const results = await roadmapGeneratorService.generate(
        selectedProjectId, 
        undefined, 
        30 
      );

      if (results.success) {
        toast.success(`Roadmap gerado com sucesso!`, {
          id: "generate-roadmap",
          description: `${results.createdCount} ativos foram planejados dentro da margem de conformidade.`
        });
        queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      } else {
        toast.error("Falha ao concluir a ação", {
          id: "generate-roadmap",
          description: results.errors[0] || "Verifique se existem ativos mapeados com datas válidas."
        });
      }
    } catch (err: any) {
      toast.error("Falha ao otimizar roadmap", {
        id: "generate-roadmap",
        description: err.message
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto AI Generation Functions (Full alignment with Inventory flow)
  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    try {
      setAutoGeneratingStep("Analisando inventário...");
      await new Promise(r => setTimeout(r, 500));

      setAutoGeneratingStep("Identificando tecnologias...");
      const result = await aiOrchestratorService.orchestrateFromInventory(undefined, undefined, (status) => {
        setAutoGeneratingStep(status);
      });

      setAutoGeneratingStep("Preparando prévia...");
      await new Promise(r => setTimeout(r, 300));

      setAutoReviewData(result.reviewData);
      setShowAutoReview(true);

      toast.success(`${result.uniqueTechnologies} tecnologias identificadas.`);
    } catch (err: any) {
      toast.error("Erro ao gerar roadmap: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsAutoGenerating(false);
      setAutoGeneratingStep("");
    }
  };

  const handleAutoConfirm = async (data: AIReviewData) => {
    setIsAutoGenerating(true);
    setAutoGeneratingStep("Gerando roadmap...");
    try {
      const result = await aiRoadmapGeneratorService.generateRoadmapFromAIReview(data);
      if (!result.success) throw new Error(result.errors.join(", "));

      toast.success("Roadmap gerado com sucesso a partir do inventário!");
      setShowAutoReview(false);
      setAutoReviewData(null);
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      queryClient.invalidateQueries({ queryKey: ["migration-plans"] });
      if (result.roadmapProjectId) {
        setSelectedProjectId(result.roadmapProjectId);
      }
    } catch (err: any) {
      toast.error("Erro ao confirmar: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsAutoGenerating(false);
      setAutoGeneratingStep("");
    }
  };

  // Exportação em PDF
  const handleExportPdf = async () => {
    if (projectPlans.length === 0) {
      toast.error("Não foi possível concluir a ação", { description: "Não há planos gerados neste roadmap para exportar." });
      return;
    }

    try {
      toast.loading("Compilando parecer estratégico e gerando PDF...", { id: "pdf-export" });
      
      const insights = deterministicEngineService.getExecutiveInsights(
        { 
          critical: stats.critical, 
          high: projectPlans.filter((p: any) => p.priority === 'high').length,
          next180Days: stats.next180Days,
          estimatedBudget: stats.estimatedBudget
        }, 
        projectPlans
      );

      await pdfService.generateExecutiveReport({
        stats: {
          totalAssets: stats.totalAssets,
          critical: stats.critical,
          outOfSupport: stats.outOfSupport,
          next180Days: stats.next180Days,
          estimatedBudget: stats.estimatedBudget
        },
        plans: projectPlans,
        insights,
        riskData: [
          { name: "Crítico", value: stats.critical, color: "#ef4444" },
          { name: "Out of Support", value: stats.outOfSupport, color: "#f43f5e" }
        ]
      });

      toast.success("Parecer Estratégico PDF exportado com sucesso!", { id: "pdf-export" });
    } catch (err: any) {
      toast.error("Não foi possível concluir a ação", { id: "pdf-export", description: err.message });
    }
  };

  function onSubmit(values: z.infer<typeof projectSchema>) {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: values, oldStatus: editingProject.status });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-100 pb-10">
      
      {/* ---------------------------------------------------- */}
      {/* VISTA 1: LISTA GLOBAL DE ROADMAPS (selectedProjectId === null) */}
      {/* ---------------------------------------------------- */}
      {!selectedProjectId ? (
        <div className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MapIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Roadmaps</h1>
                <p className="text-slate-400 text-sm mt-0.5 max-w-xl">
                  Planejamentos gerados automaticamente a partir do inventário e enriquecidos com lifecycle oficial.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 gap-2 border border-indigo-500/20 transition-all h-11"
              >
                {isAutoGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{autoGeneratingStep || "Gerando..."}</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-cyan-300" />
                    <span>Gerar Roadmap Automático</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsChatModalOpen(true)}
                className="rounded-xl border-white/10 hover:bg-white/5 text-slate-300 font-bold transition-all h-11 gap-2"
              >
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Complementar com IA</span>
              </Button>

              <Button 
                variant="outline"
                className="rounded-xl border-white/10 bg-[#090f1d]/50 text-slate-300 hover:bg-white/5 hover:text-white h-11 px-5 text-xs font-bold"
                onClick={() => {
                  setEditingProject(null);
                  form.reset({
                    name: "",
                    category: categories[0]?.name || "Geral",
                    scope: "corporate",
                    status: "in_progress",
                    description: "",
                    owner: "",
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  });
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Novo Projeto
              </Button>
            </div>
          </div>

          {/* Grid de Roadmaps */}
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] border-white/10 bg-[#090f1d]/20 text-center">
              <MapIcon className="h-14 w-14 text-slate-600 mb-4 animate-pulse" />
              <h2 className="text-xl font-black text-slate-300">Nenhum roadmap gerado</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                Importe seu inventário de ativos e gere seu primeiro roadmap automaticamente clicando nos botões acima.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
              {projects.map((project) => {
                const projectPlans = allPlans.filter(p => p.roadmap_project_id === project.id);
                const techSet = new Set(projectPlans.map(p => p.assets?.lifecycle_catalog?.product_name).filter(Boolean));
                const technologies = Array.from(techSet).slice(0, 3).join(", ") + (techSet.size > 3 ? "..." : "");
                
                const criticalCount = projectPlans.filter(p => p.priority === 'critical' || p.risk_level === 'critical').length;
                const totalCost = projectPlans.reduce((sum, p) => sum + (p.estimated_cost || 0), 0);
                
                const statusLabels: Record<string, string> = {
                  draft: "Rascunho",
                  review: "Em Revisão",
                  approved: "Aprovado",
                  scheduled: "Agendado",
                  in_progress: "Em Andamento",
                  completed: "Concluído",
                  blocked: "Bloqueado",
                  cancelled: "Cancelado"
                };

                const statusColors: Record<string, string> = {
                  draft: "bg-slate-900/60 text-slate-400 border-slate-800",
                  review: "bg-blue-950/40 text-blue-400 border-blue-900/30",
                  approved: "bg-emerald-950/40 text-emerald-400 border-emerald-900/30",
                  scheduled: "bg-cyan-950/40 text-cyan-400 border-cyan-900/30",
                  in_progress: "bg-purple-950/40 text-purple-400 border-purple-900/30",
                  completed: "bg-teal-950/40 text-teal-400 border-teal-900/30",
                  blocked: "bg-rose-950/40 text-rose-400 border-rose-900/30",
                  cancelled: "bg-slate-950/40 text-slate-500 border-slate-900/30",
                };

                return (
                  <div key={project.id} className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#090f1d]/50 p-6 shadow-xl hover:shadow-2xl hover:border-white/10 transition-all duration-300 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className={`text-[10px] font-bold uppercase tracking-wider ${statusColors[project.status] || statusColors.draft}`}>
                          {statusLabels[project.status] || project.status}
                        </Badge>
                        <span className="text-xs text-slate-500 font-bold">{project.category}</span>
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tight mb-2 truncate">{project.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{project.description || "Sem descrição."}</p>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Tecnologias:</span>
                          <span className="text-slate-300 font-bold max-w-[180px] truncate">{technologies || "Nenhuma"}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Risco:</span>
                          <Badge variant="outline" className={`text-[10px] font-bold border-none px-0 ${criticalCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                            {criticalCount > 0 ? `${criticalCount} Ativos Críticos` : "Baixo Risco"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold">Custo Estimado:</span>
                          <span className="text-emerald-400 font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalCost)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                      <Button 
                        onClick={() => setSelectedProjectId(project.id)}
                        className="flex-1 rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                      >
                        Abrir Timeline
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-10 w-10 rounded-xl border border-white/5 text-slate-400 hover:text-white">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#090f1d] border border-white/10 rounded-xl text-white">
                          <DropdownMenuItem 
                            className="focus:bg-white/5 focus:text-white cursor-pointer rounded-lg text-xs"
                            onClick={() => {
                              setEditingProject(project);
                              form.reset({
                                name: project.name,
                                category: project.category,
                                scope: project.scope || "corporate",
                                status: project.status,
                                description: project.description || "",
                                owner: project.owner || "",
                                start_date: project.start_date || "",
                                end_date: project.end_date || "",
                              });
                              setIsCreateOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-500 focus:bg-red-500/10 focus:text-red-400 cursor-pointer rounded-lg text-xs"
                            onClick={() => setProjectToDelete(project.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // ----------------------------------------------------
        // VISTA 2: TIMELINE / DETALHES DO ROADMAP ATIVO
        // ----------------------------------------------------
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedProjectId(null)}
            className="text-slate-400 hover:text-white font-bold h-9 px-3 rounded-xl gap-2 self-start w-fit bg-white/5 border border-white/5"
          >
            ← Voltar para Roadmaps
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                {selectedProject?.name}
                {selectedProject && (
                  <Badge className="rounded-full px-3 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                    {selectedProject.category}
                  </Badge>
                )}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                {selectedProject?.description || "Planejamento de ciclo de vida e substituição de ativos tecnológicos."}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                onClick={() => {
                  setEditingProject(selectedProject);
                  form.reset({
                    name: selectedProject!.name,
                    category: selectedProject!.category,
                    scope: selectedProject!.scope || "corporate",
                    status: selectedProject!.status,
                    description: selectedProject!.description || "",
                    owner: selectedProject!.owner || "",
                    start_date: selectedProject!.start_date || "",
                    end_date: selectedProject!.end_date || "",
                  });
                  setIsCreateOpen(true);
                }}
                className="rounded-xl border-[#232938] bg-[#090f1d]/50 text-slate-300 hover:bg-white/5 hover:text-white h-11 px-4 text-xs font-bold"
              >
                <Pencil className="h-4 w-4 mr-2" /> Editar
              </Button>
              
              <Button 
                onClick={handleGenerateRoadmap}
                disabled={isGenerating}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 gap-2 border border-indigo-500/20 transition-all h-11"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Otimizando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-cyan-300" />
                    <span>Otimizar Timeline</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Métricas do Roadmap */}
          {projectPlans.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Planejado", value: stats.totalAssets, icon: ClipboardCheck, color: "blue" },
                  { label: "Fora de Suporte", value: stats.outOfSupport, icon: ShieldAlert, color: "rose", highlight: stats.outOfSupport > 0 },
                  { label: "Risco Crítico", value: stats.critical, icon: AlertTriangle, color: "amber", highlight: stats.critical > 0 },
                  { label: "EoL 180 Dias", value: stats.next180Days, icon: CalendarDays, color: "orange" },
                  { label: "Custo Estimado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.estimatedBudget), icon: Download, color: "emerald" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className={`p-5 rounded-[2rem] border transition-all hover:scale-[1.02] duration-300 ${
                      item.highlight 
                        ? "bg-rose-500/5 border-rose-500/15" 
                        : "bg-[#090f1d] border-white/5"
                    } shadow-xl relative overflow-hidden`}
                  >
                    <div className={`p-2 w-10 h-10 rounded-xl mb-3 flex items-center justify-center bg-white/5`}>
                      <item.icon className={`h-5 w-5 ${item.color === 'rose' ? 'text-rose-500' : (item.color === 'amber' ? 'text-amber-500' : (item.color === 'orange' ? 'text-orange-500' : (item.color === 'emerald' ? 'text-emerald-500' : 'text-blue-500')))}`} />
                    </div>
                    <div className="text-xl md:text-2xl font-black tracking-tighter text-slate-100">{item.value}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Área Interativa com Abas (Gantt vs Parecer Executivo) */}
              <div className="bg-[#090f1d]/50 border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden min-h-[600px] relative flex flex-col">
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/10">
                  <div className="flex bg-slate-950/60 p-1 rounded-full border border-white/5">
                    <button
                      onClick={() => setActiveTab("gantt")}
                      className={`px-6 py-2 rounded-full text-xs font-black uppercase transition-all ${
                        activeTab === "gantt"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      Visualização Gantt
                    </button>
                    <button
                      onClick={() => setActiveTab("executive")}
                      className={`px-6 py-2 rounded-full text-xs font-black uppercase transition-all ${
                        activeTab === "executive"
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      Parecer Executivo
                    </button>
                  </div>

                  <Button 
                    onClick={handleExportPdf}
                    className="rounded-full h-11 px-6 font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/10 transition-all border-none flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar Relatório PDF</span>
                  </Button>
                </div>

                <div className="flex-1 min-h-[500px]">
                  {activeTab === "gantt" ? (
                    <GanttView projectId={selectedProjectId!} />
                  ) : (
                    <ExecutivePresentation projectId={selectedProjectId!} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sem planos gerados ainda no roadmap ativo */}
          {selectedProject && projectPlans.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] border-white/10 bg-[#090f1d]/20 text-center">
              <MapIcon className="h-14 w-14 text-slate-600 mb-4 animate-pulse" />
              <h2 className="text-xl font-black text-slate-300">Nenhuma timeline ativa</h2>
              <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
                Clique no botão <strong>Otimizar Timeline</strong> acima para processar o inventário e desenhar a linha do tempo estratégica de conformidade técnica para este roadmap.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DIALOGS E MODALS DE INTEGRAÇÃO (COMPARTILHADOS) */}
      {/* ---------------------------------------------------- */}

      {/* AIChatGenerator Modal */}
      <AIChatGenerator open={isChatModalOpen} onOpenChange={setIsChatModalOpen} />

      {/* Auto Roadmap Review Dialog (AI preview confirmation flow) */}
      <Dialog open={showAutoReview} onOpenChange={(open) => {
        if (!open && !isAutoGenerating) {
          setShowAutoReview(false);
          setAutoReviewData(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Revisão de Roadmap</DialogTitle>
          <DialogDescription className="sr-only">Painel de revisão de roadmap gerado automaticamente.</DialogDescription>
          {autoReviewData && (
            <AIReviewPreview
              data={autoReviewData}
              onConfirm={handleAutoConfirm}
              onCancel={() => {
                setShowAutoReview(false);
                setAutoReviewData(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Formulário de Criação / Edição de Roadmap */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#070c19] border border-white/10 text-white rounded-3xl max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              {editingProject ? "Editar Projeto" : "Criar Novo Roadmap"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para criar ou editar as informações do projeto de roadmap.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 font-semibold">Nome do Projeto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Migração Windows Server 2025" {...field} className="bg-slate-950/60 border-white/10 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-semibold">Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/60 border-white/10 text-white">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#090f1d] border-white/10 text-white">
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.name} className="focus:bg-white/5 focus:text-white">{c.name}</SelectItem>
                          ))}
                          {categories.length === 0 && (
                            <SelectItem value="Geral" className="focus:bg-white/5 focus:text-white">Geral</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-semibold">Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/60 border-white/10 text-white">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#090f1d] border-white/10 text-white">
                          <SelectItem value="draft" className="focus:bg-white/5">Rascunho</SelectItem>
                          <SelectItem value="review" className="focus:bg-white/5">Em Revisão</SelectItem>
                          <SelectItem value="approved" className="focus:bg-white/5">Aprovado</SelectItem>
                          <SelectItem value="scheduled" className="focus:bg-white/5">Agendado</SelectItem>
                          <SelectItem value="in_progress" className="focus:bg-white/5">Em Andamento</SelectItem>
                          <SelectItem value="completed" className="focus:bg-white/5">Concluído</SelectItem>
                          <SelectItem value="blocked" className="focus:bg-white/5">Bloqueado</SelectItem>
                          <SelectItem value="cancelled" className="focus:bg-white/5">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-semibold">Data de Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-slate-950/60 border-white/10 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 font-semibold">Data Prevista de Término</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-slate-950/60 border-white/10 text-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 font-semibold">Responsável (Dono)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do gestor ou equipe" {...field} className="bg-slate-950/60 border-white/10 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
                  {editingProject ? "Salvar Alterações" : "Criar Projeto"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <ConfirmationModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            deleteMutation.mutate(projectToDelete);
          }
        }}
        title="Excluir Projeto de Roadmap?"
        description="Esta ação é irreversível. Todos os planos de migração e orçamentos vinculados a este projeto de planejamento estratégico serão apagados permanentemente da plataforma."
        confirmLabel="Sim, Excluir Projeto"
        variant="danger"
        destructiveLevel="critical"
        confirmationText="EXCLUIR"
      />

    </div>
  );
}
