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
    console.log('Datos procesados:', data.length, 'productos');
    console.log('Muestra:', data.slice(0, 3));
    
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
  };

  const handleUpdateStock = (productName: string, newStock: number) => {
    console.log('Actualizando stock:', productName, newStock);
    
    setExcelData(prevData => {
      return prevData.map(item => {
        if (item && item.Producto === productName) {
          console.log('Stock actualizado:', productName, newStock);
          return { ...item, Stock: newStock };
        }
        return item;
      });
    });
  };

  // Función de exportación mejorada con encabezados y estilos
  const exportExcel = () => {
    console.log('=== EXPORTACIÓN CON ENCABEZADOS Y ESTILOS ===');
    
    if (excelData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    try {
      // Preparar datos con la estructura correcta
      const exportData = excelData.map(item => ({
        'MATERIAL': item.Material || '',
        'PRODUCTO': item.Producto || '',
        'UMB': item.UMB || 'UN',
        'STOCK': Number(item.Stock) || 0
      }));

      console.log('Exportando', exportData.length, 'productos con encabezados');

      // Crear hoja de cálculo
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();

      // Configurar encabezados con estilo
      const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:D1');
      
      // Aplicar estilos a los encabezados
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "366092" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        };
      }

      // Aplicar bordes a todas las celdas de datos
      for (let row = 1; row <= exportData.length; row++) {
        for (let col = 0; col < 4; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              },
              alignment: { horizontal: col === 1 ? "left" : "center" } // Producto alineado a la izquierda
            };
          }
        }
      }

      // Configurar anchos de columna optimizados
      ws['!cols'] = [
        { wch: 15 }, // MATERIAL - más ancho
        { wch: 40 }, // PRODUCTO - mucho más ancho para descripciones largas
        { wch: 8 },  // UMB
        { wch: 12 }  // STOCK - un poco más ancho
      ];

      // Configurar altura de filas
      ws['!rows'] = [
        { hpt: 25 }, // Encabezado más alto
        ...Array(exportData.length).fill({ hpt: 20 }) // Filas de datos
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      const exportFileName = `${fileName.replace(/\.[^/.]+$/, "") || "inventario"}_actualizado.xlsx`;
      
      XLSX.writeFile(wb, exportFileName);

      toast({
        title: "✅ Archivo exportado correctamente",
        description: `${exportFileName} con encabezados y ${exportData.length} productos`,
      });

    } catch (error) {
      console.error('Error en exportación:', error);
      toast({
        title: "Error al exportar",
        description: "Hubo un problema al generar el archivo",
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

        {/* Estado del sistema */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-green-700 mb-2">📊 Estado del Sistema:</h3>
            <div className="grid grid-cols-3 gap-4 text-sm text-green-600">
              <div>✅ Productos: {excelData.length}</div>
              <div>📁 Archivo: {fileName || 'No cargado'}</div>
              <div>🎤 Voz: {isListening ? 'Activo' : 'Inactivo'}</div>
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
              📥 Exportar Excel con Formato ({excelData.length} productos)
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
                  Importa el archivo Excel. Detecta automáticamente: Material | Código | Producto | Stock
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
              onUpdateStock={(index, newStock) => {
                const product = excelData[index];
                if (product) {
                  handleUpdateStock(product.Producto, newStock);
                }
              }}
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
