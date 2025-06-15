
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelProcessor from "@/components/ExcelProcessor";
import VoiceCommands from "@/components/VoiceCommands";
import InventoryTable from "@/components/InventoryTable";
import { FileSpreadsheet, Mic, ClipboardList } from "lucide-react";

const Index = () => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [originalHeader, setOriginalHeader] = useState<any>({});
  const [originalStyles, setOriginalStyles] = useState<any>({});
  const [isListening, setIsListening] = useState(false);

  const handleDataProcessed = (data: any[], header: any, styles: any) => {
    console.log('Data processed in Index:', data);
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
  };

  const handleUpdateStock = (productNameOrIndex: string | number, newStock: number) => {
    console.log('Updating stock:', productNameOrIndex, newStock);
    setExcelData(prevData => {
      return prevData.map((item, index) => {
        if (typeof productNameOrIndex === 'string') {
          // Actualización por nombre (comandos de voz)
          if (item.Producto && item.Producto === productNameOrIndex) {
            console.log('Updated product by name:', item.Producto, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        } else {
          // Actualización por índice (edición manual)
          if (index === productNameOrIndex) {
            console.log('Updated product by index:', index, 'to', newStock);
            return { ...item, Stock: newStock };
          }
        }
        return item;
      });
    });
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

        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Cargar Archivo
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Inventario
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
