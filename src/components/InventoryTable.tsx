import { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Save, X, Search, Plus } from "lucide-react";

interface InventoryTableProps {
  data: any[];
  onUpdateStock: (index: number, newStock: number) => void;
  highlightedCells?: Set<number>;
}

const InventoryTable = ({ data, onUpdateStock, highlightedCells = new Set() }: InventoryTableProps) => {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  console.log('📊 Total productos cargados:', data.length);
  
  // Generar IDs únicos para cada producto
  const productsWithIds = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      uniqueId: `product_${index}_${item.Material || item.Codigo || index}`,
      originalIndex: index
    }));
  }, [data]);

  // Función CORREGIDA para obtener código real del Excel
  const getMaterialCode = useCallback((product: any) => {
    console.log('🔍 Producto completo recibido:', product);
    
    // Intentar obtener Material primero
    if (product.Material) {
      console.log('✅ Material encontrado:', product.Material);
      return String(product.Material);
    }
    
    // Si no hay Material, intentar Codigo
    if (product.Codigo) {
      console.log('✅ Código encontrado:', product.Codigo);
      return String(product.Codigo);
    }
    
    console.error('❌ No se encontró Material ni Código válido para:', product);
    return 'SIN-CODIGO';
  }, []);

  // Función para obtener el nombre del producto
  const getProductName = useCallback((product: any) => {
    return product.Producto || 'Sin descripción';
  }, []);

  // Función para obtener la unidad
  const getUnit = useCallback((product: any) => {
    return product.UMB || 'UN';
  }, []);

  // Filtrar productos según búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return productsWithIds;
    
    const search = searchTerm.toLowerCase();
    return productsWithIds.filter(product => {
      const materialCode = getMaterialCode(product).toLowerCase();
      const productName = getProductName(product).toLowerCase();
      
      return materialCode.includes(search) || productName.includes(search);
    });
  }, [productsWithIds, searchTerm, getMaterialCode, getProductName]);

  // Función para enfocar el input en iOS
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, []);

  const startEdit = useCallback((productId: string, currentStock: number, addMode: boolean = false) => {
    console.log('🔧 Iniciando edición:', productId, currentStock, 'modo suma:', addMode);
    setEditingProductId(productId);
    setIsAddMode(addMode);
    setEditValue(addMode ? '' : currentStock.toString());
    setTimeout(() => focusInput(), 50);
  }, [focusInput]);

  const saveEdit = useCallback(() => {
    if (editingProductId !== null && editValue.trim() !== '') {
      const product = filteredProducts.find(p => p.uniqueId === editingProductId);
      if (product) {
        const numericValue = parseFloat(editValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          if (isAddMode) {
            // Modo suma: añadir cantidad al stock existente
            onUpdateStock(product.originalIndex, numericValue);
            console.log('➕ Sumando', numericValue, 'al stock de', product.Producto);
          } else {
            // Modo reemplazo: establecer nuevo stock total
            const currentStock = Number(product.Stock) || 0;
            const difference = numericValue - currentStock;
            onUpdateStock(product.originalIndex, difference);
            console.log('🔄 Reemplazando stock de', product.Producto, 'diferencia:', difference);
          }
          
          setEditingProductId(null);
          setEditValue('');
          setIsAddMode(false);
        }
      }
    }
  }, [editingProductId, editValue, onUpdateStock, filteredProducts, isAddMode]);

  const cancelEdit = useCallback(() => {
    setEditingProductId(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

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
        <CardTitle>Inventario - {filteredProducts.length} de {data.length} productos</CardTitle>
        <div className="flex items-center gap-2 mt-4">
          <Search className="w-4 h-4 flex-shrink-0" />
          <Input
            placeholder="Buscar por código o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0"
          />
          {searchTerm && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSearchTerm('')}
              className="flex-shrink-0"
            >
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Vista móvil - Tarjetas */}
        <div className="block md:hidden space-y-3">
          {filteredProducts.map((product) => {
            const isEditing = editingProductId === product.uniqueId;
            const displayStock = Number(product.Stock || 0);
            const isHighlighted = highlightedCells.has(product.originalIndex);
            
            const materialCode = getMaterialCode(product);
            const productName = getProductName(product);
            
            return (
              <Card 
                key={product.uniqueId}
                className={`p-4 ${isHighlighted ? 'bg-green-100 border-green-300 animate-pulse' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <h3 className="font-medium text-base leading-tight mb-1">
                      {productName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {materialCode}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Stock */}
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">STOCK</div>
                      {isEditing ? (
                        <div className="space-y-1">
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.1"
                            min="0"
                            value={editValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isAddMode ? "Sumar" : "Total"}
                            className="w-20 text-center text-base font-mono"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                          />
                          {isAddMode && (
                            <p className="text-xs text-green-600">
                              +{editValue || '0'} = {displayStock + (parseFloat(editValue) || 0)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className={`text-xl font-mono font-bold ${isHighlighted ? 'text-green-800' : ''}`}>
                          {displayStock.toFixed(1)}
                        </div>
                      )}
                    </div>
                    
                    {/* Acciones */}
                    <div className="flex flex-col gap-2">
                      {isEditing ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={saveEdit}
                            className="w-10 h-10 p-0 bg-green-600 hover:bg-green-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={cancelEdit}
                            className="w-10 h-10 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit(product.uniqueId, displayStock, false)}
                            className="w-10 h-10 p-0 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit(product.uniqueId, displayStock, true)}
                            className="w-10 h-10 p-0 hover:bg-green-50 text-green-600"
                            title="Sumar"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Vista desktop - Tabla */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">PRODUCTO</TableHead>
                <TableHead className="w-32 min-w-[100px]">STOCK</TableHead>
                <TableHead className="w-32 min-w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isEditing = editingProductId === product.uniqueId;
                const displayStock = Number(product.Stock || 0);
                const isHighlighted = highlightedCells.has(product.originalIndex);
                
                const materialCode = getMaterialCode(product);
                const productName = getProductName(product);
                const unit = getUnit(product);
                
                return (
                  <TableRow 
                    key={product.uniqueId}
                    className={isHighlighted ? 'bg-green-100 border-green-300 animate-pulse' : ''}
                  >
                    <TableCell className="font-medium">
                      <div className="break-words" title={productName}>
                        {productName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {materialCode}
                      </div>
                    </TableCell>
                    <TableCell className={isHighlighted ? 'bg-green-200 font-bold text-green-800' : ''}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.1"
                            min="0"
                            value={editValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isAddMode ? "Cantidad a sumar" : "Stock total"}
                            className="w-32 text-center text-lg font-mono"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                          />
                          {isAddMode && (
                            <p className="text-xs text-green-600 text-center">
                              +{editValue || '0'} = {displayStock + (parseFloat(editValue) || 0)}
                            </p>
                          )}
                        </div>
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
                            className="min-h-[48px] min-w-[48px] bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-5 h-5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={cancelEdit}
                            className="min-h-[48px] min-w-[48px]"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit(product.uniqueId, displayStock, false)}
                            className="min-h-[48px] min-w-[48px] hover:bg-blue-50"
                            title="Reemplazar stock"
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => startEdit(product.uniqueId, displayStock, true)}
                            className="min-h-[48px] min-w-[48px] hover:bg-green-50 text-green-600"
                            title="Sumar al stock"
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron productos que coincidan con "{searchTerm}"
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>💡 Tip:</strong> Usa el botón <Edit className="w-4 h-4 inline mx-1" /> para reemplazar el stock total, 
            o el botón <Plus className="w-4 h-4 inline mx-1" /> para sumar cantidad al stock existente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
