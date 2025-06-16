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
        
        console.log('=== PROCESANDO ARCHIVO CON MAPEO CORREGIDO ===');
        
        // Convertir toda la hoja a JSON para ver la estructura real
        const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Estructura completa del Excel:', allData.slice(0, 15));
        
        // Buscar la fila de encabezados que contenga "MATERIAL", "PRODUCTO", etc.
        let headerRowIndex = -1;
        let columnMapping: any = {};
        
        for (let i = 0; i < allData.length; i++) {
          const row = allData[i] as any[];
          if (row && row.some(cell => 
            typeof cell === 'string' && 
            (cell.includes('MATERIAL') || cell.includes('PRODUCTO') || cell.includes('UMB'))
          )) {
            headerRowIndex = i;
            console.log('Encabezados encontrados en fila:', i, row);
            
            // Mapear las columnas según los encabezados reales
            row.forEach((header, colIndex) => {
              if (typeof header === 'string') {
                const headerUpper = header.toUpperCase().trim();
                if (headerUpper.includes('MATERIAL')) {
                  columnMapping.material = colIndex;
                } else if (headerUpper.includes('PRODUCTO')) {
                  columnMapping.producto = colIndex;
                } else if (headerUpper.includes('UMB')) {
                  columnMapping.umb = colIndex;
                } else if (headerUpper.includes('STOCK')) {
                  columnMapping.stock = colIndex;
                }
              }
            });
            
            console.log('Mapeo de columnas detectado:', columnMapping);
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          throw new Error('No se encontraron los encabezados del inventario');
        }

        // Procesar datos usando el mapeo correcto
        const processedData = [];
        console.log('Iniciando procesamiento con mapeo correcto...');
        
        for (let i = headerRowIndex + 1; i < allData.length; i++) {
          const row = allData[i] as any[];
          
          console.log(`Procesando fila ${i}:`, row);
          
          // Verificar que la fila tenga datos válidos usando el mapeo
          if (row && row.length > 0 && (row[columnMapping.material] || row[columnMapping.producto])) {
            const material = String(row[columnMapping.material] || '');
            const producto = String(row[columnMapping.producto] || '');
            const umb = String(row[columnMapping.umb] || 'UN');
            const stock = Number(row[columnMapping.stock]) || 0;
            
            const item = {
              Material: material,
              Producto: producto,
              Codigo: material, // Usar el material como código también
              UMB: umb,
              Stock: stock
            };
            
            console.log(`✅ Producto procesado correctamente:`, item);
            processedData.push(item);
          } else {
            console.log(`❌ Fila ${i} omitida - datos insuficientes:`, row);
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
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra el archivo Excel del inventario aquí'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Estructura esperada: MATERIAL | PRODUCTO | UMB | STOCK
                </p>
              </div>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleFileSelect}
                type="button"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Seleccionar Archivo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
