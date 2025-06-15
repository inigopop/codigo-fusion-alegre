
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
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

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
          console.log('Comando de voz final:', finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('Reconocimiento de voz terminado');
        setIsListening(false);
        setTranscript('');
      };
    }
  }, [setIsListening]);

  // Función de búsqueda simplificada
  const searchProducts = (term: string) => {
    console.log('Buscando productos con término:', term);
    console.log('Datos disponibles:', excelData.length);
    
    if (!term.trim() || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    // Filtrado mucho más simple - solo verificar que tenga Producto y no esté vacío
    const validProducts = excelData.filter(item => 
      item && 
      item.Producto && 
      typeof item.Producto === 'string' && 
      item.Producto.trim() !== '' &&
      !item.Producto.includes('INVENTARIO') &&
      !item.Producto.includes('MATERIAL')
    );

    console.log('Productos válidos encontrados:', validProducts.length);

    const searchTermLower = term.toLowerCase();
    const results = validProducts.filter(item => 
      item.Producto.toLowerCase().includes(searchTermLower)
    );
    
    console.log('Resultados de búsqueda:', results.length);
    setSearchResults(results.slice(0, 10));
  };

  // Procesamiento de comandos de voz simplificado
  const processVoiceCommand = (command: string) => {
    console.log('Procesando comando:', command);

    if (excelData.length === 0) {
      const result = 'No hay datos cargados';
      setCommandResult(result);
      speak(result);
      return;
    }

    const lowerCommand = command.toLowerCase().trim();

    // Buscar patrón simple: "producto número"
    const words = lowerCommand.split(' ');
    if (words.length >= 2) {
      const lastWord = words[words.length - 1];
      const stockValue = parseFloat(lastWord.replace(',', '.'));
      
      if (!isNaN(stockValue)) {
        // Las palabras antes del número son el nombre del producto
        const productName = words.slice(0, -1).join(' ');
        
        console.log('Buscando producto:', productName, 'con stock:', stockValue);
        
        // Buscar producto de manera más flexible
        const foundProduct = excelData.find(item => 
          item && 
          item.Producto && 
          item.Producto.toLowerCase().includes(productName)
        );
        
        if (foundProduct) {
          console.log('Producto encontrado:', foundProduct.Producto);
          onUpdateStock(foundProduct.Producto, stockValue);
          const result = `Stock actualizado: ${foundProduct.Producto} = ${stockValue}`;
          setCommandResult(result);
          speak(`Stock actualizado a ${stockValue}`);
          
          toast({
            title: "Stock actualizado por voz",
            description: `${foundProduct.Producto}: ${stockValue}`,
          });
          return;
        }
      }
    }

    // Si comienza con "buscar"
    if (lowerCommand.includes('buscar')) {
      const searchTerm = lowerCommand.replace('buscar', '').trim();
      if (searchTerm) {
        setSearchTerm(searchTerm);
        searchProducts(searchTerm);
        speak(`Buscando ${searchTerm}`);
        return;
      }
    }

    const result = 'Comando no reconocido';
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
        console.error('Error iniciando reconocimiento:', error);
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
      {/* Buscador */}
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
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => selectProduct(product)}
                  >
                    <div className="font-medium">{product.Producto}</div>
                    <div className="text-sm text-gray-500">
                      Stock: {product.Stock || 0} {product.UMB || ''}
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
                        Stock actual: {selectedProduct.Stock || 0}
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
          onClick={() => speak('Control de voz funcionando')}
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
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-700">Escuchando...</span>
            </div>
            {transcript && (
              <p className="text-sm text-blue-600 mt-2 italic">"{transcript}"</p>
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
            <li><strong>• "[producto] [cantidad]"</strong> - Actualiza stock</li>
            <li><strong>• "Buscar [producto]"</strong> - Busca productos</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Ejemplos:</strong> "aceite 5", "pan 10", "buscar leche"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
