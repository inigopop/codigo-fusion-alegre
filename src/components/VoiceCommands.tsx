import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Search, Settings, BookOpen } from "lucide-react";
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
  const [vocabularyReady, setVocabularyReady] = useState(false);
  const [productDictionary, setProductDictionary] = useState<string[]>([]);
  const [phoneticsMap, setPhoneticsMap] = useState<Map<string, string[]>>(new Map());
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<any>(null);
  const { toast } = useToast();

  // Función para normalizar texto (quitar acentos, etc.)
  const normalizeText = (text: string): string => {
    return text.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ñ/g, 'n')
      .replace(/ü/g, 'u')
      .trim();
  };

  // Función para generar variaciones fonéticas comunes
  const generatePhoneticVariations = (word: string): string[] => {
    const variations = new Set([word]);
    const normalized = normalizeText(word);
    
    // Variaciones comunes en español
    const phoneticRules = [
      // B/V confusión
      [/b/g, 'v'], [/v/g, 'b'],
      // C/K/Q confusión
      [/c/g, 'k'], [/k/g, 'c'], [/qu/g, 'k'],
      // Y/LL confusión
      [/y/g, 'll'], [/ll/g, 'y'],
      // Z/S/C confusión
      [/z/g, 's'], [/s/g, 'z'], [/ce/g, 'se'], [/ci/g, 'si'],
      // H muda
      [/h/g, ''], ['', 'h'],
      // Dobles consonantes
      [/rr/g, 'r'], [/r/g, 'rr'],
    ];

    phoneticRules.forEach(([from, to]) => {
      if (typeof from === 'string') {
        variations.add(normalized.replace(new RegExp(from, 'g'), to));
      } else {
        variations.add(normalized.replace(from, to));
      }
    });

    // Agregar versiones sin espacios y con espacios
    variations.add(normalized.replace(/\s+/g, ''));
    variations.add(normalized.replace(/\s+/g, ' '));

    return Array.from(variations);
  };

  // Procesar vocabulario del Excel
  useEffect(() => {
    if (excelData && excelData.length > 0) {
      console.log('🧠 Procesando vocabulario del Excel...');
      
      const allWords = new Set<string>();
      const phonetics = new Map<string, string[]>();
      
      excelData.forEach(item => {
        if (item.Producto) {
          const productName = item.Producto.toString();
          const normalized = normalizeText(productName);
          
          // Agregar el producto completo
          allWords.add(normalized);
          phonetics.set(normalized, generatePhoneticVariations(productName));
          
          // Agregar palabras individuales
          const words = normalized.split(/\s+/).filter(w => w.length >= 2);
          words.forEach(word => {
            allWords.add(word);
            phonetics.set(word, generatePhoneticVariations(word));
          });
        }
        
        if (item.Material) {
          const materialName = item.Material.toString();
          const normalized = normalizeText(materialName);
          allWords.add(normalized);
          phonetics.set(normalized, generatePhoneticVariations(materialName));
        }
      });
      
      const dictionary = Array.from(allWords).sort((a, b) => b.length - a.length);
      setProductDictionary(dictionary);
      setPhoneticsMap(phonetics);
      setVocabularyReady(true);
      
      console.log('✅ Vocabulario procesado:', dictionary.length, 'términos únicos');
      console.log('📝 Muestra del diccionario:', dictionary.slice(0, 10));
      
      toast({
        title: "🧠 Vocabulario del Excel procesado",
        description: `${dictionary.length} términos únicos listos para reconocimiento`,
      });
    }
  }, [excelData, toast]);

  // Función mejorada de búsqueda con vocabulario específico
  const intelligentSearch = (searchTerm: string): any[] => {
    if (!searchTerm.trim() || !excelData || excelData.length === 0) {
      return [];
    }

    const normalizedSearch = normalizeText(searchTerm);
    console.log('🔍 Búsqueda inteligente para:', normalizedSearch);
    
    const results = excelData.filter((item, index) => {
      if (!item || !item.Producto) return false;
      
      const productName = normalizeText(item.Producto);
      const materialName = item.Material ? normalizeText(item.Material) : '';
      
      // Coincidencia exacta (prioridad alta)
      if (productName.includes(normalizedSearch) || materialName.includes(normalizedSearch)) {
        return true;
      }
      
      // Coincidencia por palabras (prioridad media)
      const searchWords = normalizedSearch.split(/\s+/);
      const productWords = productName.split(/\s+/);
      
      const wordMatches = searchWords.filter(searchWord => 
        productWords.some(productWord => 
          productWord.includes(searchWord) || searchWord.includes(productWord)
        )
      );
      
      if (wordMatches.length >= Math.min(searchWords.length, 2)) {
        return true;
      }
      
      // Coincidencia fonética (prioridad baja)
      const variations = phoneticsMap.get(normalizedSearch) || [];
      return variations.some(variation => 
        productName.includes(variation) || materialName.includes(variation)
      );
    });
    
    // Ordenar por relevancia
    return results.sort((a, b) => {
      const aProduct = normalizeText(a.Producto);
      const bProduct = normalizeText(b.Producto);
      
      // Priorizar coincidencias exactas al inicio
      const aStartsWith = aProduct.startsWith(normalizedSearch);
      const bStartsWith = bProduct.startsWith(normalizedSearch);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Luego por longitud (más específico primero)
      return aProduct.length - bProduct.length;
    }).slice(0, 8);
  };

  const searchProducts = (term: string) => {
    const results = intelligentSearch(term);
    console.log(`Búsqueda inteligente "${term}": ${results.length} resultados`);
    setSearchResults(results);
  };

  // Función para limpiar el estado y detener el reconocimiento completamente
  const forceStopRecognition = () => {
    console.log('🛑 Forzando detención completa del reconocimiento');
    
    // Limpiar timeout de reinicio
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Detener reconocimiento si existe
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Error deteniendo reconocimiento:', error);
      }
    }
    
    // Resetear todos los estados
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  };

  // Configuración mejorada del reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configuración optimizada para español con vocabulario específico
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.maxAlternatives = 5; // Más alternativas para mejor precisión
      
      // Configurar gramática personalizada si está disponible
      if ('webkitSpeechGrammarList' in window && vocabularyReady) {
        const grammar = '#JSGF V1.0; grammar products; public <product> = ' + 
          productDictionary.slice(0, 50).join(' | ') + ';';
        
        const speechRecognitionList = new (window as any).webkitSpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        recognitionRef.current.grammars = speechRecognitionList;
        
        console.log('✅ Gramática personalizada configurada con', productDictionary.length, 'términos');
      }

      recognitionRef.current.onstart = () => {
        console.log('🎤 Reconocimiento iniciado con vocabulario específico');
        setTranscript('');
        setInterimTranscript('');
        setIsProcessing(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let maxConfidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          // Evaluar todas las alternativas
          let bestAlternative = result[0];
          let bestScore = 0;
          
          for (let j = 0; j < result.length; j++) {
            const alternative = result[j];
            const transcript = normalizeText(alternative.transcript);
            
            // Calcular puntuación basada en coincidencias con vocabulario
            let score = alternative.confidence || 0;
            
            if (vocabularyReady) {
              const words = transcript.split(/\s+/);
              const vocabularyMatches = words.filter(word => 
                productDictionary.some(dictWord => 
                  dictWord.includes(word) || word.includes(dictWord)
                )
              );
              
              // Bonus por coincidencias con vocabulario
              score += (vocabularyMatches.length / words.length) * 0.3;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestAlternative = alternative;
            }
          }
          
          const transcript = bestAlternative.transcript;
          const confidence = bestScore;
          
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
        
        if (finalTranscript && maxConfidence > 0.2) { // Umbral más bajo con vocabulario específico
          console.log('🎯 Comando final con vocabulario:', finalTranscript, 'Confianza:', maxConfidence);
          setTranscript(finalTranscript);
          setLastCommand(finalTranscript);
          processVoiceCommand(finalTranscript, maxConfidence);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Error reconocimiento:', event.error);
        setIsProcessing(false);
        
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
        } else if (event.error === 'aborted') {
          console.log('Reconocimiento abortado por el usuario');
        } else {
          toast({
            title: "Error de reconocimiento",
            description: `Error: ${event.error}`,
            variant: "destructive",
          });
        }
        
        forceStopRecognition();
      };

      recognitionRef.current.onend = () => {
        console.log('🔚 Reconocimiento terminado');
        setIsProcessing(false);
        setInterimTranscript('');
        
        if (isListening && recognitionRef.current) {
          restartTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
                console.log('🔄 Reconocimiento reiniciado automáticamente');
              } catch (error) {
                console.error('Error al reiniciar:', error);
                forceStopRecognition();
              }
            }
          }, 100);
        } else {
          setIsListening(false);
        }
      };
    }

    return () => {
      forceStopRecognition();
    };
  }, [isListening, setIsListening, vocabularyReady, productDictionary]);

  // Procesamiento inteligente de comandos con vocabulario específico
  const processVoiceCommand = async (command: string, confidence: number) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const normalizedCommand = normalizeText(command);
    
    console.log('🔄 Procesando con vocabulario específico:', normalizedCommand, 'Confianza:', confidence);

    try {
      // Comando de búsqueda
      if (normalizedCommand.includes('buscar') || normalizedCommand.includes('busca')) {
        const searchTerm = normalizedCommand
          .replace(/buscar|busca/g, '').trim()
          .replace(/el |la |los |las |un |una /g, '');
        
        if (searchTerm.length >= 2) {
          setSearchTerm(searchTerm);
          const results = intelligentSearch(searchTerm);
          setSearchResults(results);
          speak(`Buscando ${searchTerm}. Encontrados ${results.length} productos.`);
          
          toast({
            title: `🔍 Búsqueda inteligente: "${searchTerm}"`,
            description: `Se encontraron ${results.length} productos con vocabulario específico`,
          });
        }
        setIsProcessing(false);
        return;
      }

      // Comando de stock mejorado con vocabulario específico
      const stockPatterns = [
        /^(.+?)\s+(\d+(?:[.,]\d+)?)$/,
        /^(\d+(?:[.,]\d+)?)\s+(?:para|de)\s+(.+)$/,
        /^(?:stock|inventario)\s+(.+?)\s+(\d+(?:[.,]\d+)?)$/,
        /^(?:actualizar|cambiar)\s+(.+?)\s+(?:a|con)\s+(\d+(?:[.,]\d+)?)$/
      ];

      for (const pattern of stockPatterns) {
        const match = normalizedCommand.match(pattern);
        
        if (match) {
          let productTerm, stockValue;
          
          if (pattern.source.startsWith('^(\\d+')) {
            stockValue = parseFloat(match[1].replace(',', '.'));
            productTerm = match[2].trim();
          } else {
            productTerm = match[1].trim();
            stockValue = parseFloat(match[2].replace(',', '.'));
          }
          
          if (!isNaN(stockValue) && productTerm.length >= 2) {
            // Buscar producto con el sistema inteligente
            const results = intelligentSearch(productTerm);
            
            if (results.length > 0) {
              const bestMatch = results[0]; // El primer resultado es el mejor match
              const foundProductIndex = excelData.findIndex(item => 
                item.Producto === bestMatch.Producto && 
                item.Material === bestMatch.Material
              );
              
              if (foundProductIndex !== -1) {
                onUpdateStock(foundProductIndex, stockValue);
                
                speak(`Stock actualizado con vocabulario específico. ${bestMatch.Producto}: ${stockValue} unidades.`);
                
                toast({
                  title: "✅ Stock actualizado por voz inteligente",
                  description: `${bestMatch.Producto}: ${stockValue}`,
                  duration: 3000,
                });
                
                setIsProcessing(false);
                return;
              }
            }
          }
        }
      }

      // Si llegamos aquí, el comando no fue reconocido
      if (confidence > 0.4) {
        speak('No pude encontrar ese producto en el vocabulario. Intenta con "buscar producto" o "producto cantidad".');
        
        toast({
          title: "Producto no encontrado en vocabulario",
          description: `"${command}" - El sistema conoce ${productDictionary.length} productos específicos`,
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

    if (!vocabularyReady) {
      toast({
        title: "Vocabulario no listo",
        description: "Espera a que se procese el vocabulario del Excel",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      forceStopRecognition();
      speak('Reconocimiento de voz desactivado');
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        speak(`Reconocimiento de voz activado con ${productDictionary.length} productos específicos`);
      } catch (error) {
        console.error('Error iniciando reconocimiento:', error);
        forceStopRecognition();
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
      {/* Estado del vocabulario */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-purple-700 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                🧠 Vocabulario del Excel:
              </h3>
              <div className="text-sm text-purple-600 space-y-1">
                <p>Productos: {excelData?.length || 0}</p>
                <p>Vocabulario: {vocabularyReady ? `✅ ${productDictionary.length} términos` : '⏳ Procesando...'}</p>
                <p>Estado: {isListening ? '🎤 Escuchando inteligente' : '⏸️ Inactivo'}</p>
                {confidence > 0 && (
                  <div>Confianza: <Badge variant={confidence > 0.6 ? 'default' : 'secondary'}>{Math.round(confidence * 100)}%</Badge></div>
                )}
              </div>
            </div>
            {isProcessing && (
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Procesando con IA...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcripción en tiempo real */}
      {(interimTranscript || transcript) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-green-700 mb-2">📝 Reconocimiento Inteligente:</h4>
            <div className="space-y-2">
              {interimTranscript && (
                <p className="text-sm text-gray-600 italic">
                  Escuchando: "{interimTranscript}"
                </p>
              )}
              {transcript && (
                <p className="text-sm font-medium text-green-800">
                  Comando procesado: "{transcript}"
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buscador mejorado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar Productos (Con IA)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos con reconocimiento inteligente..."
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
                      Material: {product.Material} | Stock: {product.Stock || 0}
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
                        Material: {selectedProduct.Material} | Stock actual: {selectedProduct.Stock || 0}
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
          disabled={isProcessing || !vocabularyReady}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              Detener Escucha Inteligente
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Iniciar Control IA por Voz
            </>
          )}
        </Button>

        <Button
          onClick={() => speak(`Sistema de reconocimiento inteligente con ${productDictionary.length} productos específicos del Excel`)}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
          disabled={!vocabularyReady}
        >
          <Volume2 className="w-5 h-5" />
          Probar Voz IA
        </Button>
      </div>

      {isListening && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-700">
                🧠 Escuchando con IA... {confidence > 0 && `(${Math.round(confidence * 100)}% confianza)`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guía de comandos actualizada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Comandos de Voz con IA ({productDictionary.length} productos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">🔍 Búsqueda Inteligente:</h4>
                <p>• "buscar aceite" → encuentra "Aceite de oliva"</p>
                <p>• "busca azucar" → encuentra "Azúcar blanco"</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">📦 Stock con IA:</h4>
                <p>• "aceite cinco" → actualiza cualquier aceite</p>
                <p>• "azucar diez" → reconoce sin tildes</p>
                <p>• "vino tres" → encuentra productos similares</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">🧠 Ventajas del Sistema IA:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• ✅ Reconoce productos específicos de tu Excel</li>
                <li>• ✅ Corrige errores fonéticos automáticamente</li>
                <li>• ✅ Entiende variaciones (aceite = aceyte = azeite)</li>
                <li>• ✅ Busca por palabras parciales inteligentemente</li>
                <li>• ✅ Mejor precisión con tu vocabulario específico</li>
                <li>• ✅ Gramática personalizada para tus productos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
