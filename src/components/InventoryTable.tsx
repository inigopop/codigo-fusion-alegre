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
  
  // Debug: Log the first few items to see the actual structure
  console.log('🔍 Estructura de datos:', data.slice(0, 3));
  console.log('🔍 Campos disponibles:', data.length > 0 ? Object.keys(data[0]) : []);
  
  // Generar IDs únicos para cada producto
  const productsWithIds = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      uniqueId: `product_${index}_${item.Material || 'nomaterial'}`,
      originalIndex: index
    }));
  }, [data]);

  // Función para obtener el código del material - CORREGIDA COMPLETAMENTE
  const getMaterialCode = useCallback((product: any) => {
    console.log('🔍 Producto completo:', product);
    
    // Buscar en todos los campos posibles para el código
    const possibleCodeFields = [
      'MATERIAL', 'Material', 'material',
      'CODIGO', 'Codigo', 'codigo', 'Code', 'code',
      'ID', 'id', 'Id'
    ];
    
    for (const field of possibleCodeFields) {
      if (product[field] && typeof product[field] === 'string' && /^\d+$/.test(product[field])) {
        console.log('✅ Código encontrado en campo:', field, '=', product[field]);
        return product[field];
      }
    }
    
    // Si no hay código numérico, usar el índice + 1000000 como fallback
    const fallbackCode = `1${String(product.originalIndex || 0).padStart(6, '0')}`;
    console.log('⚠️ Usando código fallback:', fallbackCode);
    return fallbackCode;
  }, []);

  // Función para obtener el nombre del producto - CORREGIDA
  const getProductName = useCallback((product: any) => {
    console.log('🔍 Buscando nombre en:', product);
    
    // Buscar en todos los campos posibles para el nombre del producto
    const possibleNameFields = [
      'PRODUCTO', 'Producto', 'producto',
      'DESCRIPCION', 'Descripcion', 'descripcion',
      'DESCRIPTION', 'Description', 'description',
      'NOMBRE', 'Nombre', 'nombre', 'Name', 'name',
      'MATERIAL', 'Material', 'material' // A veces el material contiene la descripción
    ];
    
    for (const field of possibleNameFields) {
      if (product[field] && typeof product[field] === 'string' && product[field].trim()) {
        console.log('✅ Nombre encontrado en campo:', field, '=', product[field]);
        return product[field].trim();
      }
    }
    
    console.log('⚠️ No se encontró nombre, usando fallback');
    return 'Sin descripción';
  }, []);

  // Función para obtener la unidad - CORREGIDA
  const getUnit = useCallback((product: any) => {
    const possibleUnitFields = [
      'UMB', 'umb', 'Umb',
      'UNIDAD', 'Unidad', 'unidad', 'Unit', 'unit',
      'UM', 'um', 'Um'
    ];
    
    for (const field of possibleUnitFields) {
      if (product[field] && typeof product[field] === 'string' && product[field].trim()) {
        return product[field].trim();
      }
    }
    
    return 'UN';
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
    console.log('🔧 INICIO EDICIÓN');
    console.log('Product ID:', productId);
    console.log('Stock actual:', currentStock);
    
    setEditingProductId(productId);
    setEditValue(currentStock.toString());
    
    // Enfocar después de que el componente se re-renderice
    setTimeout(() => focusInput(), 50);
  }, [focusInput]);

  const saveEdit = useCallback(() => {
    console.log('💾 GUARDANDO');
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
    console.log('❌ CANCELANDO EDICIÓN');
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
    console.log('📝 Cambio input:', value);
    setEditValue(value);
  }, []);

  // Manejar blur del input (cuando pierde el foco)
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    console.log('👁️ Input perdió foco');
  }, []);

  // Manejar touch events específicamente para iOS
  const handleSaveTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Touch save');
    saveEdit();
  }, [saveEdit]);

  const handleCancelTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('👆 Touch cancel');
    cancelEdit();
  }, [cancelEdit]);

  const handleEditTouch = useCallback((productId: string, currentStock: number) => {
    return (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('👆 Touch edit');
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
                <TableHead className="w-32">MATERIAL</TableHead>
                <TableHead className="min-w-[300px]">PRODUCTO</TableHead>
                <TableHead className="w-20">UMB</TableHead>
                <TableHead className="w-32">STOCK</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsWithIds.map((product) => {
                const isEditing = editingProductId === product.uniqueId;
                const displayStock = Number(product.Stock || 0);
                
                // Obtener los valores correctos EXACTAMENTE como en el Excel original
                const materialCode = getMaterialCode(product);  // Código numérico en MATERIAL
                const productName = getProductName(product);    // Descripción en PRODUCTO
                const unit = getUnit(product);                  // Unidad en UMB
                
                console.log('🏗️ Fila renderizada:', {
                  materialCode,    // Debe ser código numérico
                  productName,     // Debe ser descripción completa
                  unit,           // Debe ser la unidad
                  stock: displayStock
                });
                
                return (
                  <TableRow key={product.uniqueId}>
                    <TableCell className="font-mono text-sm font-bold">
                      {materialCode}
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px]">
                      <div className="truncate" title={productName}>
                        {productName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
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
