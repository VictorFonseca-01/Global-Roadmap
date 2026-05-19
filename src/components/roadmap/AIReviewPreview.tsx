import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Server, Monitor, Trash2 } from "lucide-react";
import type { AIReviewData, AIReviewItem, Criticality } from "@/types";

interface AIReviewPreviewProps {
  initialData: AIReviewData;
  onConfirm: (data: AIReviewData) => void;
  onCancel: () => void;
  onBackToChat: () => void;
}

export function AIReviewPreview({ initialData, onConfirm, onCancel, onBackToChat }: AIReviewPreviewProps) {
  const [data, setData] = useState<AIReviewData>(initialData);

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

  const criticalCount = data.items.filter(i => i.calculated_criticality === 'critical').length;
  const serverCount = data.items.filter(i => i.asset_type === 'server').length;
  const clientCount = data.items.filter(i => i.asset_type === 'client').length;
  const eolWarningCount = data.items.filter(i => i.compatibility_risk === 'high' || !i.end_of_support).length;
  const estimatedTotal = data.items.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);

  const getStatusBadge = (item: AIReviewItem) => {
    if (!item.end_of_support || !item.implemented_at) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing Data</Badge>;
    }
    if (item.compatibility_risk === 'high') {
      return <Badge variant="destructive" className="flex items-center gap-1 bg-orange-600"><AlertTriangle className="w-3 h-3" /> High Risk</Badge>;
    }
    if (item.compatibility_risk === 'medium') {
      return <Badge variant="secondary" className="flex items-center gap-1 text-orange-600 bg-orange-100"><Info className="w-3 h-3" /> Needs Review</Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1 border-green-500 text-green-600"><CheckCircle2 className="w-3 h-3" /> Verified</Badge>;
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
          {data.missing_information.length > 0 && (
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 mr-2" /> Faltam Dados
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50 dark:bg-slate-900/50">
            <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Total de Ativos</p>
                  <p className="text-2xl font-bold">{data.items.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Monitor className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Servers / Clients</p>
                  <p className="text-2xl font-bold">{serverCount} / {clientCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                  <Server className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Alertas EoL/Risco</p>
                  <p className="text-2xl font-bold text-orange-600">{eolWarningCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Orçamento Previsto</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimatedTotal)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Estimativa preliminar</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <ScrollArea className="flex-1 border-t bg-white dark:bg-slate-950">
            <div className="p-4 min-w-[1200px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-transparent">
                    <TableHead>Produto & Versão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>EoL / Sucessor</TableHead>
                    <TableHead>Criticidade</TableHead>
                    <TableHead>Custo ($)</TableHead>
                    <TableHead>Risco Compatibilidade</TableHead>
                    <TableHead>Confiança IA</TableHead>
                    <TableHead>Status IA</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        Nenhum item identificado.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.items.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.vendor} {item.product_name}
                        </div>
                        <div className="text-sm text-slate-500">v. {item.version}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{item.asset_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.end_of_support ? new Date(item.end_of_support).toLocaleDateString() : <span className="text-red-500 text-xs">Falta Data EoL</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          ↳ 
                          <Input 
                            value={item.successor_version || ''} 
                            onChange={e => handleUpdateItem(item.id, { successor_version: e.target.value })}
                            placeholder="Sucessor?"
                            className="h-6 w-24 px-1 py-0 text-xs bg-transparent border-transparent hover:border-slate-200 focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.estimated_cost} 
                          onChange={e => handleUpdateItem(item.id, { estimated_cost: Number(e.target.value) || 0 })}
                          className="h-8 w-24 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${item.compatibility_risk === 'high' ? 'text-red-600 font-medium' : item.compatibility_risk === 'medium' ? 'text-orange-500' : 'text-slate-500'}`}>
                          {item.compatibility_risk === 'high' ? 'Alto risco em legados' : item.compatibility_risk === 'medium' ? 'Exige homologação' : 'Compatível'}
                        </span>
                        {item.notes && <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={item.notes}>{item.notes}</div>}
                      </TableCell>
                      <TableCell>
                        {item.confidence_score !== undefined ? (
                          <Badge variant="outline" className={`font-semibold
                            ${item.confidence_score >= 80 ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20' : 
                              item.confidence_score >= 50 ? 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 
                              'border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20'}
                          `}>
                            {item.confidence_score}%
                          </Badge>
                        ) : <span className="text-slate-400 text-xs">-</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item)}
                      </TableCell>
                      <TableCell>
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
                  ))}
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
          <Button variant="ghost" onClick={onBackToChat}>Voltar ao Chat</Button>
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
