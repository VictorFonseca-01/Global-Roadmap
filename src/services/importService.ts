import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { assetService } from './assetService';
import { lifecycleService } from './lifecycleService';
import { applicationService } from './applicationService';
import { deterministicEngineService } from './deterministicEngineService';
import { migrationPlanService } from './migrationPlanService';
import { geminiService } from './geminiService';
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

    const history = {
      file_name: 'Importação manual',
      total_records: rawData.length,
      successful_records: 0,
      failed_records: 0,
    };

    // 1. Otimização Máxima: Identificar Itens Únicos para Enriquecimento
    const uniqueItems = Array.from(new Set(rawData.map(row => {
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
    for (const row of rawData) {
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
          const priority = deterministicEngineService.calculatePriority(matchedLifecycle.end_of_support);
          const startDate = deterministicEngineService.calculateRecommendedStartDate(priority);
          
          await migrationPlanService.create({
            roadmap_project_id: roadmapProjectId,
            asset_id: createdAsset.id,
            priority,
            risk_level: 'low',
            status: 'planned',
            recommended_target_os: matchedLifecycle.successor_version,
            recommended_start_date: startDate,
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
    return history;
  }
};

