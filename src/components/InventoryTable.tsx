
import { useState, useCallback } from 'react';
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [localStocks, setLocalStocks] = useState<{[key: number]: number}>({});

  const startEdit = useCallback((index: number, currentStock: number) => {
    console.log('Starting edit for index:', index, 'current stock:', currentStock);
    setEditingIndex(index);
    setEditValue(currentStock.toString());
    // Store the original stock value locally
    setLocalStocks(prev => ({ ...prev, [index]: currentStock }));
  }, []);

  const saveEdit = useCallback(() => {
    console.log('Saving edit for index:', editingIndex, 'new value:', editValue);
    if (editingIndex !== null) {
      const numericValue = parseFloat(editValue);
      if (!isNaN(numericValue)) {
        onUpdateStock(editingIndex, numericValue);
        // Update local state
        setLocalStocks(prev => ({ ...prev, [editingIndex]: numericValue }));
      }
      setEditingIndex(null);
      setEditValue('');
    }
  }, [editingIndex, editValue, onUpdateStock]);

  const cancelEdit = useCallback(() => {
    console.log('Canceling edit for index:', editingIndex);
    setEditingIndex(null);
    setEditValue('');
  }, [editingIndex]);

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
    console.log('Input change for index:', editingIndex, 'value:', value);
    setEditValue(value);
  }, [editingIndex]);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // Prevent iOS from zooming in
    e.target.style.fontSize = '16px';
  }, []);

  const getDisplayStock = useCallback((index: number, originalStock: number) => {
    // Use local stock if available, otherwise use original
    return localStocks[index] !== undefined ? localStocks[index] : originalStock;
  }, [localStocks]);

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
              {data.map((row, index) => {
                const uniqueKey = `${row.Material}-${index}-${row.Producto?.substring(0, 10)}`;
                const displayStock = getDisplayStock(index, Number(row.Stock || 0));
                
                return (
                  <TableRow key={uniqueKey}>
                    <TableCell className="font-mono text-sm">{row.Material}</TableCell>
                    <TableCell className="font-medium max-w-[200px]">
                      <div className="truncate" title={row.Producto}>
                        {row.Producto}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{row.UMB}</TableCell>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyPress}
                          onFocus={handleInputFocus}
                          className="w-20 text-center text-base"
                          autoFocus
                          inputMode="decimal"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          data-index={index}
                        />
                      ) : (
                        <span className="font-mono">
                          {displayStock.toFixed(1)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingIndex === index ? (
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
                          onClick={() => startEdit(index, displayStock)}
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
