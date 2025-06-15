
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
  const [fileName, setFileName] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();

  const handleDataProcessed = (data: any[], header: any, styles: any, filename?: string) => {
    console.log('=== DATA PROCESSED IN INDEX ===');
    console.log('Data length:', data.length);
    console.log('Sample data:', data[0]);
    console.log('Original header:', header);
    console.log('Filename:', filename);
    
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
  };

  const handleUpdateStock = (productNameOrIndex: string | number, newStock: number) => {
    console.log('=== UPDATE STOCK DEBUG ===');
    console.log('Product identifier:', productNameOrIndex);
    console.log('New stock:', newStock);
    console.log('Current data length:', excelData.length);
    
    setExcelData(prevData => {
      const newData = prevData.map((item, index) => {
        if (typeof productNameOrIndex === 'string') {
          if (item.Producto && item.Producto === productNameOrIndex) {
            console.log('Updated product by name:', item.Producto, 'from', item.Stock, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        } else {
          if (index === productNameOrIndex) {
            console.log('Updated product by index:', index, 'from', item.Stock, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        }
        return item;
      });
      
      console.log('Data after update:', newData.length);
      return newData;
    });
  };

  const exportExcel = () => {
    console.log('=== EXPORT DEBUG ===');
    console.log('Excel data length:', excelData.length);
    console.log('Original header:', originalHeader);
    console.log('Original styles:', originalStyles);
    console.log('Sample data item:', excelData[0]);

    if (excelData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Primero debes cargar un archivo Excel",
        variant: "destructive",
      });
      return;
    }

    try {
      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      
      // Preparar los datos manteniendo la estructura original
      const exportData: any[][] = [];
      
      // Fila de encabezado - usar el encabezado original o uno por defecto
      const headers = ['MATERIAL', 'PRODUCTO', 'UMB', 'STOCK'];
      exportData.push(headers);
      
      // Añadir datos
      excelData.forEach(item => {
        exportData.push([
          item.Material || '',
          item.Producto || '',
          item.UMB || '',
          Number(item.Stock || 0)
        ]);
      });
      
      console.log('Export data prepared:', exportData.length, 'rows');
      console.log('Headers:', exportData[0]);
      console.log('Sample row:', exportData[1]);
      
      // Crear hoja de trabajo
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      // Configurar el rango
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      console.log('Sheet range:', range);
      
      // Aplicar formato a los encabezados
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { v: headers[col], t: 's' };
        }
        
        // Aplicar estilo de encabezado
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: "366092" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }
      
      // Configurar anchos de columna
      ws['!cols'] = [
        { wch: 15 }, // Material
        { wch: 50 }, // Producto 
        { wch: 10 }, // UMB
        { wch: 15 }  // Stock
      ];
      
      // Aplicar bordes a todas las celdas de datos
      for (let row = 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          // Asegurar que la columna de stock sea numérica
          if (col === 3 && ws[cellAddress]) { // Columna D (Stock)
            ws[cellAddress].t = 'n';
            if (typeof ws[cellAddress].v === 'string') {
              ws[cellAddress].v = parseFloat(ws[cellAddress].v) || 0;
            }
          }
          
          // Aplicar bordes
          if (!ws[cellAddress].s) ws[cellAddress].s = {};
          ws[cellAddress].s.border = {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          };
        }
      }
      
      // Añadir hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      
      // Generar nombre del archivo
      const baseFileName = fileName.replace(/\.[^/.]+$/, "") || "inventario";
      const exportFileName = `${baseFileName}_actualizado.xlsx`;
      
      // Exportar
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
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExcelProcessor 
                  onDataProcessed={handleDataProcessed}
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
                  Usa el buscador para encontrar productos y actualiza el stock usando comandos de voz
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
