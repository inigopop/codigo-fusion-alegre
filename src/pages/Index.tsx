import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import ExcelProcessor from "@/components/ExcelProcessor";
import VoiceCommands from "@/components/VoiceCommands";
import InventoryTable from "@/components/InventoryTable";
import { FileSpreadsheet, Mic, ClipboardList, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as ExcelJS from 'exceljs';

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
    console.log('Campos disponibles:', data.length > 0 ? Object.keys(data[0]) : []);
    
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
  };

  const handleUpdateStock = (index: number, quantityToAdd: number) => {
    console.log('🔄 SUMANDO stock por ÍNDICE:', index, 'cantidad a sumar:', quantityToAdd);
    
    setExcelData(prevData => {
      return prevData.map((item, itemIndex) => {
        if (itemIndex === index) {
          const currentStock = Number(item.Stock) || 0;
          const newStock = currentStock + quantityToAdd;
          
          console.log('✅ Stock actualizado en índice:', index, 'de', currentStock, '+', quantityToAdd, '=', newStock);
          
          return { ...item, Stock: newStock };
        }
        return item;
      });
    });
  };

  const getMaterialCode = (item: any) => {
    console.log('🔍 Exportación - Producto completo:', item);
    
    // Intentar obtener Material primero
    if (item.Material) {
      console.log('✅ Exportación - Material:', item.Material);
      return String(item.Material);
    }
    
    // Si no hay Material, intentar Codigo
    if (item.Codigo) {
      console.log('✅ Exportación - Código:', item.Codigo);
      return String(item.Codigo);
    }
    
    console.error('❌ Exportación - No se encontró Material ni Código válido');
    return 'SIN-CODIGO';
  };

  const getProductName = (item: any) => {
    return item.Producto || 'Sin descripción';
  };

  const getUnit = (item: any) => {
    return item.UMB || 'UN';
  };

  const exportExcel = async () => {
    console.log('=== EXPORTACIÓN CORREGIDA - NOMBRE DINÁMICO ===');
    
    if (excelData.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    try {
      // Obtener mes actual en español
      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
                     'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const mesActual = meses[new Date().getMonth()];
      const añoActual = new Date().getFullYear();
      const tituloCompleto = `INVENTARIO BARES ${mesActual} ${añoActual}`;

      // Crear workbook y worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inventario');

      // FILA 1: Título principal
      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = tituloCompleto;
      titleCell.font = { 
        name: 'Arial', 
        size: 26, 
        bold: true,
        color: { argb: 'FF000000' }
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Amarillo brillante
      };
      titleCell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
      };
      titleCell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // FILA 2: Vacía
      worksheet.addRow(['', '', '', '']);

      // FILA 3: Encabezados de columnas EXACTOS
      const headerRow = worksheet.addRow(['MATERIAL', 'PRODUCTO', 'UMB', 'STOCK']);
      headerRow.eachCell((cell) => {
        cell.font = { 
          name: 'Arial', 
          bold: true,
          color: { argb: 'FF000000' }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' } // Gris
        };
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle' 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // FILAS DE DATOS - MAPPING EXACTO CON CÓDIGOS REALES
      excelData.forEach((item, index) => {
        const materialCode = getMaterialCode(item);
        const productName = getProductName(item);
        const unit = getUnit(item);
        const stock = Number(item.Stock) || 0;
        
        console.log('📊 Exportando fila con código real:', {
          materialCode,
          productName,
          unit,
          stock
        });
        
        const dataRow = worksheet.addRow([
          materialCode,
          productName,
          unit,
          stock
        ]);
        
        dataRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial' };
          cell.alignment = { 
            horizontal: colNumber === 2 ? 'left' : 'center',
            vertical: 'middle' 
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      });

      // Configurar anchos de columna
      worksheet.getColumn('A').width = 15; // MATERIAL
      worksheet.getColumn('B').width = 50; // PRODUCTO
      worksheet.getColumn('C').width = 8;  // UMB
      worksheet.getColumn('D').width = 12; // STOCK

      // Configurar alturas de fila
      worksheet.getRow(1).height = 60; // Título principal
      worksheet.getRow(2).height = 10; // Fila vacía
      worksheet.getRow(3).height = 25; // Encabezados
      
      // Alturas para filas de datos
      for (let i = 4; i <= excelData.length + 3; i++) {
        worksheet.getRow(i).height = 20;
      }

      // Generar archivo con nombre dinámico
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const exportFileName = `Inventario Bares ${mesActual} ${añoActual}.xlsx`;
      
      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Archivo generado con nombre dinámico:', exportFileName);

      toast({
        title: "✅ Archivo exportado correctamente",
        description: `${exportFileName} con ${excelData.length} productos`,
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
            <TabsTrigger 
              value="excel" 
              className={`flex items-center gap-2 ${
                excelData.length === 0 
                  ? 'data-[state=active]:bg-green-500 data-[state=active]:text-white bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'data-[state=active]:bg-red-500 data-[state=active]:text-white bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Cargar Archivo
            </TabsTrigger>
            <TabsTrigger 
              value="inventory" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <ClipboardList className="w-4 h-4" />
              Inventario ({excelData.length})
            </TabsTrigger>
            <TabsTrigger 
              value="voice" 
              className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-black bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            >
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
