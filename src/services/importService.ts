import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { assetService } from './assetService';
import { lifecycleService } from './lifecycleService';
import { applicationService } from './applicationService';
import { deterministicEngineService } from './deterministicEngineService';
import { migrationPlanService } from './migrationPlanService';
import { auditService } from './auditService';
import { supabase } from '@/lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────

function cleanStr(s: any): string {
  if (!s) return '';
  return String(s).trim().toUpperCase().replace(/\s+/g, ' ');
}

function isValidValue(v: any): boolean {
  if (v === null || v === undefined) return false;
  const str = String(v).trim().toLowerCase();
  if (str === '' || str === '-' || str === 'n/a' || str === 'não informado' || str === 'nao informado' || str === 'unknown') return false;
  return true;
}

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

// ─── Service ─────────────────────────────────────────────────────────────

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

  /**
   * Pre-processes the data to return a preview and metrics without saving.
   */
  async analyzeImport(rawData: Record<string, any>[]) {
    // 1. Normalize
    const { normalizedData, mappedColumns, ignoredColumns } = this.normalizeData(rawData);
    
    // 2. Load existing to preview duplicates
    const { data: existingAssets } = await supabase.from('assets').select('id, hostname, asset_tag, serial_number');
    const existing = existingAssets || [];
    
    const byTag = new Map(existing.filter(a => a.asset_tag).map(a => [cleanStr(a.asset_tag), a]));
    const bySerial = new Map(existing.filter(a => a.serial_number).map(a => [cleanStr(a.serial_number), a]));
    const byHost = new Map(existing.filter(a => a.hostname).map(a => [cleanStr(a.hostname), a]));

    let newCount = 0;
    let updateCount = 0;
    let missingHostname = 0;
    let missingOs = 0;

    for (const row of normalizedData) {
      if (!isValidValue(row.hostname)) missingHostname++;
      if (!isValidValue(row.os_name) && !isValidValue(row.os_product)) missingOs++;

      const tag = cleanStr(row.asset_tag);
      const serial = cleanStr(row.serial_number);
      const host = cleanStr(row.hostname);

      let found = false;
      if (tag && byTag.has(tag)) found = true;
      else if (serial && bySerial.has(serial)) found = true;
      else if (host && byHost.has(host)) found = true;

      if (found) {
        updateCount++;
      } else {
        newCount++;
      }
    }

    return {
      normalizedData,
      mappedColumns,
      ignoredColumns,
      newCount,
      updateCount,
      missingHostname,
      missingOs,
      totalRows: rawData.length
    };
  },

  normalizeData(rawData: Record<string, any>[]) {
    const mappedColumns = new Set<string>();
    const ignoredColumns = new Set<string>();

    const mappings = {
      hostname: ['hostname', 'host', 'nome', 'name', 'computador', 'dispositivo', 'nome do host', 'nome do computador', 'computer name', 'device name', 'máquina', 'maquina', 'equipamento'],
      os_name: ['os_name', 'sistema operacional - nome', 'sistema operacional', 'so', 'os', 'product', 'produto', 'nome do so', 'nome do produto', 'operating system', 'sistema', 'sistema instalado'],
      os_version: ['os_version', 'versão', 'version', 'versao', 'versão do so', 'os version', 'build', 'release', 'edição', 'edicao'],
      vendor: ['vendor', 'fabricante', 'manufacturer', 'brand', 'marca'],
      device_type: ['device_type', 'tipo', 'type', 'tipo de dispositivo', 'categoria', 'device type'],
      asset_tag: ['asset_tag', 'patrimônio', 'patrimonio', 'etiqueta', 'tag', 'número de inventário', 'numero de inventario', 'inventario', 'tombo', 'inventory number'],
      serial_number: ['serial', 'serial number', 'número de série', 'numero de serie', 's/n', 'service tag'],
      owner_department: ['owner_department', 'departamento', 'department', 'setor', 'localização', 'localizacao', 'area', 'unidade', 'site', 'filial'],
      user: ['usuário', 'usuario', 'user', 'assigned to', 'owner', 'utilizador'],
      business_criticality: ['business_criticality', 'criticidade', 'criticality', 'prioridade', 'priority', 'criticidade de negócio', 'criticidade do negocio'],
      cpu: ['cpu', 'processador', 'processor', 'componentes - processador', 'componente - processador'],
      ram_gb: ['ram_gb', 'ram', 'memória', 'memoria', 'memoria ram'],
      storage_gb: ['storage_gb', 'disco', 'hd', 'ssd', 'armazenamento', 'storage'],
      model: ['modelo', 'model', 'product name']
    };

    const normalizedData = rawData.map(row => {
      const normalized: Record<string, any> = {};
      
      for (const rawKey of Object.keys(row)) {
        const cleanKey = rawKey.trim().toLowerCase();
        let matchedField: string | null = null;
        
        for (const [field, aliases] of Object.entries(mappings)) {
          if (aliases.some(alias => cleanKey === alias)) {
            matchedField = field;
            break;
          }
        }
        
        if (!matchedField) {
          for (const [field, aliases] of Object.entries(mappings)) {
            if (aliases.some(alias => {
              if (['nome', 'name', 'so', 'os', 'tipo', 'type', 'host', 'ram', 'hd', 'cpu', 'site'].includes(alias)) {
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
          mappedColumns.add(rawKey);
        } else {
          normalized[rawKey] = row[rawKey];
          ignoredColumns.add(rawKey);
        }
      }

      // Hard fallbacks
      if (!normalized.hostname && row['Nome']) normalized.hostname = row['Nome'];
      if (!normalized.vendor && row['Fabricante']) normalized.vendor = row['Fabricante'];
      if (!normalized.os_name && row['Sistema operacional - Nome']) normalized.os_name = row['Sistema operacional - Nome'];

      if (normalized.hostname) normalized.hostname = String(normalized.hostname).trim();

      // Advanced Classification
      let devType = String(normalized.device_type || '').toLowerCase();
      let osStr = String(normalized.os_name || '').toLowerCase();
      let prodStr = String(normalized.model || '').toLowerCase();
      let combinedStr = `${devType} ${osStr} ${prodStr}`;

      const vmKeywords = ['vmware', 'virtualbox', 'hyper-v', 'kvm', 'qemu', 'xen', 'proxmox', 'nutanix', 'virtual machine', 'virtual platform'];
      const netKeywords = ['switch', 'router', 'firewall', 'access point', 'fortinet', 'cisco', 'mikrotik', 'aruba', 'ubiquiti', 'juniper'];
      const softKeywords = ['microsoft office', 'sql server', 'oracle java', 'vmware tools', 'anydesk', 'antivirus'];

      if (vmKeywords.some(k => combinedStr.includes(k))) {
        normalized.device_type = 'virtual machine';
      } else if (netKeywords.some(k => combinedStr.includes(k))) {
        normalized.device_type = 'network device';
      } else if (softKeywords.some(k => combinedStr.includes(k)) && !combinedStr.includes('windows 10') && !combinedStr.includes('windows 11') && !combinedStr.includes('server') && !combinedStr.includes('desktop') && !combinedStr.includes('notebook') && !combinedStr.includes('workstation')) {
        normalized.device_type = 'software';
      } else if (devType.includes('server') || osStr.includes('server') || osStr.includes('servidor')) {
        normalized.device_type = 'server';
      } else {
        normalized.device_type = 'workstation';
      }

      // Criticality
      if (normalized.business_criticality) {
        const rawCrit = String(normalized.business_criticality).toLowerCase();
        if (rawCrit.includes('critica') || rawCrit.includes('critical')) normalized.business_criticality = 'critical';
        else if (rawCrit.includes('alta') || rawCrit.includes('high')) normalized.business_criticality = 'high';
        else if (rawCrit.includes('media') || rawCrit.includes('medium') || rawCrit.includes('média')) normalized.business_criticality = 'medium';
        else if (rawCrit.includes('baixa') || rawCrit.includes('low')) normalized.business_criticality = 'low';
        else normalized.business_criticality = 'medium';
      } else {
        normalized.business_criticality = 'medium';
      }

      if (normalized.os_name) {
        const parsed = parseOsFromText(normalized.os_name);
        normalized.os_vendor = parsed.vendor;
        normalized.os_product = parsed.product;
        if (!normalized.os_version) {
          normalized.os_version = parsed.version;
        }
      }

      if (normalized.hostname && (!normalized.vendor || !normalized.os_name || normalized.os_name === 'Unknown' || normalized.vendor === 'Unknown')) {
        const parsed = parseOsFromText(normalized.hostname);
        if (!normalized.vendor || normalized.vendor === 'Unknown') normalized.vendor = parsed.vendor;
        if (!normalized.os_name || normalized.os_name === 'Unknown') normalized.os_name = parsed.product;
        if (!normalized.os_version) normalized.os_version = parsed.version;
      }

      return normalized;
    });

    return { normalizedData, mappedColumns: Array.from(mappedColumns), ignoredColumns: Array.from(ignoredColumns) };
  },

  async processImport(normalizedData: Record<string, any>[], roadmapProjectId?: string) {
    const history = {
      file_name: 'Importação do GLPI',
      total_records: normalizedData.length,
      successful_records: 0,
      failed_records: 0,
      inserted_count: 0,
      updated_count: 0,
      skipped_count: 0,
      duplicate_count: 0,
      missing_os_count: 0,
      missing_hostname_count: 0
    };

    const { data: existingAssets } = await supabase.from('assets').select('*');
    const existing = existingAssets || [];
    
    const byTag = new Map(existing.filter(a => a.asset_tag).map(a => [cleanStr(a.asset_tag), a]));
    const bySerial = new Map(existing.filter(a => a.serial_number).map(a => [cleanStr(a.serial_number), a]));
    const byHost = new Map(existing.filter(a => a.hostname).map(a => [cleanStr(a.hostname), a]));

    const [categories, catalog, apps] = await Promise.all([
      supabase.from('asset_categories').select('*'),
      lifecycleService.getAll(),
      applicationService.getAll(),
    ]);

    for (const row of normalizedData) {
      if (!isValidValue(row.hostname)) history.missing_hostname_count++;
      if (!isValidValue(row.os_name) && !isValidValue(row.os_product)) history.missing_os_count++;
      
      // se não houver hostname válido e não foi reconhecido nenhum outro ID, pular
      if (!isValidValue(row.hostname) && !isValidValue(row.asset_tag) && !isValidValue(row.serial_number)) {
        history.skipped_count++;
        continue;
      }

      const tag = cleanStr(row.asset_tag);
      const serial = cleanStr(row.serial_number);
      const host = cleanStr(row.hostname);

      let matchedExisting = null;
      if (tag && byTag.has(tag)) matchedExisting = byTag.get(tag);
      else if (serial && bySerial.has(serial)) matchedExisting = bySerial.get(serial);
      else if (host && byHost.has(host)) matchedExisting = byHost.get(host);

      try {
        let vendor = (row.os_vendor || row.vendor || '').toLowerCase();
        let product = (row.os_product || row.os_name || row.product || '').toLowerCase();
        let version = (row.os_version || row.version || '').toLowerCase();

        const matchedCategory = categories.data?.find(c => 
          c.name.toLowerCase() === (row.category || '').toLowerCase() ||
          c.name.toLowerCase() === (row.device_type || '').toLowerCase() ||
          (row.device_type === 'server' && c.name === 'Servers') ||
          (row.device_type === 'workstation' && c.name === 'Computers') ||
          (row.device_type === 'virtual machine' && c.name === 'Virtual Machines') ||
          (row.device_type === 'network device' && c.name === 'Network Devices')
        );

        const matchedLifecycle = catalog.find(l => 
          l.vendor.toLowerCase() === vendor &&
          l.product_name.toLowerCase() === product &&
          (l.version || '').toLowerCase() === version
        );

        const matchedApp = apps.find(a => 
          a.name.toLowerCase() === (row.application_name || '').toLowerCase()
        );

        // Prepara payload de atualização, apenas substituindo se o novo valor for válido
        const payload: Record<string, any> = {};
        if (isValidValue(row.hostname)) payload.hostname = row.hostname;
        if (isValidValue(row.asset_tag)) payload.asset_tag = row.asset_tag;
        if (isValidValue(row.serial_number)) payload.serial_number = row.serial_number;
        if (isValidValue(row.device_type)) payload.device_type = row.device_type;
        if (matchedCategory?.id) payload.category_id = matchedCategory.id;
        if (matchedLifecycle?.id) payload.lifecycle_id = matchedLifecycle.id;
        if (matchedApp?.id) payload.application_id = matchedApp.id;
        if (isValidValue(row.owner_department)) payload.owner_department = row.owner_department;
        if (isValidValue(row.business_criticality)) payload.business_criticality = row.business_criticality;
        if (isValidValue(row.cpu)) payload.cpu = row.cpu;
        if (isValidValue(row.ram_gb)) payload.ram_gb = parseFloat(String(row.ram_gb));
        if (isValidValue(row.storage_gb)) payload.storage_gb = parseFloat(String(row.storage_gb));
        if (isValidValue(row.purchase_date)) payload.purchase_date = row.purchase_date;

        let createdOrUpdatedAssetId = '';

        if (matchedExisting) {
          // Merge sem sobrescrever por vazio
          const finalPayload = { ...payload };
          for (const k of Object.keys(finalPayload)) {
            if (!isValidValue(finalPayload[k]) && isValidValue(matchedExisting[k])) {
              delete finalPayload[k];
            }
          }
          await assetService.update(matchedExisting.id, finalPayload);
          createdOrUpdatedAssetId = matchedExisting.id;
          history.updated_count++;
          history.duplicate_count++;
        } else {
          // Fallback para campos obrigatórios
          payload.hostname = payload.hostname || 'Unknown Host';
          payload.device_type = payload.device_type || 'workstation';
          payload.business_criticality = payload.business_criticality || 'medium';
          
          const created = await assetService.create(payload as any);
          createdOrUpdatedAssetId = created.id;
          history.inserted_count++;
        }

        if (matchedLifecycle && roadmapProjectId) {
          const priority = deterministicEngineService.calculatePriority(matchedLifecycle.end_of_support, payload.business_criticality || 'medium');
          const window = deterministicEngineService.calculateMigrationWindow(matchedLifecycle.end_of_support);
          
          await migrationPlanService.create({
            roadmap_project_id: roadmapProjectId,
            asset_id: createdOrUpdatedAssetId,
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
        console.error('Falha ao importar/atualizar linha:', row, err);
        history.failed_records++;
      }
    }

    await supabase.from('import_history').insert([{
      file_name: history.file_name,
      total_records: history.total_records,
      successful_records: history.successful_records,
      failed_records: history.failed_records,
      // Passando tudo para o Supabase ou apenas o que tem no schema
    }]);
    
    await auditService.log({
      action: 'IMPORT_ASSETS_GLPI',
      entity_type: 'import_history',
      description: `GLPI Import: ${history.inserted_count} inseridos, ${history.updated_count} atualizados, ${history.failed_records} falhas.`,
      metadata: history
    });

    return history;
  }
};
