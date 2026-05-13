import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from "lucide-react";
import { importService } from "@/services/importService";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";

export function ImportWizard({ onComplete }: { onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      let data: any[] = [];
      if (selectedFile.name.endsWith('.csv')) {
        data = await importService.parseCSV(selectedFile);
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        data = await importService.parseExcel(selectedFile);
      } else {
        toast.error("Formato de arquivo não suportado. Use CSV ou Excel.");
        return;
      }

      setPreviewData(data.slice(0, 10)); // Show first 10 rows
      setStep(2);
    } catch (error) {
      toast.error("Erro ao ler o arquivo.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);

    try {
      let data: any[] = [];
      if (file.name.endsWith('.csv')) {
        data = await importService.parseCSV(file);
      } else {
        data = await importService.parseExcel(file);
      }

      const history = await importService.processImport(data);
      toast.success(`Importação concluída: ${history.successful_records} sucessos, ${history.failed_records} falhas.`);
      onComplete();
      setIsOpen(false);
      reset();
    } catch (error) {
      toast.error("Erro durante a importação.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setStep(1);
  };

  const previewColumns: ColumnDef<any>[] = previewData.length > 0 
    ? Object.keys(previewData[0]).map(key => ({
        accessorKey: key,
        header: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) reset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" /> Importar Inventário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar Inventário (CSV/Excel)</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Arraste seu arquivo CSV ou Excel aqui ou clique para selecionar.<br/>
              O sistema fará o match automático de categorias e lifecycle.
            </p>
            <Input 
              type="file" 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileChange}
              className="max-w-xs"
              disabled={isLoading}
            />
            {isLoading && <Loader2 className="h-6 w-6 animate-spin mt-4" />}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <Check className="h-4 w-4" /> Arquivo carregado: {file?.name}
            </div>
            <p className="text-sm font-semibold">Preview dos dados (primeiras 10 linhas):</p>
            <div className="max-h-[300px] overflow-auto border rounded-md">
              <DataTable columns={previewColumns} data={previewData} />
            </div>
            <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
              <AlertCircle className="h-4 w-4" />
              Certifique-se de que as colunas 'hostname', 'device_type' e 'os_name' estejam presentes para melhor processamento.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={reset} disabled={isLoading}>Cancelar</Button>
          {step === 2 && (
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
