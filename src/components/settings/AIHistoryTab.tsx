import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiHistoryService } from '@/services/aiHistoryService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, History, AlertCircle, Database, CheckCircle2, XCircle, ChevronDown, ChevronUp, Clock, Target, Zap } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AIHistoryTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: history, isLoading } = useQuery({
    queryKey: ['ai-history'],
    queryFn: aiHistoryService.getAll,
  });

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  const stats = {
    total: history?.length || 0,
    success: history?.filter(h => h.status === 'success').length || 0,
    failure: history?.filter(h => h.status === 'failure').length || 0,
    itemsGenerated: history?.reduce((acc, curr) => acc + curr.items_count, 0) || 0,
    avgConfidence: history?.filter(h => h.status === 'success' && h.metadata?.confidence_avg)
      .reduce((acc, curr, _, arr) => acc + (curr.metadata.confidence_avg / arr.length), 0) || 0
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
              <History className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total de Processamentos</p>
              <h4 className="text-2xl font-bold">{stats.total}</h4>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Ativos Gerados (IA)</p>
              <h4 className="text-2xl font-bold">{stats.itemsGenerated}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Confiança Média</p>
              <h4 className="text-2xl font-bold">{Math.round(stats.avgConfidence)}%</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Taxa de Sucesso</p>
              <h4 className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
              </h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Histórico */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Histórico de Geração
          </CardTitle>
          <CardDescription>Registro detalhado de todas as interações com o Motor de IA.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
              <TableRow>
                <TableHead className="pl-8">Status</TableHead>
                <TableHead>Projeto Sugerido</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Itens Identificados</TableHead>
                <TableHead>Tempo Atrás</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">Nenhum registro encontrado no histórico.</TableCell>
                </TableRow>
              )}
              {history?.map((record) => (
                <React.Fragment key={record.id}>
                  <TableRow className="group cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-900/80" onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}>
                    <TableCell className="pl-8">
                      {record.status === 'success' ? (
                        <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{record.project_name}</TableCell>
                    <TableCell>{record.user_profiles?.full_name || 'Usuário Desconhecido'}</TableCell>
                    <TableCell>
                      {record.status === 'success' ? (
                        <span className="font-semibold text-blue-600">{record.items_count} ativos</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(record.created_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="pr-8 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                        {expandedId === record.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedId === record.id && (
                    <TableRow className="bg-slate-50/30 dark:bg-slate-950/30">
                      <TableCell colSpan={6} className="px-8 py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Prompt de Entrada</h5>
                            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl text-sm text-slate-700 dark:text-slate-300 border shadow-inner max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                              {record.prompt}
                            </div>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Metadados e Diagnóstico</h5>
                            <div className="bg-white dark:bg-slate-950 p-4 rounded-xl text-sm border shadow-inner max-h-[200px] overflow-y-auto font-mono text-xs text-slate-600">
                              {JSON.stringify(record.metadata, null, 2)}
                            </div>
                            {record.status === 'failure' && record.metadata?.error && (
                              <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>{record.metadata.error}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
