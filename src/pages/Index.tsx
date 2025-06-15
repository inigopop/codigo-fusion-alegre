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
    console.log('=== DATA PROCESSED DEBUG ===');
    console.log('Datos recibidos:', data.length, 'filas');
    console.log('Muestra de datos:', data.slice(0, 3));
    console.log('Header original:', header);
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
    console.log('Parámetros:', { productNameOrIndex, newStock });
    console.log('Tipo de identificador:', typeof productNameOrIndex);
    
    setExcelData(prevData => {
      console.log('Datos previos:', prevData.length);
      
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
      
      console.log('Datos actualizados:', newData.length);
      return newData;
    });
  };

  // Función de exportación con logs detallados
  const exportExcel = () => {
    console.log('=== EXPORT DEBUG ===');
    console.log('Iniciando exportación...');
    console.log('Datos totales:', excelData.length);
    console.log('Nombre de archivo base:', fileName);

    if (excelData.length === 0) {
      console.log('No hay datos para exportar');
      toast({
        title: "No hay datos para exportar",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Filtrando datos válidos...');
      
      // Log de todos los productos para ver qué se está filtrando
      excelData.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          completo: item,
          producto: item?.Producto,
          tipoProducto: typeof item?.Producto,
          material: item?.Material,
          umb: item?.UMB,
          stock: item?.Stock
        });
      });

      // Filtrado muy simple
      const validData = excelData.filter((item, index) => {
        const isValid = item && item.Producto && typeof item.Producto === 'string' && item.Producto.trim() !== '';
        console.log(`Validación ${index}: ${isValid}`);
        return isValid;
      });

      console.log('Productos válidos:', validData.length);

      if (validData.length === 0) {
        console.error('No se encontraron productos válidos');
        toast({
          title: "Error",
          description: "No se encontraron productos válidos para exportar",
          variant: "destructive",
        });
        return;
      }

      // Crear datos de exportación simples
      const exportData = validData.map((item, index) => {
        const exportItem = {
          'MATERIAL': item.Material || '',
          'PRODUCTO': item.Producto || '',
          'UMB': item.UMB || '',
          'STOCK': Number(item.Stock) || 0
        };
        console.log(`Export item ${index}:`, exportItem);
        return exportItem;
      });

      console.log('Datos preparados:', exportData.length);
      console.log('Muestra de datos exportación:', exportData.slice(0, 3));

      // Crear workbook simple
      console.log('Creando worksheet...');
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      console.log('Creando workbook...');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      // Configuración simple de columnas
      ws['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 10 },
        { wch: 15 }
      ];

      // Nombre del archivo
      const baseFileName = fileName.replace(/\.[^/.]+$/, "") || "inventario";
      const exportFileName = `${baseFileName}_actualizado.xlsx`;
      
      console.log('Nombre de exportación:', exportFileName);
      console.log('Iniciando descarga...');

      // Exportar
      XLSX.writeFile(wb, exportFileName);

      console.log('Exportación completada exitosamente');

      toast({
        title: "Archivo exportado",
        description: `${exportFileName} descargado con ${validData.length} productos`,
      });

    } catch (error) {
      console.error('Error detallado en exportación:', error);
      console.error('Stack trace:', error.stack);
      toast({
        title: "Error al exportar",
        description: `Error: ${error.message}`,
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

        {/* Debug panel */}
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-red-700 mb-2">Panel de Debug:</h3>
            <div className="grid grid-cols-3 gap-4 text-sm text-red-600">
              <div>Datos cargados: {excelData.length}</div>
              <div>Archivo: {fileName || 'No cargado'}</div>
              <div>Navegador: {navigator.userAgent.split(' ')[0]}</div>
            </div>
          </CardContent>
        </Card>

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
