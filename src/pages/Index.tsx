
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
    console.log('Datos procesados:', data.length, 'filas');
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
  };

  const handleUpdateStock = (productNameOrIndex: string | number, newStock: number) => {
    console.log('Actualizando stock:', productNameOrIndex, 'nuevo stock:', newStock);
    
    setExcelData(prevData => {
      const newData = prevData.map((item, index) => {
        if (typeof productNameOrIndex === 'string') {
          if (item.Producto && item.Producto === productNameOrIndex) {
            console.log('Stock actualizado por nombre:', item.Producto, newStock);
            return { ...item, Stock: newStock };
          }
        } else {
          if (index === productNameOrIndex) {
            console.log('Stock actualizado por índice:', index, newStock);
            return { ...item, Stock: newStock };
          }
        }
        return item;
      });
      
      return newData;
    });
  };

  // Función de exportación completamente simplificada
  const exportExcel = () => {
    console.log('Iniciando exportación...');
    console.log('Datos a exportar:', excelData.length);

    if (excelData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    try {
      // Filtrar solo los productos válidos
      const validData = excelData.filter(item => 
        item && 
        item.Producto && 
        typeof item.Producto === 'string' && 
        item.Producto.trim() !== '' &&
        !item.Producto.includes('INVENTARIO') &&
        !item.Producto.includes('MATERIAL')
      );

      console.log('Productos válidos para exportar:', validData.length);

      // Crear estructura de datos simple
      const exportData = validData.map(item => ({
        'MATERIAL': item.Material || '',
        'PRODUCTO': item.Producto || '',
        'UMB': item.UMB || '',
        'STOCK': parseFloat(item.Stock) || 0
      }));

      console.log('Datos preparados para exportación:', exportData.length);

      // Crear libro de trabajo simple
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      // Configurar anchos de columna básicos
      ws['!cols'] = [
        { wch: 15 }, // MATERIAL
        { wch: 40 }, // PRODUCTO
        { wch: 10 }, // UMB
        { wch: 15 }  // STOCK
      ];

      // Nombre del archivo
      const baseFileName = fileName.replace(/\.[^/.]+$/, "") || "inventario";
      const exportFileName = `${baseFileName}_actualizado.xlsx`;

      // Exportar
      XLSX.writeFile(wb, exportFileName);

      console.log('Exportación completada:', exportFileName);

      toast({
        title: "Archivo exportado",
        description: `${exportFileName} descargado con ${validData.length} productos`,
      });

    } catch (error) {
      console.error('Error en exportación:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el archivo",
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

        {excelData.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={exportExcel}
              size="lg"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="w-5 h-5" />
              Exportar Inventario ({excelData.length} productos)
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
                  Importa el archivo Excel del economato con las columnas: Material, Producto, UMB, Stock.
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
                  Busca productos y actualiza el stock usando comandos de voz
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
