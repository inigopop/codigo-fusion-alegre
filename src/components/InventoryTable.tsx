
import { useState, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Save, X, Search } from "lucide-react";

interface InventoryTableProps {
  data: any[];
  onUpdateStock: (index: number, newStock: number) => void;
}

const InventoryTable = ({ data, onUpdateStock }: InventoryTableProps) => {
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  const startEdit = useCallback((productId: string, currentStock: number) => {
    console.log('🔧 Iniciando edición:', productId, currentStock);
    setEditingProductId(productId);
    setEditValue(currentStock.toString());
    setTimeout(() => focusInput(), 50);
  }, [focusInput]);

  const saveEdit = useCallback(() => {
    if (editingProductId !== null && editValue.trim() !== '') {
      const product = filteredProducts.find(p => p.uniqueId === editingProductId);
      if (product) {
        const numericValue = parseFloat(editValue);
        if (!isNaN(numericValue) && numericValue >= 0) {
          onUpdateStock(product.originalIndex, numericValue);
          setEditingProductId(null);
          setEditValue('');
        }
      }
    }
  }, [editingProductId, editValue, onUpdateStock, filteredProducts]);

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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32 min-w-[120px]">MATERIAL</TableHead>
                <TableHead className="min-w-[200px]">PRODUCTO</TableHead>
                <TableHead className="w-20 min-w-[60px]">UMB</TableHead>
                <TableHead className="w-32 min-w-[100px]">STOCK</TableHead>
                <TableHead className="w-24 min-w-[100px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const isEditing = editingProductId === product.uniqueId;
                const displayStock = Number(product.Stock || 0);
                
                const materialCode = getMaterialCode(product);
                const productName = getProductName(product);
                const unit = getUnit(product);
                
                return (
                  <TableRow key={product.uniqueId}>
                    <TableCell className="font-mono text-sm font-bold break-all">
                      {materialCode}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="break-words" title={productName}>
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
                          className="w-24 text-center text-lg font-mono"
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
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
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => startEdit(product.uniqueId, displayStock)}
                          className="min-h-[48px] min-w-[48px] hover:bg-blue-50"
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
        
        {filteredProducts.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron productos que coincidan con "{searchTerm}"
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
