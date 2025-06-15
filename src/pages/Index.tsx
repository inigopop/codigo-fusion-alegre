
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelProcessor from "@/components/ExcelProcessor";
import VoiceCommands from "@/components/VoiceCommands";
import { FileSpreadsheet, Mic } from "lucide-react";

const Index = () => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Excel Voice Assistant
          </h1>
          <p className="text-xl text-gray-600">
            Procesa archivos Excel y controla con comandos de voz
          </p>
        </div>

        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Procesador Excel
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Comandos de Voz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <CardTitle>Procesador de Archivos Excel</CardTitle>
                <CardDescription>
                  Carga y procesa archivos Excel, analiza encabezados y datos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExcelProcessor 
                  onDataProcessed={setExcelData}
                  existingData={excelData}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice">
            <Card>
              <CardHeader>
                <CardTitle>Control por Voz</CardTitle>
                <CardDescription>
                  Usa comandos de voz para interactuar con tus datos de Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceCommands 
                  excelData={excelData}
                  isListening={isListening}
                  setIsListening={setIsListening}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {excelData.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Vista Previa de Datos</CardTitle>
              <CardDescription>
                {excelData.length} registros cargados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      {excelData[0] && Object.keys(excelData[0]).map((header) => (
                        <th key={header} className="border border-gray-300 p-2 text-left font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 5).map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 p-2">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelData.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Mostrando 5 de {excelData.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
