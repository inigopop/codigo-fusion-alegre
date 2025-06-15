
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
        
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headerRow: any = {};
        const headerStyles: any = {};
        
        console.log('Processing Excel file with range:', range);
        
        // Guardar encabezado original (primera fila)
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          if (cell) {
            const colLetter = XLSX.utils.encode_col(col);
            headerRow[colLetter] = cell.v;
            headerStyles[cellAddress] = cell.s || {};
            console.log(`Header ${colLetter}: ${cell.v}`);
          }
        }
        
        // Convertir datos empezando desde la fila 2 (fila 1 es el encabezado)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 1, // Empezar desde la fila 2 (índice 1)
          header: ['Material', 'Producto', 'UMB', 'Stock'],
          defval: '' // Valor por defecto para celdas vacías
        });
        
        console.log('Excel data processed:', jsonData.length, 'rows');
        console.log('Sample data:', jsonData.slice(0, 3));
        console.log('Original header:', headerRow);
        
        onDataProcessed(jsonData, headerRow, headerStyles, file.name);
        
        toast({
          title: "Archivo procesado exitosamente",
          description: `Se cargaron ${jsonData.length} registros desde ${file.name}`,
        });
      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast({
          title: "Error al procesar archivo",
          description: "No se pudo procesar el archivo Excel. Verifica que sea válido.",
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

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
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
    multiple: false
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
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
                  {isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra el archivo Excel del economato aquí'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  o haz clic para seleccionar. Formatos: .xlsx, .xls, .csv
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
