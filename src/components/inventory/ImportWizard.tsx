import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, Check, Loader2, ArrowRight } from "lucide-react";
import { importService } from "@/services/importService";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table-custom";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export function ImportWizard({ onComplete, triggerClassName }: { onComplete: () => void; triggerClassName?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [, setRawData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
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

      setRawData(data);
      const metrics = await importService.analyzeImport(data);
      setAnalysis(metrics);
      setPreviewData(metrics.normalizedData.slice(0, 10));
      setStep(2);
    } catch (error) {
      toast.error("Erro ao ler o arquivo.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!analysis) return;
    setIsLoading(true);

    try {
      const history = await importService.processImport(analysis.normalizedData);
      setImportResult(history);
      toast.success("Importação concluída.");
      // Invalidate queries so Inventory and Dashboard refresh immediately
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      onComplete();
      setStep(3); // Result screen
    } catch (error) {
      toast.error("Erro durante a importação.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRawData([]);
    setPreviewData([]);
    setAnalysis(null);
    setImportResult(null);
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
      if (!open && step === 3) reset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <Upload className="h-4 w-4 mr-2" /> Importar Inventário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importação Inteligente do GLPI</DialogTitle>
          <DialogDescription className="sr-only">Selecione e envie a planilha de inventário para importar os dados para o sistema.</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Arraste o export do GLPI (CSV ou Excel) aqui ou clique para selecionar.<br/>
              O motor realizará deduplicação por Tag/Serial/Hostname e normalização de SOs automaticamente.
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

        {step === 2 && analysis && (
          <div className="space-y-4 w-full min-w-0">
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <Check className="h-4 w-4" /> Arquivo analisado: {file?.name}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Novos Ativos</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.newCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizações (Deduplicados)</p>
                <p className="text-2xl font-bold text-amber-600">{analysis.updateCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem SO</p>
                <p className="text-2xl font-bold text-red-500">{analysis.missingOs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem Hostname</p>
                <p className="text-2xl font-bold text-red-500">{analysis.missingHostname}</p>
              </div>
            </div>

            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong>Colunas mapeadas ({analysis.mappedColumns.length}):</strong> {analysis.mappedColumns.join(', ')}</p>
              <p><strong>Colunas ignoradas ({analysis.ignoredColumns.length}):</strong> {analysis.ignoredColumns.slice(0, 15).join(', ')}{analysis.ignoredColumns.length > 15 ? '...' : ''}</p>
            </div>

            <p className="text-sm font-semibold">Preview do mapeamento (10 linhas):</p>
            <div className="max-h-[250px] overflow-y-auto overflow-x-hidden border rounded-md">
              <div className="w-full overflow-x-auto min-w-0">
                <DataTable columns={previewColumns} data={previewData} />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="ghost" onClick={reset} disabled={isLoading}>Cancelar</Button>
              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar e Inserir
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && importResult && (
          <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-center">Inventário Sincronizado</h2>
            
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm w-full max-w-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Novos Inseridos</span>
                <span className="font-semibold text-green-600">{importResult.inserted_count}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Atualizados</span>
                <span className="font-semibold text-amber-600">{importResult.updated_count}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Duplicados Prevenidos</span>
                <span className="font-semibold text-blue-600">{importResult.duplicate_count}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Ignorados (Sem ID)</span>
                <span className="font-semibold text-red-500">{importResult.skipped_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sem SO</span>
                <span className="font-semibold">{importResult.missing_os_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Erros</span>
                <span className="font-semibold">{importResult.failed_records}</span>
              </div>
            </div>

            <Button 
              size="lg" 
              className="mt-6 w-full max-w-sm bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIsOpen(false);
                reset();
                navigate('/roadmaps');
                // Could emit an event or just navigate. The roadmap page has the wizard button.
              }}
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              Gerar Roadmap Automático
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
