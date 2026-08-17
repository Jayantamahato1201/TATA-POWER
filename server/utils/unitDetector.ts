import { MetricCategory } from '../types/index.js';

export interface ExtractedMetricInfo {
  unit?: string;
  cleanName: string;
  category: MetricCategory;
}

/**
 * Normalizes raw unit string from headers or metadata into canonical industrial engineering units
 */
export function normalizeUnit(raw: string, fullContext?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  const lower = s.toLowerCase();

  // 1. Temperature
  if (['°c', 'degc', 'deg c', 'deg_c', 'celsius', 'centigrade'].includes(lower)) return '°C';
  if (lower === 'c' && fullContext && (fullContext.toLowerCase().includes('temp') || fullContext.toLowerCase().includes('deg') || fullContext.includes('_C') || fullContext.includes('(C)'))) {
    return '°C';
  }
  if (['°f', 'degf', 'deg f', 'deg_f', 'fahrenheit'].includes(lower)) return '°F';
  if (lower === 'f' && fullContext && (fullContext.toLowerCase().includes('temp') || fullContext.toLowerCase().includes('deg') || fullContext.includes('_F') || fullContext.includes('(F)'))) {
    return '°F';
  }
  if (['k', 'kelvin'].includes(lower) && fullContext && (fullContext.toLowerCase().includes('temp') || fullContext.toLowerCase().includes('thermal'))) {
    return 'K';
  }

  // 2. Voltage
  if (['kv', 'kilovolt', 'kilovolts'].includes(lower)) return 'kV';
  if (['mv', 'millivolt', 'millivolts'].includes(lower)) return 'mV';
  if (['v', 'volt', 'volts'].includes(lower)) {
    if (lower === 'v' && fullContext && !fullContext.toLowerCase().includes('volt') && !fullContext.toLowerCase().includes('bus') && !fullContext.toLowerCase().includes('gen') && !fullContext.toLowerCase().includes('phase') && !fullContext.includes('_V') && !fullContext.includes('(V)') && !fullContext.includes('[V]')) {
      return undefined;
    }
    return 'V';
  }

  // 3. Current
  if (['ka', 'kiloamp', 'kiloamps'].includes(lower)) return 'kA';
  if (['ma', 'milliamp', 'milliamps'].includes(lower)) return 'mA';
  if (['a', 'amp', 'amps', 'ampere', 'amperes'].includes(lower)) {
    if (lower === 'a' && fullContext && !fullContext.toLowerCase().includes('curr') && !fullContext.toLowerCase().includes('amp') && !fullContext.toLowerCase().includes('stator') && !fullContext.toLowerCase().includes('rotor') && !fullContext.toLowerCase().includes('phase') && !fullContext.includes('_A') && !fullContext.includes('(A)') && !fullContext.includes('[A]')) {
      return undefined;
    }
    return 'A';
  }

  // 4. Power
  if (['kw', 'kilowatt', 'kilowatts'].includes(lower)) return 'kW';
  if (['mw', 'megawatt', 'megawatts'].includes(lower)) return 'MW';
  if (['gw', 'gigawatt', 'gigawatts'].includes(lower)) return 'GW';
  if (['w', 'watt', 'watts'].includes(lower)) {
    if (lower === 'w' && fullContext && !fullContext.toLowerCase().includes('power') && !fullContext.toLowerCase().includes('watt') && !fullContext.includes('_W') && !fullContext.includes('(W)')) {
      return undefined;
    }
    return 'W';
  }
  if (['kvar', 'kilo-var', 'kilo_var'].includes(lower)) return 'kVAR';
  if (['mvar', 'mega-var', 'mega_var'].includes(lower)) return 'MVAR';
  if (['kva', 'kilovolt-ampere'].includes(lower)) return 'kVA';
  if (['mva', 'megavolt-ampere'].includes(lower)) return 'MVA';

  // 5. Frequency
  if (['hz', 'hertz'].includes(lower)) return 'Hz';
  if (['khz', 'kilohertz'].includes(lower)) return 'kHz';
  if (['mhz', 'megahertz'].includes(lower)) return 'MHz';

  // 6. Pressure
  if (['bar', 'bars'].includes(lower)) return 'bar';
  if (['mbar', 'millibar'].includes(lower)) return 'mbar';
  if (['psi', 'psig', 'psia'].includes(lower)) return 'PSI';
  if (['kpa', 'kilopascal'].includes(lower)) return 'kPa';
  if (['mpa', 'megapascal'].includes(lower)) return 'MPa';
  if (['pa', 'pascal'].includes(lower)) return 'Pa';

  // 7. Fuel / Percentage / Level / Ratio
  if (['%', 'pct', 'percent', 'percentage'].includes(lower)) return '%';

  // 8. Speed / RPM
  if (['rpm', 'rev/min', 'rotations_per_minute'].includes(lower)) return 'RPM';
  if (['rps', 'rev/sec'].includes(lower)) return 'RPS';

  // 9. Flow
  if (['m3/h', 'm3_h', 'm3h', 'm³/h', 'm^3/h', 'cum/hr'].includes(lower)) return 'm³/h';
  if (['l/min', 'l_min', 'lpm', 'liters/min', 'l/m'].includes(lower)) return 'L/min';
  if (['gpm', 'gal/min'].includes(lower)) return 'GPM';
  if (['l/h', 'l/hr', 'lph'].includes(lower)) return 'L/h';

  // 10. Vibration / Velocity / Displacement
  if (['mm/s', 'mm_s', 'mms', 'mm/sec'].includes(lower)) return 'mm/s';
  if (['m/s', 'm_s', 'ms-1'].includes(lower)) return 'm/s';
  if (['µm', 'um', 'micron', 'microns'].includes(lower)) return 'µm';
  if (['g', 'g-force'].includes(lower) && fullContext && fullContext.toLowerCase().includes('vib')) return 'g';

  // 11. Emissions / Concentration
  if (['mg/nm3', 'mg_nm3', 'mg/nm³', 'mg_nm³'].includes(lower)) return 'mg/Nm³';
  if (['mg/m3', 'mg_m3', 'mg/m³'].includes(lower)) return 'mg/m³';
  if (['ppm', 'parts_per_million'].includes(lower)) return 'ppm';
  if (['ppb', 'parts_per_billion'].includes(lower)) return 'ppb';

  // 12. Mechanical / Torque / Mass
  if (['nm', 'newton-meter', 'n-m', 'n_m'].includes(lower)) return 'Nm';
  if (['knm', 'kilonewton-meter'].includes(lower)) return 'kNm';
  if (['kg', 'kilogram', 'kilograms'].includes(lower)) return 'kg';
  if (['ton', 'tons', 'tonne', 'tonnes'].includes(lower)) return 'ton';
  if (['lbs', 'lb', 'pound', 'pounds'].includes(lower)) return 'lbs';

  // 13. Time / Duration
  if (['hours', 'hour', 'hrs', 'hr', 'h'].includes(lower) && (fullContext?.toLowerCase().includes('time') || fullContext?.toLowerCase().includes('hour') || fullContext?.toLowerCase().includes('duration') || lower !== 'h')) return 'hours';
  if (['min', 'mins', 'minutes', 'minute'].includes(lower)) return 'min';
  if (['s', 'sec', 'secs', 'seconds', 'second'].includes(lower) && (fullContext?.toLowerCase().includes('time') || fullContext?.toLowerCase().includes('duration') || lower !== 's')) return 's';
  if (['ms', 'millis', 'milliseconds'].includes(lower)) return 'ms';

  // If explicit bracketed token provided and looks like a valid unit
  if (/^[a-zA-Z°%µ³²\/\-_^]{1,12}$/.test(s) && !['value', 'reading', 'data', 'col', 'field', 'id', 'num', 'total', 'avg', 'count'].includes(lower)) {
    return s;
  }

  return undefined;
}

