import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Trash2, ExternalLink, ChevronDown, ChevronUp, Clock, ShieldAlert, TrendingUp, Sparkles } from "lucide-react";
import { differenceInDays } from 'date-fns';
import type { AIReviewData, AIReviewItem, Criticality } from "@/types";

interface AIReviewPreviewProps {
  initialData?: AIReviewData;
  data?: AIReviewData;
  onConfirm: (data: AIReviewData) => void;
  onCancel: () => void;
  onBackToChat?: () => void;
}

export function AIReviewPreview({ initialData, data: dataProp, onConfirm, onCancel, onBackToChat }: AIReviewPreviewProps) {
  const [data, setData] = useState<AIReviewData>(initialData || dataProp!);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const handleUpdateItem = (id: string, updates: Partial<AIReviewItem>) => {
    setData(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveItem = (id: string) => {
    setData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };
  const {
    criticalCount,
    eolWarningCount,
    estimatedTotal,
    nextCriticalDate,
    avgMigrationTime,
    accumulatedRiskPct,
    nonCompliantCount,
    withoutSuccessorCount,
    legacyCriticalCount,
    opexSavingsTotal
  } = useMemo(() => {
    const critCount = data.items.filter(i => i.calculated_criticality === 'critical').length;
    const eolWarning = data.items.filter(i => i.support_status === 'out_of_support' || i.support_status === 'near_eol').length;
    const estTotal = data.items.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

    const allEols = data.items
      .map(i => i.end_of_support)
      .filter((eol): eol is string => !!eol)
      .map(eol => new Date(eol));
    const nextCrit = allEols.length > 0
      ? new Date(Math.min(...allEols.map(d => d.getTime())))
      : null;

    const migrationDaysList = data.items
      .map(i => {
        if (i.suggested_start && i.suggested_deadline) {
          const start = new Date(i.suggested_start);
          const end = new Date(i.suggested_deadline);
          return Math.max(0, differenceInDays(end, start));
        }
        return 0;
      })
      .filter(d => d > 0);
    const avgMigTime = migrationDaysList.length > 0
      ? Math.round(migrationDaysList.reduce((a, b) => a + b, 0) / migrationDaysList.length)
      : 120;

    const totalAssets = data.items.length || 1;
    const highRiskAssets = data.items.filter(i => 
      i.support_status === 'out_of_support' || 
      i.support_status === 'near_eol' ||
      i.calculated_criticality === 'critical'
    ).length;
    const accRiskPct = Math.round((highRiskAssets / totalAssets) * 100);

    const nonCompliant = data.items.filter(i => i.support_status === 'out_of_support').length;
    const withoutSuccessor = data.items.filter(i => !i.successor_version).length;
    const legacyCrit = data.items.filter(i => i.compatibility_risk === 'high' && i.calculated_criticality === 'critical').length;
    const opexSavings = data.items.reduce((acc, curr) => acc + (curr.opex_savings || 0), 0);

    return {
      criticalCount: critCount,
      eolWarningCount: eolWarning,
      estimatedTotal: estTotal,
      nextCriticalDate: nextCrit,
      avgMigrationTime: avgMigTime,
      accumulatedRiskPct: accRiskPct,
      nonCompliantCount: nonCompliant,
      withoutSuccessorCount: withoutSuccessor,
      legacyCriticalCount: legacyCrit,
      opexSavingsTotal: opexSavings
    };
  }, [data.items]);

  const getSupportStatusBadge = (status: AIReviewItem['support_status']) => {
    switch (status) {
      case 'supported':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-1 border-none"><CheckCircle2 className="w-3 h-3" /> Supported</Badge>;
      case 'near_eol':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 border-none"><AlertTriangle className="w-3 h-3" /> Near EoL</Badge>;
      case 'out_of_support':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-medium flex items-center gap-1 border-none"><AlertCircle className="w-3 h-3" /> Out of Support</Badge>;
      case 'extended_support':
        return <Badge className="bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center gap-1 border-none"><Info className="w-3 h-3" /> Extended</Badge>;
      case 'unknown':
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center gap-1 border-none"><AlertTriangle className="w-3 h-3" /> Revisar lifecycle</Badge>;
      default:
        return <Badge className="bg-slate-400 text-white font-medium flex items-center gap-1 border-none">Unknown</Badge>;
    }
  };

  const getCriticalityColor = (crit: string) => {
    switch(crit) {
      case 'critical': return 'text-red-600 font-bold';
      case 'high': return 'text-orange-500 font-bold';
      case 'medium': return 'text-yellow-600 font-medium';
      case 'low': return 'text-green-600';
      default: return 'text-gray-500';
    }
  };

  // Ordenar itens colocando os mais críticos de suporte e severidade no topo!
  const sortedItems = useMemo(() => {
    return [...data.items].sort((a, b) => {
      const statusWeight = {
        'out_of_support': 4,
        'near_eol': 3,
        'extended_support': 2,
        'supported': 1,
        'unknown': 0
      };
      const weightA = statusWeight[a.support_status || 'unknown'] || 0;
      const weightB = statusWeight[b.support_status || 'unknown'] || 0;
      
      if (weightA !== weightB) return weightB - weightA;
      
      const critWeight = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
      };
      const cA = critWeight[a.calculated_criticality || 'low'] || 0;
      const cB = critWeight[b.calculated_criticality || 'low'] || 0;
      return cB - cA;
    });
  }, [data.items]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-lg overflow-hidden border shadow-sm">
      {/* Header Executivo */}
      <div className="bg-white dark:bg-slate-950 p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Sala de Validação Executiva
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Revisão do roadmap gerado via IA: <strong className="text-slate-700 dark:text-slate-300">{data.project_name}</strong> ({data.category})
          </p>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1 text-sm"><AlertTriangle className="w-4 h-4 mr-2" /> {criticalCount} Ativos Críticos</Badge>
          )}
          {eolWarningCount > 0 && (
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2" /> {eolWarningCount} Sob Risco de EoL
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 p-4 bg-slate-50 dark:bg-slate-900/50">
            {/* Card 1: Ambientes Fora de Compliance */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fora Compliance</span>
                  <div className="h-6 w-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-black text-rose-600">{nonCompliantCount}</p>
                  <p className="text-[9px] text-slate-400 font-medium">Out of Support</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Risco Acumulado */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risco Acumulado</span>
                  <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-black text-orange-500">{accumulatedRiskPct}%</p>
                  <p className="text-[9px] text-slate-400 font-medium">Índice Geral</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Janela Crítica */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Janela Crítica</span>
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {nextCriticalDate ? nextCriticalDate.toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">Próximo EoL</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Tempo Médio de Migração */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tempo Médio</span>
                  <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-black text-violet-600">{avgMigrationTime}d</p>
                  <p className="text-[9px] text-slate-400 font-medium">Janela Média</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Sistemas sem Sucessor */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sem Sucessor</span>
                  <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">{withoutSuccessorCount}</p>
                  <p className="text-[9px] text-slate-400 font-medium">Sem Upgrade</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Legados Críticos */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Legados Críticos</span>
                  <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-black text-amber-600">{legacyCriticalCount}</p>
                  <p className="text-[9px] text-slate-400 font-medium">Alto Risco</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 7: CAPEX Estimado */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CAPEX Total</span>
                  <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-emerald-600 truncate">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(estimatedTotal)}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">Investimento</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 8: OPEX Reduzido */}
            <Card className="bg-white dark:bg-slate-950 border-none shadow-sm hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OPEX Reduzido</span>
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-blue-600 truncate">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(opexSavingsTotal)}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">Economia Anual</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <ScrollArea className="flex-1 border-t bg-white dark:bg-slate-950">
            <div className="p-4 min-w-[1250px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-transparent">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Produto & Versão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>EoL / Sucessor</TableHead>
                    <TableHead>Janela Recomendada</TableHead>
                    <TableHead>Criticidade</TableHead>
                    <TableHead>Custo ($)</TableHead>
                    <TableHead>Risco Compatibilidade</TableHead>
                    <TableHead>Confiança IA</TableHead>
                    <TableHead>Status Suporte</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                        Nenhum item identificado.
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedItems.map((item) => {
                    const isExpanded = expandedItemId === item.id;
                    return (
                      <>
                        <TableRow key={item.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-900/40 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                          <TableCell className="w-[40px] text-center" onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              {item.vendor} {item.product_name}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">v. {item.version}</div>
                            
                            {/* Executive Risk Insights */}
                            {item.risk_insights && item.risk_insights.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.risk_insights.map((insight, idx) => (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-100 dark:border-red-900/30">
                                    {insight}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{item.asset_type}</Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="text-sm font-semibold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              {item.end_of_support ? new Date(item.end_of_support).toLocaleDateString() : '-'}
                              {item.lifecycle_url && (
                                <a href={item.lifecycle_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors" title="Fonte Oficial Microsoft">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              ↳ 
                              <Input 
                                value={item.successor_version || ''} 
                                onChange={e => handleUpdateItem(item.id, { successor_version: e.target.value })}
                                placeholder="Sucessor?"
                                className="h-6 w-32 px-1 py-0 text-xs bg-transparent border-transparent hover:border-slate-200 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.suggested_start && item.suggested_deadline ? (
                              <div className="text-xs space-y-1">
                                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Início:</span> {new Date(item.suggested_start).toLocaleDateString()}
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Prazo:</span> {new Date(item.suggested_deadline).toLocaleDateString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Select 
                              value={item.calculated_criticality} 
                              onValueChange={(v) => handleUpdateItem(item.id, { calculated_criticality: v as Criticality })}
                            >
                              <SelectTrigger className={`h-8 w-[110px] text-xs border-transparent hover:border-slate-200 ${getCriticalityColor(item.calculated_criticality)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low" className="text-green-600">Low</SelectItem>
                                <SelectItem value="medium" className="text-yellow-600">Medium</SelectItem>
                                <SelectItem value="high" className="text-orange-500">High</SelectItem>
                                <SelectItem value="critical" className="text-red-600">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Input 
                              type="number"
                              value={item.estimated_cost} 
                              onChange={e => handleUpdateItem(item.id, { estimated_cost: Number(e.target.value) || 0 })}
                              className="h-8 w-24 text-sm"
                            />
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <div className={`text-xs font-semibold flex items-center gap-1 ${item.compatibility_risk === 'high' ? 'text-rose-600' : item.compatibility_risk === 'medium' ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {item.compatibility_risk === 'high' ? 'Alto Risco' : item.compatibility_risk === 'medium' ? 'Médio Risco' : 'Baixo Risco'}
                            </div>
                            {item.compatibility_notes && item.compatibility_notes.length > 0 ? (
                              <div className="mt-1 space-y-0.5">
                                {item.compatibility_notes.map((note, idx) => (
                                  <div key={idx} className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {note}
                                  </div>
                                ))}
                              </div>
                            ) : item.notes ? (
                              <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={item.notes}>{item.notes}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {item.confidence_score !== undefined ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className={`font-semibold
                                  ${item.confidence_score >= 80 ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 
                                    item.confidence_score >= 50 ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20' : 
                                    'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/20'}
                                `}>
                                  {item.confidence_score}%
                                </Badge>
                                {item.confidence_source && (
                                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                                    {item.confidence_source === 'lifecycle_catalog' ? 'catálogo' : 
                                     item.confidence_source === 'deterministic_fallback' ? 'regex/fallback' : 'ia gemini'}
                                  </div>
                                )}
                              </div>
                            ) : <span className="text-slate-400 text-xs">-</span>}
                          </TableCell>
                          <TableCell>
                            {getSupportStatusBadge(item.support_status)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Strategy and Phases Row */}
                        {isExpanded && (
                          <TableRow className="bg-slate-50/75 dark:bg-slate-900/50 hover:bg-slate-50/75">
                            <TableCell colSpan={11} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                
                                {/* Coluna 1: Estratégia e Rollback */}
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider mb-2">Estratégia de Migração Corporativa</h4>
                                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border text-xs text-slate-600 dark:text-slate-400 font-medium">
                                      {item.migration_strategy}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider mb-2">Plano de Recuperação (Rollback)</h4>
                                    <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border text-xs text-slate-600 dark:text-slate-400">
                                      {item.rollback_plan}
                                    </div>
                                  </div>
                                </div>

                                {/* Coluna 2: Requisitos e Riscos */}
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider mb-2">Requisitos Técnicos de Hardware / Soft</h4>
                                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                                      {item.requirements && item.requirements.map((req, idx) => (
                                        <li key={idx} className="flex items-center gap-1.5 font-medium">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                          {req}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider mb-2">Janela de Coexistência</h4>
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-100 dark:border-amber-900/30 text-xs">
                                      {item.phases?.coexistence_start && item.phases?.coexistence_end ? (
                                        <span>Operação em paralelo obrigatória de <strong>{new Date(item.phases.coexistence_start).toLocaleDateString()}</strong> até <strong>{new Date(item.phases.coexistence_end).toLocaleDateString()}</strong>.</span>
                                      ) : (
                                        <span>Sem necessidade de coexistência prolongada. Migração direta.</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Coluna 3: Cronograma de Fases de Rollout */}
                                <div>
                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider mb-3">Rollout e Fases de Modernização (Gantt Interno)</h4>
                                  <div className="space-y-2">
                                    {[
                                      { label: 'Homologação', start: item.phases?.homologation_start, end: item.phases?.homologation_end },
                                      { label: 'Piloto', start: item.phases?.pilot_start, end: item.phases?.pilot_end },
                                      { label: 'Rollout Corporativo', start: item.phases?.rollout_start, end: item.phases?.rollout_end },
                                      { label: 'Desativação / Descarte', start: item.phases?.deactivation_start, end: item.phases?.deactivation_end }
                                    ].map((phase, pIdx) => (
                                      <div key={pIdx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-950 rounded-lg border text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{phase.label}</span>
                                        <span className="text-[10px] text-slate-500">
                                          {phase.start ? `${new Date(phase.start).toLocaleDateString()} a ${new Date(phase.end!).toLocaleDateString()}` : 'Não aplicável'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Side Panel */}
        <div className="w-full xl:w-80 border-l bg-slate-50/80 dark:bg-slate-900/80 p-6 flex flex-col gap-6 overflow-y-auto">
          
          {data.missing_information.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Missing Information
              </h3>
              <div className="flex flex-col gap-2">
                {data.missing_information.map((info, idx) => (
                  <div key={idx} className="bg-orange-100/50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 p-3 rounded-md text-sm text-orange-800 dark:text-orange-300">
                    {info}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.assumptions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                AI Assumptions
              </h3>
              <ul className="space-y-2">
                {data.assumptions.map((assum, idx) => (
                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 p-3 rounded-md border shadow-sm">
                    {assum}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white dark:bg-slate-950 p-4 flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          {onBackToChat && <Button variant="ghost" onClick={onBackToChat}>Voltar ao Chat</Button>}
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
          onClick={() => onConfirm(data)}
        >
          Confirmar e Gerar Roadmap
        </Button>
      </div>
    </div>
  );
}
