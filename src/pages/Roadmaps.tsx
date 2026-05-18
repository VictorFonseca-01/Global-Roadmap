import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmapService";
import { roadmapGeneratorService } from "@/services/roadmapGeneratorService";
import { categoryService } from "@/services/categoryService";

import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoadmapProject } from "@/types";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Map, MoreHorizontal, Loader2, Zap } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";



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

import { RoadmapGeneratorWizard } from "@/components/roadmap/RoadmapGeneratorWizard";

export default function RoadmapsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<RoadmapProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: () => roadmapService.getAll(),
  });


  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  });

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

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof projectSchema>) => roadmapService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Projeto de Roadmap criado!");
      setIsOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoadmapProject> }) => roadmapService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Projeto atualizado!");
      setIsOpen(false);
      setEditingProject(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roadmapService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Projeto excluído com sucesso!");
      setProjectToDelete(null);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir", { description: error.message });
      setProjectToDelete(null);
    }
  });

  function onSubmit(values: z.infer<typeof projectSchema>) {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const navigate = useNavigate();

  const generateMutation = useMutation({
    mutationFn: (projectId: string) => roadmapGeneratorService.generate(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Roadmap gerado com sucesso!");
      navigate(`/roadmap-timeline?projectId=${projectId}`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar roadmap: " + error.message);
    }
  });

  const columns: ColumnDef<RoadmapProject>[] = [
    {
      accessorKey: "name",
      header: "Projeto / Responsável",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.original.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{row.original.owner || "Sem dono"}</span>
        </div>
      ),
    },
    {
      accessorKey: "stats",
      header: "Resumo Estratégico",
      cell: ({ row }) => (
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Ativos</span>
            <span className="font-bold">{row.original.total_assets || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Críticos</span>
            <span className="font-bold text-red-500">{row.original.critical_count || 0}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Orçamento</span>
            <span className="font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.original.estimated_budget || 0)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, string> = {
          draft: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
          review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
          approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
          scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
          in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          blocked: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
          cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        };
        return <Badge className={`${variants[status]} border-none rounded-full px-3`}>{status.toUpperCase()}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Ações do Roadmap",
      cell: ({ row }) => {
        const hasPlans = (row.original.total_migration_plans || 0) > 0;
        
        return (
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {hasPlans ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-4"
                      onClick={() => navigate(`/roadmap-timeline?projectId=${row.original.id}`)}
                    >
                      <Map className="h-3.5 w-3.5 mr-2" /> Abrir Timeline
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Visualizar planejamento detalhado</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/20 h-8 px-4"
                      disabled={generateMutation.isPending}
                      onClick={() => generateMutation.mutate(row.original.id)}
                    >
                      {generateMutation.isPending && generateMutation.variables === row.original.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 mr-2" />
                      )}
                      Gerar Roadmap
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Executar Motor Determinístico para este projeto</TooltipContent>
                </Tooltip>
              )}

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Mais opções</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => {
                    setEditingProject(row.original);
                    form.reset({
                      name: row.original.name,
                      category: row.original.category,
                      scope: row.original.scope || "corporate",
                      status: row.original.status,
                      description: row.original.description || "",
                      owner: row.original.owner || "",
                      start_date: row.original.start_date || "",
                      end_date: row.original.end_date || "",
                    });
                    setIsOpen(true);
                  }}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar Projeto
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600"
                    onClick={() => setProjectToDelete(row.original.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TooltipProvider>
        );
      },
    },

  ];


  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-black tracking-tighter">Projetos de Roadmap</h1>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <RoadmapGeneratorWizard />
            </TooltipTrigger>
            <TooltipContent>Criar novo projeto e gerar planos em um único fluxo</TooltipContent>
          </Tooltip>
          <Dialog open={isOpen} onOpenChange={(open) => {

          setIsOpen(open);
          if (!open) {
            setEditingProject(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Projeto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Editar Projeto" : "Criar Novo Roadmap"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Migração Windows 11 - 2025" {...field} />
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
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                            {categories.length === 0 && (
                              <SelectItem value="default" disabled>Nenhuma categoria encontrada</SelectItem>
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
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Rascunho</SelectItem>
                            <SelectItem value="review">Em Revisão</SelectItem>
                            <SelectItem value="approved">Aprovado</SelectItem>
                            <SelectItem value="scheduled">Agendado</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="blocked">Bloqueado</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
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
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>Data Prevista de Término</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                      <FormLabel>Responsável (Dono)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do responsável" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingProject ? "Salvar Alterações" : "Criar Roadmap"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {projects.length === 0 ? (
      <EmptyState 
        icon={Map}
        title="Nenhum roadmap encontrado"
        description="Você ainda não criou nenhum projeto de planejamento estratégico. Comece criando um novo projeto para visualizar o ciclo de vida dos seus ativos."
        actionLabel="Criar Projeto"
        onAction={() => setIsOpen(true)}
      />
    ) : (
      <DataTable 
        columns={columns} 
        data={projects} 
        searchKey="name" 
      />
    )}

    <ConfirmationModal
      isOpen={!!projectToDelete}
      onClose={() => setProjectToDelete(null)}
      onConfirm={() => {
        if (projectToDelete) {
          deleteMutation.mutate(projectToDelete);
        }
      }}
      title="Excluir Projeto de Roadmap?"
      description="Esta ação é irreversível. Todos os planos de migração atrelados a este projeto serão apagados permanentemente."
      confirmLabel="Sim, Excluir Projeto"
      variant="destructive"
    />
  </div>
);
}



