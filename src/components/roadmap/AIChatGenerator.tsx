import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AIReviewPreview } from "./AIReviewPreview";
import { geminiService } from "@/services/geminiService";
import { aiRoadmapGeneratorService } from "@/services/aiRoadmapGeneratorService";
import type { AIReviewData, AIReviewItem } from "@/types";
import { Loader2, AlertCircle, Sparkles, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !loading) {
      setPrompt("");
      setReviewData(null);
      setError(null);
      onOpenChange(false);
    }
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

        return {
          ...item,
          id: `gen-${Date.now()}-${idx}`,
          calculated_criticality: item.business_criticality,
          compatibility_risk,
          estimated_cost: item.asset_type === 'server' ? 5000 : 1200,
          notes
        };
      });

      setReviewData({
        ...parsed,
        items: reviewItems
      });

    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao interpretar dados.");
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
      toast.success("Roadmap gerado com sucesso via IA!");
      handleOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${reviewData ? 'max-w-[95vw] h-[95vh] p-0' : 'sm:max-w-[600px]'} flex flex-col overflow-hidden`}>
        {!reviewData ? (
          <>
            <DialogHeader className="p-6 pb-2">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Gerador de Roadmap Inteligente
              </DialogTitle>
              <DialogDescription>
                Descreva o seu ambiente em linguagem natural ou cole um relatório existente. A IA identificará os ativos, estimará custos e alertará sobre riscos antes de criar o projeto final.
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 flex-1 flex flex-col gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                <strong className="block mb-1">Exemplo de entrada:</strong>
                <p className="opacity-80">
                  "Temos Windows 10 22H2 implementado em 01/01/2020, Windows 11 23H2 implementado em 10/02/2024 e Windows Server 2012 R2 implementado em 15/03/2016. Gere um roadmap Microsoft Client e Server."
                </p>
              </div>

              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Cole as informações do seu parque aqui..."
                className="flex-1 min-h-[200px] w-full p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm border border-red-200 dark:border-red-900/50">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 gap-2">
                <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleParse} 
                  disabled={loading || prompt.trim().length < 10}
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
              onCancel={() => handleOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  );
}
