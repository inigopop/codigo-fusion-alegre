
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ExcelProcessor from "@/components/ExcelProcessor";
import VoiceCommands from "@/components/VoiceCommands";
import InventoryTable from "@/components/InventoryTable";
import { FileSpreadsheet, Mic, ClipboardList, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

const Index = () => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [originalHeader, setOriginalHeader] = useState<any>({});
  const [originalStyles, setOriginalStyles] = useState<any>({});
  const [originalWorksheet, setOriginalWorksheet] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const handleDataProcessed = (data: any[], header: any, styles: any, filename?: string) => {
    console.log('Data processed in Index:', data.length, 'items');
    console.log('Original header:', header);
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
  };

  const handleUpdateStock = (productNameOrIndex: string | number, newStock: number) => {
    console.log('Updating stock:', productNameOrIndex, newStock);
    setExcelData(prevData => {
      return prevData.map((item, index) => {
        if (typeof productNameOrIndex === 'string') {
          if (item.Producto && item.Producto === productNameOrIndex) {
            console.log('Updated product by name:', item.Producto, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        } else {
          if (index === productNameOrIndex) {
            console.log('Updated product by index:', index, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        }
        return item;
      });
    });
  };

  const exportExcel = () => {
    if (excelData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Primero debes cargar un archivo Excel",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting export...');
      console.log('Excel data length:', excelData.length);
      console.log('Original header:', originalHeader);
      
      const wb = XLSX.utils.book_new();
      
      // Crear una matriz con el encabezado original y los datos actualizados
      const exportData = [];
      
      // Primera fila: encabezado original
      const headerRow = [];
      if (Object.keys(originalHeader).length > 0) {
        // Usar el encabezado original en el orden correcto
        const columnOrder = ['A', 'B', 'C', 'D'];
        for (const col of columnOrder) {
          headerRow.push(originalHeader[col] || '');
        }
      } else {
        // Encabezado por defecto si no hay original
        headerRow.push('MATERIAL', 'PRODUCTO', 'UMB', 'STOCK');
      }
      exportData.push(headerRow);
      
      // Añadir los datos del inventario
      excelData.forEach(item => {
        exportData.push([
          item.Material || '',
          item.Producto || '',
          item.UMB || '',
          Number(item.Stock || 0)
        ]);
      });
      
      console.log('Export data prepared:', exportData.length, 'rows');
      console.log('Header row:', exportData[0]);
      console.log('Sample data row:', exportData[1]);
      
      // Crear la hoja de trabajo
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      // Establecer el rango de la hoja
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Aplicar estilos al encabezado
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        
        if (!ws[cellAddress]) {
          ws[cellAddress] = { v: '', t: 's' };
        }
        
        // Aplicar estilos del encabezado original si existen
        const originalCellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (originalStyles[originalCellAddress]) {
          ws[cellAddress].s = originalStyles[originalCellAddress];
        } else {
          // Estilo por defecto para el encabezado
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: "CCCCCC" } },
            font: { bold: true, color: { rgb: "000000" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      }
      
      // Configurar anchos de columna
      const colWidths = [
        { wch: 12 }, // Material
        { wch: 40 }, // Producto (más ancho para nombres largos)
        { wch: 8 },  // UMB
        { wch: 12 }  // Stock
      ];
      ws['!cols'] = colWidths;
      
      // Aplicar formato a las celdas de datos
      for (let row = 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          // Formato específico para la columna de stock (números)
          if (col === 3) { // Columna D (Stock)
            ws[cellAddress].t = 'n'; // Tipo numérico
            if (typeof ws[cellAddress].v === 'string') {
              ws[cellAddress].v = parseFloat(ws[cellAddress].v) || 0;
            }
          }
          
          // Bordes para todas las celdas
          ws[cellAddress].s = {
            ...ws[cellAddress].s,
            border: {
              top: { style: "thin", color: { rgb: "000000" } },
              bottom: { style: "thin", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          };
        }
      }
      
      // Añadir la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      
      // Generar nombre del archivo
      const exportFileName = (fileName || "inventario").replace(/\.[^/.]+$/, "") + "_inventario_actualizado.xlsx";
      
      // Exportar el archivo
      XLSX.writeFile(wb, exportFileName);
      
      console.log('Export completed successfully');
      
      toast({
        title: "Archivo exportado exitosamente",
        description: `Se ha descargado ${exportFileName} con ${excelData.length} productos`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sistema de Inventario Hotelero
          </h1>
          <p className="text-xl text-gray-600">
            Gestiona el inventario del economato con control por voz
          </p>
        </div>

        {/* Botón de exportar visible siempre que haya datos */}
        {excelData.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={exportExcel}
              size="lg"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="w-5 h-5" />
              Exportar Inventario Actualizado ({excelData.length} productos)
            </Button>
          </div>
        )}

        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Cargar Archivo
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Inventario ({excelData.length})
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Control por Voz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <CardTitle>Carga de Archivo del Economato</CardTitle>
                <CardDescription>
                  Importa el archivo Excel del economato. Las columnas deben ser: Material, Producto, UMB, Stock. 
                  Solo la columna Stock es editable.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExcelProcessor 
                  onDataProcessed={(data, header, styles, filename) => {
                    handleDataProcessed(data, header, styles, filename);
                  }}
                  existingData={excelData}
                  originalHeader={originalHeader}
                  originalStyles={originalStyles}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryTable 
              data={excelData}
              onUpdateStock={handleUpdateStock}
            />
          </TabsContent>

          <TabsContent value="voice">
            <Card>
              <CardHeader>
                <CardTitle>Control por Voz del Inventario</CardTitle>
                <CardDescription>
                  Usa el buscador para encontrar productos y actualiza el stock usando comandos de voz o manualmente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceCommands 
                  excelData={excelData}
                  onUpdateStock={handleUpdateStock}
                  isListening={isListening}
                  setIsListening={setIsListening}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
