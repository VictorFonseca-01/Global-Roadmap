import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { categoryService } from "@/services/categoryService";
import { roadmapWorkflowService } from "@/services/roadmapWorkflowService";
import { roadmapService } from "@/services/roadmapService";
import { migrationPlanService } from "@/services/migrationPlanService";
import { pdfService } from "@/services/pdfService";
import { deterministicEngineService } from "@/services/deterministicEngineService";

import type { RoadmapProject } from "@/types";
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
  DialogTitle
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
import { useUserProfile } from "@/hooks/useUserProfile";
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
  const { profile } = useUserProfile();
  
  // States
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<RoadmapProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gantt" | "executive">("gantt");

  // Relação de roles e permissões
  const role = profile?.role?.toLowerCase() || '';
  const canGenerateRoadmaps = role.includes('admin') || role.includes('director') || role.includes('manager') || true;

  // Queries
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  });

  // assets query removed as SO lists are abstracted

  const { data: allPlans = [] } = useQuery({
    queryKey: ["migration-plans"],
    queryFn: () => migrationPlanService.getAll(),
  });

  // SO lists are abstracted for simplified UI

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

  // Selecionar primeiro projeto ativo se houver
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

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

  // handleToggleSo removed for simplification

  // Ação de Geração/Otimização do Roadmap
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
        undefined, // Sempre processa todo o inventário por padrão
        30 // Margem recomendada corporativa de 30 dias
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

  // Exportação em PDF usando o pdfService corporativo
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
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-100">
      
      {/* HEADER SUPERIOR E SELETOR DE PROJETOS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <MapIcon className="h-6 w-6 text-blue-500" />
            <span className="text-xs font-black text-blue-500/80 uppercase tracking-[0.2em]">Planejamento Estratégico</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-slate-100">
            Roadmap / Timeline
            {selectedProject && (
              <Badge className="rounded-full px-4 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                {selectedProject.category}
              </Badge>
            )}
          </h1>
        </div>

        {/* CONTROLES DE PROJETO */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#090f1d] border border-white/5 p-1.5 rounded-full shadow-lg">
            <Select 
              value={selectedProjectId || ""} 
              onValueChange={setSelectedProjectId}
              disabled={isProjectsLoading || projects.length === 0}
            >
              <SelectTrigger className="h-9 px-4 rounded-full border-none shadow-none bg-transparent hover:bg-white/5 transition-all text-xs font-bold text-slate-300 w-[240px]">
                <SelectValue placeholder={isProjectsLoading ? "Carregando projetos..." : "Selecione o Projeto"} />
              </SelectTrigger>
              <SelectContent className="bg-[#090f1d] border border-white/10 rounded-2xl shadow-2xl text-white">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="focus:bg-white/5 focus:text-white rounded-lg">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProject && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-white">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#090f1d] border border-white/10 rounded-xl text-white">
                  <DropdownMenuItem 
                    className="focus:bg-white/5 focus:text-white cursor-pointer rounded-lg text-xs"
                    onClick={() => {
                      setEditingProject(selectedProject);
                      form.reset({
                        name: selectedProject.name,
                        category: selectedProject.category,
                        scope: selectedProject.scope || "corporate",
                        status: selectedProject.status,
                        description: selectedProject.description || "",
                        owner: selectedProject.owner || "",
                        start_date: selectedProject.start_date || "",
                        end_date: selectedProject.end_date || "",
                      });
                      setIsCreateOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar Dados do Projeto
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-500 focus:bg-red-500/10 focus:text-red-400 cursor-pointer rounded-lg text-xs"
                    onClick={() => setProjectToDelete(selectedProject.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Projeto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <Button 
            variant="outline"
            className="rounded-full border-white/10 bg-[#090f1d]/50 text-slate-300 hover:bg-white/5 hover:text-white h-11 px-5 text-xs font-bold"
            onClick={() => {
              setEditingProject(null);
              form.reset({
                name: "",
                category: categories[0]?.name || "",
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

      {/* PAINEL DE CONTROLE SIMPLIFICADO (Apple Enterprise SaaS style) */}
      {selectedProject && (
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-[#0c1427]/85 to-[#050912]/95 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 h-40 w-40 bg-blue-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-500/5 rounded-full blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Inteligência Estrutural Ativa</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Geração Automática de Roadmap
              </h2>
              <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                O motor inteligente analisa automaticamente o inventário corporativo, cruza dados com os ciclos de vida (EoL) oficiais dos fabricantes e projeta uma linha do tempo segura com margem de segurança padrão de 30 dias.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Button 
                onClick={handleGenerateRoadmap}
                disabled={isGenerating || isProjectsLoading}
                className="h-12 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>Gerar / Otimizar Roadmap</span>
              </Button>

              {canGenerateRoadmaps && (
                <Button 
                  variant="outline"
                  onClick={() => setIsChatModalOpen(true)}
                  className="h-12 px-6 rounded-2xl border-white/10 hover:border-blue-500/30 bg-white/5 hover:bg-blue-500/5 text-slate-300 hover:text-blue-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Gerar via Chat IA</span>
                </Button>
              )}
              <AIChatGenerator open={isChatModalOpen} onOpenChange={setIsChatModalOpen} />
            </div>
          </div>
        </div>
      )}

      {/* METRICA SUMMARY DE PERFORMANCE E TABS */}
      {selectedProject && projectPlans.length > 0 && (
        <div className="space-y-6">
          
          {/* Summary Cards Premium (Estilo RoadmapTimeline Page) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Planejado", value: stats.totalAssets, icon: ClipboardCheck, color: "blue" },
              { label: "Fora de Suporte", value: stats.outOfSupport, icon: ShieldAlert, color: "rose", highlight: stats.outOfSupport > 0 },
              { label: "Risco Crítico", value: stats.critical, icon: AlertTriangle, color: "amber", highlight: stats.critical > 0 },
              { label: "EoL 180 Dias", value: stats.next180Days, icon: CalendarDays, color: "orange" },
              { label: "Orçamento Estimado", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.estimatedBudget), icon: Download, color: "emerald" },
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

          {/* ÁREA INTERATIVA DO GANTT E APRESENTAÇÃO EXEC */}
          <div className="bg-[#090f1d]/50 border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden min-h-[600px] relative flex flex-col">
            
            {/* Abas e botão exportar */}
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

            {/* Conteúdo Ativo da Aba */}
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

      {/* CASO NÃO HAJA PROJETOS GERADOS AINDA */}
      {selectedProject && projectPlans.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-[3rem] border-white/10 bg-[#090f1d]/20 text-center select-none">
          <MapIcon className="h-14 w-14 text-slate-600 mb-4 animate-pulse" />
          <h2 className="text-xl font-black text-slate-300">Nenhum roadmap ativo</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
            Selecione os Sistemas Operacionais do seu inventário no painel acima e clique em <strong>Gerar / Otimizar Roadmap</strong> para desenhar a timeline estratégica de conformidade técnica.
          </p>
        </div>
      )}

      {/* FORMULÁRIO DE DIALOG PARA CRIAR/EDITAR PROJETO */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#070c19] border border-white/10 text-white rounded-3xl max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              {editingProject ? "Editar Projeto" : "Criar Novo Roadmap"}
            </DialogTitle>
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

      {/* MODAL DE DELEÇÃO COM CONFIRMATION MODAL CENTRALIZADO */}
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
