import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { assetService } from './assetService';
import { applicationService } from './applicationService';
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

export function normalizeHeader(h: string): string {
  if (!h) return '';
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "");     // remove TUDO que não é alfanumérico
}

export interface NormalizedOS {
  vendor: string;
  product: string;
  version: string;
  version_hint?: string;
  edition?: string;
  raw_os: string;
}

export function normalizeOperatingSystemName(rawOs: string): NormalizedOS {
  const t = (rawOs || '').trim();
  let vendor = 'Unknown';
  let product = 'Unknown';
  let version = '';
  let version_hint = '';
  let edition = '';

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

  // Se for Windows
  if (vendor === 'Microsoft') {
    if (lower.includes('server')) {
      product = 'Windows Server';
      
      // Encontrar a versão (ano: 2008, 2012, 2016, 2019, 2022, 2025)
      const yearMatch = t.match(/\b(2008|2012|2016|2019|2022|2025)\b/);
      if (yearMatch) {
        version = yearMatch[1];
        if (lower.includes('r2')) {
          version += ' R2';
        }
      }
      
      // Edição
      if (lower.includes('standard evaluation')) {
        edition = 'Standard Evaluation';
      } else if (lower.includes('datacenter evaluation')) {
        edition = 'Datacenter Evaluation';
      } else if (lower.includes('standard')) {
        edition = 'Standard';
      } else if (lower.includes('datacenter')) {
        edition = 'Datacenter';
      } else if (lower.includes('essentials')) {
        edition = 'Essentials';
      } else if (lower.includes('enterprise')) {
        edition = 'Enterprise';
      }
    } else {
      // Client Windows
      if (lower.includes('windows 11') || lower.includes('win 11')) {
        product = 'Windows 11';
      } else if (lower.includes('windows 10') || lower.includes('win 10')) {
        product = 'Windows 10';
      } else if (lower.includes('windows 7') || lower.includes('win 7')) {
        product = 'Windows 7';
      } else if (lower.includes('windows 8.1') || lower.includes('win 8.1')) {
        product = 'Windows 8.1';
      } else if (lower.includes('windows 8') || lower.includes('win 8')) {
        product = 'Windows 8';
      } else {
        product = 'Windows';
      }

      // Pro, Home, Enterprise, Education, etc.
      if (lower.includes('pro') || lower.includes('professional')) {
        version_hint = 'Pro';
      } else if (lower.includes('home')) {
        version_hint = 'Home';
      } else if (lower.includes('enterprise') || lower.includes('ent')) {
        version_hint = 'Enterprise';
      } else if (lower.includes('education') || lower.includes('edu')) {
        version_hint = 'Education';
      }
      
      // Se tiver versão build de client Windows (ex: 22h2, 23h2)
      const winVerMatch = t.match(/\b(24h2|23h2|22h2|21h2|20h2|1909|1809|1607)\b/i);
      if (winVerMatch) {
        version = winVerMatch[1].toUpperCase();
      }
    }
  } else {
    // Linux ou outro SO
    if (lower.includes('ubuntu')) {
      product = 'Ubuntu';
    } else if (lower.includes('red hat') || lower.includes('redhat') || lower.includes('rhel')) {
      product = 'Red Hat Enterprise Linux';
    } else if (lower.includes('centos')) {
      product = 'CentOS';
    } else if (lower.includes('debian')) {
      product = 'Debian';
    } else {
      product = t || 'Unknown';
    }

    const verMatch = t.match(/\b(\d+(\.\d+)*)\b/);
    if (verMatch) {
      version = verMatch[1];
    }
  }

  return {
    vendor,
    product,
    version,
    version_hint: version_hint || undefined,
    edition: edition || undefined,
    raw_os: t
  };
}

