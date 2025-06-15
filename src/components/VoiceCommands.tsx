
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result event:', event);
        let currentTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            currentTranscript += transcript;
          }
        }
        
        setTranscript(currentTranscript);
        console.log('Current transcript:', currentTranscript);
        
        if (finalTranscript) {
          console.log('Final transcript received:', finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setTranscript('');
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setIsListening]);

  const searchProducts = (term: string) => {
    console.log('=== SEARCH DEBUG ===');
    console.log('Search term:', term);
    console.log('Excel data length:', excelData.length);
    console.log('First 3 products:', excelData.slice(0, 3));

    if (!term.trim() || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    const results = excelData.filter(item => {
      if (!item || !item.Producto) {
        console.log('Item without Producto:', item);
        return false;
      }
      
      const productName = item.Producto.toString().toLowerCase();
      const searchTermLower = term.toLowerCase();
      
      const matches = productName.includes(searchTermLower);
      if (matches) {
        console.log('Match found:', item.Producto);
      }
      
      return matches;
    });
    
    console.log('Search results found:', results.length);
    console.log('Results:', results.map(r => r.Producto));
    setSearchResults(results.slice(0, 10));
  };

  const processVoiceCommand = (command: string) => {
    console.log('=== VOICE COMMAND DEBUG ===');
    console.log('Processing command:', command);
    console.log('Excel data available:', excelData.length);

    const lowerCommand = command.toLowerCase().trim();

    if (excelData.length === 0) {
      const result = 'No hay datos de inventario cargados';
      setCommandResult(result);
      speak(result);
      return;
    }

    // Buscar patrón: "producto cantidad"
    const stockUpdatePattern = /(.+?)\s+(\d+(?:[.,]\d+)?)$/;
    const match = lowerCommand.match(stockUpdatePattern);
    
    if (match) {
      const productSearchTerm = match[1].trim();
      const stockValue = match[2].replace(',', '.');
      const stock = parseFloat(stockValue);
      
      console.log('Trying to update:', productSearchTerm, 'to stock:', stock);
      
      if (!isNaN(stock)) {
        // Buscar producto
        const foundProduct = excelData.find(item => {
          if (!item || !item.Producto) return false;
          const itemName = item.Producto.toString().toLowerCase();
          return itemName.includes(productSearchTerm);
        });
        
        if (foundProduct) {
          console.log('Product found, updating:', foundProduct.Producto);
          onUpdateStock(foundProduct.Producto, stock);
          const result = `Stock actualizado: ${foundProduct.Producto} = ${stock}`;
          setCommandResult(result);
          speak(`Stock actualizado a ${stock}`);
          return;
        } else {
          console.log('Product not found for search term:', productSearchTerm);
          const result = `No se encontró el producto: ${productSearchTerm}`;
          setCommandResult(result);
          speak('Producto no encontrado');
          return;
        }
      }
    }

    // Comando de búsqueda
    if (lowerCommand.includes('buscar')) {
      const searchTermFromVoice = lowerCommand.replace('buscar', '').trim();
      if (searchTermFromVoice) {
        console.log('Voice search for:', searchTermFromVoice);
        setSearchTerm(searchTermFromVoice);
        searchProducts(searchTermFromVoice);
        speak(`Buscando ${searchTermFromVoice}`);
      }
      return;
    }

    const result = 'Comando no reconocido. Intenta: "producto cantidad" o "buscar producto"';
    setCommandResult(result);
    speak('Comando no reconocido');
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Reconocimiento de voz no disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast({
          title: "Error",
          description: "No se pudo iniciar el reconocimiento de voz",
          variant: "destructive",
        });
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Search input changed to:', value);
    setSearchTerm(value);
    searchProducts(value);
  };

  const selectProduct = (product: any) => {
    console.log('Product selected:', product);
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchTerm('');
    setStockInput('');
  };

  const updateSelectedProductStock = () => {
    if (selectedProduct && stockInput) {
      const stock = parseFloat(stockInput.replace(',', '.'));
      if (!isNaN(stock)) {
        console.log('Updating selected product stock:', selectedProduct.Producto, 'to', stock);
        onUpdateStock(selectedProduct.Producto, stock);
        const result = `Stock actualizado: ${selectedProduct.Producto} = ${stock}`;
        setCommandResult(result);
        speak(`Stock actualizado a ${stock}`);
        setSelectedProduct(null);
        setStockInput('');
        toast({
          title: "Stock actualizado",
          description: `${selectedProduct.Producto}: ${stock}`,
        });
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
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto bg-white shadow-lg">
                {searchResults.map((product, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => selectProduct(product)}
                  >
                    <div className="font-medium text-gray-900">{product.Producto}</div>
                    <div className="text-sm text-gray-500">
                      Código: {product.Material} | Stock: {Number(product.Stock || 0).toFixed(1)} {product.UMB}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateSelectedProductStock();
                          }
                        }}
                      />
                      <Button onClick={updateSelectedProductStock} disabled={!stockInput}>
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
                <span className="text-sm font-medium text-blue-700">Escuchando...</span>
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
          <CardTitle className="text-lg">Comandos de Voz</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-2">
            <li><strong>• "[producto] [cantidad]"</strong> - Actualiza stock directamente</li>
            <li><strong>• "Buscar [producto]"</strong> - Busca productos</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Ejemplos:</strong> "aceite 5.5", "azúcar 3", "buscar leche"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
