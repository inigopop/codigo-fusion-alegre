import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelProcessorProps {
  onDataProcessed: (data: any[], originalHeader: any, originalStyles: any, fileName?: string) => void;
  existingData: any[];
  originalHeader: any;
  originalStyles: any;
}

const ExcelProcessor = ({ onDataProcessed, existingData }: ExcelProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Flexible column detection patterns
  const detectColumnType = (header: string): 'material' | 'producto' | 'umb' | 'stock' | null => {
    if (!header || typeof header !== 'string') return null;
    
    const h = header.toLowerCase().trim();
    
    // Material patterns (codes, material, codigo, etc.)
    if (h.includes('material') || h.includes('codigo') || h.includes('code') || 
        h.includes('mat') || h.includes('artículo') || h.includes('articulo') ||
        (h.length <= 8 && /^[a-z0-9\s]*$/i.test(h) && h !== 'stock' && h !== 'producto')) {
      return 'material';
    }
    
    // Product patterns
    if (h.includes('producto') || h.includes('descripción') || h.includes('descripcion') ||
        h.includes('nombre') || h.includes('artículo') || h.includes('articulo') ||
        h.includes('product') || h.includes('description')) {
      return 'producto';
    }
    
    // UMB patterns (unit of measure)
    if (h.includes('umb') || h.includes('unidad') || h.includes('medida') || 
        h.includes('unit') || h.includes('measure') || h === 'u' || h === 'um' ||
        h.includes('kg') || h.includes('un') || h.includes('und')) {
      return 'umb';
    }
    
    // Stock patterns
    if (h.includes('stock') || h.includes('cantidad') || h.includes('existencia') ||
        h.includes('inventory') || h.includes('qty') || h.includes('quantity')) {
      return 'stock';
    }
    
    return null;
  };

  // Check if a row looks like data (has at least material code and product name)
  const isDataRow = (row: any[]): boolean => {
    if (!row || row.length < 2) return false;
    
    // First column should look like a material code
    const firstCol = String(row[0] || '').trim();
    const secondCol = String(row[1] || '').trim();
    
    // Skip empty rows
    if (!firstCol && !secondCol) return false;
    
    // Skip rows that look like headers or titles
    if (firstCol.toLowerCase().includes('material') || 
        firstCol.toLowerCase().includes('codigo') ||
        firstCol.toLowerCase().includes('inventario') ||
        secondCol.toLowerCase().includes('material') ||
        secondCol.toLowerCase().includes('producto')) {
      return false;
    }
    
    // Must have both material code and product name
    return Boolean(firstCol && secondCol && firstCol.length > 0 && secondCol.length > 0);
  };

  const processExcelFile = useCallback((file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
        
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        console.log('=== PROCESANDO ARCHIVO CON DETECCIÓN FLEXIBLE ===');
        
        // Convertir toda la hoja a JSON para ver la estructura real
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Estructura completa del Excel:', allData.slice(0, 15));
        
        // Find the header row by looking for column patterns
        let headerRowIndex = -1;
        let columnMapping: { [key: string]: number } = {};
        
        for (let i = 0; i < Math.min(allData.length, 20); i++) { // Check first 20 rows for headers
          const row = allData[i] as any[];
          if (!row || row.length < 2) continue;
          
          const detectedColumns: { [key: string]: number } = {};
          let columnCount = 0;
          
          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || '').trim();
            if (!cellValue) continue;
            
            const colType = detectColumnType(cellValue);
            if (colType) {
              detectedColumns[colType] = j;
              columnCount++;
            }
          }
          
          // We need at least material and producto columns
          if (detectedColumns.material !== undefined && detectedColumns.producto !== undefined) {
            headerRowIndex = i;
            columnMapping = detectedColumns;
            console.log('✅ Encabezados encontrados en fila:', i, row);
            console.log('Mapeo de columnas detectado:', columnMapping);
            break;
          }
        }
        
        // If no header found, try to auto-detect based on common patterns
        if (headerRowIndex === -1) {
          console.log('⚠️ No se encontraron encabezados explícitos, intentando detección automática...');
          
          // Look for the first row that has data (not headers)
          for (let i = 0; i < allData.length; i++) {
            const row = allData[i] as any[];
            if (isDataRow(row)) {
              // Assume standard column order: Material, Product, UMB?, Stock?
              columnMapping.material = 0;
              columnMapping.producto = 1;
              
              if (row.length >= 3) {
                // Try to detect if third column is UMB or Stock
                const thirdCol = String(row[2] || '').trim();
                const fourthCol = String(row[3] || '').trim();
                
                if (row.length >= 4 && (thirdCol === 'KG' || thirdCol === 'UN' || thirdCol === 'kg' || thirdCol === 'un' || 
                                       thirdCol.toLowerCase().includes('kg') || thirdCol.toLowerCase().includes('un'))) {
                  columnMapping.umb = 2;
                  columnMapping.stock = 3;
                } else if (!isNaN(parseFloat(thirdCol))) {
                  // Third column is numeric, probably stock
                  columnMapping.stock = 2;
                } else if (row.length >= 4 && !isNaN(parseFloat(fourthCol))) {
                  columnMapping.umb = 2;
                  columnMapping.stock = 3;
                } else {
                  columnMapping.stock = 2;
                }
              }
              
              headerRowIndex = i - 1; // Start processing from this row
              console.log('✅ Detección automática - columnas:', columnMapping);
              break;
            }
          }
        }
        
        if (headerRowIndex === -1 && Object.keys(columnMapping).length === 0) {
          throw new Error('No se pudo detectar la estructura del archivo. Asegúrate de que contenga columnas de Material y Producto.');
        }

        // Process data rows
        const processedData = [];
        const startRow = Math.max(0, headerRowIndex + 1);
        console.log('Iniciando procesamiento desde fila:', startRow);
        
        for (let i = startRow; i < allData.length; i++) {
          const row = allData[i] as any[];
          if (!isDataRow(row)) continue;
          
          const material = String(row[columnMapping.material] || '').trim();
          const producto = String(row[columnMapping.producto] || '').trim();
          const umb = columnMapping.umb !== undefined ? String(row[columnMapping.umb] || '').trim() : 'UN';
          const stockValue = columnMapping.stock !== undefined ? String(row[columnMapping.stock] || '').trim() : '0';
          
          // Parse stock value
          let stock = 0;
          if (stockValue) {
            const numericValue = parseFloat(stockValue.replace(',', '.'));
            if (!isNaN(numericValue)) {
              stock = numericValue;
            }
          }
          
          if (material && producto) {
            const item = {
              Material: material,
              Producto: producto,
              Codigo: material,
              UMB: umb || 'UN',
              Stock: stock
            };
            
            console.log(`✅ Producto procesado:`, item);
            processedData.push(item);
          }
        }
        
        console.log('✅ Procesamiento completado:', processedData.length, 'productos');
        console.log('Muestra de productos procesados:', processedData.slice(0, 3));
        
        if (processedData.length === 0) {
          throw new Error('No se encontraron productos válidos en el archivo');
        }
        
        onDataProcessed(processedData, {}, {}, file.name);
        
        toast({
          title: "✅ Archivo procesado correctamente",
          description: `Se cargaron ${processedData.length} productos con mapeo corregido`,
        });
        
      } catch (error) {
        console.error('❌ Error procesando Excel:', error);
        toast({
          title: "Error al procesar archivo",
          description: error instanceof Error ? error.message : "No se pudo procesar el archivo Excel",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [onDataProcessed, toast]);

  const clearData = () => {
    onDataProcessed([], {}, {});
    setFileName('');
    toast({
      title: "Datos limpiados",
      description: "Se han eliminado todos los datos cargados",
    });
  };

  const handleFileSelect = (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
    event.target.value = '';
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) processExcelFile(file);
    },
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    noClick: true
  });

  return (
    <div className="space-y-6">
      {/* Botón de carga principal */}
      <div className="text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl mx-auto flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-primary" />
          </div>
          
          <Button 
            onClick={handleFileSelect}
            disabled={isProcessing}
            size="lg"
            className="apple-button bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 shadow-apple-lg"
          >
            <Upload className="w-5 h-5 mr-3" />
            Cargar Inventario
          </Button>
          
          <p className="text-xs text-muted-foreground font-light">
            Formatos compatibles: Excel (.xlsx, .xls) • Detección flexible de columnas (Material, Producto, UMB, Stock)
          </p>
        </div>
      </div>

      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">
                Procesando {fileName}...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {existingData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Archivo cargado: {fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {existingData.length} productos listos para inventario
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearData}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelProcessor;
