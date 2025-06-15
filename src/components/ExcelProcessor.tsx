
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExcelProcessorProps {
  onDataProcessed: (data: any[], originalHeader: any, originalStyles: any) => void;
  existingData: any[];
  originalHeader: any;
  originalStyles: any;
}

const ExcelProcessor = ({ onDataProcessed, existingData, originalHeader, originalStyles }: ExcelProcessorProps) => {
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
        const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
        
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // Extraer el encabezado original y sus estilos
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const headerRow: any = {};
        const headerStyles: any = {};
        
        // Guardar encabezado original (primera fila)
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          const cell = worksheet[cellAddress];
          if (cell) {
            headerRow[XLSX.utils.encode_col(col)] = cell.v;
            headerStyles[cellAddress] = cell.s || {};
          }
        }
        
        // Convertir datos sin el encabezado (empezando desde la fila 2)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          range: 1, // Empezar desde la fila 2 (índice 1)
          header: ['Producto', 'Precio', 'Stock', 'Categoria'] // Nombres de columnas estándar
        });
        
        console.log('Excel data processed:', jsonData);
        console.log('Original header:', headerRow);
        console.log('Header styles:', headerStyles);
        
        onDataProcessed(jsonData, headerRow, headerStyles);
        
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

  const exportExcel = () => {
    if (existingData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Primero debes cargar un archivo Excel",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear nuevo workbook
      const wb = XLSX.utils.book_new();
      
      // Preparar datos con encabezado original
      const dataWithHeader = [
        Object.values(originalHeader || {}),
        ...existingData.map(row => [row.Producto, row.Precio, row.Stock, row.Categoria])
      ];
      
      // Crear worksheet
      const ws = XLSX.utils.aoa_to_sheet(dataWithHeader);
      
      // Aplicar estilos al encabezado
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Estilo para encabezado (fondo gris, negrita, centrado, mayúsculas)
      const headerStyle = {
        fill: { fgColor: { rgb: "BCBCBC" } },
        font: { bold: true },
        alignment: { horizontal: "center" }
      };
      
      // Aplicar estilos a la primera fila (encabezado)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].s = headerStyle;
        
        // Convertir texto del encabezado a mayúsculas
        if (ws[cellAddress].v) {
          ws[cellAddress].v = String(ws[cellAddress].v).toUpperCase();
        }
      }
      
      // Ajustar ancho de columnas
      const colWidths = [];
      
      // Calcular ancho mínimo para cada columna
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 0;
        
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (cell && cell.v) {
            const cellLength = String(cell.v).length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        }
        
        // Ancho mínimo de 10, máximo de 50
        colWidths.push({ wch: Math.max(10, Math.min(50, maxWidth + 2)) });
      }
      
      ws['!cols'] = colWidths;
      
      // Agregar worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      
      // Exportar archivo
      const exportFileName = fileName.replace(/\.[^/.]+$/, "") + "_inventario.xlsx";
      XLSX.writeFile(wb, exportFileName);
      
      toast({
        title: "Archivo exportado exitosamente",
        description: `Se ha descargado ${exportFileName}`,
      });
      
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      toast({
        title: "Error al exportar archivo",
        description: "No se pudo exportar el archivo Excel",
        variant: "destructive",
      });
    }
  };

  const clearData = () => {
    onDataProcessed([], {}, {});
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
            {...useDropzone({
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
            }).getRootProps()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-gray-300 hover:border-gray-400"
          >
            <input {...useDropzone({
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
            }).getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  Arrastra el archivo Excel del economato o haz clic para seleccionar
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
                    {existingData.length} productos listos para inventario
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={exportExcel}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar Inventario
                </Button>
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
