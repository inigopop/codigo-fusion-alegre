
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event: any) => {
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
        
        if (finalTranscript) {
          console.log('Final transcript:', finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Error de reconocimiento de voz",
          description: `Error: ${event.error}`,
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        setTranscript('');
      };

      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
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

    console.log('Searching for:', term);
    console.log('Available products:', excelData.length);

    const results = excelData.filter(item => {
      if (!item.Producto) return false;
      
      const productName = item.Producto.toLowerCase();
      const searchTerm = term.toLowerCase();
      
      // Búsqueda más flexible - incluye palabras parciales
      const words = searchTerm.split(' ');
      return words.every(word => 
        productName.includes(word) || 
        productName.split(' ').some(productWord => productWord.includes(word))
      ) || productName.includes(searchTerm);
    });
    
    console.log('Search results:', results.length);
    setSearchResults(results.slice(0, 10));
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

    // Comando de búsqueda
    if (lowerCommand.includes('buscar') || lowerCommand.includes('encontrar')) {
      const searchTermFromVoice = lowerCommand.replace(/buscar|encontrar/gi, '').trim();
      if (searchTermFromVoice) {
        console.log('Voice search for:', searchTermFromVoice);
        setSearchTerm(searchTermFromVoice);
        searchProducts(searchTermFromVoice);
        const result = `Buscando: ${searchTermFromVoice}`;
        setCommandResult(result);
        speak(result);
      }
      return;
    }

    // Comando para actualizar stock - patrones más flexibles
    const patterns = [
      /(.+?)\s+(\d+(?:[.,]\d+)?)$/,
      /(.+?)\s+cantidad\s+(\d+(?:[.,]\d+)?)/i,
      /(.+?)\s+stock\s+(\d+(?:[.,]\d+)?)/i,
      /actualizar\s+(.+?)\s+a\s+(\d+(?:[.,]\d+)?)/i
    ];

    for (const pattern of patterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        let productName = match[1].trim();
        const stockValue = match[2].replace(',', '.');
        const stock = parseFloat(stockValue);
        
        if (!isNaN(stock)) {
          console.log('Trying to update product:', productName, 'to stock:', stock);
          
          // Buscar producto con mayor flexibilidad
          const foundProduct = excelData.find(item => {
            if (!item.Producto) return false;
            const itemName = item.Producto.toLowerCase();
            const searchName = productName.toLowerCase();
            
            // Múltiples formas de búsqueda
            return itemName.includes(searchName) || 
                   searchName.includes(itemName) ||
                   itemName.split(' ').some(word => searchName.includes(word) && word.length > 2) ||
                   searchName.split(' ').some(word => itemName.includes(word) && word.length > 2);
          });
          
          if (foundProduct) {
            console.log('Found and updating product:', foundProduct.Producto);
            onUpdateStock(foundProduct.Producto, stock);
            const result = `Stock actualizado: ${foundProduct.Producto} = ${stock}`;
            setCommandResult(result);
            speak(`Stock actualizado a ${stock}`);
            return;
          } else {
            console.log('Product not found for:', productName);
            console.log('Available products:', excelData.map(item => item.Producto).slice(0, 5));
            const result = `No se encontró el producto: ${productName}`;
            setCommandResult(result);
            speak('Producto no encontrado');
            return;
          }
        }
      }
    }

    // Otros comandos
    if (lowerCommand.includes('cuántos') || lowerCommand.includes('total')) {
      const result = `Hay ${excelData.length} productos en el inventario`;
      setCommandResult(result);
      speak(result);
    } else if (lowerCommand.includes('limpiar')) {
      setCommandResult('');
      setLastCommand('');
      setSearchTerm('');
      setSearchResults([]);
      speak('Pantalla limpiada');
    } else {
      const result = 'Comando no reconocido. Intenta: "buscar producto" o "producto cantidad"';
      setCommandResult(result);
      speak('Comando no reconocido');
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      utterance.volume = 0.8;
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
      console.log('Stopping speech recognition');
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      console.log('Starting speech recognition');
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
    setSearchTerm(value);
    searchProducts(value);
  };

  const selectProduct = (product: any) => {
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
                placeholder="Buscar por nombre o código..."
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
            <li><strong>• "Buscar [producto]"</strong> - Busca productos</li>
            <li><strong>• "[producto] [cantidad]"</strong> - Actualiza stock directamente</li>
            <li><strong>• "Actualizar [producto] a [cantidad]"</strong> - Actualiza stock</li>
            <li>• "¿Cuántos productos?" - Cuenta productos</li>
            <li>• "Limpiar" - Limpia resultados</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Ejemplos:</strong> "Buscar aceite", "Aceite 5.5", "Azúcar 3"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