export function parseOsFromText(text: string): { vendor: string; product: string; version: string } {
  const normalized = normalizeOperatingSystemName(text);
  return {
    vendor: normalized.vendor,
    product: normalized.product,
    version: normalized.version || normalized.version_hint || ''
  };
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
      hostname: ['nome', 'hostname', 'nomedocomputador', 'computername', 'devicename'],
      os_name: ['sistemaoperacionalnome', 'sistemaoperacional', 'operatingsystem', 'os', 'so', 'sistema', 'nomedosistemaoperacional'],
      os_version: ['sistemaoperacionalversao', 'versao', 'versaodoso', 'osversion', 'version', 'release', 'build'],
      device_type: ['tipo', 'type', 'categoria', 'devicetype'],
      vendor: ['fabricante', 'manufacturer', 'vendor', 'marca'],
      model: ['modelo', 'model'],
      asset_tag: ['numerodeinventario', 'patrimonio', 'assettag', 'inventorynumber', 'tombo'],
      location: ['localizacao', 'location', 'site', 'filial'],
      last_update: ['ultimaatualizacao', 'lastupdate', 'updatedat'],
      cpu: ['componentesprocessador', 'processador', 'cpu'],
      owner_department: ['ownerdepartment', 'departamento', 'department', 'setor', 'area', 'unidade'],
      serial_number: ['serial', 'serialnumber', 'numerodeserie', 'sn', 'servicetag'],
      user: ['usuario', 'user', 'assignedto', 'owner', 'utilizador'],
      business_criticality: ['businesscriticality', 'criticidade', 'criticality', 'prioridade', 'priority', 'criticidadedenegocio', 'criticidadedonegocio'],
      ram_gb: ['ramgb', 'ram', 'memoria', 'memoriaram'],
      storage_gb: ['storagegb', 'disco', 'hd', 'ssd', 'armazenamento', 'storage'],
    };

    const normalizedData = rawData.map(row => {
      const normalized: Record<string, any> = {};
      
      for (const rawKey of Object.keys(row)) {
        const cleanKey = normalizeHeader(rawKey);
        let matchedField: string | null = null;
        
        for (const [field, aliases] of Object.entries(mappings)) {
          if (aliases.some(alias => cleanKey === alias)) {
            matchedField = field;
            break;
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

  async processImport(normalizedData: Record<string, any>[], _roadmapProjectId?: string) {
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

    const [categories, apps] = await Promise.all([
      supabase.from('asset_categories').select('*'),
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
        let vendor = (row.os_vendor || row.vendor || '').trim();
        let product = (row.os_product || row.os_name || row.product || '').trim();
        let version = (row.os_version || row.version || '').trim();

        if (!vendor || !product) {
          const rawOs = row.os_name || row.product || '';
          if (rawOs) {
            const parsed = parseOsFromText(rawOs);
            vendor = parsed.vendor;
            product = parsed.product;
            version = parsed.version || version;
          }
        }

        const matchedCategory = categories.data?.find(c => 
          c.name.toLowerCase() === (row.category || '').toLowerCase() ||
          c.name.toLowerCase() === (row.device_type || '').toLowerCase() ||
          (row.device_type === 'server' && c.name === 'Servers') ||
          (row.device_type === 'workstation' && c.name === 'Computers') ||
          (row.device_type === 'virtual machine' && c.name === 'Virtual Machines') ||
          (row.device_type === 'network device' && c.name === 'Network Devices')
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
        if (matchedApp?.id) payload.application_id = matchedApp.id;
        if (isValidValue(row.owner_department)) payload.owner_department = row.owner_department;
        if (isValidValue(row.business_criticality)) payload.business_criticality = row.business_criticality;
        if (isValidValue(row.cpu)) payload.cpu = row.cpu;
        if (isValidValue(row.ram_gb)) payload.ram_gb = parseFloat(String(row.ram_gb));
        if (isValidValue(row.storage_gb)) payload.storage_gb = parseFloat(String(row.storage_gb));
        if (isValidValue(row.purchase_date)) payload.purchase_date = row.purchase_date;

        // Armazenar os dados brutos de inventário de forma estruturada no campo notes
        const rawInventoryData = {
          source: "glpi",
          os: row.os_name || row.product || 'Unknown',
          os_version: row.os_version || row.version || '',
          vendor: row.vendor || row.os_vendor || 'Unknown',
          device_type: row.device_type || payload.device_type || 'workstation',
          manufacturer: row.vendor || row.os_vendor || 'Unknown',
          model: row.model || '',
          department: row.owner_department || '',
          user: row.user || '',
          imported_at: new Date().toISOString()
        };
        payload.notes = JSON.stringify({ raw_inventory_data: rawInventoryData });

        if (matchedExisting) {
          // Merge sem sobrescrever por vazio
          const finalPayload = { ...payload };
          for (const k of Object.keys(finalPayload)) {
            if (!isValidValue(finalPayload[k]) && isValidValue(matchedExisting[k])) {
              delete finalPayload[k];
            }
          }
          await assetService.update(matchedExisting.id, finalPayload);
          history.updated_count++;
          history.duplicate_count++;
        } else {
          // Fallback para campos obrigatórios
          payload.hostname = payload.hostname || 'Unknown Host';
          payload.device_type = payload.device_type || 'workstation';
          payload.business_criticality = payload.business_criticality || 'medium';
          payload.lifecycle_id = null; // Garantir que novos ativos iniciam com lifecycle nulo
          
          await assetService.create(payload as any);
          history.inserted_count++;
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
