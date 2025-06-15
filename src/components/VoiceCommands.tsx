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

  // LOG: Verificar datos al cargar
  useEffect(() => {
    console.log('=== VOICE COMMANDS DEBUG ===');
    console.log('Datos recibidos:', excelData?.length || 0);
    if (excelData && excelData.length > 0) {
      console.log('Muestra de datos:', excelData.slice(0, 3));
      console.log('Estructura del primer elemento:', Object.keys(excelData[0] || {}));
    }
  }, [excelData]);

  // Función de búsqueda con logs detallados
  const searchProducts = (term: string) => {
    console.log('=== BÚSQUEDA DEBUG ===');
    console.log('Término de búsqueda:', term);
    console.log('Datos totales:', excelData?.length || 0);
    
    if (!term.trim() || !excelData || excelData.length === 0) {
      console.log('Búsqueda cancelada: término vacío o sin datos');
      setSearchResults([]);
      return;
    }

    // Log de cada elemento para ver su estructura
    console.log('Analizando primeros 5 elementos:');
    excelData.slice(0, 5).forEach((item, index) => {
      console.log(`Elemento ${index}:`, {
        completo: item,
        producto: item?.Producto,
        tipo: typeof item?.Producto
      });
    });

    // Búsqueda simple sin filtros complejos
    const searchTermLower = term.toLowerCase();
    console.log('Buscando con término en minúsculas:', searchTermLower);
    
    const allResults = excelData.filter((item, index) => {
      const hasProducto = item && item.Producto;
      const isString = typeof item.Producto === 'string';
      const isNotEmpty = item.Producto && item.Producto.trim() !== '';
      const containsSearch = isString && item.Producto.toLowerCase().includes(searchTermLower);
      
      console.log(`Item ${index}: hasProducto=${hasProducto}, isString=${isString}, isNotEmpty=${isNotEmpty}, containsSearch=${containsSearch}`);
      
      return hasProducto && isString && isNotEmpty && containsSearch;
    });
    
    console.log('Resultados encontrados:', allResults.length);
    console.log('Primeros 3 resultados:', allResults.slice(0, 3));
    
    setSearchResults(allResults.slice(0, 10));
  };

  // Inicialización del reconocimiento de voz con logs
  useEffect(() => {
    console.log('=== VOICE RECOGNITION DEBUG ===');
    console.log('WebKit Speech Recognition disponible:', 'webkitSpeechRecognition' in window);
    console.log('Speech Recognition disponible:', 'SpeechRecognition' in window);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';
      
      console.log('Reconocimiento configurado correctamente');

      recognitionRef.current.onresult = (event: any) => {
        console.log('=== VOICE RESULT DEBUG ===');
        console.log('Evento completo:', event);
        
        let currentTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Resultado ${i}: "${transcript}", final: ${event.results[i].isFinal}`);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            currentTranscript += transcript;
          }
        }
        
        setTranscript(currentTranscript);
        
        if (finalTranscript) {
          console.log('Comando final recibido:', finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento:', event.error);
        console.error('Detalles del error:', event);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        console.log('Reconocimiento terminado');
        setIsListening(false);
        setTranscript('');
      };
    } else {
      console.error('Reconocimiento de voz no disponible en este navegador');
    }
  }, [setIsListening]);

  // Procesamiento de comandos con logs detallados
  const processVoiceCommand = (command: string) => {
    console.log('=== PROCESAMIENTO COMANDO DEBUG ===');
    console.log('Comando recibido:', command);
    console.log('Datos disponibles:', excelData?.length || 0);

    if (!excelData || excelData.length === 0) {
      const result = 'No hay datos cargados';
      console.log('Resultado:', result);
      setCommandResult(result);
      speak(result);
      return;
    }

    const lowerCommand = command.toLowerCase().trim();
    console.log('Comando procesado:', lowerCommand);

    // Comando de búsqueda
    if (lowerCommand.includes('buscar')) {
      const searchTerm = lowerCommand.replace('buscar', '').trim();
      console.log('Término de búsqueda extraído:', searchTerm);
      if (searchTerm) {
        setSearchTerm(searchTerm);
        searchProducts(searchTerm);
        speak(`Buscando ${searchTerm}`);
        return;
      }
    }

    // Comando de actualización de stock
    const words = lowerCommand.split(' ');
    console.log('Palabras del comando:', words);
    
    if (words.length >= 2) {
      const lastWord = words[words.length - 1];
      console.log('Última palabra:', lastWord);
      
      const stockValue = parseFloat(lastWord.replace(',', '.'));
      console.log('Valor de stock parseado:', stockValue);
      
      if (!isNaN(stockValue)) {
        const productName = words.slice(0, -1).join(' ');
        console.log('Nombre del producto:', productName);
        
        // Búsqueda más permisiva
        const foundProduct = excelData.find((item, index) => {
          const hasProduct = item && item.Producto;
          const isMatch = hasProduct && item.Producto.toLowerCase().includes(productName);
          console.log(`Comparando ${index}: "${item?.Producto}" incluye "${productName}": ${isMatch}`);
          return isMatch;
        });
        
        console.log('Producto encontrado:', foundProduct);
        
        if (foundProduct) {
          console.log('Actualizando stock:', foundProduct.Producto, stockValue);
          onUpdateStock(foundProduct.Producto, stockValue);
          const result = `Stock actualizado: ${foundProduct.Producto} = ${stockValue}`;
          setCommandResult(result);
          speak(`Stock actualizado a ${stockValue}`);
          
          toast({
            title: "Stock actualizado por voz",
            description: `${foundProduct.Producto}: ${stockValue}`,
          });
          return;
        } else {
          console.log('Producto no encontrado para:', productName);
        }
      }
    }

    const result = 'Comando no reconocido';
    console.log('Resultado final:', result);
    setCommandResult(result);
    speak('Comando no reconocido');
  };

  const speak = (text: string) => {
    console.log('=== SPEECH SYNTHESIS DEBUG ===');
    console.log('Texto a reproducir:', text);
    console.log('Speech Synthesis disponible:', 'speechSynthesis' in window);
    
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.8;
      
      utterance.onstart = () => console.log('Síntesis iniciada');
      utterance.onend = () => console.log('Síntesis finalizada');
      utterance.onerror = (event) => console.error('Error en síntesis:', event);
      
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    console.log('=== TOGGLE LISTENING DEBUG ===');
    console.log('Estado actual:', isListening);
    console.log('Recognition ref:', recognitionRef.current);
    
    if (!recognitionRef.current) {
      console.error('No hay referencia de reconocimiento');
      toast({
        title: "Reconocimiento de voz no disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      console.log('Deteniendo reconocimiento...');
      recognitionRef.current.stop();
    } else {
      console.log('Iniciando reconocimiento...');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Reconocimiento iniciado exitosamente');
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
    console.log('=== SEARCH INPUT DEBUG ===');
    console.log('Nuevo valor de búsqueda:', value);
    setSearchTerm(value);
    searchProducts(value);
  };

  const selectProduct = (product: any) => {
    console.log('=== PRODUCT SELECTION DEBUG ===');
    console.log('Producto seleccionado:', product);
    setSelectedProduct(product);
    setSearchResults([]);
    setSearchTerm('');
    setStockInput('');
  };

  const updateSelectedProductStock = () => {
    console.log('=== UPDATE STOCK DEBUG ===');
    console.log('Producto seleccionado:', selectedProduct);
    console.log('Stock input:', stockInput);
    
    if (selectedProduct && stockInput) {
      const stock = parseFloat(stockInput.replace(',', '.'));
      console.log('Stock parseado:', stock);
      
      if (!isNaN(stock)) {
        console.log('Actualizando stock:', selectedProduct.Producto, stock);
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
      } else {
        console.error('Stock no válido:', stockInput);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Debug info */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-yellow-700 mb-2">Información de Debug:</h3>
          <p className="text-sm text-yellow-600">Datos cargados: {excelData?.length || 0}</p>
          <p className="text-sm text-yellow-600">Reconocimiento disponible: {recognitionRef.current ? 'Sí' : 'No'}</p>
          <p className="text-sm text-yellow-600">Escuchando: {isListening ? 'Sí' : 'No'}</p>
        </CardContent>
      </Card>

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