/**
 * Classifies semantic category for visual styling, charts, and colors
 */
export function classifyCategory(key: string, detectedUnit?: string): MetricCategory {
  const lower = key.toLowerCase();
  const unitLower = (detectedUnit || '').toLowerCase();

  if (unitLower.includes('°c') || unitLower.includes('°f') || unitLower === 'k' || lower.includes('temp') || lower.includes('thermal') || lower.includes('coolant') || lower.includes('exhaust')) {
    return 'temperature';
  }
  if (unitLower === 'v' || unitLower === 'kv' || unitLower === 'mv' || lower.includes('volt') || lower.includes('bus_v') || lower.includes('gen_volt')) {
    return 'voltage';
  }
  if (['kw', 'mw', 'gw', 'w', 'kvar', 'mvar', 'kva', 'mva'].includes(unitLower) || lower.includes('power') || lower.includes('load') || lower.includes('watt') || lower.includes('generation')) {
    return 'power';
  }
  if (['hz', 'khz', 'mhz'].includes(unitLower) || lower.includes('freq') || lower.includes('hertz')) {
    return 'frequency';
  }
  if (['bar', 'mbar', 'psi', 'kpa', 'mpa', 'pa'].includes(unitLower) || lower.includes('press')) {
    return 'pressure';
  }
  if (unitLower === '%' && (lower.includes('fuel') || lower.includes('tank') || lower.includes('level') || lower.includes('soc'))) {
    return 'fuel';
  }
  if (['rpm', 'rps'].includes(unitLower) || lower.includes('rpm') || lower.includes('speed') || lower.includes('velocity')) {
    return 'rpm';
  }
  if (['mm/s', 'm/s', 'µm', 'um'].includes(unitLower) || lower.includes('vib')) {
    return 'vibration';
  }
  if (['mg/nm³', 'mg/m³', 'ppm', 'ppb'].includes(unitLower) || lower.includes('emission') || lower.includes('nox') || lower.includes('so2') || lower.includes('co2') || lower.includes('flue')) {
    return 'emissions';
  }
  if (unitLower === '%' || lower.includes('efficiency') || lower.includes('heat_rate')) {
    return 'efficiency';
  }
  if (['hours', 'hrs', 'min', 'mins', 's', 'sec', 'ms'].includes(unitLower) || lower.includes('duration') || lower.includes('runtime') || lower.includes('uptime') || lower.includes('hours')) {
    return 'duration';
  }
  if (['a', 'ka', 'ma'].includes(unitLower) || lower.includes('current') || lower.includes('amp') || lower.includes('stator_i') || lower.includes('rotor_i')) {
    return 'current';
  }
  return 'custom';
}

