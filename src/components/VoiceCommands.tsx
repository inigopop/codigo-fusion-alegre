
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockInput, setStockInput] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Búsqueda simplificada
  const searchProducts = (term: string) => {
    if (!term.trim() || !excelData || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    const searchTermLower = term.toLowerCase();
    const results = excelData.filter(item => 
      item && item.Producto && 
      item.Producto.toLowerCase().includes(searchTermLower)
    );
    
    console.log(`Búsqueda "${term}": ${results.length} resultados`);
    setSearchResults(results.slice(0, 10));
  };

  // Inicialización del reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          console.log('Comando de voz:', finalTranscript);
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setTranscript('');
      };
    }
  }, [setIsListening]);

  // Procesamiento de comandos de voz
  const processVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    
    if (lowerCommand.includes('buscar')) {
      const searchTerm = lowerCommand.replace('buscar', '').trim();
      if (searchTerm) {
        setSearchTerm(searchTerm);
        searchProducts(searchTerm);
        speak(`Buscando ${searchTerm}`);
      }
      return;
    }

    // Comando de stock: buscar patrón "producto cantidad"
    const words = lowerCommand.split(' ');
    if (words.length >= 2) {
      const lastWord = words[words.length - 1];
      const stockValue = parseFloat(lastWord.replace(',', '.'));
      
      if (!isNaN(stockValue)) {
        const productTerm = words.slice(0, -1).join(' ');
        const foundProduct = excelData.find(item => 
          item && item.Producto && 
          item.Producto.toLowerCase().includes(productTerm)
        );
        
        if (foundProduct) {
          onUpdateStock(foundProduct.Producto, stockValue);
          speak(`Stock actualizado a ${stockValue}`);
          
          toast({
            title: "Stock actualizado por voz",
            description: `${foundProduct.Producto}: ${stockValue}`,
          });
          return;
        }
      }
    }

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
        toast({
          title: "Error",
          description: "No se pudo iniciar el reconocimiento de voz",
          variant: "destructive",
        });
      }
    }
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
      {/* Info de debug */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 mb-2">Estado del Sistema:</h3>
          <div className="text-sm text-blue-600 space-y-1">
            <p>Productos cargados: {excelData?.length || 0}</p>
            <p>Reconocimiento de voz: {recognitionRef.current ? 'Disponible' : 'No disponible'}</p>
            <p>Estado: {isListening ? 'Escuchando' : 'Inactivo'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Buscador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchProducts(e.target.value);
                }}
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
                      Código: {product.Codigo} | Stock: {product.Stock || 0}
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
                        Código: {selectedProduct.Codigo} | Stock actual: {selectedProduct.Stock || 0}
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
          onClick={() => speak('Sistema de voz funcionando correctamente')}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Volume2 className="w-5 h-5" />
          Probar Voz
        </Button>
      </div>

      {isListening && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">🎤 Escuchando...</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comandos de Voz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>• "buscar [producto]"</strong> - Busca productos</p>
            <p><strong>• "[producto] [cantidad]"</strong> - Actualiza stock</p>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Ejemplos:</strong> "buscar aceite", "aceite 5", "azucar 10"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
