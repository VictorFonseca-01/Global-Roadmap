import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lifecycleService } from "@/services/lifecycleService";
import { categoryService } from "@/services/categoryService";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import type { LifecycleItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, BookOpen, Calendar as CalendarIcon } from "lucide-react";
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

const lifecycleSchema = z.object({
  category_id: z.string().min(1, "Selecione uma categoria"),
  vendor: z.string().min(1, "Fabricante é obrigatório"),
  product_name: z.string().min(1, "Nome do produto é obrigatório"),
  model: z.string().optional(),
  version: z.string().optional(),
  asset_type: z.string().optional(),
  end_of_support: z.string().min(1, "Data de fim de suporte é obrigatória"),
  successor_version: z.string().optional(),
  notes: z.string().optional(),
});

export default function LifecyclePage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LifecycleItem | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["lifecycle"],
    queryFn: () => lifecycleService.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.getAll(),
  });

  const form = useForm<z.infer<typeof lifecycleSchema>>({
    resolver: zodResolver(lifecycleSchema),
    defaultValues: {
      category_id: "",
      vendor: "",
      product_name: "",
      model: "",
      version: "",
      asset_type: "software",
      end_of_support: "",
      successor_version: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => lifecycleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifecycle"] });
      toast.success("Item de lifecycle criado!");
      setIsOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => lifecycleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifecycle"] });
      toast.success("Item atualizado!");
      setIsOpen(false);
      setEditingItem(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lifecycleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lifecycle"] });
      toast.success("Item excluído!");
    },
  });

  function onSubmit(values: z.infer<typeof lifecycleSchema>) {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const columns: ColumnDef<LifecycleItem>[] = [
    {
      accessorKey: "product_name",
      header: "Produto",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.product_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.vendor}</span>
        </div>
      ),
    },
    {
      accessorKey: "version",
      header: "Versão",
    },
    {
      accessorKey: "asset_categories.name",
      header: "Categoria",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.asset_categories?.name}</Badge>
      ),
    },
    {
      accessorKey: "end_of_support",
      header: "End of Support",
      cell: ({ row }) => {
        const date = parseISO(row.original.end_of_support);
        const isPast = date < new Date();
        return (
          <div className={`flex items-center gap-2 ${isPast ? "text-red-500 font-bold" : ""}`}>
            <CalendarIcon className="h-4 w-4" />
            {format(date, "dd/MM/yyyy")}
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
              setEditingItem(row.original);
              form.reset({
                category_id: row.original.category_id,
                vendor: row.original.vendor,
                product_name: row.original.product_name,
                model: row.original.model || "",
                version: row.original.version || "",
                asset_type: row.original.asset_type || "software",
                end_of_support: row.original.end_of_support,
                successor_version: row.original.successor_version || "",
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
              if (confirm("Excluir este item de lifecycle?")) {
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
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Lifecycle</h1>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingItem(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Item" : "Novo Item de Lifecycle"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category_id"
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
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="asset_type"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="hardware">Hardware</SelectItem>
                          <SelectItem value="license">Licença</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="Ex: Microsoft" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="product_name"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Produto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Windows Server" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Versão</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 2022" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_of_support"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>End of Support</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="successor_version"
                  render={({ field }: { field: any }) => (
                    <FormItem>
                      <FormLabel>Versão Sucessora</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }: { field: any }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Input placeholder="..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="col-span-2 w-full">
                  {editingItem ? "Salvar" : "Criar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable 
        columns={columns} 
        data={items} 
        searchKey="product_name" 
      />
    </div>
  );
}
