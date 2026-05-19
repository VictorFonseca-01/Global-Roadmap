import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { assetService } from './assetService';
import { lifecycleService } from './lifecycleService';
import { applicationService } from './applicationService';
import { deterministicEngineService } from './deterministicEngineService';
import { migrationPlanService } from './migrationPlanService';
import { geminiService } from './geminiService';
import { auditService } from './auditService';
import { supabase } from '@/lib/supabase';
import type { Criticality } from '@/types';


export const importService = {
  async parseCSV(file: File): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<Record<string, string>>) => resolve(results.data),
        error: (error: Error) => reject(error)
      });
    });
  },

  async parseExcel(file: File): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json as Record<string, unknown>[]);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  async processImport(rawData: Record<string, any>[], roadmapProjectId?: string) {
    // Normalizar cabeçalhos e valores de cada linha da planilha de entrada (aliases dinâmicos PT/EN)
    const normalizedData = rawData.map(row => {
      const normalized: Record<string, any> = {};
      
      const mappings = {
        hostname: ['hostname', 'host', 'nome', 'name', 'computador', 'dispositivo', 'nome do host'],
        vendor: ['vendor', 'fabricante', 'manufacturer', 'brand', 'marca'],
        os_name: ['os_name', 'sistema operacional - nome', 'sistema operacional', 'so', 'os', 'product', 'produto', 'nome do so', 'nome do produto'],
        os_version: ['os_version', 'versão', 'version', 'versao', 'versão do so'],
        device_type: ['device_type', 'tipo', 'type', 'tipo de dispositivo', 'categoria'],
        asset_tag: ['asset_tag', 'patrimônio', 'patrimonio', 'etiqueta', 'tag', 'número de inventário', 'numero de inventario', 'inventario'],
        owner_department: ['owner_department', 'departamento', 'department', 'setor', 'localização', 'localizacao', 'area'],
        business_criticality: ['business_criticality', 'criticidade', 'criticality', 'prioridade', 'priority', 'criticidade de negócio', 'criticidade do negocio'],
        cpu: ['cpu', 'processador', 'processor', 'componentes - processador', 'componente - processador'],
        ram_gb: ['ram_gb', 'ram', 'memória', 'memoria', 'memoria ram'],
        storage_gb: ['storage_gb', 'disco', 'hd', 'ssd', 'armazenamento', 'storage']
      };

      for (const rawKey of Object.keys(row)) {
        const cleanKey = rawKey.trim().toLowerCase();
        
        let matchedField: string | null = null;
        for (const [field, aliases] of Object.entries(mappings)) {
          if (aliases.some(alias => cleanKey === alias || cleanKey.includes(alias))) {
            matchedField = field;
            break;
          }
        }

        if (matchedField) {
          normalized[matchedField] = row[rawKey];
        } else {
          normalized[rawKey] = row[rawKey];
        }
      }

      // Fallbacks explícitos se a busca flexível falhar
      if (!normalized.hostname && row['Nome']) normalized.hostname = row['Nome'];
      if (!normalized.vendor && row['Fabricante']) normalized.vendor = row['Fabricante'];
      if (!normalized.os_name && row['Sistema operacional - Nome']) normalized.os_name = row['Sistema operacional - Nome'];
      if (!normalized.asset_tag && row['Número de inventário']) normalized.asset_tag = row['Número de inventário'];
      if (!normalized.cpu && row['Componentes - Processador']) normalized.cpu = row['Componentes - Processador'];
      if (!normalized.owner_department && row['Localização']) normalized.owner_department = row['Localização'];

      // Garantir integridade de hostname como string limpa obrigatória
      if (normalized.hostname) {
        normalized.hostname = String(normalized.hostname).trim();
      }

      // Detecção e normalização inteligente de device_type
      if (normalized.device_type) {
        const rawType = String(normalized.device_type).toLowerCase();
        if (rawType.includes('desktop') || rawType.includes('workstation') || rawType.includes('notebook') || rawType.includes('client') || rawType.includes('pc') || rawType.includes('micro')) {
          normalized.device_type = 'workstation';
        } else if (rawType.includes('server') || rawType.includes('servidor') || rawType.includes('virtual') || rawType.includes('vmware') || rawType.includes('qemu')) {
          normalized.device_type = 'server';
        } else {
          normalized.device_type = 'workstation';
        }
      } else {
        const osStr = String(normalized.os_name || '').toLowerCase();
        if (osStr.includes('server') || osStr.includes('servidor')) {
          normalized.device_type = 'server';
        } else {
          normalized.device_type = 'workstation';
        }
      }

      // Normalizar prioridade/criticidade de negócio para PostgreSQL enum
      if (normalized.business_criticality) {
        const rawCrit = String(normalized.business_criticality).toLowerCase();
        if (rawCrit.includes('critica') || rawCrit.includes('critical')) {
          normalized.business_criticality = 'critical';
        } else if (rawCrit.includes('alta') || rawCrit.includes('high')) {
          normalized.business_criticality = 'high';
        } else if (rawCrit.includes('media') || rawCrit.includes('medium') || rawCrit.includes('média')) {
          normalized.business_criticality = 'medium';
        } else if (rawCrit.includes('baixa') || rawCrit.includes('low')) {
          normalized.business_criticality = 'low';
        } else {
          normalized.business_criticality = 'medium';
        }
      } else {
        normalized.business_criticality = 'medium';
      }

      return normalized;
    });

    const history = {
      file_name: 'Importação manual',
      total_records: normalizedData.length,
      successful_records: 0,
      failed_records: 0,
    };

    // 1. Otimização Máxima: Identificar Itens Únicos para Enriquecimento
    const uniqueItems = Array.from(new Set(normalizedData.map(row => {
      const vendor = row.vendor || 'Unknown';
      const product = row.os_name || row.product || 'Unknown';
      const version = row.os_version || row.version || '';
      return `${vendor}|${product}|${version}`;
    }))).map(key => {
      const [vendor, product, version] = key.split('|');
      return { vendor, product, version };
    });

    // 2. Enriquecimento em Lote (GeminiService gerencia cache e tokens)
    console.log(`[Import] Enriquecendo ${uniqueItems.length} itens únicos via IA/Cache...`);
    await Promise.all(uniqueItems.map(item => 
      geminiService.enrichLifecycle(item.vendor, item.product, item.version)
        .catch(err => console.warn(`[Import] Falha no enriquecimento: ${item.product}`, err))
    ));

    // 3. Carregar dados para matching
    const [categories, catalog, apps] = await Promise.all([
      supabase.from('asset_categories').select('*'),
      lifecycleService.getAll(),
      applicationService.getAll(),
    ]);
    
    // 4. Processar Ativos O(N)
    for (const row of normalizedData) {
      try {
        const vendor = (row.vendor || '').toLowerCase();
        const product = (row.os_name || row.product || '').toLowerCase();
        const version = (row.os_version || row.version || '').toLowerCase();

        const matchedCategory = categories.data?.find(c => 
          c.name.toLowerCase() === (row.category || '').toLowerCase() ||
          c.name.toLowerCase() === (row.device_type || '').toLowerCase()
        );

        const matchedLifecycle = catalog.find(l => 
          l.vendor.toLowerCase() === vendor &&
          l.product_name.toLowerCase() === product &&
          (l.version || '').toLowerCase() === version
        );

        const matchedApp = apps.find(a => 
          a.name.toLowerCase() === (row.application_name || '').toLowerCase()
        );

        const assetData = {
          hostname: row.hostname as string,
          asset_tag: row.asset_tag as string,
          device_type: (row.device_type as string) || 'workstation',
          category_id: matchedCategory?.id,
          lifecycle_id: matchedLifecycle?.id,
          application_id: matchedApp?.id,
          owner_department: row.owner_department as string,
          business_criticality: (String(row.business_criticality || 'medium').toLowerCase()) as Criticality,
          cpu: row.cpu as string,
          ram_gb: parseFloat(String(row.ram_gb)) || undefined,
          storage_gb: parseFloat(String(row.storage_gb)) || undefined,
          purchase_date: row.purchase_date as string,
        };


        const createdAsset = await assetService.create(assetData);
        
        if (matchedLifecycle && roadmapProjectId) {
          const priority = deterministicEngineService.calculatePriority(matchedLifecycle.end_of_support, assetData.business_criticality);
          const window = deterministicEngineService.calculateMigrationWindow(matchedLifecycle.end_of_support);
          
          await migrationPlanService.create({
            roadmap_project_id: roadmapProjectId,
            asset_id: createdAsset.id,
            priority,
            risk_level: 'low',
            status: 'planned',
            recommended_target_os: matchedLifecycle.successor_version,
            recommended_start_date: window.start,
            planned_start_date: window.start,
            planned_end_date: window.end,
            justification: deterministicEngineService.generateJustification(
              priority, 
              matchedLifecycle.product_name, 
              matchedLifecycle.version || '', 
              matchedLifecycle.end_of_support
            )
          });
        }

        history.successful_records++;
      } catch (err) {
        console.error('Falha ao importar linha:', row, err);
        history.failed_records++;
      }
    }

    await supabase.from('import_history').insert([history]);
    
    await auditService.log({
      action: 'IMPORT_ASSETS',
      entity_type: 'import_history',
      description: `Importação concluída: ${history.successful_records} sucessos, ${history.failed_records} falhas.`,
      metadata: history
    });

    return history;
  }
};

