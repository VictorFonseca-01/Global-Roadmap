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

export function parseOsFromText(text: string): { vendor: string; product: string; version: string } {
  const t = (text || '').trim();
  let vendor = 'Unknown';
  let product = 'Unknown';
  let version = '';

  const lower = t.toLowerCase();

  // 1. Detect Vendor
  if (lower.includes('microsoft') || lower.includes('windows') || lower.includes('win ')) {
    vendor = 'Microsoft';
  } else if (lower.includes('ubuntu') || lower.includes('canonical')) {
    vendor = 'Canonical';
  } else if (lower.includes('red hat') || lower.includes('redhat') || lower.includes('rhel')) {
    vendor = 'Red Hat';
  } else if (lower.includes('centos')) {
    vendor = 'CentOS';
  } else if (lower.includes('debian')) {
    vendor = 'Debian';
  }

  // 2. Detect Product
  if (lower.includes('windows server') || lower.includes('win server') || lower.includes('winserver')) {
    product = 'Windows Server';
  } else if (lower.includes('windows 11') || lower.includes('win 11')) {
    product = 'Windows 11';
  } else if (lower.includes('windows 10') || lower.includes('win 10')) {
    product = 'Windows 10';
  } else if (lower.includes('windows 7') || lower.includes('win 7')) {
    product = 'Windows 7';
  } else if (lower.includes('windows 8') || lower.includes('win 8')) {
    product = 'Windows 8';
  } else if (lower.includes('ubuntu')) {
    product = 'Ubuntu';
  } else if (lower.includes('red hat') || lower.includes('redhat') || lower.includes('rhel')) {
    product = 'Red Hat Enterprise Linux';
  } else if (lower.includes('centos')) {
    product = 'CentOS';
  }

  // 3. Detect Version
  const yearMatch = t.match(/\b(2008|2012|2016|2019|2022|2025)\b/);
  if (yearMatch) {
    version = yearMatch[1];
    if (lower.includes('r2')) {
      version += ' R2';
    }
  } else {
    const winVerMatch = t.match(/\b(24h2|23h2|22h2|21h2|20h2|1909|1809|1607)\b/i);
    if (winVerMatch) {
      version = winVerMatch[1].toUpperCase();
    } else {
      const linuxVerMatch = t.match(/\b(\d+\.\d+)\b/);
      if (linuxVerMatch) {
        version = linuxVerMatch[1];
      }
    }
  }

  if (product === 'Unknown' && t) {
    product = t;
  }

  return { vendor, product, version };
}

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
        
        // Pass 1: Strict exact matching
        for (const [field, aliases] of Object.entries(mappings)) {
          if (aliases.some(alias => cleanKey === alias)) {
            matchedField = field;
            break;
          }
        }
        
        // Pass 2: Flexible partial matching (only for non-short, non-ambiguous aliases)
        if (!matchedField) {
          for (const [field, aliases] of Object.entries(mappings)) {
            if (aliases.some(alias => {
              if (['nome', 'name', 'so', 'os', 'tipo', 'type', 'host', 'ram', 'hd', 'cpu'].includes(alias)) {
                return cleanKey === alias;
              }
              return cleanKey.includes(alias);
            })) {
              matchedField = field;
              break;
            }
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

      // Extrair fabricante do SO, nome do produto e versão a partir de normalized.os_name
      if (normalized.os_name) {
        const parsed = parseOsFromText(normalized.os_name);
        normalized.os_vendor = parsed.vendor;
        normalized.os_product = parsed.product;
        if (!normalized.os_version) {
          normalized.os_version = parsed.version;
        }
      }

      // Se não há vendor ou os_name ou os_version, extrair do hostname
      if (normalized.hostname && (!normalized.vendor || !normalized.os_name || normalized.os_name === 'Unknown' || normalized.vendor === 'Unknown')) {
        const parsed = parseOsFromText(normalized.hostname);
        if (!normalized.vendor || normalized.vendor === 'Unknown') normalized.vendor = parsed.vendor;
        if (!normalized.os_name || normalized.os_name === 'Unknown') normalized.os_name = parsed.product;
        if (!normalized.os_version) normalized.os_version = parsed.version;
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
      const vendor = row.os_vendor || row.vendor || 'Unknown';
      const product = row.os_product || row.os_name || row.product || 'Unknown';
      const version = row.os_version || row.version || '';
      return `${vendor}|${product}|${version}`;
    }))).map(key => {
      const [vendor, product, version] = key.split('|');
      return { vendor, product, version };
    });

    // 2. Enriquecimento em Lote (GeminiService gerencia cache e tokens)
    console.log(`[Import] Enriquecendo ${uniqueItems.length} itens únicos via IA/Cache...`);
    const enrichmentMap = new Map<string, { vendor: string; product: string; version: string }>();
    
    await Promise.all(uniqueItems.map(async item => {
      try {
        const enriched = await geminiService.enrichLifecycle(item.vendor, item.product, item.version);
        if (enriched) {
          const key = `${item.vendor}|${item.product}|${item.version}`.toLowerCase();
          enrichmentMap.set(key, {
            vendor: enriched.vendor,
            product: enriched.product_name,
            version: enriched.version
          });
        }
      } catch (err) {
        console.warn(`[Import] Falha no enriquecimento: ${item.product}`, err);
      }
    }));

    // 3. Carregar dados para matching
    const [categories, catalog, apps] = await Promise.all([
      supabase.from('asset_categories').select('*'),
      lifecycleService.getAll(),
      applicationService.getAll(),
    ]);
    
    // 4. Processar Ativos O(N)
    for (const row of normalizedData) {
      try {
        let vendor = (row.os_vendor || row.vendor || '').toLowerCase();
        let product = (row.os_product || row.os_name || row.product || '').toLowerCase();
        let version = (row.os_version || row.version || '').toLowerCase();
        
        const originalKey = `${vendor}|${product}|${version}`;
        const enriched = enrichmentMap.get(originalKey);
        if (enriched) {
          vendor = (enriched.vendor || '').toLowerCase();
          product = (enriched.product || '').toLowerCase();
          version = (enriched.version || '').toLowerCase();
        }

        const matchedCategory = categories.data?.find(c => 
          c.name.toLowerCase() === (row.category || '').toLowerCase() ||
          c.name.toLowerCase() === (row.device_type || '').toLowerCase() ||
          (row.device_type === 'server' && c.name === 'Servers') ||
          (row.device_type === 'workstation' && c.name === 'Computers')
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

