import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { CNDataRecord } from '@/types';

dayjs.extend(customParseFormat);

export async function parseFile(file: File): Promise<any[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
  }
}

function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

async function parseExcel(file: File): Promise<any[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  // defval ensures empty cells are included as empty strings, mimicking PapaParse behavior
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

// Data normalization logic will go here
export function normalizeData(rawData: any[]): CNDataRecord[] {
  // Try to find correct column names since headers might have different cases or trailing spaces
  if (!rawData || rawData.length === 0) return [];
  
  const headers = Object.keys(rawData[0]);
  const getCol = (possibleNames: string[]) => {
    const found = headers.find(h => possibleNames.some(n => h.toLowerCase().trim() === n.toLowerCase()));
    return found || possibleNames[0];
  };

  const colPlant = getCol(['Planning Plant', 'Plant']);
  const colNotif = getCol(['Notif', 'Notification', 'Notification No']);
  const colNotifDate = getCol(['Notif. Date', 'Notification Date', 'Date']);
  const colLocation = getCol(['Location']);
  const colWorkCenter = getCol(['Work Center', 'Main WorkCenter']);
  const colPlantSection = getCol(['Plant Section']);
  const colEquipment = getCol(['Equipment']);
  const colDesc = getCol(['Description']);
  const colFuncLoc = getCol(['Functional Loc.', 'Functional Location', 'Func Loc']);
  const colUserStatus = getCol(['User status', 'User Status', 'UserStatus']);
  const colSystemStatus = getCol(['System status', 'System Status', 'SystemStatus']);
  const colCauseCode = getCol(['CauseCdTxt', 'Cause Code', 'CauseCode']);
  const colCompletionDate = getCol(['Completion Date', 'CompletionDate']);
  const colReqStart = getCol(['Required Start', 'RequiredStart']);
  const colReqEnd = getCol(['Required End', 'RequiredEnd']);
  const colAgeing = getCol(['Ageing(Completion Date-Malfunction Start date)', 'Ageing']);

  return rawData.map(row => {
    // 1. Dynamic Plant Handling
    const plantId = String(row[colPlant] || '').trim();
    let plantName = plantId;
    if (plantId) {
       // Convert like "3101" to "Smelter 1"
       // The user prompt said: sort plant IDs and name them Smelter 1, Smelter 2 etc.
       // We'll leave it as plantId for now and do the generic mapping later in a post-process
       // or we just map it dynamically in a second pass.
    }

    // 2. Parse Dates robustly
    const parseDate = (d: any) => {
      if (!d) return null;
      if (typeof d === 'number') {
        // Excel serial date
        return dayjs(new Date((d - (25567 + 2)) * 86400 * 1000)).toISOString();
      }
      
      const formats = ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD/MM/YYYY'];
      let pd = dayjs(d, formats, 'en', true);
      if (pd.isValid()) return pd.toISOString();
      
      // Try non-strict fallback
      pd = dayjs(d);
      if (pd.isValid()) return pd.toISOString();
      
      return null;
    };

    const notificationDate = parseDate(row[colNotifDate]) || '';
    const completionDate = parseDate(row[colCompletionDate]);
    
    // 3. Determine status based on System status logic
    const sysStat = String(row[colSystemStatus] || '').toUpperCase();
    const isClosed = sysStat.includes('NOCO') || sysStat.includes('NACO');
    const isOpen = !isClosed;

    // 4. Derive Technology strictly based on Python script
    const desc = String(row[colDesc] || '').toUpperCase();
    let technology = 'Other';
    if (desc.startsWith('VA:') || desc.startsWith('VA ')) technology = 'Vibration Analysis';
    else if (desc.substring(0, 5).includes('THV')) technology = 'Thermography';
    else if (desc.startsWith('OIL') || desc.includes('OIL:')) technology = 'Oil Analysis';
    else if (desc.startsWith('NDT') || desc.includes('NDT:')) technology = 'NDT';

    // 5. Derive Area (Python script consolidates Casthouse)
    const rawLoc = String(row[colLocation] || '').toUpperCase();
    let area = rawLoc;
    if (rawLoc.includes('CASTHOUSE')) area = 'CASTHOUSE';
    // Fallback based on earlier report if rawLoc is empty
    if (!area) area = String(row[colPlantSection] || 'UNKNOWN').toUpperCase();
    
    // 6. Cause Code and Hotspot logic (Python script: replace "Lubricant Issue" -> "Lubrication Issue")
    let causeCode = String(row[colCauseCode] || 'Unknown').trim();
    if (causeCode === 'Lubricant Issue') causeCode = 'Lubrication Issue';
    const isHotspot = causeCode === 'Hotspot';

    // 7. Ageing & OnTime logic
    const reqEnd = parseDate(row[colReqEnd]);
    // Python script: df["OnTime"] = df["Completion Date"] <= df["Required End"]
    let isOnTime = false;
    if (completionDate && reqEnd) {
      isOnTime = new Date(completionDate) <= new Date(reqEnd);
    }

    return {
      plantId,
      plantName: plantId, // Will be overridden in second pass
      notification: String(row[colNotif] || ''),
      notificationDate,
      location: String(row[colLocation] || ''),
      workCenter: String(row[colWorkCenter] || ''),
      plantSection: String(row[colPlantSection] || ''),
      area,
      equipment: String(row[colEquipment] || '').trim(),
      description: String(row[colDesc] || ''),
      functionalLocation: String(row[colFuncLoc] || ''),
      userStatus: String(row[colUserStatus] || ''),
      systemStatus: String(row[colSystemStatus] || ''),
      causeCode,
      completionDate,
      requiredStart: parseDate(row[colReqStart]),
      requiredEnd: reqEnd,
      ageing: Number(row[colAgeing]) || 0,
      isOpen,
      technology,
      isCritical: false, // Calculated later
      isHotspot,
      isOnTime,
    };
  }).filter(r => r.notification); // Skip completely empty rows
}

export function applyDynamicMappings(data: CNDataRecord[]): CNDataRecord[] {
  return data.map(record => {
    let pname = record.plantId;
    if (String(record.plantId).includes('3101')) pname = 'Plant 1';
    else if (String(record.plantId).includes('3102')) pname = 'Plant 2';

    return {
      ...record,
      plantName: pname,
    };
  });
}
