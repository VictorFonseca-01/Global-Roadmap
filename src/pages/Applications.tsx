import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationService } from "@/services/applicationService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { Application } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, AppWindow } from "lucide-react";
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

const appSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  vendor: z.string().optional(),
  current_version: z.string().optional(),
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  owner_department: z.string().optional(),
  notes: z.string().optional(),
});

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  const { data: apps = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => applicationService.getAll(),
  });

  const form = useForm<z.infer<typeof appSchema>>({
    resolver: zodResolver(appSchema),
    defaultValues: {
      name: "",
      vendor: "",
      current_version: "",
      criticality: "medium",
      owner_department: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => applicationService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Aplicação cadastrada!");
      setIsOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => applicationService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Aplicação atualizada!");
      setIsOpen(false);
      setEditingApp(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => applicationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Aplicação removida!");
    },
  });

  function onSubmit(values: z.infer<typeof appSchema>) {
    if (editingApp) {
      updateMutation.mutate({ id: editingApp.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<Application>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.vendor}</span>
        </div>
      ),
    },
    {
      accessorKey: "current_version",
      header: "Versão",
    },
    {
      accessorKey: "criticality",
      header: "Criticidade",
      cell: ({ row }) => {
        const crit = row.original.criticality;
        const variants: Record<string, string> = {
          critical: "bg-red-100 text-red-800",
          high: "bg-orange-100 text-orange-800",
          medium: "bg-yellow-100 text-yellow-800",
          low: "bg-green-100 text-green-800",
        };
        return <Badge variant="outline" className={variants[crit]}>{crit.toUpperCase()}</Badge>;
      },
    },
    {
      accessorKey: "owner_department",
      header: "Dono",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setEditingApp(row.original);
              form.reset({
                name: row.original.name,
                vendor: row.original.vendor || "",
                current_version: row.original.current_version || "",
                criticality: row.original.criticality,
                owner_department: row.original.owner_department || "",
                notes: row.original.notes || "",
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
              if (confirm("Excluir esta aplicação?")) {
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
          <AppWindow className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Aplicações</h1>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingApp(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Aplicação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingApp ? "Editar Aplicação" : "Cadastrar Aplicação"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SAP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Fabricante</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SAP SE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="current_version"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Versão Atual</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 7.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="criticality"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Criticidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="critical">Crítica</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="low">Baixa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="owner_department"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Departamento Responsável</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Financeiro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  {editingApp ? "Salvar" : "Cadastrar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={apps} 
        searchKey="name" 
      />
    </div>
  );
}
