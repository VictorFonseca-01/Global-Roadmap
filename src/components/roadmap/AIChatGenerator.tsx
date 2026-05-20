import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AIReviewPreview } from "./AIReviewPreview";
import { geminiService } from "@/services/geminiService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";
import type { AIReviewData, AIReviewItem } from "@/types";
import { Loader2, AlertCircle, Sparkles, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { aiHistoryService } from "@/services/aiHistoryService";
import { lifecycleEnrichmentService } from "@/services/lifecycleEnrichmentService";

interface AIChatGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIChatGenerator({ open, onOpenChange }: AIChatGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<AIReviewData | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const navigate = useNavigate();

  // Load Draft
  useEffect(() => {
    if (open) {
      const saved = sessionStorage.getItem('ai_roadmap_draft');
      if (saved && !prompt && !reviewData) {
        setDraftPrompt(saved);
        setShowDraftRestore(true);
      }
    }
  }, [open]);

  // Save Draft (debounce)
  useEffect(() => {
    if (open && prompt.length > 10) {
      const timeout = setTimeout(() => {
        sessionStorage.setItem('ai_roadmap_draft', prompt);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [prompt, open]);

  const handleRequestClose = () => {
    if (loading) return;
    if (prompt.length > 50 || reviewData) {
      setShowConfirmClose(true);
    } else {
      forceClose();
    }
  };

  const forceClose = () => {
    setPrompt("");
    setReviewData(null);
    setError(null);
    setShowConfirmClose(false);
    onOpenChange(false);
  };

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setLoading(true);
    try {
      setLoadingStep("Interpretando ambiente...");
      
      const parsed = await geminiService.parseRoadmapPrompt(prompt);
      
      setLoadingStep("Validando dados e preparando prévia...");
      // Mapear retorno simples para os tipos requeridos pela tabela executiva
      const reviewItems: AIReviewItem[] = parsed.items.map((item, idx) => {
        // Lógica de compatibilidade mock ou baseada no tipo para preview
        let compatibility_risk: 'low' | 'medium' | 'high' = 'low';
        let notes = '';
        if (item.product_name.toLowerCase().includes('server') || item.asset_type === 'server') {
          compatibility_risk = 'medium';
          notes = 'Exige homologação de aplicações hospedadas';
        }
        if (item.version && parseInt(item.version.replace(/\D/g,'')) < 2012) {
           compatibility_risk = 'high';
           notes = 'Aplicações legadas podem falhar na migração direta';
        }

        let calculatedScore = 0;
        let confidence_source: 'ai' | 'deterministic_fallback' = 'ai';
        let confidence_score = item.confidence_score;
        if (confidence_score === undefined || confidence_score === null) {
          confidence_source = 'deterministic_fallback';
          if (item.vendor) calculatedScore += 15;
          if (item.product_name) calculatedScore += 20;
          if (item.version && item.version.toLowerCase() !== 'unknown' && item.version.toLowerCase() !== 'n/a') calculatedScore += 25;
          if (item.asset_type) calculatedScore += 15;
          if (item.implemented_at) calculatedScore += 25;
          confidence_score = calculatedScore;
        }

        return {
          ...item,
          id: `gen-${Date.now()}-${idx}`,
          calculated_criticality: item.business_criticality,
          compatibility_risk,
          estimated_cost: item.asset_type === 'server' ? 5000 : 1200,
          confidence_score,
          confidence_source,
          notes
        };
      });

      if (!parsed.items || parsed.items.length === 0) {
        throw new Error("Nenhum item de tecnologia pôde ser extraído do texto. Tente fornecer mais detalhes (ex: nomes de sistemas operacionais, versões e datas).");
      }

      const enrichedItems = await lifecycleEnrichmentService.enrichLifecycleData(reviewItems);

      setReviewData({
        ...parsed,
        items: enrichedItems
      });

      if (parsed.warning_message) {
        toast.warning(parsed.warning_message, { duration: 8000 });
      }

    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao interpretar dados.");
      await aiHistoryService.logFailure({ prompt, errorMsg: err.message });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleConfirm = async (data: AIReviewData) => {
    setError(null);
    setLoading(true);
    setLoadingStep("Gerando roadmap...");
    try {
      const result = await aiRoadmapGeneratorService.generateRoadmapFromAIReview(data);
      if (!result.success) {
        throw new Error(result.errors.join(", "));
      }
      
      await aiHistoryService.logSuccess({
        prompt,
        projectName: data.project_name,
        itemsCount: data.items.length,
        projectId: result.roadmapProjectId || undefined,
        metadata: { confidence_avg: data.items.reduce((acc, curr) => acc + (curr.confidence_score || 0), 0) / (data.items.length || 1) }
      });

      sessionStorage.removeItem('ai_roadmap_draft');
      toast.success("Roadmap gerado com sucesso via IA!");
      forceClose();
      if (result.roadmapProjectId) {
        navigate(`/roadmap-timeline?projectId=${result.roadmapProjectId}`);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao gerar roadmap.");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const charCount = prompt.length;
  const isWarning = charCount > 3000;
  const isBlocked = charCount > 6000;

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleRequestClose()}>
      <DialogContent 
        className={`${reviewData ? 'max-w-[95vw] h-[95vh] p-0' : 'sm:max-w-[600px]'} flex flex-col overflow-hidden`}
        onInteractOutside={(e) => { e.preventDefault(); handleRequestClose(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); handleRequestClose(); }}
      >
        {!reviewData ? (
          <>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Complementar Inventário com IA
              </DialogTitle>
              <DialogDescription>
                Você pode complementar o inventário com informações que não estão no GLPI, como datas de implantação, prioridades ou restrições. O inventário importado já é a base principal do roadmap.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                <strong className="block mb-1">Exemplos de complemento:</strong>
                <p className="opacity-80">
                  "Windows 10 foi implementado em 01/01/2024 e queremos iniciar a migração 10 dias a partir de hoje." ou "Priorize servidores" ou "Desconsidere máquinas de laboratório".
                </p>
              </div>

              <div className="relative flex-1 flex flex-col">
                <textarea 
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Adicione contexto extra que não está na planilha do GLPI..."
                  className={`flex-1 min-h-[200px] w-full p-4 rounded-md border bg-slate-50 dark:bg-slate-900/50 resize-none focus:outline-none focus:ring-2 ${isWarning && !isBlocked ? 'border-yellow-400 focus:ring-yellow-500' : isBlocked ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500'}`}
                  disabled={loading}
                />
                <div className={`absolute bottom-3 right-3 text-xs font-medium ${isBlocked ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-slate-400'}`}>
                  {charCount} / 6000
                </div>
              </div>

              {isWarning && !isBlocked && (
                <div className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Prompts muito longos podem gerar respostas truncadas.
                </div>
              )}
              {isBlocked && (
                <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> Limite máximo atingido. Reduza o texto para continuar.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 gap-2">
                <Button variant="ghost" onClick={handleRequestClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleParse} 
                  disabled={loading || charCount < 10 || isBlocked}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {loadingStep}
                    </>
                  ) : (
                    <>
                      <MessageSquareText className="mr-2 h-4 w-4" />
                      Analisar Dados
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full relative">
            <AIReviewPreview 
              initialData={reviewData}
              onConfirm={handleConfirm}
              onCancel={handleRequestClose}
              onBackToChat={() => setReviewData(null)}
            />
            {/* Aviso Flutuante sobre Assets Agrupadores */}
            <div className="absolute top-4 right-4 max-w-sm pointer-events-none">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-3 rounded shadow-lg text-xs text-yellow-800 dark:text-yellow-400 flex gap-2 pointer-events-auto">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Aviso Importante:</strong> Esta geração criará itens que representam "grupos lógicos" (ex: "Todos Windows 10"). Para o acompanhamento real das migrações, você deverá vincular os hostnames físicos da sua rede a estes planos posteriormente.
                </p>
              </div>
            </div>
            
            {/* Loading Overlay durante geração final */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{loadingStep}</p>
              </div>
            )}
          </div>
        )}

        <ConfirmationModal
          isOpen={showDraftRestore}
          onClose={() => {
            sessionStorage.removeItem('ai_roadmap_draft');
            setShowDraftRestore(false);
          }}
          onConfirm={() => {
            setPrompt(draftPrompt);
            setShowDraftRestore(false);
          }}
          title="Rascunho Encontrado"
          description="Encontramos uma análise anterior não finalizada. Deseja restaurar o texto digitado?"
          confirmLabel="Restaurar"
          cancelLabel="Descartar"
          variant="info"
          disablePortal={true}
        />

        <ConfirmationModal
          isOpen={showConfirmClose}
          onClose={() => setShowConfirmClose(false)}
          onConfirm={() => {
            sessionStorage.removeItem('ai_roadmap_draft');
            forceClose();
          }}
          title="Descartar Análise IA?"
          description="Toda a análise atual e os itens revisados serão perdidos. Tem certeza que deseja fechar?"
          confirmLabel="Sim, Descartar"
          cancelLabel="Continuar Editando"
          variant="danger"
          disablePortal={true}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
