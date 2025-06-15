
import { useState, useCallback, useMemo } from 'react';
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
  // Usar ID único basado en el producto en lugar de índice
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Generar IDs únicos para cada producto
  const productsWithIds = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      uniqueId: `${item.Material || 'no-material'}-${item.Producto?.substring(0, 20) || 'no-product'}-${index}`,
      originalIndex: index
    }));
  }, [data]);

  const startEdit = useCallback((productId: string, currentStock: number) => {
    console.log('=== INICIO EDICIÓN ===');
    console.log('Product ID:', productId);
    console.log('Current Stock:', currentStock);
    
    setEditingProductId(productId);
    setEditValue(currentStock.toString());
  }, []);

  const saveEdit = useCallback(() => {
    console.log('=== GUARDANDO EDICIÓN ===');
    console.log('Editing Product ID:', editingProductId);
    console.log('New Value:', editValue);
    
    if (editingProductId !== null) {
      const product = productsWithIds.find(p => p.uniqueId === editingProductId);
      if (product) {
        const numericValue = parseFloat(editValue);
        if (!isNaN(numericValue)) {
          console.log('Updating stock for index:', product.originalIndex, 'to:', numericValue);
          onUpdateStock(product.originalIndex, numericValue);
        }
      }
      setEditingProductId(null);
      setEditValue('');
    }
  }, [editingProductId, editValue, onUpdateStock, productsWithIds]);

  const cancelEdit = useCallback(() => {
    console.log('=== CANCELANDO EDICIÓN ===');
    console.log('Canceling edit for product ID:', editingProductId);
    
    setEditingProductId(null);
    setEditValue('');
  }, [editingProductId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('=== CAMBIO EN INPUT ===');
    console.log('Editing Product ID:', editingProductId);
    console.log('New Input Value:', value);
    setEditValue(value);
  }, [editingProductId]);

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
                
                return (
                  <TableRow key={product.uniqueId}>
                    <TableCell className="font-mono text-sm">{product.Material}</TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={product.Producto}>
                        {product.Producto}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{product.UMB}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyPress}
                          className="w-20 text-center text-base"
                          autoFocus
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                        />
                      ) : (
                        <span className="font-mono">
                          {displayStock.toFixed(1)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={saveEdit}
                            className="touch-manipulation min-h-[44px] min-w-[44px]"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={cancelEdit}
                            className="touch-manipulation min-h-[44px] min-w-[44px]"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => startEdit(product.uniqueId, displayStock)}
                          className="touch-manipulation min-h-[44px] min-w-[44px]"
                        >
                          <Edit className="w-4 h-4" />
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
