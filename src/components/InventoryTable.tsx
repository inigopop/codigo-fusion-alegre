
import { useState } from 'react';
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

  const startEdit = (index: number, currentStock: number) => {
    console.log('Starting edit for index:', index, 'current stock:', currentStock);
    setEditingIndex(index);
    setEditValue(currentStock.toString());
  };

  const saveEdit = () => {
    console.log('Saving edit for index:', editingIndex, 'new value:', editValue);
    if (editingIndex !== null) {
      const numericValue = parseFloat(editValue);
      if (!isNaN(numericValue)) {
        onUpdateStock(editingIndex, numericValue);
      }
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    console.log('Canceling edit for index:', editingIndex);
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input change for index:', editingIndex, 'value:', e.target.value);
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    // Don't auto-save on blur for mobile devices to prevent accidental saves
    console.log('Input blur for index:', editingIndex);
  };

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
              {data.map((row, index) => (
                <TableRow key={`${row.Material}-${row.Producto}-${index}`}>
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
                        onBlur={handleInputBlur}
                        className="w-20 text-center"
                        autoFocus
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                    ) : (
                      <span className="font-mono">
                        {Number(row.Stock || 0).toFixed(1)}
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
                          className="touch-manipulation"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={cancelEdit}
                          className="touch-manipulation"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => startEdit(index, Number(row.Stock || 0))}
                        className="touch-manipulation"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryTable;
