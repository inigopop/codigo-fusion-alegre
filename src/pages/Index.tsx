
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

  const handleDataProcessed = (data: any[], header: any, styles: any) => {
    console.log('Data processed in Index:', data);
    console.log('Original header:', header);
    console.log('Original styles:', styles);
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
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
      console.log('Original header:', originalHeader);
      console.log('Excel data sample:', excelData[0]);
      
      const wb = XLSX.utils.book_new();
      
      // Crear el encabezado original preservando el orden correcto
      const headerRow = [];
      const columnOrder = ['A', 'B', 'C', 'D']; // Material, Producto, UMB, Stock
      
      // Reconstruir el encabezado en el orden correcto
      for (const col of columnOrder) {
        if (originalHeader[col]) {
          headerRow.push(originalHeader[col]);
        }
      }
      
      // Si no tenemos encabezado original, usar el estándar
      if (headerRow.length === 0) {
        headerRow.push('MATERIAL', 'PRODUCTO', 'UMB', 'STOCK');
      }
      
      console.log('Header row:', headerRow);
      
      // Crear los datos manteniendo el orden correcto: Material, Producto, UMB, Stock
      const dataRows = excelData.map(row => [
        row.Material,
        row.Producto, 
        row.UMB,
        row.Stock
      ]);
      
      console.log('Data rows sample:', dataRows[0]);
      
      // Combinar encabezado y datos
      const allData = [headerRow, ...dataRows];
      
      // Crear la hoja de cálculo
      const ws = XLSX.utils.aoa_to_sheet(allData);
      
      // Aplicar estilos al encabezado
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      const headerStyle = {
        fill: { fgColor: { rgb: "BCBCBC" } },
        font: { bold: true },
        alignment: { horizontal: "center" }
      };
      
      // Aplicar estilos y convertir a mayúsculas el encabezado
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].s = headerStyle;
        
        // Convertir a mayúsculas
        if (ws[cellAddress].v) {
          ws[cellAddress].v = String(ws[cellAddress].v).toUpperCase();
        }
      }
      
      // Configurar anchos de columna
      const colWidths = [];
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 0;
        
        // Calcular el ancho máximo para cada columna
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (cell && cell.v) {
            const cellLength = String(cell.v).length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        }
        
        // Para la columna Producto (columna B, índice 1), asegurar ancho mínimo adecuado
        if (col === 1) {
          maxWidth = Math.max(maxWidth, 30);
        }
        
        colWidths.push({ wch: Math.max(10, Math.min(60, maxWidth + 2)) });
      }
      
      ws['!cols'] = colWidths;
      
      // Añadir la hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      
      // Generar nombre del archivo
      const exportFileName = (fileName || "inventario").replace(/\.[^/.]+$/, "") + "_inventario.xlsx";
      
      // Exportar el archivo
      XLSX.writeFile(wb, exportFileName);
      
      console.log('Export completed successfully');
      
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
              Exportar Inventario Final ({excelData.length} productos)
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
                    handleDataProcessed(data, header, styles);
                    setFileName(filename || 'economato');
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
