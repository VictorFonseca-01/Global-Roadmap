import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roadmapService } from "@/services/roadmapService";
import { categoryService } from "@/services/categoryService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoadmapProject } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Map, Calendar } from "lucide-react";
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
import { format, parseISO } from "date-fns";

const projectSchema = z.object({
  name: z.string().min(3, "Nome do projeto deve ter pelo menos 3 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  scope: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
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

  const { data: projects = [] } = useQuery({
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
    mutationFn: (data: any) => roadmapService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      toast.success("Projeto de Roadmap criado!");
      setIsOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => roadmapService.update(id, data),
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
      toast.success("Projeto excluído!");
    },
  });

  function onSubmit(values: z.infer<typeof projectSchema>) {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<RoadmapProject>[] = [
    {
      accessorKey: "name",
      header: "Nome do Projeto",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.owner || "Sem dono"}</span>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Categoria",
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variants: Record<string, string> = {
          draft: "bg-gray-100 text-gray-800",
          active: "bg-green-100 text-green-800",
          completed: "bg-blue-100 text-blue-800",
          archived: "bg-amber-100 text-amber-800",
        };
        return <Badge className={variants[status]}>{status.toUpperCase()}</Badge>;
      },
    },
    {
      accessorKey: "start_date",
      header: "Período",
      cell: ({ row }) => {
        if (!row.original.start_date) return "-";
        return (
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            {format(parseISO(row.original.start_date), "MMM/yy")} - 
            {row.original.end_date ? format(parseISO(row.original.end_date), "MMM/yy") : "Ativo"}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
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
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-500"
            onClick={() => {
              if (confirm("Excluir este projeto de roadmap?")) {
                deleteMutation.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Projetos de Roadmap</h1>
        </div>
        <div className="flex items-center gap-2">
          <RoadmapGeneratorWizard />
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
                  render={({ field }: { field: any }) => (
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
                    render={({ field }: { field: any }) => (
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
                    render={({ field }: { field: any }) => (
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
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="completed">Concluído</SelectItem>
                            <SelectItem value="archived">Arquivado</SelectItem>
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
                    render={({ field }: { field: any }) => (
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
                    render={({ field }: { field: any }) => (
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
                  render={({ field }: { field: any }) => (
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

    <DataTable 
        columns={columns} 
        data={projects} 
        searchKey="name" 
      />
    </div>
  );
}
