import { useState } from 'react';
import { Button } from "@/components/ui/button";
import ExcelProcessor from "@/components/ExcelProcessor";
import VoiceCommands from "@/components/VoiceCommands";
import InventoryTable from "@/components/InventoryTable";
import { FolderOpen, Mic, Package, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as ExcelJS from 'exceljs';

const Index = () => {
  const [excelData, setExcelData] = useState<any[]>([]);
  const [originalHeader, setOriginalHeader] = useState<any>({});
  const [originalStyles, setOriginalStyles] = useState<any>({});
  const [fileName, setFileName] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [highlightedCells, setHighlightedCells] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'import' | 'inventory' | 'voice'>('import');
  const { toast } = useToast();

  const handleDataLoaded = (data: any[], header: any, styles: any, filename?: string) => {
    console.log('Datos procesados:', data.length, 'productos');
    console.log('Muestra:', data.slice(0, 3));
    console.log('Campos disponibles:', data.length > 0 ? Object.keys(data[0]) : []);
    
    setExcelData(data);
    setOriginalHeader(header);
    setOriginalStyles(styles);
    if (filename) {
      setFileName(filename);
    }
    
    // Cambiar automáticamente a la vista de inventario cuando se cargan datos
    if (data.length > 0) {
      setActiveTab('inventory');
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

    // Resaltar la celda actualizada
    setHighlightedCells(prev => new Set(prev).add(index));
    
    // Quitar el resaltado después de 3 segundos
    setTimeout(() => {
      setHighlightedCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }, 3000);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-display font-light text-foreground mb-3 tracking-tight">
            Inventario Voz
          </h1>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Sistema de gestión de inventario con reconocimiento de voz inteligente
          </p>
        </header>

        {/* Navigation Tabs - Siempre visibles */}
        <div className="flex justify-center mb-10">
          <div className="apple-card p-2 inline-flex">
            <button
              onClick={() => setActiveTab('import')}
              className={`apple-button px-6 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === 'import'
                  ? 'bg-primary text-primary-foreground shadow-apple-md'
                  : excelData.length > 0 
                    ? 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <FolderOpen className={`w-4 h-4 mr-2 ${activeTab !== 'import' && excelData.length > 0 ? 'opacity-50' : ''}`} />
              <span className="hidden sm:inline">Archivo</span>
              <span className="sm:hidden">📁</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`apple-button px-6 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === 'inventory'
                  ? 'bg-primary text-primary-foreground shadow-apple-md'
                  : excelData.length === 0
                    ? 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Package className={`w-4 h-4 mr-2 ${activeTab !== 'inventory' && excelData.length === 0 ? 'opacity-50' : ''}`} />
              <span className="hidden sm:inline">Inventario</span>
              <span className="sm:hidden">📦</span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`apple-button px-6 py-3 text-sm font-medium transition-all duration-300 ${
                activeTab === 'voice'
                  ? 'bg-primary text-primary-foreground shadow-apple-md'
                  : excelData.length === 0
                    ? 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Mic className={`w-4 h-4 mr-2 ${activeTab !== 'voice' && excelData.length === 0 ? 'opacity-50' : ''}`} />
              <span className="hidden sm:inline">Control por Voz</span>
              <span className="sm:hidden">🎤</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {activeTab === 'import' && (
            <div className="animate-fade-in">
              <div className="apple-card p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-display font-light text-foreground mb-2">
                    Cargar Inventario
                  </h2>
                  <p className="text-muted-foreground">
                    Selecciona tu archivo Excel para comenzar
                  </p>
                </div>
                
                <ExcelProcessor 
                  onDataProcessed={handleDataLoaded}
                  existingData={excelData}
                  originalHeader={originalHeader}
                  originalStyles={originalStyles}
                />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && excelData.length > 0 && (
            <div className="animate-fade-in">
              <InventoryTable 
                data={excelData}
                onUpdateStock={handleUpdateStock}
                highlightedCells={highlightedCells}
              />
            </div>
          )}

          {activeTab === 'inventory' && excelData.length === 0 && (
            <div className="animate-fade-in">
              <div className="apple-card p-12 text-center max-w-lg mx-auto">
                <div className="w-20 h-20 bg-muted rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-display font-light text-foreground mb-3">
                  Sin datos de inventario
                </h3>
                <p className="text-muted-foreground mb-6">
                  Carga un archivo Excel primero para ver tu inventario
                </p>
                <Button 
                  onClick={() => setActiveTab('import')}
                  className="apple-button bg-primary hover:bg-primary/90"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Cargar archivo
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <VoiceCommands 
                excelData={excelData}
                onUpdateStock={handleUpdateStock}
                isListening={isListening}
                setIsListening={setIsListening}
              />
            </div>
          )}
        </div>

        {/* Export Button */}
        {excelData.length > 0 && (
          <div className="mt-12 flex justify-center">
            <Button 
              onClick={exportExcel}
              size="lg"
              className="apple-button bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 shadow-apple-lg"
            >
              <Download className="w-5 h-5 mr-3" />
              <span className="hidden sm:inline">Exportar Excel Actualizado</span>
              <span className="sm:hidden">Exportar</span>
              <span className="ml-2 text-xs opacity-75">({excelData.length} productos)</span>
            </Button>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 pb-8">
          <p className="text-sm text-muted-foreground font-light">
            Sistema de inventario inteligente · Versión 2.0
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
