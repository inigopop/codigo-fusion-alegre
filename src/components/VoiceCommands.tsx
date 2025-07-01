import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Volume2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandsProps {
  excelData: any[];
  onUpdateStock: (index: number, stockToAdd: number) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

interface ProductSuggestion {
  product: any;
  index: number;
  similarity: number;
}

const VoiceCommands = ({ excelData, onUpdateStock, isListening, setIsListening }: VoiceCommandsProps) => {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [pendingQuantity, setPendingQuantity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Procesar vocabulario del Excel para mejorar reconocimiento
  const processVocabulary = useCallback(() => {
    if (excelData.length === 0) return [];
    
    const vocabulary = new Set<string>();
    
    excelData.forEach(item => {
      // Extraer palabras de los productos
      if (item.Producto) {
        const words = item.Producto.toLowerCase()
          .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales
          .split(/\s+/)
          .filter((word: string) => word.length > 2);
        words.forEach((word: string) => vocabulary.add(word));
      }
      
      // Añadir códigos de material si existen
      if (item.Material) {
        vocabulary.add(item.Material.toLowerCase());
      }
    });
    
    return Array.from(vocabulary);
  }, [excelData]);

  // Función para crear variaciones fonéticas básicas
  const createPhoneticVariations = (word: string): string[] => {
    const variations = [word];
    
    // Variaciones comunes en español
    const phoneticMap: { [key: string]: string } = {
      'c': 'k',
      'k': 'c',
      'z': 's',
      's': 'z',
      'b': 'v',
      'v': 'b',
      'g': 'j',
      'j': 'g'
    };
    
    Object.entries(phoneticMap).forEach(([from, to]) => {
      if (word.includes(from)) {
        variations.push(word.replace(new RegExp(from, 'g'), to));
      }
    });
    
    return variations;
  };

  // Función para calcular similitud entre strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Coincidencia exacta
    if (s1 === s2) return 100;
    
    // Contiene la búsqueda completa
    if (s2.includes(s1) || s1.includes(s2)) return 80;
    
    // Coincidencia por palabras individuales
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchingWords = 0;
    words1.forEach(word1 => {
      if (word1.length > 2) {
        words2.forEach(word2 => {
          if (word2.includes(word1) || word1.includes(word2)) {
            matchingWords++;
          }
        });
      }
    });
    
    return (matchingWords / Math.max(words1.length, words2.length)) * 60;
  };

  // Función para buscar sugerencias de productos
  const findProductSuggestions = (query: string): ProductSuggestion[] => {
    console.log('🔍 Buscando sugerencias para:', query);
    
    const suggestions = excelData
      .map((product, index) => {
        const productName = (product.Producto || '').toString();
        const materialCode = (product.Material || product.Codigo || '').toString();
        
        const nameSimilarity = calculateSimilarity(query, productName);
        const codeSimilarity = calculateSimilarity(query, materialCode);
        const maxSimilarity = Math.max(nameSimilarity, codeSimilarity);
        
        return {
          product,
          index,
          similarity: maxSimilarity
        };
      })
      .filter(item => item.similarity > 30)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    
    console.log('📋 Sugerencias encontradas:', suggestions.length);
    return suggestions;
  };

  // Función para buscar producto exacto
  const findExactProductMatch = (query: string): number => {
    const normalizedQuery = query.toLowerCase().trim();
    
    return excelData.findIndex(product => {
      const productName = (product.Producto || '').toLowerCase();
      const materialCode = (product.Material || product.Codigo || '').toLowerCase();
      
      // Coincidencia muy alta
      return calculateSimilarity(normalizedQuery, productName) > 70 ||
             calculateSimilarity(normalizedQuery, materialCode) > 70;
    });
  };

  // Función para mostrar sugerencias de productos
  const showProductSuggestions = (query: string, quantity: number) => {
    console.log('🎭 Mostrando sugerencias para:', query, 'cantidad:', quantity);
    
    const productSuggestions = findProductSuggestions(query);
    
    if (productSuggestions.length > 0) {
      setSuggestions(productSuggestions);
      setPendingQuantity(quantity);
      setSearchQuery(query);
      setShowSuggestionsDialog(true);
      
      speak(`No encontré exactamente "${query}". Te muestro las opciones más parecidas.`);
    } else {
      speak(`No encontré productos parecidos a "${query}"`);
      toast({
        title: "❌ Producto no encontrado",
        description: `No se encontraron coincidencias para: ${query}`,
        variant: "destructive",
      });
    }
  };

  // Función para añadir stock a un producto
  const addStockToProduct = (productIndex: number, quantityToAdd: number) => {
    const product = excelData[productIndex];
    console.log('➕ SUMANDO stock:', {
      producto: product.Producto,
      stockActual: product.Stock,
      cantidadASumar: quantityToAdd,
      nuevoStock: (Number(product.Stock) || 0) + quantityToAdd
    });
    
    // Llamar a la función con la cantidad a SUMAR (no reemplazar)
    onUpdateStock(productIndex, quantityToAdd);
    
    const newTotal = (Number(product.Stock) || 0) + quantityToAdd;
    
    speak(`Añadido ${quantityToAdd} a ${product.Producto}. Total: ${newTotal} ${product.UMB || 'unidades'}`);
    
    toast({
      title: "✅ Stock actualizado",
      description: `${product.Producto}: +${quantityToAdd} = ${newTotal} ${product.UMB || 'UN'}`,
    });
  };

  // Función para manejar la selección de una sugerencia
  const handleSuggestionSelect = (suggestion: ProductSuggestion) => {
    addStockToProduct(suggestion.index, pendingQuantity);
    setShowSuggestionsDialog(false);
    setSuggestions([]);
    setPendingQuantity(0);
    setSearchQuery('');
  };

  // Función para procesar el comando de voz
  const processVoiceCommand = useCallback((command: string) => {
    setIsProcessing(true);
    setLastCommand(command);
    
    console.log('🔍 Procesando comando:', command);
    
    const lowerCommand = command.toLowerCase();
    
    // Patrones para actualización de stock - MEJORADOS
    const updatePatterns = [
      /(.+?)\s+(\d+(?:\.\d+)?)/i,  // "vino emina 12"
      /(?:añadir?|agregar?|sumar?)\s+(.+?)\s+(\d+(?:\.\d+)?)/i,  // "añadir vino emina 12"
      /(?:actualizar?|cambiar?|poner?)\s+(.+?)\s+(?:a|con|en)\s+(\d+(?:\.\d+)?)/i,
    ];
    
    let commandProcessed = false;
    
    for (const pattern of updatePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const productQuery = match[1].trim();
        const quantity = parseFloat(match[2]);
        
        console.log('🎯 Comando de actualización detectado:', { productQuery, quantity });
        
        if (!isNaN(quantity) && quantity >= 0) {
          // Buscar producto exacto primero
          const exactMatch = findExactProductMatch(productQuery);
          
          if (exactMatch !== -1) {
            // Encontrado exacto - añadir cantidad
            addStockToProduct(exactMatch, quantity);
            commandProcessed = true;
          } else {
            // No encontrado exacto - mostrar sugerencias
            showProductSuggestions(productQuery, quantity);
            commandProcessed = true;
          }
          break;
        }
      }
    }
    
    if (!commandProcessed) {
      const product = excelData[0];
      if (product) {
        speak(`No entendí el comando. Intenta decir: "${product.Producto}" seguido de la cantidad`);
      }
    }
    
    setTimeout(() => setIsProcessing(false), 1000);
  }, [excelData]);

  // Función para forzar la detención del reconocimiento
  const forceStopRecognition = useCallback(() => {
    console.log('🛑 Forzando detención completa');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (error) {
        console.log('Error deteniendo reconocimiento:', error);
      }
      recognitionRef.current = null;
    }
    
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
    setLastCommand('');
    
    toast({
      title: "🛑 Reconocimiento detenido",
      description: "Puedes volver a empezar cuando quieras",
    });
  }, []);

  // Función para manejar el error de reconocimiento
  const handleRecognitionError = (error: string) => {
    setIsProcessing(false);
    
    switch (error) {
      case 'no-speech':
        setTranscript('No se detectó voz. Intenta de nuevo.');
        break;
      case 'audio-capture':
        toast({
          title: "Error de micrófono",
          description: "No se puede acceder al micrófono",
          variant: "destructive",
        });
        forceStopRecognition();
        break;
      case 'not-allowed':
        toast({
          title: "Permisos denegados",
          description: "Permite el acceso al micrófono",
          variant: "destructive",
        });
        forceStopRecognition();
        break;
      case 'network':
        setTranscript('Error de conexión. Reintentando...');
        break;
      default:
        setTranscript(`Error: ${error}. Presiona iniciar para continuar.`);
    }
  };

  // Función para configurar el reconocimiento
  const setupRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Reconocimiento de voz no disponible",
        description: "Tu navegador no soporta reconocimiento de voz",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configuración mejorada
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 5;
    
    // Procesar vocabulario del Excel
    const vocabulary = processVocabulary();
    console.log('📚 Vocabulario procesado:', vocabulary.length, 'palabras');
    
    recognition.onstart = () => {
      console.log('🎤 Reconocimiento iniciado');
      setIsListening(true);
      setTranscript('Escuchando...');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        console.log('🎯 Comando final:', finalTranscript);
        processVoiceCommand(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Error de reconocimiento:', event.error);
      handleRecognitionError(event.error);
    };

    recognition.onend = () => {
      console.log('⏹️ Reconocimiento terminado');
      if (isListening && !isProcessing) {
        // Auto-reiniciar si no se detuvo manualmente
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.log('🔄 Auto-reinicio fallido');
            }
          }
        }, 500);
      }
    };

    return recognition;
  }, [excelData, isListening, isProcessing]);

  // Función para iniciar la escucha
  const startListening = () => {
    if (excelData.length === 0) {
      toast({
        title: "No hay datos",
        description: "Carga un archivo Excel primero",
        variant: "destructive",
      });
      return;
    }

    const recognition = setupRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (error) {
        console.error('Error iniciando reconocimiento:', error);
        handleRecognitionError('start-error');
      }
    }
  };

  // Función para detener la escucha
  const stopListening = () => {
    forceStopRecognition();
  };

  // Efecto para limpiar el reconocimiento al desmontar el componente
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Control principal */}
      <div className="flex flex-col items-center space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={startListening}
            disabled={isListening}
            size="lg"
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          >
            <Mic className="w-5 h-5" />
            Iniciar Escucha
          </Button>
          
          <Button
            onClick={stopListening}
            disabled={!isListening}
            variant="destructive"
            size="lg"
            className="flex items-center gap-2"
          >
            <MicOff className="w-5 h-5" />
            Detener Escucha
          </Button>
        </div>

        {/* Estado visual */}
        {isListening && (
          <div className="flex items-center gap-2 text-yellow-600 animate-pulse">
            <Volume2 className="w-5 h-5" />
            <span className="font-medium">Escuchando...</span>
          </div>
        )}
      </div>

      {/* Transcripción en tiempo real */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">📝 Transcripción:</h3>
          <p className="text-sm bg-gray-50 p-3 rounded min-h-[60px]">
            {transcript || 'Presiona "Iniciar Escucha" para comenzar...'}
          </p>
          
          {lastCommand && (
            <div className="mt-3 pt-3 border-t">
              <h4 className="font-medium text-blue-600 mb-1">🎯 Último comando:</h4>
              <p className="text-sm text-blue-800">{lastCommand}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de sugerencias */}
      <Dialog open={showSuggestionsDialog} onOpenChange={setShowSuggestionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Productos similares a "{searchQuery}"</DialogTitle>
            <DialogDescription>
              Selecciona el producto correcto para añadir {pendingQuantity} unidades
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-lg">{suggestion.product.Producto}</p>
                    <p className="text-sm text-gray-600">
                      Código: {suggestion.product.Material || suggestion.product.Codigo} | 
                      Stock actual: {suggestion.product.Stock || 0} {suggestion.product.UMB}
                    </p>
                    <p className="text-xs text-green-600">
                      Similitud: {Math.round(suggestion.similarity)}%
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-green-600">
                    <Plus className="w-5 h-5" />
                    <span className="font-bold text-lg">{pendingQuantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowSuggestionsDialog(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ayuda de comandos */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">💡 Comandos disponibles:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <strong>➕ Añadir stock (SUMATORIO):</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• "Vino Emina 12" (suma 12)</li>
                <li>• "Cerveza 6" (suma 6)</li>
                <li>• "Añadir patatas 25"</li>
              </ul>
            </div>
            <div>
              <strong>🔍 Si no encuentra exacto:</strong>
              <ul className="ml-4 mt-1 space-y-1 text-gray-600">
                <li>• Se abrirá un diálogo</li>
                <li>• Mostrará productos similares</li>
                <li>• Selecciona el correcto</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-700 mb-2">📊 Sistema de Stock Sumatorio:</h3>
          <div className="text-sm text-blue-600 space-y-1">
            <p>✅ Productos cargados: {excelData.length}</p>
            <p>➕ Modo: SUMA cantidades al stock existente</p>
            <p>🎤 Reconocimiento: {isListening ? 'Activo' : 'Inactivo'}</p>
            <p>🔍 Búsqueda inteligente con sugerencias automáticas</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCommands;
