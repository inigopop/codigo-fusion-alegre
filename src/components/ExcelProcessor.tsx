
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelProcessorProps {
  onDataProcessed: (data: any[]) => void;
  existingData: any[];
}

const ExcelProcessor = ({ onDataProcessed, existingData }: ExcelProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();

  const processExcelFile = useCallback((file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Excel data processed:', jsonData);
        onDataProcessed(jsonData);
        
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      processExcelFile(file);
    }
  }, [processExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const clearData = () => {
    onDataProcessed([]);
    setFileName('');
    toast({
      title: "Datos limpiados",
      description: "Se han eliminado todos los datos cargados",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive
                    ? 'Suelta el archivo aquí...'
                    : 'Arrastra un archivo Excel o haz clic para seleccionar'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Formatos soportados: .xlsx, .xls, .csv
                </p>
              </div>
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
                    {existingData.length} registros procesados
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearData}
              >
                Limpiar datos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExcelProcessor;
