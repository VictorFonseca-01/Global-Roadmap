import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { assetService } from './assetService';
import { lifecycleService } from './lifecycleService';
import { applicationService } from './applicationService';
import { deterministicEngineService } from './deterministicEngineService';
import { migrationPlanService } from './migrationPlanService';
import { supabase } from '@/lib/supabase';

export const importService = {
  async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => resolve(results.data),
        error: (error: Error) => reject(error)
      });
    });
  },

  async parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  async processImport(rawData: any[], roadmapProjectId?: string) {
    const history = {
      file_name: 'Importação manual',
      total_records: rawData.length,
      successful_records: 0,
      failed_records: 0,
    };

    // Get catalogs for matching
    const [categories, catalog, apps] = await Promise.all([
      supabase.from('asset_categories').select('*'),
      lifecycleService.getAll(),
      applicationService.getAll(),
    ]);
    
    for (const row of rawData) {
      try {
        // Simple matching logic
        const matchedCategory = categories.data?.find(c => 
          c.name.toLowerCase() === (row.category || '').toLowerCase() ||
          c.name.toLowerCase() === (row.device_type || '').toLowerCase()
        );

        const matchedLifecycle = catalog.find(l => 
          l.product_name.toLowerCase() === (row.os_name || row.product || '').toLowerCase() &&
          (l.version || '').toLowerCase() === (row.os_version || row.version || '').toLowerCase()
        );

        const matchedApp = apps.find(a => 
          a.name.toLowerCase() === (row.application_name || '').toLowerCase()
        );

        const assetData = {
          hostname: row.hostname,
          asset_tag: row.asset_tag,
          device_type: row.device_type || 'workstation',
          category_id: matchedCategory?.id,
          lifecycle_id: matchedLifecycle?.id,
          application_id: matchedApp?.id,
          owner_department: row.owner_department,
          business_criticality: (row.business_criticality?.toLowerCase() || 'medium') as any,
          cpu: row.cpu,
          ram_gb: parseFloat(row.ram_gb) || undefined,
          storage_gb: parseFloat(row.storage_gb) || undefined,
          purchase_date: row.purchase_date,
        };

        const createdAsset = await assetService.create(assetData);
        
        // If we have a lifecycle match and a roadmap project, generate migration plan
        if (matchedLifecycle && roadmapProjectId) {
          const priority = deterministicEngineService.calculatePriority(matchedLifecycle.end_of_support);
          const startDate = deterministicEngineService.calculateRecommendedStartDate(priority);
          
          await migrationPlanService.create({
            roadmap_project_id: roadmapProjectId,
            asset_id: createdAsset.id,
            priority,
            risk_level: 'low', // Default, would check compatibility matrix if needed
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

    // Save history
    await supabase.from('import_history').insert([history]);
    
    return history;
  }
};
