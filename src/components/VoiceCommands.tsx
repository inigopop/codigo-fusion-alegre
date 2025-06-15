import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Search, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (index: number, newStock: number) => void;
  isListening: boolean;
  setIsListening: (value: boolean) => void;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [stockInput, setStockInput] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const { toast } = useToast();

  // Búsqueda inteligente mejorada
  const searchProducts = (term: string) => {
    if (!term.trim() || !excelData || excelData.length === 0) {
      setSearchResults([]);
      return;
    }

    const searchTermLower = term.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
    
    const results = excelData.filter((item, index) => {
      if (!item || !item.Producto) return false;
      
      const productName = item.Producto.toLowerCase()
        .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
        .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
      
      return productName.includes(searchTermLower) || 
             (item.Material && item.Material.toLowerCase().includes(searchTermLower));
    });
    
    console.log(`Búsqueda "${term}": ${results.length} resultados`);
    setSearchResults(results.slice(0, 8));
  };

  // Configuración mejorada del reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configuración optimizada
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.maxAlternatives = 3;
      recognitionRef.current.grammars = null;

      recognitionRef.current.onstart = () => {
        console.log('🎤 Reconocimiento iniciado');
        setTranscript('');
        setInterimTranscript('');
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0;
          
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
          }
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setConfidence(maxConfidence);
        setInterimTranscript(interimTranscript);
        
        if (finalTranscript && maxConfidence > 0.3) {
          console.log('🎯 Comando final:', finalTranscript, 'Confianza:', maxConfidence);
          setTranscript(finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript, maxConfidence);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Error reconocimiento:', event.error);
        
        if (event.error === 'no-speech') {
          toast({
            title: "No se detectó voz",
            description: "Intenta hablar más claro y cerca del micrófono",
            variant: "destructive",
          });
        } else if (event.error === 'network') {
          toast({
            title: "Error de conexión",
            description: "Verifica tu conexión a internet",
            variant: "destructive",
          });
        }
        
        setIsListening(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        console.log('🔚 Reconocimiento terminado');
        setIsListening(false);
        setIsProcessing(false);
        setInterimTranscript('');
        
        // Auto-restart si estaba escuchando
        if (isListening) {
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (error) {
                console.error('Error al reiniciar:', error);
              }
            }
          }, 100);
        }
      };
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [setIsListening, isListening]);

  // Procesamiento inteligente de comandos
  const processVoiceCommand = async (command: string, confidence: number) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const lowerCommand = command.toLowerCase().trim()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
    
    console.log('🔄 Procesando:', lowerCommand, 'Confianza:', confidence);

    try {
      // Comando de búsqueda
      if (lowerCommand.includes('buscar') || lowerCommand.includes('busca')) {
        const searchTerm = lowerCommand
          .replace(/buscar|busca/g, '').trim()
          .replace(/el |la |los |las |un |una /g, ''); // Remover artículos
        
        if (searchTerm.length >= 2) {
          setSearchTerm(searchTerm);
          searchProducts(searchTerm);
          speak(`Buscando ${searchTerm}. Encontrados ${searchResults.length} productos.`);
          
          toast({
            title: `🔍 Búsqueda: "${searchTerm}"`,
            description: `Se encontraron ${searchResults.length} productos`,
          });
        }
        setIsProcessing(false);
        return;
      }

      // Comando de stock mejorado con múltiples patrones
      const stockPatterns = [
        // "producto cantidad"
        /^(.+?)\s+(\d+(?:[.,]\d+)?)$/,
        // "cantidad para producto"
        /^(\d+(?:[.,]\d+)?)\s+(?:para|de)\s+(.+)$/,
        // "stock producto cantidad"
        /^(?:stock|inventario)\s+(.+?)\s+(\d+(?:[.,]\d+)?)$/,
        // "actualizar producto a cantidad"
        /^(?:actualizar|cambiar)\s+(.+?)\s+(?:a|con)\s+(\d+(?:[.,]\d+)?)$/
      ];

      for (const pattern of stockPatterns) {
        const match = lowerCommand.match(pattern);
        
        if (match) {
          let productTerm, stockValue;
          
          if (pattern.source.startsWith('^(\\d+')) {
            // Patrón "cantidad para producto"
            stockValue = parseFloat(match[1].replace(',', '.'));
            productTerm = match[2].trim();
          } else {
            // Otros patrones "producto cantidad"
            productTerm = match[1].trim();
            stockValue = parseFloat(match[2].replace(',', '.'));
          }
          
          if (!isNaN(stockValue) && productTerm.length >= 2) {
            // Buscar producto con coincidencia inteligente
            const foundProductIndex = excelData.findIndex((item, index) => {
              if (!item || !item.Producto) return false;
              
              const productName = item.Producto.toLowerCase()
                .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
                .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n');
              
              // Coincidencia exacta o parcial inteligente
              return productName.includes(productTerm) || 
                     productTerm.split(' ').every(word => 
                       word.length >= 2 && productName.includes(word)
                     );
            });
            
            if (foundProductIndex !== -1) {
              const foundProduct = excelData[foundProductIndex];
              onUpdateStock(foundProductIndex, stockValue);
              
              speak(`Stock actualizado. ${foundProduct.Producto}: ${stockValue} unidades.`);
              
              toast({
                title: "✅ Stock actualizado por voz",
                description: `${foundProduct.Producto}: ${stockValue}`,
                duration: 3000,
              });
              
              setIsProcessing(false);
              return;
            }
          }
        }
      }

      // Si llegamos aquí, el comando no fue reconocido
      if (confidence > 0.6) {
        speak('No pude entender el comando. Intenta con "buscar producto" o "producto cantidad".');
        
        toast({
          title: "Comando no reconocido",
          description: `"${command}" - Usa: "buscar [producto]" o "[producto] [cantidad]"`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error procesando comando:', error);
      speak('Error procesando el comando');
    }
    
    setIsProcessing(false);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
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
      recognitionRef.current.stop();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        speak('Reconocimiento de voz activado');
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
        const productIndex = excelData.findIndex(item => 
          item.Producto === selectedProduct.Producto && 
          item.Codigo === selectedProduct.Codigo
        );
        
        if (productIndex !== -1) {
          onUpdateStock(productIndex, stock);
          setSelectedProduct(null);
          setStockInput('');
          
          toast({
            title: "Stock actualizado",
            description: `${selectedProduct.Producto}: ${stock}`,
          });
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Estado del sistema mejorado */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-blue-700 mb-2">🎤 Estado del Reconocimiento:</h3>
              <div className="text-sm text-blue-600 space-y-1">
                <p>Productos: {excelData?.length || 0}</p>
                <p>Disponible: {recognitionRef.current ? '✅' : '❌'}</p>
                <p>Estado: {isListening ? '🎤 Escuchando' : '⏸️ Inactivo'}</p>
                {confidence > 0 && (
                  <p>Confianza: <Badge variant={confidence > 0.7 ? 'default' : 'secondary'}>{Math.round(confidence * 100)}%</Badge></p>
                )}
              </div>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Procesando...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcripción en tiempo real */}
      {(interimTranscript || transcript) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-green-700 mb-2">📝 Transcripción:</h4>
            <div className="space-y-2">
              {interimTranscript && (
                <p className="text-sm text-gray-600 italic">
                  Escuchando: "{interimTranscript}"
                </p>
              )}
              {transcript && (
                <p className="text-sm font-medium text-green-800">
                  Último comando: "{transcript}"
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Controles de voz mejorados */}
      <div className="flex gap-4">
        <Button
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          size="lg"
          className="flex items-center gap-2"
          disabled={isProcessing}
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
          onClick={() => speak('Sistema de reconocimiento de voz mejorado y funcionando correctamente')}
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
              <span className="text-sm font-medium text-red-700">
                🎤 Escuchando... {confidence > 0 && `(${Math.round(confidence * 100)}% confianza)`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guía de comandos mejorada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Comandos de Voz Mejorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">🔍 Búsqueda:</h4>
                <p>• "buscar aceite"</p>
                <p>• "busca azúcar"</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">📦 Actualizar Stock:</h4>
                <p>• "aceite cinco"</p>
                <p>• "azúcar diez coma cinco"</p>
                <p>• "stock vino tres"</p>
                <p>• "actualizar aceite a cinco"</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">💡 Consejos para mejor reconocimiento:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Habla claro y a velocidad normal</li>
                <li>• Mantén el micrófono cerca (30cm aprox.)</li>
                <li>• Evita ruido de fondo</li>
                <li>• Usa nombres de productos simplificados</li>
                <li>• Espera a que termine de procesar antes del siguiente comando</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
