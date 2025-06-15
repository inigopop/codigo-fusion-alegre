
import { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Save, X } from "lucide-react";

interface InventoryTableProps {
  data: any[];
  onUpdateStock: (index: number, newStock: number) => void;
}

const InventoryTable = ({ data, onUpdateStock }: InventoryTableProps) => {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Generar IDs únicos para cada producto
  const productsWithIds = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      uniqueId: `product_${index}_${item.Material || 'nomaterial'}`,
      originalIndex: index
    }));
  }, [data]);

  // Función para generar código del material a partir del nombre
  const getMaterialCode = useCallback((product: any) => {
    // Si existe un campo específico de código, usarlo
    if (product.Codigo || product.Code) {
      return product.Codigo || product.Code;
    }
    
    // Si no, generar un código a partir del nombre del material
    const materialName = product.Material || 'MATERIAL';
    
    // Generar código tomando las primeras letras de cada palabra importante
    const words = materialName.split(' ');
    let code = '';
    
    // Tomar las primeras 2-3 letras de las primeras palabras importantes
    for (let i = 0; i < Math.min(3, words.length); i++) {
      const word = words[i];
      if (word.length > 2 && !['DE', 'DEL', 'LA', 'EL', 'Y', 'CON'].includes(word)) {
        code += word.substring(0, Math.min(3, word.length));
      }
    }
    
    // Si el código es muy corto, usar las primeras letras del material completo
    if (code.length < 4) {
      code = materialName.replace(/[^A-Z0-9]/g, '').substring(0, 8);
    }
    
    return code || 'MAT';
  }, []);

  // Función para obtener el nombre del producto
  const getProductName = useCallback((product: any) => {
    // El nombre del producto está en Material (según los logs)
    return product.Material || product.Descripción || product.Description || product.Producto || 'Sin descripción';
  }, []);

  // Función para obtener la unidad
  const getUnit = useCallback((product: any) => {
    // La unidad está en Producto (según los logs) o UMB
    return product.Producto || product.UMB || product.Unidad || product.Unit || 'UN';
  }, []);

  // Función para enfocar el input en iOS
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      // Pequeño delay para iOS
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, []);

  const startEdit = useCallback((productId: string, currentStock: number) => {
    console.log('🔧 INICIO EDICIÓN - iOS');
    console.log('Product ID:', productId);
    console.log('Stock actual:', currentStock);
    
    setEditingProductId(productId);
    setEditValue(currentStock.toString());
    
    // Enfocar después de que el componente se re-renderice
    setTimeout(() => focusInput(), 50);
  }, [focusInput]);

  const saveEdit = useCallback(() => {
    console.log('💾 GUARDANDO - iOS');
    console.log('Product ID editando:', editingProductId);
    console.log('Nuevo valor:', editValue);
    
    if (editingProductId !== null && editValue.trim() !== '') {
      const product = productsWithIds.find(p => p.uniqueId === editingProductId);
      if (product) {
        const numericValue = parseFloat(editValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          console.log('✅ Actualizando índice:', product.originalIndex, 'a valor:', numericValue);
          onUpdateStock(product.originalIndex, numericValue);
          
          // Limpiar estado después de actualizar
          setEditingProductId(null);
          setEditValue('');
          
          console.log('✅ Estado limpiado');
        } else {
          console.log('❌ Valor inválido:', editValue);
        }
      } else {
        console.log('❌ Producto no encontrado');
      }
    } else {
      console.log('❌ Faltan datos para guardar');
    }
  }, [editingProductId, editValue, onUpdateStock, productsWithIds]);

  const cancelEdit = useCallback(() => {
    console.log('❌ CANCELANDO EDICIÓN - iOS');
    setEditingProductId(null);
    setEditValue('');
  }, []);

  // Manejar eventos de teclado específicos para iOS
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('⌨️ Tecla presionada:', e.key);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  // Manejar cambios en el input con validación
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('📝 Cambio input iOS:', value);
    setEditValue(value);
  }, []);

  // Manejar blur del input (cuando pierde el foco)
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    console.log('👁️ Input perdió foco en iOS');
  }, []);

  // Manejar touch events específicamente para iOS
  const handleSaveTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Touch save iOS');
    saveEdit();
  }, [saveEdit]);

  const handleCancelTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Touch cancel iOS');
    cancelEdit();
  }, [cancelEdit]);

  const handleEditTouch = useCallback((productId: string, currentStock: number) => {
    return (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('👆 Touch edit iOS');
      startEdit(productId, currentStock);
    };
  }, [startEdit]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Carga un archivo Excel para comenzar el inventario
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventario - {data.length} productos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Material</TableHead>
                <TableHead className="min-w-[200px]">Producto</TableHead>
                <TableHead className="w-20">UMB</TableHead>
                <TableHead className="w-32">Stock</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsWithIds.map((product) => {
                const isEditing = editingProductId === product.uniqueId;
                const displayStock = Number(product.Stock || 0);
                
                // Obtener los valores correctos para cada columna
                const materialCode = getMaterialCode(product);
                const productName = getProductName(product);
                const unit = getUnit(product);
                
                console.log('🔍 Producto con código generado:', {
                  originalMaterial: product.Material,
                  generatedCode: materialCode,
                  productName,
                  unit,
                  stock: displayStock
                });
                
                return (
                  <TableRow key={product.uniqueId}>
                    <TableCell className="font-mono text-sm">
                      {materialCode}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={productName}>
                        {productName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {unit}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          ref={inputRef}
                          type="number"
                          step="0.1"
                          min="0"
                          value={editValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          onBlur={handleInputBlur}
                          className="w-24 text-center text-lg font-mono"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          style={{
                            WebkitAppearance: 'none',
                            fontSize: '16px',
                          }}
                        />
                      ) : (
                        <span className="font-mono text-lg">
                          {displayStock.toFixed(1)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={saveEdit}
                            onTouchEnd={handleSaveTouch}
                            className="touch-manipulation min-h-[48px] min-w-[48px] bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-5 h-5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={cancelEdit}
                            onTouchEnd={handleCancelTouch}
                            className="touch-manipulation min-h-[48px] min-w-[48px]"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => startEdit(product.uniqueId, displayStock)}
                          onTouchEnd={handleEditTouch(product.uniqueId, displayStock)}
                          className="touch-manipulation min-h-[48px] min-w-[48px] hover:bg-blue-50"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