/**
 * Extracts unit and clean metric display name from column header strings
 */
export function extractUnitAndName(colName: string, existingUnit?: string): ExtractedMetricInfo {
  let extractedUnit: string | undefined = existingUnit ? normalizeUnit(existingUnit, colName) : undefined;
  let cleanName = colName;

  if (!extractedUnit) {
    // 1. Parentheses or Brackets: e.g. "Temperature (°C)", "Voltage [V]", "Power (kW)", "Fuel (%)", "Speed (RPM)"
    const bracketMatch = colName.match(/[\(\[]\s*([^\)\]]+)\s*[\)\]]/);
    if (bracketMatch) {
      const candidate = bracketMatch[1].trim();
      const norm = normalizeUnit(candidate, colName);
      if (norm) {
        extractedUnit = norm;
        cleanName = colName.replace(/[\(\[][^\)\]]+[\)\]]/g, '').trim();
      }
    }
  }

  if (!extractedUnit) {
    // 2. Suffixes separated by underscore, space, or hyphen:
    // e.g. "Voltage_V", "Power_kW", "Current_A", "Speed_RPM", "Pressure_bar", "Fuel_pct", "Flow_m3_h", "Temp_degC"
    const suffixRegex = /(?:_|\s|-)(°C|°F|degC|degF|deg_C|deg_F|C|F|kV|mV|V|kA|mA|A|kW|MW|GW|W|kVAR|MVAR|kVA|MVA|Hz|kHz|MHz|mbar|bar|psi|PSI|kPa|MPa|Pa|RPM|rpm|rps|pct|percent|%|mm_s|mms|mm\/s|m_s|m\/s|m3_h|m3h|m3\/h|m³\/h|l_min|lpm|l\/min|L\/min|gpm|GPM|mg_nm3|mg_Nm3|mg\/nm3|mg\/nm³|mg_m3|mg\/m3|ppm|ppb|Nm|kg|ton|tonne|lbs|hrs|hours|mins|min|sec|ms)$/i;
    const suffixMatch = colName.match(suffixRegex);
    if (suffixMatch && suffixMatch.index !== undefined) {
      const candidate = suffixMatch[1].trim();
      const norm = normalizeUnit(candidate, colName);
      if (norm) {
        extractedUnit = norm;
        cleanName = colName.slice(0, suffixMatch.index).trim();
      }
    }
  }

  // Format clean name
  cleanName = cleanName
    .replace(/_+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  cleanName = cleanName.replace(/\b\w/g, (c) => c.toUpperCase());
  if (!cleanName) cleanName = colName;

  const category = classifyCategory(colName, extractedUnit);

  return {
    unit: extractedUnit,
    cleanName,
    category,
  };
}
