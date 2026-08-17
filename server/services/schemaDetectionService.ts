import { ColumnMetadata } from '../types/index.js';
import { extractUnitAndName } from '../utils/unitDetector.js';

export class SchemaDetectionService {
  public static analyzeColumns(rows: Record<string, any>[]): ColumnMetadata[] {
    if (!rows || rows.length === 0) return [];

    const columnNames = Object.keys(rows[0]);
    const metadataList: ColumnMetadata[] = [];

    for (const col of columnNames) {
      const values = rows.map((r) => r[col]).filter((v) => v !== undefined && v !== null && v !== '');
      const totalSampleCount = values.length;

      let numericCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      let minVal: number | undefined = undefined;
      let maxVal: number | undefined = undefined;
      let sumVal = 0;

      const distinctSet = new Set<string>();

      for (const val of values) {
        const strVal = String(val).trim();
        distinctSet.add(strVal);

        // Check boolean
        if (['true', 'false', '0', '1', 'yes', 'no'].includes(strVal.toLowerCase())) {
          booleanCount++;
        }

        // Check numeric
        const num = Number(val);
        if (!isNaN(num) && typeof val !== 'boolean' && strVal !== '') {
          numericCount++;
          if (minVal === undefined || num < minVal) minVal = num;
          if (maxVal === undefined || num > maxVal) maxVal = num;
          sumVal += num;
        }

        // Check date
        if (isNaN(num)) {
          const parsedDate = Date.parse(strVal);
          if (!isNaN(parsedDate) && strVal.length > 5) {
            dateCount++;
          }
        }
      }

      const lowerCol = col.toLowerCase();
      let dataType: ColumnMetadata['dataType'] = 'string';

      if (numericCount / totalSampleCount > 0.75) {
        dataType = 'numeric';
      } else if (dateCount / totalSampleCount > 0.75 || lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('timestamp')) {
        dataType = 'datetime';
      } else if (booleanCount / totalSampleCount > 0.9 && distinctSet.size <= 2) {
        dataType = 'boolean';
      } else if (distinctSet.size <= Math.min(20, totalSampleCount * 0.2)) {
        dataType = 'category';
      }

      // Unit & Display Name detection using accurate header analysis
      const extracted = extractUnitAndName(col);
      const unit = extracted.unit;
      const displayName = extracted.cleanName;

      // Semantic role detection
      const isTimestamp =
        dataType === 'datetime' ||
        lowerCol.includes('time') ||
        lowerCol.includes('date') ||
        lowerCol.includes('timestamp') ||
        lowerCol === 'ts';

      const isEquipment =
        lowerCol.includes('equip') ||
        lowerCol.includes('gen') ||
        lowerCol.includes('unit') ||
        lowerCol.includes('machine') ||
        lowerCol.includes('asset') ||
        lowerCol.includes('tag');

      const isSensor =
        dataType === 'numeric' &&
        !lowerCol.includes('id') &&
        !lowerCol.includes('index') &&
        !lowerCol.includes('row');

      const isIdentifier =
        lowerCol.includes('id') ||
        lowerCol === 'id' ||
        (distinctSet.size === totalSampleCount && dataType !== 'datetime');

      const sampleValues = Array.from(distinctSet).slice(0, 5);

      metadataList.push({
        name: col,
        displayName: displayName || this.formatDisplayName(col),
        dataType,
        unit,
        min: minVal,
        max: maxVal,
        avg: numericCount > 0 ? Number((sumVal / numericCount).toFixed(2)) : undefined,
        distinctCount: distinctSet.size,
        sampleValues,
        isIdentifier,
        isTimestamp,
        isEquipment,
        isSensor,
      });
    }

    return metadataList;
  }

  private static formatDisplayName(col: string): string {
    return col
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
