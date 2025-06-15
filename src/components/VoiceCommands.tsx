
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Volume2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (productName: string, newStock: number) => void;
  isListening: boolean;
  setIsListening: (value: boolean) => void;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockInput, setStockInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            processVoiceCommand(finalTranscript);
            setLastCommand(finalTranscript);
          } else {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Error de reconocimiento de voz",
          description: "No se pudo procesar el comando de voz",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setIsListening, toast]);

  const searchProducts = (term: string) => {
    if (!term.trim() || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    const results = excelData.filter(item => 
      (item.Producto && item.Producto.toLowerCase().includes(term.toLowerCase())) ||
      (item.Material && item.Material.toString().toLowerCase().includes(term.toLowerCase()))
    );
    
    setSearchResults(results.slice(0, 10)); // Limitar a 10 resultados
  };

  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    console.log('Processing voice command:', lowerCommand);

    if (excelData.length === 0) {
      const result = 'No hay datos de inventario cargados';
      setCommandResult(result);
      speak(result);
      return;
    }

    // Primero buscar si es un comando de búsqueda
    if (lowerCommand.includes('buscar') || lowerCommand.includes('encontrar')) {
      const searchTerm = lowerCommand.replace(/buscar|encontrar/gi, '').trim();
      if (searchTerm) {
        setSearchTerm(searchTerm);
        searchProducts(searchTerm);
        const result = `Buscando productos con: ${searchTerm}`;
        setCommandResult(result);
        speak(result);
      }
      return;
    }

    // Comando para actualizar stock: "producto cantidad" o "actualizar producto a cantidad"
    const updateRegex = /(?:actualizar\s+(.+?)\s+a\s+(\d+(?:[.,]\d+)?)|(.+?)\s+(\d+(?:[.,]\d+)?)$)/i;
    const match = lowerCommand.match(updateRegex);
    
    if (match) {
      const productName = (match[1] || match[3])?.trim();
      const stockValue = (match[2] || match[4])?.replace(',', '.');
      
      if (productName && stockValue) {
        const stock = parseFloat(stockValue);
        if (!isNaN(stock)) {
          // Buscar el producto más similar
          const foundProduct = excelData.find(item => {
            if (!item.Producto) return false;
            const itemName = item.Producto.toLowerCase();
            const searchName = productName.toLowerCase();
            return itemName.includes(searchName) || searchName.includes(itemName.split(' ')[0]);
          });
          
          if (foundProduct) {
            onUpdateStock(foundProduct.Producto, stock);
            const result = `Stock actualizado: ${foundProduct.Producto} = ${stock.toFixed(1)}`;
            setCommandResult(result);
            speak(`Stock actualizado a ${stock.toFixed(1)}`);
          } else {
            const result = `No se encontró el producto: ${productName}`;
            setCommandResult(result);
            speak('Producto no encontrado. Intenta usar el buscador.');
          }
          return;
        }
      }
    }

    // Otros comandos
    if (lowerCommand.includes('cuántos productos') || lowerCommand.includes('total productos')) {
      const result = `Hay ${excelData.length} productos en el inventario`;
      setCommandResult(result);
      speak(result);
    } else if (lowerCommand.includes('limpiar') || lowerCommand.includes('borrar')) {
      setCommandResult('');
      setLastCommand('');
      setSearchTerm('');
      setSearchResults([]);
      speak('Pantalla limpiada');
    } else {
      const result = 'Comando no reconocido. Prueba: "buscar [producto]" o "[producto] [cantidad]"';
      setCommandResult(result);
      speak('Comando no reconocido');
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        toast({
          title: "Reconocimiento de voz no disponible",
          description: "Tu navegador no soporta reconocimiento de voz",
          variant: "destructive",
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchProducts(value);
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchTerm('');
  };

  const updateSelectedProductStock = () => {
    if (selectedProduct && stockInput) {
      const stock = parseFloat(stockInput.replace(',', '.'));
      if (!isNaN(stock)) {
        onUpdateStock(selectedProduct.Producto, stock);
        const result = `Stock actualizado: ${selectedProduct.Producto} = ${stock.toFixed(1)}`;
        setCommandResult(result);
        speak(`Stock actualizado a ${stock.toFixed(1)}`);
        setSelectedProduct(null);
        setStockInput('');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Buscador de productos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscador de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código de producto..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => selectProduct(product)}
                  >
                    <div className="font-medium">{product.Producto}</div>
                    <div className="text-sm text-gray-500">
                      Código: {product.Material} | Stock actual: {Number(product.Stock || 0).toFixed(1)} {product.UMB}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProduct && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">{selectedProduct.Producto}</h4>
                      <p className="text-sm text-gray-600">
                        Código: {selectedProduct.Material} | Unidad: {selectedProduct.UMB}
                      </p>
                      <p className="text-sm text-gray-600">
                        Stock actual: {Number(selectedProduct.Stock || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Nueva cantidad"
                        value={stockInput}
                        onChange={(e) => setStockInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={updateSelectedProductStock}>
                        Actualizar
                      </Button>
                      <Button variant="outline" onClick={() => {setSelectedProduct(null); setStockInput('');}}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controles de voz */}
      <div className="flex gap-4">
        <Button
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="flex items-center gap-2"
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Detener Escucha
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Iniciar Control por Voz
            </>
          )}
        </Button>

        <Button
          onClick={() => speak('Control de voz funcionando correctamente')}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Volume2 className="w-5 h-5" />
          Probar Voz
        </Button>
      </div>

      {isListening && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">Escuchando comandos de inventario...</span>
              </div>
            </div>
            {transcript && (
              <p className="text-sm text-blue-600 mt-2 italic">
                "{transcript}"
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {lastCommand && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium text-gray-700 mb-2">Último comando:</h3>
            <p className="text-sm text-gray-600 italic">"{lastCommand}"</p>
          </CardContent>
        </Card>
      )}

      {commandResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-green-700 mb-2">Resultado:</h3>
            <p className="text-sm text-green-600">{commandResult}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comandos de Voz para Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><strong>• "Buscar [producto]"</strong> - Busca productos por nombre o código</li>
            <li><strong>• "[producto] [cantidad]"</strong> - Actualiza stock directamente</li>
            <li><strong>• "Actualizar [producto] a [cantidad]"</strong> - Forma larga para actualizar stock</li>
            <li>• "¿Cuántos productos hay?" - Cuenta total de productos</li>
            <li>• "Limpiar pantalla" - Limpia los resultados</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Ejemplos:</strong> "Buscar leche", "Leche 5.5", "Actualizar pan a 3.2"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
